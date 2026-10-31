import { readFile, writeFile, mkdir, readdir, lstat, realpath, open, rm, rename, statfs } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const root = path.dirname(fileURLToPath(import.meta.url));
export const config = JSON.parse(await readFile(path.join(root, 'worker.config.json'), 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const GiB = 1024 ** 3;
export function assertLocked() {
  if (config.VIDEO_GENERATION_ENABLED !== false ||
      (process.env.VIDEO_GENERATION_ENABLED !== undefined && process.env.VIDEO_GENERATION_ENABLED !== 'false')) {
    throw Error('VIDEO_GENERATION_ENABLED must remain false. Activation is outside this preparation worker.');
  }
}
export function denyProduction(action) {
  assertLocked();
  throw Error(`${action} blocked: VIDEO_GENERATION_ENABLED=false; no rendering, AI, TTS or dispatch is implemented.`);
}
export function route(spec) {
  if (!spec || typeof spec !== 'object') throw Error('Expected workload specification');
  for (const key of ['width','height','durationSeconds','sceneCount','memoryGiB']) {
    if (!Number.isFinite(spec[key]) || spec[key] <= 0) throw Error(`Invalid workload ${key}`);
  }
  if (typeof spec.requiresGpu !== 'boolean' || typeof spec.has3d !== 'boolean') throw Error('Declare requiresGpu and has3d explicitly');
  const destination = spec.requiresGpu ? 'gpu-provider-unconfigured' :
    spec.has3d || Object.entries(config.localLimits).some(([key, limit]) => spec[key] > limit)
      ? 'github-hosted-cpu-candidate' : 'dell-light-candidate';
  return {destination, dispatchEnabled:false, generationEnabled:false,
    benchmarkRequired:true, note:'Estimate only; no job queued. Hosted CPU capacity must be benchmarked; GPU is not assumed.'};
}
function cpuTimes() {
  return os.cpus().map(c => ({ idle:c.times.idle, total:Object.values(c.times).reduce((a,b)=>a+b,0) }));
}
export async function resources() {
  const before=cpuTimes();
  await new Promise(resolve=>setTimeout(resolve,500));
  const after=cpuTimes();
  const idle=after.reduce((sum,c,i)=>sum+c.idle-before[i].idle,0);
  const total=after.reduce((sum,c,i)=>sum+c.total-before[i].total,0);
  const disk=await statfs(root);
  return {cpuLoadPercent:total ? Math.round(100*(1-idle/total)) : 0,
    logicalCpus:after.length, freeMemoryGiB:os.freemem()/GiB, totalMemoryGiB:os.totalmem()/GiB,
    freeDiskGiB:Number(disk.bavail)*Number(disk.bsize)/GiB};
}
export function checkResources(r) {
  if (r.freeMemoryGiB < config.minimumFreeMemoryGiB || r.freeDiskGiB < config.minimumFreeDiskGiB ||
      r.cpuLoadPercent > config.maximumCpuLoadPercent) throw Error('Resource budget exceeded; retry later, no job queued');
}
async function filesUnder(dir, prefix='') {
  const result=[];
  for (const name of (await readdir(dir)).sort()) {
    if (name.includes('\\') || name.includes(':') || name.startsWith('.') || /(?:secret|credential|token|\.env)/i.test(name)) throw Error(`Forbidden input name: ${name}`);
    const full=path.join(dir,name), info=await lstat(full), relative=prefix+name;
    if (info.isSymbolicLink()) throw Error('Symlinks are forbidden');
    if (info.isDirectory()) result.push(...await filesUnder(full,relative+'/'));
    else if (info.isFile()) {
      if (info.size > 256*1024*1024) throw Error('Input exceeds 256 MiB per-file preparation limit');
      result.push({relative,full,size:info.size});
    } else throw Error('Only regular files accepted');
  }
  return result;
}
export async function validateInput(input) {
  const inventory=await filesUnder(input);
  if(inventory.length>500 || inventory.reduce((sum,f)=>sum+f.size,0)>512*1024*1024) throw Error('Bundle exceeds 500 files or 512 MiB');
  for (const name of ['source.json','script.json','storyboard.json','scenes.json','assets.json','workload.json']) {
    JSON.parse(await readFile(path.join(input,name),'utf8'));
  }
  const source=JSON.parse(await readFile(path.join(input,'source.json'),'utf8'));
  if (!source.sourceId || !source.version || !/^[a-f0-9]{64}$/.test(source.sourceHash)) throw Error('Source requires sourceId, version and SHA256 sourceHash');
  const scenes=JSON.parse(await readFile(path.join(input,'scenes.json'),'utf8'));
  if (!Array.isArray(scenes.scenes) || !scenes.scenes.length || scenes.scenes.some(s=>!s.id || !Array.isArray(s.conceptIds) || !s.conceptIds.length)) throw Error('Each scene requires id and nonempty conceptIds');
  const assets=JSON.parse(await readFile(path.join(input,'assets.json'),'utf8'));
  if (!Array.isArray(assets.assets)) throw Error('assets.json requires assets array');
  const ids=new Set();
  for (const a of assets.assets) {
    if (!a.id || ids.has(a.id) || !a.path || !a.provenance || !a.license || !a.version || !a.attribution || a.videoDerivativeRightsConfirmed!==true || !/^[a-f0-9]{64}$/.test(a.sha256)) throw Error('Asset requires unique id, path, provenance, license, version, attribution, video rights and SHA256');
    ids.add(a.id);
    if (path.isAbsolute(a.path) || a.path.includes('\\') || a.path.split('/').some(s=>s==='..'||s==='.') || !a.path.startsWith('assets/')) throw Error('Asset path must stay under assets/');
    const assetPath=path.join(input,a.path);
    const resolved=await realpath(assetPath), base=await realpath(path.join(input,'assets'));
    if (!resolved.startsWith(base+path.sep)) throw Error('Asset escapes assets directory');
    if (hash(await readFile(assetPath))!==a.sha256) throw Error('Asset checksum mismatch');
  }
  const workload=JSON.parse(await readFile(path.join(input,'workload.json'),'utf8'));
  if (workload.sceneCount!==scenes.scenes.length) throw Error('Workload sceneCount differs from manifest');
  return {source, routing:route(workload)};
}
export async function prepare(input, output=path.join(root,'.local','bundles')) {
  assertLocked();
  input=await realpath(path.resolve(input));
  output=path.resolve(output);
  if (output===input || output.startsWith(input+path.sep)) throw Error('Output must be outside input');
  await mkdir(path.join(root,'.local'),{recursive:true});
  const lockPath=path.join(root,'.local','prepare.lock');
  let lock;
  try { lock=await open(lockPath,'wx'); } catch(e) { if(e.code==='EEXIST') throw Error('Worker busy or stale lock; no waiting queue. Inspect lock before manual recovery.'); throw e; }
  let staging;
  try {
    await lock.writeFile(JSON.stringify({pid:process.pid,started:new Date().toISOString()}));
    checkResources(await resources());
    const validation=await validateInput(input);
    const entries=await filesUnder(input);
    if(entries.length>500 || entries.reduce((s,f)=>s+f.size,0)>512*1024*1024) throw Error('Bundle exceeds 500 files or 512 MiB');
    await mkdir(output,{recursive:true});
    staging=path.join(output,'.preparing-'+process.pid+'-'+Date.now());
    await mkdir(staging);
    const files=[];
    for (const f of entries) {
      const data=await readFile(f.full);
      await mkdir(path.dirname(path.join(staging,f.relative)),{recursive:true});
      await writeFile(path.join(staging,f.relative),data,{flag:'wx'});
      files.push({path:f.relative,size:data.length,sha256:hash(data)});
    }
    // Validate the copied snapshot as well, avoiding source changes during preparation.
    const snapshot=await validateInput(staging);
    if(JSON.stringify(snapshot)!==JSON.stringify(validation)) throw Error('Input changed while preparing');
    const lockfile=await readFile(path.join(root,'package-lock.json'));
    const manifest={schemaVersion:1,status:'prepared-unapproved',generationEnabled:false,
      source:snapshot.source,routing:snapshot.routing,node:process.version,
      dependencyLockSha256:hash(lockfile),dependencyVersions:Object.fromEntries(Object.entries(JSON.parse(lockfile).packages).filter(([key])=>key.startsWith('node_modules/')).map(([key,value])=>[key.slice(13),value.version])),files,
      expectedOutput:{format:'mp4',created:false,workload:JSON.parse(await readFile(path.join(staging,'workload.json'),'utf8'))},clinicalApproval:false,coverageApproval:false};
    const serialized=JSON.stringify(manifest,null,2)+'\n';
    const id='v1-'+hash(serialized);
    await writeFile(path.join(staging,'bundle-manifest.json'),serialized,{flag:'wx'});
    await verify(staging);
    const destination=path.join(output,id);
    await rename(staging,destination); staging=undefined;
    return {id,destination,status:manifest.status,routing:manifest.routing};
  } finally {
    await lock.close(); await rm(lockPath,{force:true});
    if(staging) { const target=path.resolve(staging); if(!target.startsWith(output+path.sep) || !path.basename(target).startsWith('.preparing-')) throw Error('Unsafe cleanup target'); await rm(target,{recursive:true,force:true}); }
  }
}
export async function verify(bundle) {
  const manifest=JSON.parse(await readFile(path.join(bundle,'bundle-manifest.json'),'utf8'));
  if(manifest.schemaVersion!==1 || manifest.generationEnabled!==false || manifest.status!=='prepared-unapproved' || !Array.isArray(manifest.files)) throw Error('Invalid bundle manifest');
  const entries=await filesUnder(bundle);
  const actual=entries.filter(f=>f.relative!=='bundle-manifest.json');
  if(actual.length!==manifest.files.length) throw Error('Unexpected or missing bundle files');
  const seen=new Set();
  for(const f of manifest.files) {
    if(seen.has(f.path)) throw Error('Duplicate manifest path'); seen.add(f.path);
    const match=actual.find(a=>a.relative===f.path);
    if(!match || match.size!==f.size || hash(await readFile(match.full))!==f.sha256) throw Error('Bundle checksum mismatch: '+f.path);
  }
  const base=path.basename(path.resolve(bundle));
  if(base.startsWith('v1-') && base!=='v1-'+hash(await readFile(path.join(bundle,'bundle-manifest.json')))) throw Error('Bundle identity mismatch');
  const checked=await validateInput(bundle);
  if(JSON.stringify(checked.source)!==JSON.stringify(manifest.source) || JSON.stringify(checked.routing)!==JSON.stringify(manifest.routing)) throw Error('Bundle metadata mismatch');
  return {valid:true,files:actual.length,generationEnabled:false};
}
async function main() {
  assertLocked();
  const [command,argument,output]=process.argv.slice(2);
  if(['render','ai','tts','dispatch','publish'].includes(command)) denyProduction(command);
  if(command==='doctor') {
    const versions={};
    for(const tool of ['git','ffmpeg','ffprobe']) {
      try { versions[tool]=execFileSync(tool,[tool==='git'?'--version':'-version'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/)[0]; }
      catch { versions[tool]='NOT AVAILABLE'; }
    }
    const packages=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));
    console.log(JSON.stringify({node:process.version,nodeLts:process.release.lts||false,versions,
      remotion:packages.packages['node_modules/remotion']?.version,
      resources:await resources(),config,runnerRegistrationPerformedByThisTool:false,productionImplemented:false},null,2));
  } else if(command==='prepare' && argument) console.log(JSON.stringify(await prepare(argument,output),null,2));
  else if(command==='verify' && argument) console.log(JSON.stringify(await verify(path.resolve(argument)),null,2));
  else if(command==='route' && argument) console.log(JSON.stringify(route(JSON.parse(await readFile(argument,'utf8'))),null,2));
  else throw Error('Usage: worker.mjs doctor | prepare <input-directory> [output-directory] | verify <bundle-directory> | route <workload.json>');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
