/**
 * Shared educational selection over the single 3D model library. One registry, many entries:
 * lessons, Anatomy Lab, exams, Clinical Cockpit and ATLA all choose from the same data here.
 * Nothing selected is clinically approved, and nothing here touches progress or grading.
 */
export const LIBRARY_PATH='tools/atla-ai/resources/model-library.json';
const VIEWER_PATH='ui-tools/atla-resource-preview.html';
const SURFACES=new Set(['lesson','anatomy','exam','cockpit','atla']);
const LESSON_LIMIT=12;
export const simplify=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'')
 .toLocaleLowerCase('el').replace(/ς/g,'σ').replace(/\s+/g,' ').trim();
// Terms are curated in normalized lower case; only the final sigma is folded to match simplify().
const termRegex=term=>new RegExp('(?<!\\p{L})(?:'+term.replace(/ς/g,'σ')+')','gu');
const hits=(terms,text)=>(terms??[]).reduce((n,term)=>n+(text.match(termRegex(term))||[]).length,0);
/** Occurrences of a structure in normalized text, ignoring same-named vessels and nerves. */
export function structureHits(structure,exclude,text){
 const cleaned=exclude?text.replace(termRegex(exclude),' '):text;
 return hits(structure.match,cleaned);
}
function textScore(model,library,text){
 const normalized=simplify(text);
 let score=0;
 for(const id of model.structures??[]){
  score+=structureHits(library.vocabulary.structures[id],library.vocabulary.exclude?.[id],normalized);
 }
 if(!score)return 0;
 if(model.kind==='pathology'&&!hits(library.vocabulary.findings[model.finding]?.match,normalized))return 0;
 return score;
}
const deliverable=(model,surface)=>Boolean(model.delivery)&&model.clinicalUseApproved===false&&model.surfaces?.includes(surface);
/** One model stands for its structures and finding, so a chapter never lists near-identical models. */
function ranked(rows,limit){
 const seen=new Set(),shown=new Set(),out=[];
 rows.sort((a,b)=>b.score-a.score||a.model.entryId-b.model.entryId);
 for(const {model} of rows){
  if(model.kind==='pathology'){
   const key=model.structures.join()+'|'+model.finding;
   if(seen.has(key))continue;
   seen.add(key);
  }else if(model.structures?.length&&model.structures.every(id=>shown.has(id)))continue;
  else model.structures?.forEach(id=>shown.add(id));
  out.push(model);
  if(out.length===limit)break;
 }
 return out;
}
export function selectLibraryModels(library,{surface,text='',courseId='',chapterId='',revealed=false,confirmedAnatomy=false}={}){
 if(!library||!SURFACES.has(surface))return [];
 // Exam answers are never disclosed or hinted before a learner reveals the reference.
 if(surface==='exam'&&!revealed)return [];
 // No diagnosis is inferred from a traumatic scenario or a generic body-system name.
 if(surface==='cockpit'&&!confirmedAnatomy)return [];
 const models=(library.models??[]).filter(m=>m.source==='nih3d'&&deliverable(m,surface));
 if(surface==='lesson'){
  const chapter=String(courseId)+'/'+String(chapterId);
  const rows=[];
  for(const model of models){
   const link=model.saekChapters?.find(c=>c.chapter===chapter);
   if(link)rows.push({model,score:link.occurrences});
  }
  return ranked(rows,LESSON_LIMIT);
 }
 const rows=[];
 for(const model of models){
  const score=textScore(model,library,text);
  if(score)rows.push({model,score});
 }
 return ranked(rows,1);
}
/**
 * ATLA offers a model only when it helps: the learner asked, or is struggling with the concept.
 * When text is enough nothing is loaded; exams and simulations keep their stricter gates.
 */
export function selectAtlaVisual(library,{text='',mode='lesson',revealed=false,confirmedAnatomy=false,requestedVisual=false,struggling=false}={}){
 if(mode==='exam')return selectLibraryModels(library,{surface:'exam',text,revealed})[0]??null;
 if(mode==='simulation')return selectLibraryModels(library,{surface:'cockpit',text,confirmedAnatomy})[0]??null;
 if(!requestedVisual&&!struggling)return null;
 return selectLibraryModels(library,{surface:'atla',text})[0]??null;
}
/** Same-origin relative return target only; anything else falls back to the default. */
export function safeReturnHref(from,baseUrl,fallback){
 if(typeof from!=='string'||!from||from.length>500||/[\\\u0000-\u001f]/.test(from))return fallback;
 if(!from.startsWith('/')||from.startsWith('//'))return fallback;
 try{
  const base=new URL(baseUrl),target=new URL(from,base);
  if(target.origin!==base.origin||!['http:','https:'].includes(target.protocol))return fallback;
  return target.pathname+target.search+target.hash;
 }catch{return fallback}
}
export function viewerHref(model,{rootUrl,tool='anatomy',from=''}={}){
 const url=new URL(VIEWER_PATH,rootUrl);
 url.searchParams.set('tool',tool==='cockpit'?'cockpit':'anatomy');
 url.searchParams.set('dataset','nih');
 url.searchParams.set('model',model.accession);
 if(from)url.searchParams.set('from',from);
 return url.pathname+url.search;
}
const rootOf=()=>new URL('../../',import.meta.url);
let pending=null;
export function loadLibrary(rootUrl=rootOf()){
 pending??=fetch(new URL(LIBRARY_PATH,rootUrl),{cache:'no-cache'}).then(r=>{
  if(!r.ok)throw Error('Μητρώο 3D HTTP '+r.status);
  return r.json();
 }).catch(error=>{pending=null;throw error});
 return pending;
}
