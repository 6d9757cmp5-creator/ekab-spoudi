#!/usr/bin/env node
/* NIH 3D model intake: license-check each published entry; no blanket NIH permission. */
import {writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const argv=process.argv.slice(2);
function num(name,def){const x=argv.find(s=>s.startsWith('--'+name+'='));return x?Number(x.slice(name.length+3)):def;}
const start=num('start',1),end=num('end',120),limit=num('max-files',8),maxBytes=num('max-mb',4)*1048576;
if(![start,end,limit,maxBytes].every(Number.isFinite)||start<1||end<start||end-start>600||limit>30||maxBytes>20*1048576)throw Error('Invalid controlled batch or size limit');
const base='tools/anatomy-3d/resources/nih3d-approved/';
const cockpit='tools/patient-simulator/resources/nih3d-approved/';
const catalog='tools/atla-ai/resources/nih3d-catalog/';
function licenseOf(value){
 const x=String(value||'').trim().toLowerCase().replace(/[\s_]+/g,' ');
 if(x==='public domain'||x==='cc0'||x==='cc0 1.0'||x==='cc0-1.0')return x.startsWith('public')?'Public Domain':'CC0-1.0';
 if(x==='cc-by'||/^cc[- ]by(?: 4(?:\.0)?)?$/.test(x)||x==='cc by 4.0')return 'CC BY 4.0';
 return null;
}
function route(entry){
 const category=String(entry.category||'').toLowerCase();
 if(category.includes('anatomy'))return base;
 if(/devices|hardware|prosthetics/.test(category))return cockpit;
 return null;
}
const relevant=/\b(?:heart|cardiac|lung|brain|spine|spinal|skull|cranial|nerve|artery|vein|chest|thorax|rib|kidney|pelvis|eye|ear|muscle|face|bone|larynx|trachea|liver|hip|femur|humerus|hand|foot|patella|skeleton|vascular|orthopedic|airway|oxygen|intubation|splint|cast|defibrillator|paramedic|ambulance|medical|anatomy)\b|(?:cardio|pulmon|vertebr|neuro|crani|orthop|anatom)/i;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function query(url){
 for(let n=0;n<2;n++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});
   if([429,502,503,504].includes(response.status)&&n===0){await wait(600);continue;}
   return response;
  }catch(e){if(n)throw e;await wait(500);}
 }
}
const found=[],errors=[];
for(let id=start;id<=end;id++){
 try{
  const response=await query('https://3d.nih.gov/api/entries/'+id);
  if(!response.ok){if(response.status!==404)errors.push({id,status:response.status});continue;}
  const entry=await response.json();
  const acc=String(entry.threedpxId||entry.entryId||id).replace(/[^a-zA-Z0-9-]/g,'').slice(0,42);
  const subs=(entry.submissions||[]).filter(s=>s.submissionStatus==='Published').sort((a,b)=>(b.version||0)-(a.version||0));
  const sub=subs[0];if(!sub)continue;
  const meta=sub.metadata||{},title=String(meta.title||'NIH 3D '+acc);
  const files=[];
  for(const run of sub.workflowRuns||[])for(const f of run.outputFiles||[]){
   const fmt=String(f.fileFormat||'').toUpperCase();
   if(!['GLB','STL','OBJ','X3D','WRL','GLTF'].includes(fmt)||!f.fileId||!run.prefectRunId)continue;
   files.push({name:String(f.name||'').slice(0,160),format:fmt,size:f.fileSize||null,url:'https://3d.nih.gov/api/submissions/'+sub.submissionId+'/runs/'+run.prefectRunId+'/output-files/'+f.fileId});
  }
  found.push({entryId:id,accession:acc,title:title.slice(0,180),category:String(entry.category||''),licenseRaw:String(meta.license||''),license:licenseOf(meta.license),creator:String(sub.modifiedByUser?.displayName||''),version:sub.version??null,url:'https://3d.nih.gov/entries/'+acc,route:route(entry),citation:meta.attributionInstructions||null,description:String(meta.description||'').slice(0,350),files:files.slice(0,15)});
 }catch(e){errors.push({id,error:String(e?.message||e).slice(0,120)});}
 if(id%10===0)await wait(100);
}
await mkdir(catalog,{recursive:true});
const range=start+'-'+end;
const eligible=found.filter(x=>x.license&&x.route&&x.files.length);
await writeFile(catalog+'entries-'+range+'.json',JSON.stringify({source:'NIH 3D',terms:'https://3d.nih.gov/terms',date:new Date().toISOString(),range:{start,end},totalEntries:found.length,eligible:eligible.length,items:found,errors},null,2)+'\n');
console.log('AUDIT',JSON.stringify({range,found:found.length,eligible:eligible.length,licenseCounts:Object.fromEntries([...new Set(found.map(x=>x.licenseRaw))].map(x=>[x,found.filter(y=>y.licenseRaw===x).length])),sample:found.filter(x=>x.route).slice(0,8).map(x=>({title:x.title,cat:x.category,license:x.licenseRaw,files:x.files.length})),errors:errors.length}));
if(argv.includes('--audit-only'))process.exit(0);
const candidates=eligible.filter(x=>relevant.test(x.title)&&x.files.some(f=>f.format==='GLB'||f.format==='STL')).sort((a,b)=>Number(b.files.some(f=>f.format==='GLB'))-Number(a.files.some(f=>f.format==='GLB'))||a.entryId-b.entryId);
const imported=[];
for(const row of candidates){
 if(imported.length>=limit)break;
 const f=row.files.filter(x=>['GLB','STL'].includes(x.format)).sort((a,b)=>Number(b.format==='GLB')-Number(a.format==='GLB')).find(x=>!x.size||Number(x.size)<=maxBytes);
 if(!f)continue;
 try{
  const response=await fetch(f.url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('Download HTTP '+response.status);
  if(Number(response.headers.get('content-length')||0)>maxBytes)throw Error('File size budget exceeded');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<84||bytes.length>maxBytes)throw Error('Invalid size '+bytes.length);
  if(f.format==='GLB'&&(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length))throw Error('Invalid GLB');
  if(f.format==='STL'&&bytes.readUInt32LE(80)*50+84!==bytes.length&&!bytes.toString('ascii',0,5).toLowerCase().startsWith('solid'))throw Error('Invalid STL');
  const dest=row.route+'nih3d-'+String(row.entryId).padStart(6,'0')+'.'+f.format.toLowerCase();
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest+'.incoming',bytes);await rename(dest+'.incoming',dest);
  imported.push({entryId:row.entryId,accession:row.accession,title:row.title,originalUrl:row.url,sourceFileUrl:f.url,path:dest,format:f.format,license:row.license,licenseExact:row.licenseRaw,creator:row.creator,citation:row.citation,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),status:'research-only; not clinically validated'});
  console.log('VERIFIED',row.accession,row.title,bytes.length,row.license);
 }catch(e){errors.push({id:row.entryId,assetError:String(e.message).slice(0,140)});}
}
for(const dir of [base,cockpit]){
 const models=imported.filter(x=>x.path.startsWith(dir));
 if(models.length)await writeFile(dir+'manifest-'+range+'.json',JSON.stringify({source:'NIH 3D',licenseChecked:true,clinicalApproval:false,models},null,2)+'\n');
 console.log('ROUTE',dir,models.length);
}
await writeFile(catalog+'results-'+range+'.json',JSON.stringify({range,imported,errors},null,2)+'\n');
console.log('SUCCESS NIH_BATCH',JSON.stringify({scanned:end-start+1,found:found.length,eligible:eligible.length,imported:imported.length,errors:errors.length}));
