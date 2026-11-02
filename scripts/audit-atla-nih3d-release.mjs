#!/usr/bin/env node
/**
 * ATLA NIH3D verified-release audit.
 * Ignore overlapping pilot ranges; count only canonical 100-ID shards.
 * Release asset size and original download-time SHA256 are checked.
 * Does not claim independent SHA256 verification of decompressed release bytes.
 */
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
const repo=process.env.GITHUB_REPOSITORY||'6d9757cmp5-creator/ekab-spoudi';
const tag='atla-nih3d-master-2026';
const dir='tools/atla-ai/resources/nih3d-master-plan-2026';
const format=new Set(['GLB','GLTF','STL','OBJ','X3D','WRL','PLY','3MF']);
const packPrefix=start=>'atla-nih3d-'+String(start).padStart(5,'0')+'-'+String(start+99).padStart(5,'0');
function audit(catalog,segments,reports,assets){
 const problems=[],assetsByName=new Map(assets.map(x=>[x.name,x]));
 const published=new Set(),publishedWithFile=new Set();
 for(const segment of segments)for(const item of segment.items||segment.entries||[]){
  const id=Number(item.entryId??item.id);
  if(published.has(id))problems.push('NIH duplicate entry ID '+id);
  published.add(id);
  if((item.files||[]).some(f=>format.has(String(f.format||'').toUpperCase())))publishedWithFile.add(id);
 }
 if(catalog.verifiedScannedIds!==25000||catalog.apiErrors!==0||catalog.status!=='TARGET_RANGE_SCANNED')problems.push('NIH catalog is not completely scanned');
 if(published.size!==catalog.publishedEntriesFound)problems.push('Catalog count mismatch');
 const canonical=new Map(),pilots=[];
 for(const r of reports){
  const a=Number(r.range?.start),b=Number(r.range?.end);
  if(a>=1&&a<=24901&&(a-1)%100===0&&b===a+99){
   if(canonical.has(a))problems.push('Duplicate canonical RESULT '+a);
   else canonical.set(a,r);
  }else pilots.push({start:a,end:b});
 }
 const archived=new Set();let files=0,originalBytes=0,releaseBytes=0,packs=0,missingNumericIds=0,failedFiles=0,sourceErrors=0,shaEvidence=0;
 for(let start=1;start<=24901;start+=100){
  const m=canonical.get(start),prefix=packPrefix(start);
  if(!m){problems.push('Missing canonical '+prefix+'-RESULT.json');continue}
  if(!assetsByName.has(prefix+'-RESULT.json'))problems.push('Missing remote manifest '+prefix);
  if(!Array.isArray(m.modelFiles)||m.modelFiles.length!==m.downloadedOriginalFiles)problems.push('Model file count mismatch '+prefix);
  if(Number(m.uniqueEntryIds)!==new Set((m.modelFiles||[]).map(f=>Number(f.entryId))).size)problems.push('Unique entry count mismatch '+prefix);
  if((m.failed||[]).length!==Number(m.failedOutputFiles||0))problems.push('Failed-file list mismatch '+prefix);
  if((m.sourceRefreshFailures||[]).length!==Number(m.sourceMetadataErrors||0))problems.push('Source-error list mismatch '+prefix);
  missingNumericIds+=Number(m.missingOrUnpublishedIds||0);
  failedFiles+=Number(m.failedOutputFiles||0);sourceErrors+=Number(m.sourceMetadataErrors||0);
  for(const file of m.modelFiles||[]){
   files++;archived.add(Number(file.entryId));originalBytes+=Number(file.bytes||0);
   if(/^[a-f0-9]{64}$/i.test(file.sha256||''))shaEvidence++;else problems.push('Missing original SHA256 '+file.entryId);
   if(!published.has(Number(file.entryId)))problems.push('Archive file from unknown NIH ID '+file.entryId);
  }
  for(const p of m.packs||[]){
   packs++;let bytes=0,allPresent=true;
   for(const name of p.split?.length?p.split:[p.name]){
    const asset=assetsByName.get(name);
    if(!asset){problems.push('Missing archive '+name);allPresent=false}
    else {bytes+=Number(asset.size||0);if(!(asset.size>0))problems.push('Empty archive '+name)}
   }
   if(allPresent&&bytes!==Number(p.bytes))problems.push('Archive length mismatch '+p.name);
   releaseBytes+=bytes;
  }
 }
 const missingPublished=[...publishedWithFile].filter(id=>!archived.has(id));
 if(missingPublished.length)problems.push('Published NIH 3D entries without archived source model: '+missingPublished.length);
 if(failedFiles||sourceErrors)problems.push('Download errors '+failedFiles+' metadata errors '+sourceErrors);
 if(shaEvidence!==files)problems.push('Missing SHA256 download evidence');
 if(canonical.size!==250)problems.push('Canonical shards '+canonical.size+'/250');
 const complete=problems.length===0&&canonical.size===250;
 return {status:complete?'RELEASE_PRESENCE_VERIFIED':'PARTIAL_OR_UNVERIFIED',complete,
  catalog:{scanned:catalog.verifiedScannedIds,published:published.size,publishedWithSupported3D:publishedWithFile.size},
  binary:{canonicalShards:canonical.size,totalShards:250,sourceModelIds:archived.size,originalFiles:files,originalDownloadSha256Count:shaEvidence,
   originalBytes,releasePackCount:packs,verifiedRemotePackBytes:releaseBytes,publishedSourceModelsNotArchived:missingPublished.length,
   failedFiles,sourceErrors,missingOrUnpublishedNumericIds:missingNumericIds},
  overlappingPilotsExcluded:pilots,problemCount:problems.length,problems:problems.slice(0,260),
  verificationLimit:'Checks release presence and byte sizes plus download-time source hashes; independent extraction and remote original-file SHA256 verification remains separate.',
  release:'https://github.com/'+repo+'/releases/tag/'+tag};
}
if(process.argv.includes('--self-test')){
 const src={verifiedScannedIds:25000,apiErrors:0,status:'TARGET_RANGE_SCANNED',publishedEntriesFound:1};
 const seg=[{items:[{entryId:1,files:[{format:'GLB'}]}]}];
 const a=audit(src,seg,[],[]);
 if(a.complete||a.binary.canonicalShards!==0||a.problemCount===0)throw Error('Fail-closed missing-shards test failed');
 const b=audit(src,seg,[{range:{start:160,end:175}}],[]);
 if(b.binary.canonicalShards!==0||b.overlappingPilotsExcluded.length!==1)throw Error('Pilot dedup test failed');
 console.log('PASS NIH release audit fail-closed + pilot overlap tests');
 process.exit(0);
}
const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
if(!token)throw Error('Set GH_TOKEN for release API');
async function gh(path){
 const req=await fetch('https://api.github.com'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'atla-nih3d-verified-audit'},signal:AbortSignal.timeout(30000)});
 if(!req.ok)throw Error('GitHub API '+req.status+' '+path);
 return req.json();
}
const release=await gh('/repos/'+repo+'/releases/tags/'+tag),assets=[];
for(let page=1;page<=100;page++){
 const arr=await gh('/repos/'+repo+'/releases/'+release.id+'/assets?per_page=100&page='+page);
 assets.push(...arr);if(arr.length<100)break;
}
const catalog=JSON.parse(await readFile(dir+'/catalog-index.json','utf8'));
const names=(await readdir(dir+'/segments')).filter(n=>/^entries-\d+-\d+\.json$/.test(n));
const segments=await Promise.all(names.map(async n=>JSON.parse(await readFile(dir+'/segments/'+n,'utf8'))));
const folder=process.argv.find(v=>v.startsWith('--manifests='))?.slice(12)||'tmp/nih3d-reports';
await mkdir(folder,{recursive:true});
const reportNames=(await readdir(folder)).filter(n=>n.endsWith('-RESULT.json'));
const reports=await Promise.all(reportNames.map(async n=>JSON.parse(await readFile(folder+'/'+n,'utf8'))));
const result=audit(catalog,segments,reports,assets);
await writeFile('docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.json',JSON.stringify(result,null,2)+'\n');
const table=[
 '# NIH 3D — Verified Archive Status / ATLA Master Plan 2026','',
 'State: **'+result.status+'**. This reports actual source archives, not just NIH metadata.','',
 '| Measure | Verified |','|---|---:|',
 '| Published NIH entries | '+result.catalog.published+' |',
 '| Canonical import groups | '+result.binary.canonicalShards+' / 250 |',
 '| NIH source models archived | '+result.binary.sourceModelIds+' |',
 '| Original files and recorded SHA256 | '+result.binary.originalDownloadSha256Count+' |',
 '| Released archive packs | '+result.binary.releasePackCount+' |',
 '| Released archive bytes (size verified) | '+result.binary.verifiedRemotePackBytes+' |',
 '| Published 3D entries not yet archived | '+result.binary.publishedSourceModelsNotArchived+' |',
 '| Failed downloads | '+result.binary.failedFiles+' |',
 '| NIH metadata-refresh failures | '+result.binary.sourceErrors+' |',
 '| QA problems | '+result.problemCount+' |','',
 'Pilot ranges overlapping canonical ranges are excluded from counts.','',
 'Limits: Remote pack presence/size and original-file download-time SHA256 are checked. No independent remote content rehash or scientific approval is claimed.','',
 '## Open issues','',...result.problems.map(v=>'- '+v),'',
 '[Archived lossless files]('+result.release+')',''
].join('\n');
await writeFile('docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.md',table);
console.log('ATLA_NIH3D_RELEASE_AUDIT '+JSON.stringify({status:result.status,shards:result.binary.canonicalShards,modelFiles:result.binary.originalFiles,errors:result.problemCount}));
