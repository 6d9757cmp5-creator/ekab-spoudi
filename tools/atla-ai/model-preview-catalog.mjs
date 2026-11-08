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
/** Which library source each viewer collection shows. */
const LIBRARY_SOURCES=Object.freeze({
 anatomy:Object.freeze({primary:'hra',research:'z-anatomy'}),
 cockpit:Object.freeze({primary:'quaternius',patients:'patients',makehuman:'makehuman',rigged:'makehuman-rigged'})
});
/** One collection of the shared 3D library in the viewer's asset shape: every tool reads the same registry. */
export function libraryAssets(library,tool,sourceType){
 if(sourceType==='nih')return nihAssetsFromLibrary(library,tool);
 const source=LIBRARY_SOURCES[tool]?.[sourceType],cfg=configurations[tool]?.[sourceType];
 if(!source||!cfg)throw Error('Unknown 3D collection');
 const assets=(library?.models??[]).filter(m=>m.source===source&&m.delivery&&m.viewable!==false&&m.clinicalUseApproved===false)
  .map(m=>({[cfg.pathKey]:m.delivery.path,[cfg.hashKey]:m.delivery.sha256,bytes:m.delivery.bytes,name:m.label,
   region:m.region??'',license:m.license}));
 return {assets};
}
/** Viewer tool and collection for each library source. */
const VIEWER_COLLECTION=Object.freeze({
 nih3d:['anatomy','nih'],hra:['anatomy','primary'],'z-anatomy':['anatomy','secondary'],
 quaternius:['cockpit','primary'],patients:['cockpit','secondary'],makehuman:['cockpit','makehuman'],'makehuman-rigged':['cockpit','rigged']
});
const SOURCE_NAMES=Object.freeze({nih3d:'NIH 3D',hra:'HRA / HuBMAP','z-anatomy':'Z-Anatomy',quaternius:'Quaternius',patients:'Στατικοί ασθενείς',
 makehuman:'MakeHuman','makehuman-rigged':'MakeHuman με σκελετό',bp3d:'BodyParts3D'});
const fold=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/ς/g,'σ');
/**
 * Every model of the shared 3D library as one list for the library page: what it is called, which
 * group it belongs to and the viewer address that opens it. Atlases open in the full atlas.
 */
export function libraryEntries(library,{viewer='atla-resource-preview.html',atlas='anatomy-full-atlas.html',from=''}={}){
 const structures=library?.vocabulary?.structures??{},findings=library?.vocabulary?.findings??{};
 const entries=[];
 for(const m of library?.models??[]){
  const collection=VIEWER_COLLECTION[m.source];
  if(!collection||!m.delivery||m.viewable===false||m.clinicalUseApproved!==false)continue;
  if(m.source==='nih3d'&&!m.surfaces?.includes('library'))continue;
  const [tool,dataset]=collection;
  const group=m.source==='nih3d'?(m.kind==='pathology'?'pathology':m.kind==='anatomy'?'anatomy':'science')
   :tool==='cockpit'?'simulation':'anatomy';
  const terms=[...(m.structures??[]).map(id=>structures[id]?.greek),findings[m.finding]?.greek].filter(Boolean);
  const params=new URLSearchParams({tool,dataset,model:m.source==='nih3d'?m.accession:m.delivery.path});
  if(from)params.set('from',from);
  entries.push({id:m.source+':'+(m.accession??m.delivery.path),label:m.label,source:m.source,sourceLabel:SOURCE_NAMES[m.source],group,
   terms,bytes:m.delivery.bytes,restriction:m.restriction??null,href:viewer+'?'+params,
   search:fold([m.label,m.originalTitle,SOURCE_NAMES[m.source],...terms].join(' '))});
 }
 for(const a of library?.atlases??[])entries.push({id:'atlas:'+a.id,label:a.label,source:'bp3d',sourceLabel:SOURCE_NAMES.bp3d,group:'atlas',
  terms:[],bytes:null,restriction:null,href:atlas,search:fold(a.label+' '+SOURCE_NAMES.bp3d+' ατλαντας')});
 const order={atlas:0,anatomy:1,pathology:2,simulation:3,science:4};
 return entries.sort((a,b)=>order[a.group]-order[b.group]||a.label.localeCompare(b.label,'el'));
}
export const searchKey=fold;
export const toolOptions=Object.freeze({anatomy:'Anatomy Lab',cockpit:'Κλινικός Προσομοιωτής'});
