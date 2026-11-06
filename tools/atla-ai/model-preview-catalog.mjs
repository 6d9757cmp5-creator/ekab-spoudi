/**
 * ATLA source-model registry. Research files are never silently enabled in clinical simulations.
 * Existing Anatomy Lab, Clinical Cockpit, BodyParts3D and NIH assets are kept separate.
 */
const NIH_PREFIX='tools/atla-ai/resources/nih3d-library/models/';
const NIH_STATUS='Πρωτότυπο NIH 3D από το αρχείο μας · χωρίς κλινική επικύρωση';
const configurations=Object.freeze({
 anatomy:Object.freeze({
  primary:Object.freeze({prefix:'tools/anatomy-3d/resources/hra-v1.2/',label:'HRA/HuBMAP',pathKey:'output',hashKey:'sha256',status:'HRA source, not clinically validated'}),
  nih:Object.freeze({prefix:NIH_PREFIX,label:'NIH 3D',pathKey:'path',hashKey:'sha256',status:NIH_STATUS}),
  research:Object.freeze({prefix:'tools/anatomy-3d/resources/z-anatomy-research/',label:'Z-Anatomy (research only)',pathKey:'path',hashKey:'sha256',status:'NC-SA research model, not cleared for live use'})
 }),
 cockpit:Object.freeze({
  nih:Object.freeze({prefix:NIH_PREFIX,label:'NIH 3D',pathKey:'path',hashKey:'sha256',status:NIH_STATUS}),
  primary:Object.freeze({prefix:'tools/patient-simulator/resources/quaternius/',label:'Quaternius',pathKey:'path',hashKey:'sha256',status:'Character/animation research, not a clinical patient'}),
  patients:Object.freeze({prefix:'tools/patient-simulator/assets/patients/',label:'Existing static patients',pathKey:'path',hashKey:'gitBlobSha',status:'Static CC0 patient pose, not a rig or clinical simulation'}),
  makehuman:Object.freeze({prefix:'tools/patient-simulator/resources/makehuman/',label:'MakeHuman source geometry',pathKey:'path',hashKey:'sha256',extension:'.obj',status:'Unrigged source OBJ - not a prepared animated patient'}),
  rigged:Object.freeze({prefix:'tools/patient-simulator/assets/patients/',label:'Rigged CC0 MakeHuman educational actor',pathKey:'path',hashKey:'sha256',status:'Real skinned/animated source demonstrator; not physiologically or clinically validated'})
 })
});
const cleanName=name=>String(name||'').replace(/\.glb$/i,'').replace(/_/g,' ').trim();
const allowedPath=(path,prefix,extension='.glb')=>typeof path==='string'&&path.startsWith(prefix)&&path.endsWith(extension)&&
 /^[A-Za-z0-9/_.-]+$/.test(path)&&!path.includes('..')&&!path.includes('//');
export function buildModelList(tool,raw,sourceType='primary'){
 const cfg=configurations[tool]?.[sourceType];
 if(!cfg||!raw||!Array.isArray(raw.assets||raw.files))throw Error('Invalid 3D resource registry');
 const listed=[],seen=new Set();
 for(const asset of (raw.assets||raw.files)){
  const path=asset[cfg.pathKey];
  if(!allowedPath(path,cfg.prefix,cfg.extension)||seen.has(path))continue;
  const originalSHA=String(asset[cfg.hashKey]||'');
  if(cfg.hashKey==='gitBlobSha'?!/^[a-f0-9]{40}$/i.test(originalSHA):!/^[a-f0-9]{64}$/i.test(originalSHA))continue;
  const bytes=Number(asset.bytes??asset.size);
  if(!Number.isSafeInteger(bytes)||bytes<1000||bytes>250*1048576)continue;
  seen.add(path);
  listed.push({
   id:path,label:cleanName(asset.name||path.split('/').pop()),path,bytes,sourceType,format:(cfg.extension||'.glb').slice(1),
   region:String(asset.region||'').slice(0,45),
   status:cfg.status,license:String(asset.license||raw.license||raw.sourceLicense||'').slice(0,100),
   integrity:{algorithm:cfg.hashKey,value:originalSHA.toLowerCase()},
   details:asset.details??null,
   clinicallyValidated:false
  });
 }
 return listed.sort((a,b)=>a.label.localeCompare(b.label,'el'));
}
export function getResourceCatalogUrls(rootUrl){
 const root=new URL(rootUrl);
 if(!['http:','https:'].includes(root.protocol))throw Error('Invalid site base');
 return {
  library:new URL('tools/atla-ai/resources/model-library.json',root),
  anatomy:new URL('tools/anatomy-3d/resources/imported-manifest.json',root),
  anatomyResearch:new URL('tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json',root),
  cockpit:new URL('tools/patient-simulator/resources/quaternius/imported-manifest.json',root),
  cockpitPatients:new URL('tools/patient-simulator/assets/patients/preview-manifest.json',root),
  cockpitMakehumanCore:new URL('tools/patient-simulator/resources/makehuman/imported-manifest.json',root),
  cockpitMakehumanSupplemental:new URL('tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json',root),
  cockpitRigged:new URL('tools/patient-simulator/assets/patients/atla-makehuman-rigged-manifest.json',root)
 };
}
export function safeAssetUrl(item,tool,rootUrl){
 const cfg=configurations[tool]?.[item?.sourceType||'primary'];
 if(!cfg||!allowedPath(item?.path,cfg.prefix,cfg.extension))throw Error('Disallowed model source');
 const root=new URL(rootUrl);
 if(!['https:','http:'].includes(root.protocol))throw Error('Invalid site URL');
 const out=new URL(item.path,root);
 if(out.origin!==root.origin||!out.pathname.startsWith(new URL(cfg.prefix,root).pathname))throw Error('Disallowed source location');
 return out;
}
/** NIH models of the shared library that a tool may list, in the viewer's asset shape. */
export function nihAssetsFromLibrary(library,tool){
 const surface=tool==='cockpit'?'cockpit':'library';
 const assets=(library?.models??[]).filter(m=>m.source==='nih3d'&&m.delivery&&m.clinicalUseApproved===false&&m.surfaces?.includes(surface))
  .map(m=>({path:m.delivery.path,bytes:m.delivery.bytes,sha256:m.delivery.sha256,name:m.label,license:m.license,details:{
   accession:m.accession,originalTitle:m.originalTitle,category:m.category,originalPage:m.originalPage,sourceVersion:m.sourceVersion,
   creator:m.creator,restriction:m.restriction,license:m.license,rightsBasis:m.rightsBasis,kind:m.kind,greekStructures:(m.structures??[]).map(id=>library.vocabulary.structures[id]?.greek).filter(Boolean)
  }}));
 return {assets};
}
export const toolOptions=Object.freeze({anatomy:'Anatomy Lab',cockpit:'Κλινικός Προσομοιωτής'});

