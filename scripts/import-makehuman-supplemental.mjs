#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
const base='tools/patient-simulator/resources/makehuman/';
const j=JSON.parse(await readFile(base+'supplemental-catalog.json','utf8'));
if(j.files.length!==8||j.source!=='makehumancommunity/makehuman')throw Error('Unexpected source asset catalog');
if(process.argv.includes('--dry-run')){console.log(j.files.map(x=>x.name));process.exit(0);}
if(!process.argv.includes('--import'))throw Error('Requires --import');
const results=[];
for(const f of j.files){
 if(!f.sourcePath.startsWith('makehuman/data/')||f.sourcePath.includes('..')||f.license!=='CC0-1.0')throw Error('unsafe source');
 const dest=base+f.sourcePath.replace('makehuman/data/','');
 if(dest!==f.output||!f.output.startsWith(base))throw Error('unsafe destination');
 const url='https://raw.githubusercontent.com/makehumancommunity/makehuman/'+j.pinnedCommit+'/'+f.sourcePath;
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('HTTP '+response.status+' '+f.name);
 const raw=Buffer.from(await response.arrayBuffer());
 const sha=createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
 if(sha!==f.sha||raw.length!==f.bytes)throw Error('source verification failed: '+f.name);
 await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest,raw);
 results.push({name:f.name,path:dest,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,source:url,license:'CC0-1.0'});
 console.log('VERIFIED '+f.name+' '+raw.length);
}
await writeFile(base+'supplemental-imported-manifest.json',JSON.stringify({sourceCommit:j.pinnedCommit,scientificReview:false,files:results},null,2)+'\n');
console.log('SUCCESS '+results.length);
