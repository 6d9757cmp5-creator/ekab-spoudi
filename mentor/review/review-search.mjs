/**
 * Review-only, text-excerpt lookup for draft textbook extracts.
 * NOT a medical tutor or a production retrieval gateway.
 *
 * This intentionally cannot produce clinical recommendations, summaries,
 * prescriptions, triage decisions or synthesized medical answers.
 */
const SYNONYMS=Object.freeze({
  'αεραγωγος':['airway'],
  'αναπνοη':['breathing','respiration'],
  'πνευμονες':['lungs','respiratory'],
  'καρδια':['heart','cardiac'],
  'ανακοπη':['cardiac arrest'],
  'αναζωογονηση':['resuscitation'],
  'αιμορραγια':['bleeding','hemorrhage'],
  'τραυμα':['trauma','injury'],
  'καταγμα':['fracture'],
  'θωρακας':['chest','thoracic'],
  'θωρακικος πονος':['chest pain'],
  'εμφραγμα':['myocardial infarction'],
  'καταπληξια':['shock'],
  'σοκ':['shock'],
  'διαλογη':['triage'],
  'πρωτογενης εκτιμηση':['primary assessment'],
  'εκτιμηση':['assessment'],
  'ηλεκτροκαρδιογραφημα':['ECG','electrocardiogram'],
  'παλμοι':['pulse','heart rate'],
  'κορεσμος':['oxygen saturation'],
  'ασκοσ':['bag valve mask'],
  'απινιδωση':['defibrillation'],
  'απινιδωτης':['defibrillator'],
  'φαρμακα':['medication','drug'],
  'φαρμακολογια':['pharmacology'],
  'παιδι':['pediatric','child'],
  'εγκεφαλικο':['stroke'],
  'δηλητηριαση':['poisoning'],
  'εγκαυμα':['burn'],
});
const ID=/^[a-z0-9][a-z0-9-]{2,80}$/;
export const PREVIEW_MAX=260;
export function fold(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export function queryTerms(value){
 const q=fold(String(value??'').slice(0,100));
 if(q.length<3)return [];
 const tokens=q.split(/\s+/).filter(v=>v.length>2);
 const expansions=[];
 for(const [key,values] of Object.entries(SYNONYMS)){
  if(q.includes(key) || tokens.some(t=>t===key)){
   expansions.push(...values);
  }
 }
 const final=[...tokens,...expansions.flatMap(s=>fold(s).split(' '))].filter(t=>t.length>2);
 return [...new Set(final)].slice(0,18);
}
export function assertReviewBook(book,sourceId,manifest){
 if(!ID.test(sourceId))throw Error('Invalid book identifier');
 if(!book||book.schema_version!==1||book.source_id!==sourceId||!Array.isArray(book.passages))
  throw Error('Book source mismatch');
 const item=manifest?.books?.find(b=>b.source_id===sourceId);
 if(!item||item.passage_count!==book.passages.length||book.passages.length>5000)
  throw Error('Book manifest mismatch');
 for(const p of book.passages){
  if(!p||!ID.test(p.id)||p.source_id!==sourceId||
      typeof p.text!=='string'||p.text.length<30||p.text.length>8000||
      !['draft','human-reviewed'].includes(p.review_status)||
      typeof p.title!=='string'||typeof p.source_url!=='string'||
      !/^https:\/\//.test(p.source_url))
   throw Error('Invalid extracted passage');
 }
 return book;
}
function snippet(text,terms){
 const lower=text.toLowerCase();
 let pos=-1;
 for(const term of terms){
  const at=lower.indexOf(term.toLowerCase());
  if(at>=0&&(pos<0||at<pos))pos=at;
 }
 const start=pos<0?0:Math.max(0,pos-75);
 const segment=text.slice(start,start+PREVIEW_MAX).replace(/\s+/g,' ').trim();
 return (start?'…':'')+segment+(start+PREVIEW_MAX<text.length?'…':'');
}
export function findForEditorialPreview({query,book,sourceId,manifest,limit=6}){
 const verified=assertReviewBook(book,sourceId,manifest);
 const terms=queryTerms(query);
 if(!terms.length)return [];
 const phrases=fold(query);
 const scored=[];
 for(const p of verified.passages){
  const hay=fold(p.text);
  const heading=fold(p.title+' '+(p.section||''));
  let score=0;
  for(const term of terms){
   if(heading.includes(term))score+=3;
   if(hay.includes(term))score+=1;
  }
  if(phrases.length>4 && hay.includes(phrases))score+=5;
  if(score<=0)continue;
  scored.push({passage_id:p.id,source_id:p.source_id,title:p.title,
    section:p.section||null,source_url:p.source_url,score,
    excerpt:snippet(p.text,terms),review_status:p.review_status,
    status_label:'Μη εγκεκριμένο κείμενο — μόνο για βιβλιογραφική προεπισκόπηση'});
 }
 scored.sort((a,b)=>b.score-a.score||a.passage_id.localeCompare(b.passage_id));
 return scored.slice(0,Math.max(1,Math.min(8,Math.trunc(limit)||6)));
}
