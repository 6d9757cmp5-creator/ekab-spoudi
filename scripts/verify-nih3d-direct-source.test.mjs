import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {segmentForId,sourceFileRefs,normalizeNihEntry,getCataloguedNihEntry,getCurrentNihEntry,selectOriginalFile,getApprovedOriginalSourceLink,getNihEntryWithSafeFallback} from '../tools/atla-ai/nih3d-original-source-gateway.mjs';
assert.equal(segmentForId(1).filename,'entries-1-500.json');
assert.equal(segmentForId(500).filename,'entries-1-500.json');
assert.equal(segmentForId(501).filename,'entries-501-1000.json');
assert.equal(segmentForId(25000).filename,'entries-24501-25000.json');
assert.throws(()=>segmentForId(0),RangeError);
assert.throws(()=>segmentForId(25001),RangeError);
const official='https://3d.nih.gov/api/submissions/30822/runs/abc-123/output-files/814002';
const entry={entryId:10,accession:'3DPX-000010',title:'Visible Male Head',category:'Anatomy',licenseRaw:'Public Domain',
 url:'https://3d.nih.gov/entries/3DPX-000010',files:[
 {format:'GLB',name:'human-head.glb',size:512, url:official},
 {format:'GLB',name:'duplicate.glb',size:512,url:official},
 {format:'GLB',name:'malicious.glb',size:20,url:'https://example.com/fake.glb'},
 {format:'XYZ',name:'not3d.xyz',url:'https://3d.nih.gov/api/submissions/3/runs/abc/output-files/5'}
]};
assert.equal(sourceFileRefs(entry).length,1);
const normalized=normalizeNihEntry(entry);
assert.equal(normalized.id,10);assert.equal(normalized.files.length,1);
assert.equal(normalized.permanentlyMirrored,false);
assert.equal(normalized.scientificReview,'NOT_ESTABLISHED');
assert.equal(normalized.files[0].sha256,null);
assert.equal(selectOriginalFile(normalized),null);
assert.equal(selectOriginalFile({...normalized,scientificReview:'APPROVED_FOR_EDUCATION'}).originalUrl,official);
assert.equal(selectOriginalFile({...normalized,scientificReview:'APPROVED_FOR_EDUCATION'},{maxInlineBytes:20}),null);
assert.equal(getApprovedOriginalSourceLink(normalized),null);
const approved={...normalized,scientificReview:'APPROVED_FOR_EDUCATION'};
const external=getApprovedOriginalSourceLink(approved);
assert.equal(external.href,normalized.originalPage);
assert.equal(external.mode,'external-official-source');
assert.equal(external.inline3DValidated,false);
assert.equal(selectOriginalFile(approved).browserInlineSupported,false);
const hits=[];
const fakeFetch=async url=>{
 hits.push(url);
 if(String(url).endsWith('entries-1-500.json'))return {ok:true,json:async()=>({items:[entry]})};
 if(String(url)==='https://3d.nih.gov/api/entries/10')return {ok:true,json:async()=>({submissions:[
  {submissionStatus:'published',version:4,submissionId:30822,metadata:{title:'Visible Male Head updated',license:'CC BY 4.0'}, workflowRuns:[
   {prefectRunId:'r1',outputFiles:[
    {fileFormat:'GLB',fileId:987,name:'new.glb',fileSize:1024},
    {fileFormat:'STL',fileId:988,name:'new.stl',fileSize:2048}
   ]}
  ]},
  {submissionStatus:'draft',version:5,submissionId:30822,workflowRuns:[]}
 ]})};
 return {ok:false,status:404};
};
const snap=await getCataloguedNihEntry(10,{fetchImpl:fakeFetch,basePath:'/assets'});
assert.equal(snap.files.length,1);
assert.equal(snap.sourceStatus,'catalog_snapshot_not_live_verified');
const safe=await getNihEntryWithSafeFallback(10,{fetchImpl:fakeFetch,basePath:'/assets'});
assert.equal(safe.browserMode,'official-page-link');
assert.equal(safe.liveRefreshAttempted,false);
const failedLive=await getNihEntryWithSafeFallback(10,{basePath:'/assets',requestLiveRefresh:true,fetchImpl:async url=>String(url).includes('/api/entries/')?{ok:false,status:403}:fakeFetch(url)});
assert.equal(failedLive.sourceStatus,'catalog_snapshot_live_refresh_unavailable');
assert.equal(failedLive.liveRefreshAttempted,true);
const current=await getCurrentNihEntry(10,{fetchImpl:fakeFetch,basePath:'/assets'});
assert.equal(current.files.length,2);
assert.equal(current.version,4);
assert.equal(current.sourceStatus,'live_publication_checked');
assert.deepEqual(current.files.map(x=>x.format),['GLB','STL']);
assert.equal(current.originalLicense,'CC BY 4.0');
assert(hits.includes('https://3d.nih.gov/api/entries/10'));
assert.equal(await getCataloguedNihEntry(11,{fetchImpl:fakeFetch,basePath:'/assets'}),null);
await assert.rejects(()=>getCurrentNihEntry(10,{fetchImpl:async url=>String(url).includes('/api/entries/')?{ok:false,status:503}:{ok:true,json:async()=>({items:[entry]})}}),/503/);
const d=mkdtempSync(join(tmpdir(),'atla-source-'));
try{
 const src=join(d,'src'),out=join(d,'report.json');
 mkdirSync(join(src,'segments'),{recursive:true});
 const sample=[entry];
 for(let i=0;i<50;i++){
  const start=1+i*500,end=start+499;
  const items=i===0?sample:[];
  writeFileSync(join(src,'segments',`entries-${start}-${end}.json`),JSON.stringify({range:{start,end},totalEntries:items.length,items}));
 }
 writeFileSync(join(src,'catalog-index.json'),JSON.stringify({status:'TARGET_RANGE_SCANNED',apiErrors:0,verifiedScannedIds:25000,publishedEntriesFound:1}));
 const run=spawnSync(process.execPath,['scripts/verify-nih3d-direct-source.mjs',src,out],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(report.publishedEntries,1);
 assert.equal(report.validatedDirectFileRefs,1);
 assert.equal(report.archivedModelBinariesByThisGateway,0);
 assert.equal(report.sourceSegments,50);
 writeFileSync(join(src,'catalog-index.json'),JSON.stringify({status:'TARGET_RANGE_SCANNED',apiErrors:0,verifiedScannedIds:25000,publishedEntriesFound:7}));
 const bad=spawnSync(process.execPath,['scripts/verify-nih3d-direct-source.mjs',src,out],{encoding:'utf8'});
 assert.notEqual(bad.status,0,'Must refuse fake catalog completion');
 console.log('ATLA NIH 3D direct-source gateway: 20+ assertions passed, full segment fixture checked.');
}finally{rmSync(d,{recursive:true,force:true});}
