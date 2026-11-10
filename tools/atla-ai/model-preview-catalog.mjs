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
  nih:Object.freeze({prefix:NIH_PREFIX,label:'NIH 3D',pathKey:'path',hashKey:'sha256',status:NIH_STATUS})
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
  anatomyResearch:new URL('tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json',root)
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
export const toolOptions=Object.freeze({anatomy:'Anatomy Lab'});

/**
 * Compatibility adapter for the ONE shared registry. Legacy source manifest
 * helpers above remain available for reproducible upstream/build tests only.
 * The learner browser must not fetch seven unrelated source catalogs.
 */
const sharedSourceConfig=Object.freeze({
 hra:{tool:'anatomy',type:'primary'},
 'z-anatomy':{tool:'anatomy',type:'research'},
 nih3d:{tool:'anatomy',type:'nih'}
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

/** Which library source each viewer collection shows. */
const LIBRARY_SOURCES=Object.freeze({
 anatomy:Object.freeze({primary:'hra',research:'z-anatomy'})
});
/** One collection of the shared 3D library in the viewer's asset shape: every tool reads the same registry. */
export function libraryAssets(library,tool,sourceType){
 if(sourceType==='nih')return nihAssetsFromLibrary(library,tool);
 const source=LIBRARY_SOURCES[tool]?.[sourceType],cfg=configurations[tool]?.[sourceType==='secondary'&&tool==='anatomy'?'research':sourceType];
 if(!source||!cfg)throw Error('Unknown 3D collection');
 const assets=(library?.models??[]).filter(m=>m.source===source&&m.delivery&&m.viewable!==false&&m.clinicalUseApproved===false)
  .map(m=>({[cfg.pathKey]:m.delivery.path,[cfg.hashKey]:m.delivery.sha256,bytes:m.delivery.bytes,name:m.label,
   region:m.region??'',license:m.license}));
 return {assets};
}
/** Viewer tool and collection for each library source. */
const VIEWER_COLLECTION=Object.freeze({
 nih3d:['anatomy','nih'],hra:['anatomy','primary'],'z-anatomy':['anatomy','secondary']
});
const SOURCE_NAMES=Object.freeze({nih3d:'NIH 3D',hra:'HRA / HuBMAP','z-anatomy':'Z-Anatomy',bp3d:'BodyParts3D'});
/** Body regions that branch the library, and which region each anatomical structure belongs to. */
export const REGIONS=Object.freeze({head:'Κεφαλή και εγκέφαλος',spine:'Σπονδυλική στήλη και νωτιαίος μυελός',chest:'Θώρακας και αναπνευστικό',
 heart:'Καρδιά και αγγεία',abdomen:'Κοιλία και νεφροί',pelvis:'Πύελος και ουρογεννητικό',upper:'Άνω άκρο',lower:'Κάτω άκρο',
 body:'Ολόκληρο σώμα και συστήματα',other:'Δέρμα, λεμφικό και λοιπά'});
const STRUCTURE_REGION=Object.freeze(Object.fromEntries(Object.entries({
 head:['skull','face','jaw','brain','brain-ventricles','corpus-callosum','medulla-oblongata','eye','nose'],
 spine:['cervical-spine','thoracic-spine','lumbar-spine','lumbar-vertebra','spine','spinal-cord'],
 chest:['lung','trachea','bronchi','larynx','upper-airway','ribs','sternum','thymus'],
 heart:['heart','aorta','coronary'],abdomen:['liver','spleen','stomach','kidney','renal-pelvis'],
 pelvis:['pelvis','hip','sacrum','bladder','uterus','ovary','placenta'],
 upper:['humerus','shoulder','clavicle','scapula','elbow','forearm','wrist','scaphoid','hand'],
 lower:['femur','tibia','fibula','patella','knee','ankle','calcaneus','talus','foot'],body:['skeleton']
}).flatMap(([region,ids])=>ids.map(id=>[id,region]))));
// HRA organs carry no structure ids, so their file names place them.
const HRA_REGION=[[/Brain|Eye/,'head'],[/Spinal_Cord/,'spine'],[/Lung|Thymus/,'chest'],[/Heart|Vasculature/,'heart'],
 [/Liver|Spleen|Pancreas|Intestine|Kidney/,'abdomen'],[/Pelvis|Bladder|Uterus|Ovary|Fallopian|Prostate|Urethra|Ureter|Placenta/,'pelvis'],
 [/Knee/,'lower']];
export const FINDINGS=Object.freeze({fracture:'Κατάγματα',dislocation:'Εξαρθρήματα',aneurysm:'Ανευρύσματα',dissection:'Διαχωρισμός αορτής',
 scoliosis:'Σκολίωση',tetralogy:'Συγγενείς καρδιοπάθειες'});
const regionOf=m=>m.source==='hra'?(HRA_REGION.find(([re])=>re.test(m.delivery.path))?.[1]??'other')
 :m.source==='z-anatomy'?'body':(m.structures??[]).map(id=>STRUCTURE_REGION[id]).find(Boolean)??'other';
/** Where a model sits in the library tree: section, branch and, for large branches, a sub-branch. */
function placeOf(m,group){
 if(group==='anatomy')return {branch:regionOf(m),branchLabel:REGIONS[regionOf(m)]};
 if(group==='pathology'){
  const region=regionOf(m);
  return {branch:m.finding??'other',branchLabel:FINDINGS[m.finding]??'Λοιπά ευρήματα',sub:region,subLabel:REGIONS[region]};
 }
 if(group==='simulation')return m.source==='patients'?{branch:'patients',branchLabel:'Ασθενείς'}:{branch:'body',branchLabel:'Ανθρώπινο σώμα και κινήσεις'};
 const category=String(m.category||'Λοιπά');
 return {branch:category,branchLabel:category==='Ανατομία'?'Άλλα ανατομικά και παθολογικά':category};
}
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
  entries.push({id:m.source+':'+(m.accession??m.delivery.path),label:m.label,source:m.source,sourceLabel:SOURCE_NAMES[m.source],group,...placeOf(m,group),
   terms,bytes:m.delivery.bytes,restriction:m.restriction??null,href:viewer+'?'+params,
   search:fold([m.label,m.originalTitle,SOURCE_NAMES[m.source],...terms].join(' '))});
 }
 for(const a of library?.atlases??[])entries.push({id:'atlas:'+a.id,label:a.label,source:'bp3d',sourceLabel:SOURCE_NAMES.bp3d,group:'atlas',branch:'bp3d',branchLabel:'BodyParts3D',
  terms:[],bytes:null,restriction:null,href:atlas,search:fold(a.label+' '+SOURCE_NAMES.bp3d+' ατλαντας')});
 const order={atlas:0,anatomy:1,pathology:2,simulation:3,science:4};
 return entries.sort((a,b)=>order[a.group]-order[b.group]||a.label.localeCompare(b.label,'el'));
}
export const searchKey=fold;

