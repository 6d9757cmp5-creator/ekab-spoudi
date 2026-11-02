#!/usr/bin/env node
/** Bounded verification of two small original files served by NIH3D. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';

const base='tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json';
const output='docs/ATLA_NIH3D_LIVE_ORIGINAL_PROBE_2026.json';
const origin='https://6d9757cmp5-creator.github.io';
const parsed=JSON.parse(await readFile(base,'utf8'));
const wanted=[{id:12,format:'GLB'},{id:170,format:'STL'}];
const record={schemaVersion:1,scope:'TWO_REAL_NIH_ORIGINAL_SOURCE_FILES',binaryArchiveComplete:false,
 independentlyVerifiedAllFiles:false,downloadedTotalBytes:0,tests:[]};
for(const target of wanted){
 const e=(parsed.items??[]).find(x=>x.entryId===target.id);
 const candidates=(e?.files??[]).filter(x=>x.format===target.format&&Number(x.size)>0&&Number(x.size)<500000)
  .sort((a,b)=>Number(a.size)-Number(b.size));
 const asset=candidates[0];
 if(!asset)throw Error('Missing bounded source fixture for NIH entry '+target.id);
 const probe={accession:e.accession,title:e.title,format:target.format,sourceUrl:asset.url,
  catalogBytes:Number(asset.size),actualBytes:null,sha256:null,httpStatus:null,
  formatValidated:false,status:'FAILED',error:null,corsAllowOrigin:null,browserCrossOriginAllowed:false};
 try{
  const res=await fetch(asset.url,{headers:{Accept:'application/octet-stream',Origin:origin},signal:AbortSignal.timeout(30000)});
  probe.corsAllowOrigin=res.headers.get('access-control-allow-origin');
  probe.browserCrossOriginAllowed=probe.corsAllowOrigin==='*'||probe.corsAllowOrigin===origin;
  probe.httpStatus=res.status;
  if(!res.ok)throw Error('Original source HTTP '+res.status);
  let length=0;
  const chunks=[];
  for await(const chunk of res.body){
   length+=chunk.byteLength;
   if(length>1048576)throw Error('Original exceeds bounded probe limit');
   chunks.push(Buffer.from(chunk));
  }
  const buf=Buffer.concat(chunks);
  if(buf.length<84)throw Error('Unreasonably small binary');
  const glb=target.format==='GLB'&&buf.subarray(0,4).toString('ascii')==='glTF'
    &&buf.readUInt32LE(4)===2&&buf.readUInt32LE(8)===buf.length;
  const stl=target.format==='STL'&&(buf.readUInt32LE(80)*50+84===buf.length
    ||buf.subarray(0,5).toString('ascii').toLowerCase()==='solid');
  if(!glb&&!stl)throw Error('Original file format signature failed');
  probe.actualBytes=buf.length;
  probe.sha256=createHash('sha256').update(buf).digest('hex');
  probe.formatValidated=true;
  probe.status=buf.length===probe.catalogBytes?'SOURCE_BYTES_VERIFIED':'LIVE_SOURCE_CHANGED';
  record.downloadedTotalBytes+=buf.length;
 }catch(error){probe.error=String(error.message??error).slice(0,240);}
 record.tests.push(probe);
}
record.liveMetadata=null;
try{
 const response=await fetch('https://3d.nih.gov/api/entries/10',{headers:{Accept:'application/json',Origin:origin},signal:AbortSignal.timeout(30000)});
 const allow=response.headers.get('access-control-allow-origin');
 const metadata={httpStatus:response.status,corsAllowOrigin:allow,browserCrossOriginAllowed:allow==='*'||allow===origin,publishedSubmissionFound:false,error:null};
 if(response.ok){const data=await response.json();metadata.publishedSubmissionFound=(data.submissions??[]).some(s=>String(s.submissionStatus).toLowerCase()==='published');}
 else metadata.error='NIH API HTTP '+response.status;
 record.liveMetadata=metadata;
}catch(error){record.liveMetadata={error:String(error.message??error),browserCrossOriginAllowed:false};}
record.successful=record.tests.filter(x=>x.formatValidated).length;
record.failures=record.tests.filter(x=>!x.formatValidated).length;
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({successful:record.successful,failures:record.failures,bytes:record.downloadedTotalBytes}));
if(record.failures)process.exitCode=1;
