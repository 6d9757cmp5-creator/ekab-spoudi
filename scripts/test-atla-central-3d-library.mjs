import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {audit3DLibrary,proposeBodyComposition,choose3DQuality,search3DModels,LIBRARY_HEADING,studyScope3D} from '../tools/atla-ai/central-3d-library.mjs';
const data=JSON.parse(readFileSync('tools/atla-ai/resources/model-library.json','utf8'));
test('one canonical 3D library covers stored models and BodyParts3D atlases',()=>{
 const audit=audit3DLibrary(data);
 assert.equal(LIBRARY_HEADING,'Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων');
 assert.equal(audit.models,data.models.length);
 assert.equal(audit.atlases,2);
 assert(audit.bySource.hra>=50);
 assert(audit.bySource.nih3d>0);
 assert.equal(audit.scientificClaimsMade,false);
});
test('adaptive quality responds to small mobiles, constrained networks and desktops',()=>{
 const low=choose3DQuality({deviceMemory:1,saveData:true,viewportWidth:375,pixelRatio:3});
 const high=choose3DQuality({deviceMemory:16,hardwareConcurrency:12,viewportWidth:1440,pixelRatio:2});
 assert.equal(low.tier,'οικονομική');assert(low.pixelRatio<=1);
 assert.equal(high.tier,'υψηλή');assert(high.pixelRatio<=1.8);
 assert(low.maxRecommendedBytes<high.maxRecommendedBytes);
 assert.equal(low.recommendedAtlas,'bp3d40');
 assert.equal(high.recommendedAtlas,'bp3d43');
});
test('intelligent human-body composition uses original HRA assets and refuses unregistered overlay',()=>{
 const plan=proposeBodyComposition(data,{sex:'male'});
 assert(plan.parts.some(p=>p.source==='BodyParts3D'));
 assert(plan.parts.some(p=>p.role==='Καρδιά'&&p.source==='HRA/HuBMAP'));
 assert(plan.parts.some(p=>p.role==='Αιμοφόρα αγγεία'&&p.source==='HRA/HuBMAP'));
 assert.equal(plan.canAssemble,false,'The original datasets have no validated common placement frame');
 assert.equal(plan.status,'registration-required');
 const names=plan.parts.map(x=>x.id);
 assert.equal(new Set(names).size,3);
});
test('composition only activates for explicit complete finite transforms in a shared millimeter frame',()=>{
 const entries=[
  {id:'heart',source:'hra',label:'Heart',delivery:{path:'tools/anatomy-3d/resources/hra-v1.2/thorax/VH_M_Heart.glb',sha256:'a'.repeat(64),bytes:2000}},
  {id:'vessels',source:'hra',label:'Blood Vasculature',delivery:{path:'tools/anatomy-3d/resources/hra-v1.2/cardiovascular/VH_M_Blood_Vasculature.glb',sha256:'b'.repeat(64),bytes:2000}}
 ];
 const atlas={id:'bp3d43',label:'BodyParts3D 4.3'};
 const fake={models:entries,atlases:[atlas]};
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 for(const candidate of [atlas,...entries])candidate.composition={registrationVerified:true,coordinateFrame:'frame-1',unit:'mm',transform:matrix};
 assert.equal(proposeBodyComposition(fake).canAssemble,true);
 entries[1].composition.coordinateFrame='different';
 assert.equal(proposeBodyComposition(fake).canAssemble,false);
 entries[1].composition.coordinateFrame='frame-1';
 entries[1].composition.transform=[...matrix.slice(0,15),NaN];
 assert.equal(proposeBodyComposition(fake).canAssemble,false);
});
test('search across the original shared manifest without edits or duplicate copies',()=>{
 const source=JSON.stringify(data);
 const hits=search3DModels(data,{source:'hra',text:'heart'});
 assert(hits.length>=1);
 assert(hits.every(x=>x.source==='hra'));
 assert.equal(JSON.stringify(data),source);
});

test('curated categories retain all original registry records',()=>{
 const scopes={anatomy:0,pathology:0,research:0};
 for(const m of data.models)scopes[studyScope3D(m)]++;
 assert.deepEqual(scopes,{anatomy:264,pathology:98,research:178});
 assert.equal(Object.values(scopes).reduce((a,b)=>a+b,0),data.models.length);
 assert.equal(studyScope3D(data.models.find(x=>x.id==='3DPX-000168')),'anatomy');
 assert.equal(studyScope3D({source:'nih3d',details:{kind:'pathology'}}),'pathology');
 assert.equal(studyScope3D({source:'nih3d',details:{kind:null}}),'research');
});