/**
 * Compatibility adapter for the ONE shared registry. Legacy source manifest
 * helpers above remain available for reproducible upstream/build tests only.
 * The learner browser must not fetch seven unrelated source catalogs.
 */
const sharedSourceConfig=Object.freeze({
 hra:{tool:'anatomy',type:'primary'},
 'z-anatomy':{tool:'anatomy',type:'research'},
 nih3d:{tool:'anatomy',type:'nih'},
 quaternius:{tool:'cockpit',type:'primary'},
 patients:{tool:'cockpit',type:'patients'},
 makehuman:{tool:'cockpit',type:'makehuman'},
 'makehuman-rigged':{tool:'cockpit',type:'rigged'}
});
export function sharedRegistryAssets(library,{tool='anatomy',dataset='primary'}={}){
 if(!Array.isArray(library?.models))throw Error('Invalid central 3D library');
 const all=dataset==='all';
 const result=[];
 for(const m of library.models){
  const route=sharedSourceConfig[m?.source];
  if(!route)continue;
  if(!all&&!(dataset==='nih'?m.source==='nih3d':
    (route.tool===tool&&route.type===(dataset==='secondary'?(tool==='anatomy'?'research':'patients'):dataset))))continue;
  const cfg=configurations[route.tool]?.[route.type];
  const d=m.delivery;
  // NIH playback remains scoped by the existing explicit library/cockpit eligibility.
  const surface=tool==='cockpit'?'cockpit':'library';
  const eligible=m.source!=='nih3d'||m.surfaces?.includes(surface)||(all&&m.surfaces?.includes('library'));
  const path=d?.path;
  const extension=cfg?.extension||'.glb';
  const legacyGitBlob=m.source==='patients'&&/^[a-f0-9]{40}$/i.test(d?.sha256||'');
  const valid=eligible&&allowedPath(path,cfg?.prefix||'',extension)&&
   (/^[a-f0-9]{64}$/i.test(d?.sha256||'')||legacyGitBlob)&&
   Number.isSafeInteger(d?.bytes)&&d.bytes>=1000&&d.bytes<=250*1048576;
  // Keep unavailable items visible in the full inventory, but never downloadable.
  if(!valid&&!all)continue;
  const type=route.type;
  result.push({
   id:String(m.id||''),source:m.source,tool:route.tool,
   sourceType:type,label:cleanName(m.label||m.id),path:valid?path:null,
   bytes:valid?d.bytes:0,format:extension.slice(1),
   status:valid?(m.restriction?'Περιορισμένη προβολή · '+m.restriction:'Διαθέσιμο από το κοινό μητρώο'):
    'Μόνο καταχώριση · το πρωτότυπο δεν είναι διαθέσιμο για προβολή',
   license:String(m.license||'').slice(0,150),
   integrity:valid?{algorithm:legacyGitBlob?'gitBlobSha':'sha256',value:d.sha256.toLowerCase()}:null,
   available:Boolean(valid),
   details:{
    accession:m.accession||m.id,originalTitle:m.originalTitle||m.label,
    category:m.category,originalPage:m.originalPage,sourceVersion:m.sourceVersion,
    creator:m.creator,restriction:m.restriction,license:m.license,
    rightsBasis:m.rightsBasis,kind:m.kind,
    greekStructures:(m.structures||[]).map(id=>library.vocabulary?.structures?.[id]?.greek).filter(Boolean)
   },clinicallyValidated:false
  });
 }
 return result.sort((a,b)=>a.label.localeCompare(b.label,'el')||a.id.localeCompare(b.id));
}
