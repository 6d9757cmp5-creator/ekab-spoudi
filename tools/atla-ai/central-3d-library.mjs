/**
 * ATLA — Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων.
 * Inspect the existing single registry. No network, uploads, destructive deduplication,
 * grading writes or implied clinical approval. Import pipelines own source verification.
 */
const SHA256=/^[a-f0-9]{64}$/i;
const ALLOWED_PATH=/^[A-Za-z0-9/_.-]+$/;
const bytesOK=x=>Number.isSafeInteger(x)&&x>=1000&&x<=250*1024*1024;
const simple=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/ς/g,'σ').replace(/[_-]+/g,' ').trim();
const deliveryOK=(d,source='')=>Boolean(d&&typeof d.path==='string'&&
 ALLOWED_PATH.test(d.path)&&!d.path.startsWith('/')&&!d.path.includes('..')&&!d.path.includes('//')&&
 /\.(?:glb|obj)$/i.test(d.path)&&bytesOK(d.bytes)&&(SHA256.test(d.sha256||'')||(source==='patients'&&/^[a-f0-9]{40}$/i.test(d.sha256||''))));
const knownSources=Object.freeze({
 nih3d:'NIH 3D',hra:'HRA/HuBMAP','z-anatomy':'Z-Anatomy',
 quaternius:'Quaternius',patients:'Ασθενείς CC0',makehuman:'MakeHuman',
 'makehuman-rigged':'MakeHuman με σκελετό'
});
export const LIBRARY_HEADING='Κεντρική Βιβλιοθήκη Τρισδιάστατων Μοντέλων';
export const APPROVED_MODEL_SOURCES=knownSources;
/** Automated source/metadata integrity inspection; never mutate originals. */
export function audit3DLibrary(library){
 if(!library||!Array.isArray(library.models)||!Array.isArray(library.atlases))throw Error('Άκυρο κεντρικό μητρώο 3D.');
 const ids=new Set(),shaSeen=new Map(),statuses=[],duplicateContent=[];
 const bySource={};
 for(const m of library.models){
  const id=String(m?.id||'');
  const source=String(m?.source||'');
  const sourceKnown=Object.hasOwn(knownSources,source);
  const duplicateId=!id||ids.has(id);
  ids.add(id);
  const validDelivery=deliveryOK(m?.delivery,source);
  const missingRights=!String(m?.license||'').trim();
  const anomaly=!sourceKnown||duplicateId||missingRights||(m?.delivery!=null&&!validDelivery);
  const restricted=Boolean(m?.restrictionCode||source==='z-anatomy');
  const state=anomaly?'invalid':!validDelivery?'metadata-only':restricted?'restricted':'ready';
  statuses.push({id,source,state,label:String(m?.label||''),bytes:validDelivery?m.delivery.bytes:0});
  bySource[source]=(bySource[source]||0)+1;
  if(validDelivery){
   const sha=(source==='patients'?'gitblob:':'sha256:')+m.delivery.sha256.toLowerCase();
   if(shaSeen.has(sha))duplicateContent.push({first:shaSeen.get(sha),second:id,sha256:sha});
   else shaSeen.set(sha,id);
  }
 }
 const totals={ready:0,restricted:0,'metadata-only':0,invalid:0};
 for(const s of statuses)totals[s.state]++;
 return {
  models:statuses.length,atlases:library.atlases.length,bySource,
  totals,duplicateContent,duplicateIds:statuses.filter(s=>s.state==='invalid').length,
  scientificClaimsMade:false
 };
}
/** Only existing manifest entries are candidates; no inferred physical registration. */
export function proposeBodyComposition(library,{sex='male'}={}){
 if(!library||!Array.isArray(library.models)||!Array.isArray(library.atlases))throw Error('Άκυρο κεντρικό μητρώο 3D.');
 const s=sex==='female'?'F':'M';
 const atlas=library.atlases.find(a=>a.id==='bp3d43')||library.atlases.find(a=>a.id==='bp3d40');
 const hra=library.models.filter(m=>m.source==='hra'&&deliveryOK(m.delivery));
 const find=part=>hra.find(m=>new RegExp('(?:^|/)VH_'+s+'_'+part+'\\.glb$','i').test(m.delivery.path));
 const heart=find('Heart'),vessels=find('Blood_Vasculature');
 const parts=[
  {role:'Σκελετός και βασική ανατομία',source:'BodyParts3D',id:atlas?.id||null,label:atlas?.label||'Δεν υπάρχει'},
  {role:'Καρδιά',source:'HRA/HuBMAP',id:heart?.id||null,label:heart?.label||'Δεν υπάρχει'},
  {role:'Αιμοφόρα αγγεία',source:'HRA/HuBMAP',id:vessels?.id||null,label:vessels?.label||'Δεν υπάρχει'}
 ];
 const candidatesComplete=parts.every(p=>p.id);
 const candidates=[atlas,heart,vessels];
 const sharedFrame=candidatesComplete&&candidates.every(x=>x?.composition?.registrationVerified===true&&
  typeof x.composition?.coordinateFrame==='string'&&x.composition.coordinateFrame.length>0&&
  x.composition?.unit==='mm'&&x.composition?.transform?.length===16&&
  x.composition.transform.every(Number.isFinite))&&
  candidates.every(x=>x.composition.coordinateFrame===candidates[0].composition.coordinateFrame);
 return {
  sex:s==='F'?'female':'male',parts,candidatesComplete,
  canAssemble:Boolean(sharedFrame),status:!candidatesComplete?'missing-model':
   sharedFrame?'registered':'registration-required',
  message:!candidatesComplete?'Λείπουν ορισμένα ανατομικά δεδομένα από το κοινό μητρώο.':
   sharedFrame?'Διαθέσιμη σύνθεση με επαληθευμένο κοινό σύστημα αναφοράς.':
   'Εντοπίστηκαν υποψήφια μοντέλα. Απαιτείται τεκμηριωμένη αντιστοίχιση κλίμακας, συντεταγμένων και θέσης πριν ενωθούν.'
 };
}
/** Shared adaptive 3D policy; does not alter/decimate original asset files. */
export function choose3DQuality({deviceMemory=null,hardwareConcurrency=null,saveData=false,
 effectiveType='',pixelRatio=1,viewportWidth=1200,reducedMotion=false}={}){
 const memory=Number(deviceMemory),cores=Number(hardwareConcurrency),width=Number(viewportWidth);
 const low=saveData||/^(?:slow-2g|2g|3g)$/i.test(effectiveType)||
  (memory>0&&memory<=2)||(cores>0&&cores<=2)||(width>0&&width<480);
 const medium=!low&&((memory>0&&memory<=4)||(cores>0&&cores<=4)||(width>0&&width<820));
 const tier=low?'οικονομική':medium?'ισορροπημένη':'υψηλή';
 const ratio=Number.isFinite(Number(pixelRatio))?Number(pixelRatio):1;
 const cap=low?1:medium?1.35:1.8;
 return Object.freeze({
  tier,pixelRatio:Math.max(.75,Math.min(cap,ratio||1)),
  targetFps:reducedMotion||low?30:60,
  maxRecommendedBytes:low?15*1048576:medium?45*1048576:90*1048576,
  recommendedAtlas:low||medium?'bp3d40':'bp3d43',
  deferHeavyDownloads:true
 });
}
/** Search never silently promotes metadata-only or restricted models to available. */
export function search3DModels(library,{text='',source='all',limit=50}={}){
 if(!Array.isArray(library?.models))return [];
 const q=simple(text),tokens=q.split(/\s+/).filter(Boolean),max=Math.max(1,Math.min(300,Number(limit)||50));
 return library.models.filter(m=>{
  if(source!=='all'&&m.source!==source)return false;
  if(!tokens.length)return true;
  const hay=simple([m.label,m.originalTitle,m.sourceLabel,m.category,m.id,m.delivery?.path,
   ...(m.structures||[]).map(x=>library.vocabulary?.structures?.[x]?.greek||x)].join(' '));
  return tokens.every(t=>hay.includes(t));
 }).slice(0,max);
}

/** Study scope from source metadata ONLY; never an inferred diagnosis. */
export function studyScope3D(item){
 const kind=item?.kind??item?.details?.kind;
 if(item?.source==='nih3d'&&kind==='anatomy')return 'anatomy';
 if(item?.source==='nih3d'&&kind==='pathology')return 'pathology';
 if(item?.source==='hra')return 'anatomy';
 // Curated atlas entries carry an explicit role (see anatomy-curation.mjs).
 if(item?.source==='z-anatomy'&&kind==='anatomy')return 'anatomy';
 return 'research';
}
