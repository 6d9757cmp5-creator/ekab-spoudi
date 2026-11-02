#!/usr/bin/env node
/* Import only original MakeHuman CC0 core mesh resources, not AGPL application code. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/patient-simulator/resources/makehuman/';
const cat=JSON.parse(await readFile(resolve(root,base+'catalog.json'),'utf8'));
if(!cat.sourceCommit.match(/^[0-9a-f]{40}$/))throw Error('untrusted MakeHuman ref');
const assets=cat.coreAssets;
if(assets.length!==2||assets.some(x=>!['base.obj','base.mhclo'].includes(x.name)))throw Error('unexpected core resources');
if(process.argv.includes('--dry-run')){console.log(JSON.stringify(assets.map(x=>({name:x.name,size:x.bytes}))));process.exit(0)}
if(!process.argv.includes('--import'))throw Error('pass --import to acquire official CC0 core assets');
const manifest=[];
for(const a of assets){
 const url='https://raw.githubusercontent.com/makehumancommunity/makehuman/'+cat.sourceCommit+'/makehuman/data/3dobjs/'+a.name;
 if(a.url!==url||a.output!==base+a.name||a.license!=='CC0-1.0')throw Error('bad catalog entry');
 const res=await fetch(url,{signal:AbortSignal.timeout(90000)});
 if(!res.ok)throw Error(a.name+' HTTP '+res.status);
 const bytes=Buffer.from(await res.arrayBuffer());
 const gitSha=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 if(gitSha!==a.sha||bytes.length!==a.bytes)throw Error(a.name+' hash mismatch');
 const str=bytes.toString('utf8');
 if(a.name==='base.obj'&&!(str.includes('\nv ')&&str.includes('\nf ')))throw Error('OBJ lacks vertices/faces');
 if(a.name==='base.mhclo'&&!str.includes('verts'))throw Error('MH clothing proxy structure invalid');
 const target=resolve(root,a.output);
 await mkdir(dirname(target),{recursive:true});
 await writeFile(target+'.incoming',bytes);await rename(target+'.incoming',target);
 manifest.push({name:a.name,path:a.output,sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length,license:'CC0-1.0',origin:a.url,status:'original source geometry; unrigged; not clinically validated'});
 console.log('IMPORTED '+a.name+' '+bytes.length+' bytes');
}
await writeFile(resolve(root,base+'imported-manifest.json'),JSON.stringify({sourceCommit:cat.sourceCommit,assets:manifest},null,2)+'\n');
console.log('SUCCESS '+manifest.length+' CC0 source files');
