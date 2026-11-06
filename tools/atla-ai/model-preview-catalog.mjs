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
