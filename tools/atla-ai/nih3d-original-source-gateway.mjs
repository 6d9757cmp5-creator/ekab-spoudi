/**
 * ATLA NIH 3D original-source gateway.
 * Zero duplicate binary hosting: retrieve NIH originals only when the student requests them.
 * Source metadata !== validated clinical model, retrieved original !== permanent archive.
 */
export const NIH_CATALOG_BASE = new URL('./resources/nih3d-master-plan-2026/segments', import.meta.url).href;
export const NIH_SITE = 'https://3d.nih.gov';
export const FORMATS = new Set(['GLB','GLTF','STL','OBJ','X3D','WRL','PLY','3MF']);
const FILE_URL_RE = /^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[^/]+\/output-files\/\d+$/;
const PAGE_URL_RE = /^https:\/\/3d\.nih\.gov\/entries\/3DPX-\d+$/i;
export function segmentForId(value) {
  const id=Number(value);
  if(!Number.isInteger(id)||id<1||id>25000)throw RangeError('NIH entryId must be 1..25000');
  const start=Math.floor((id-1)/500)*500+1;
  return {id,start,end:start+499,filename:`entries-${start}-${start+499}.json`};
}
export function sourceFileRefs(item) {
  if(!item||typeof item!=='object')return [];
  const seen=new Set();
  return (item.files??[]).filter(f=>{
    const format=String(f.format??'').toUpperCase();
    if(!FORMATS.has(format)||!FILE_URL_RE.test(f.url??'')||seen.has(f.url))return false;
    seen.add(f.url);return true;
  }).map(f=>({
    name:String(f.name??'original').slice(0,200),
    format:String(f.format).toUpperCase(),
    sizeBytes:Number.isFinite(Number(f.size))&&Number(f.size)>=0?Number(f.size):null,
    originalUrl:f.url,
    source:'NIH 3D',
    permanentATLAArchive:false,
    sha256:null // A source URL is not a cryptographically verified byte copy.
  }));
}
export function normalizeNihEntry(item,{catalogOnly=true}={}) {
  if(!item||!Number.isInteger(Number(item.entryId??item.id)))throw Error('Invalid NIH metadata');
  const id=Number(item.entryId??item.id);
  const page=PAGE_URL_RE.test(item.url??'')?item.url:`${NIH_SITE}/entries/3DPX-${String(id).padStart(6,'0')}`;
  return {
    id,accession:item.accession??`3DPX-${String(id).padStart(6,'0')}`,
    title:item.title??'',category:item.category??'',description:item.description??'',
    attribution:item.creator??'',originalLicense:item.licenseRaw??item.licenseExact??item.license??null,
    version:item.sourceVersion??item.version??null,
    originalPage:page,files:sourceFileRefs(item),
    provenance:'NIH 3D',origin:'direct-from-source',
    sourceStatus:catalogOnly?'catalog_snapshot_not_live_verified':'live_publication_checked',
    scientificReview:'NOT_ESTABLISHED',permanentlyMirrored:false
  };
}
export async function getCataloguedNihEntry(entryId,{fetchImpl=fetch,basePath=NIH_CATALOG_BASE}={}) {
  const seg=segmentForId(entryId),root=String(basePath).replace(/\/$/,'');
  const response=await fetchImpl(`${root}/${seg.filename}`,{cache:'force-cache'});
  if(!response.ok)throw Error('ATLA NIH metadata HTTP '+response.status);
  const body=await response.json();
  const row=(body.items??body.entries??[]).find(item=>Number(item.entryId??item.id)===seg.id);
  if(!row)return null; // Unpublished/nonexistent IDs are expected among the scanned 25,000 IDs.
  return normalizeNihEntry(row);
}
export async function getCurrentNihEntry(entryId,{fetchImpl=fetch,basePath=NIH_CATALOG_BASE,refresh=true}={}) {
  const snapshot=await getCataloguedNihEntry(entryId,{fetchImpl,basePath});
  if(!snapshot||!refresh)return snapshot;
  const response=await fetchImpl(`${NIH_SITE}/api/entries/${snapshot.id}`,{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Live NIH metadata HTTP '+response.status);
  const live=await response.json();
  const published=(live.submissions??[])
    .filter(v=>String(v.submissionStatus??'').toLowerCase()==='published')
    .sort((a,b)=>Number(b.version??0)-Number(a.version??0))[0];
  if(!published)throw Error('NIH entry not currently published');
  const refs=[],seen=new Set();
  for(const run of published.workflowRuns??[])for(const output of run.outputFiles??[]){
    const format=String(output.fileFormat??'').toUpperCase();
    if(!FORMATS.has(format)||!output.fileId||!run.prefectRunId||!published.submissionId)continue;
    const url=`${NIH_SITE}/api/submissions/${published.submissionId}/runs/${run.prefectRunId}/output-files/${output.fileId}`;
    if(seen.has(url))continue;seen.add(url);
    refs.push({name:output.name??'',format,size:output.fileSize??null,url});
  }
  const liveRecord={
    entryId:snapshot.id,accession:snapshot.accession,title:published.metadata?.title??snapshot.title,
    category:snapshot.category,description:snapshot.description,
    creator:live.modifiedByUser?.displayName??snapshot.attribution,
    licenseRaw:published.metadata?.license??snapshot.originalLicense,
    sourceVersion:published.version,url:snapshot.originalPage,files:refs
  };
  return normalizeNihEntry(liveRecord,{catalogOnly:false});
}
export function selectOriginalFile(entry,{format='GLB',maxInlineBytes=50*1024*1024}={}) {
  // Never load unrelated 3D automatically: caller owns the approved educational relevance gate.
  if(!entry||entry.scientificReview!=='APPROVED_FOR_EDUCATION')return null;
  const candidates=entry.files.filter(x=>x.format===format.toUpperCase()).sort((a,b)=>(a.sizeBytes??Infinity)-(b.sizeBytes??Infinity));
  const suitable=candidates.find(x=>x.sizeBytes!=null&&x.sizeBytes<=maxInlineBytes);
  return suitable?{...suitable,downloadOnDemand:true,browserInlineSupported:false,officialEntryPage:entry.originalPage,delivery:'external-official-source'}:null;
}

/** Browser safe fallback. Source navigation never implies successful same-origin 3D rendering. */
export function getApprovedOriginalSourceLink(entry) {
  if(!entry||entry.scientificReview!=='APPROVED_FOR_EDUCATION')return null;
  if(!PAGE_URL_RE.test(entry.originalPage??''))return null;
  return {href:entry.originalPage,target:'_blank',rel:'noopener noreferrer',
    label:'Προβολή πρωτότυπου 3D στο NIH',mode:'external-official-source',
    inline3DValidated:false,originalSource:true};
}

/** Use the stored, same-origin catalog when external NIH metadata fetch is blocked by CORS. */
export async function getNihEntryWithSafeFallback(entryId,options={}) {
  const snapshot=await getCataloguedNihEntry(entryId,options);
  if(!snapshot)return null;
  if(!options.requestLiveRefresh)return {...snapshot,browserMode:'official-page-link',liveRefreshAttempted:false};
  try{
    const current=await getCurrentNihEntry(entryId,options);
    return {...current,browserMode:'official-page-link',liveRefreshAttempted:true};
  }catch(error){
    return {...snapshot,sourceStatus:'catalog_snapshot_live_refresh_unavailable',
      liveRefreshAttempted:true,liveRefreshUnavailableReason:String(error.message??error).slice(0,160),
      browserMode:'official-page-link'};
  }
}
