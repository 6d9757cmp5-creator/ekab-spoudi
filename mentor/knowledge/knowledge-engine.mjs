/**
 * MENTOR OS: deterministic educational micro-library.
 * No LLM, no treatment recommendations, no grading or storage mutation.
 */
export const KNOWLEDGE_STATUS='human-review-pending';
const VALID_ID=/^[a-z][a-z0-9-]{2,80}$/;
const LICENSE_PUBLISHERS=['who.int','erc.edu','wtcs.pressbooks.pub'];
function urlAllowed(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:' && LICENSE_PUBLISHERS.some(host=>u.hostname===host||u.hostname.endsWith('.'+host));
 }catch{return false;}
}
export function foldGreek(s){
 return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}
export function validateKnowledge({catalog,pack}){
 if(!catalog||catalog.schema_version!==1||!Array.isArray(catalog.sources)||
    catalog.sources.length!==8||!pack||pack.schema_version!==1||
    !Array.isArray(pack.topics)||pack.topics.length!==10||
    !Array.isArray(pack.cards)||pack.cards.length<50||
    catalog.package_id!==pack.package_id||pack.package_status!==KNOWLEDGE_STATUS||
    pack.clinical_use_allowed!==false||pack.grade_effect!==false||
    catalog.status!==KNOWLEDGE_STATUS||catalog.publisher_text_embedded!==false){
  throw new Error('invalid-knowledge-pack');
 }
 const sources=new Map(),topics=new Set(),ids=new Set();
 for(const src of catalog.sources){
  if(!VALID_ID.test(src.id)||sources.has(src.id)||!urlAllowed(src.url)||
    typeof src.title!=='string'||src.title.length<8||
    typeof src.publisher!=='string'||src.publisher.length<5||
    !Number.isInteger(src.year)||src.year<2024||src.year>2026||
    typeof src.rights!=='string'||src.rights.length<10||
    src.licence_review==='approved-for-production'||
    !['link-only','third-party-material-not-copied'].includes(src.licence_review))throw Error('invalid-knowledge-source');
  sources.set(src.id,src);
 }
 for(const topic of pack.topics){
  if(!VALID_ID.test(topic.id)||topics.has(topic.id)||typeof topic.label!=='string'||
    topic.label.length<5)throw Error('invalid-knowledge-topic');
  topics.add(topic.id);
 }
 for(const card of pack.cards){
  if(!VALID_ID.test(card.id)||ids.has(card.id)||!topics.has(card.topic)||
    typeof card.title!=='string'||card.title.length<5||
    typeof card.lesson!=='string'||card.lesson.length<70||card.lesson.length>900||
    typeof card.question!=='string'||card.question.length<14||
    typeof card.answer!=='string'||card.answer.length<12||
    !Array.isArray(card.source_ids)||card.source_ids.length<1||card.source_ids.length>3||
    card.source_ids.some(id=>!sources.has(id))||
    card.language!=='el'||card.status!==KNOWLEDGE_STATUS||
    card.medical_approval!==false||card.official_grade_effect!==false||
    card.scope!=='educational-theory-only')throw Error('invalid-knowledge-card');
  ids.add(card.id);
 }
 if(ids.size!==pack.cards.length)throw Error('duplicate-card');
 return Object.freeze({catalog,pack});
}
function textScore(card,terms,phrase){
 const title=foldGreek(card.title),body=foldGreek(card.lesson),
  question=foldGreek(card.question),answer=foldGreek(card.answer);
 let score=0,matched=0;
 for(const word of terms){
  const matches=[title.includes(word),question.includes(word),body.includes(word),answer.includes(word)];
  if(matches.some(Boolean))matched++;
  if(matches[0])score+=7;
  if(matches[1])score+=4;
  if(matches[2])score+=2;
  if(matches[3])score+=1;
 }
 // Do not return an irrelevant card merely because one generic word matches
 // a multi-term question.
 if(matched<Math.max(1,Math.ceil(terms.length*.6)))return 0;
 if(phrase.length>3&&(title.includes(phrase)||question.includes(phrase)))score+=6;
 return score;
}
export function searchKnowledge(pack,{query='',topic='all',limit=12}={}){
 if(!pack||!Array.isArray(pack.cards))throw Error('missing-knowledge');
 const q=foldGreek(String(query).slice(0,150));
 const terms=q.split(' ').filter(s=>s.length>=3).slice(0,15);
 const eligible=pack.cards.filter(x=>topic==='all'||x.topic===topic);
 if(!terms.length)return eligible.slice(0,Math.max(1,Math.min(20,limit|0)));
 return eligible.map(card=>({card,score:textScore(card,terms,q)}))
  .filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score||a.card.id.localeCompare(b.card.id))
  .slice(0,Math.max(1,Math.min(20,limit|0))).map(entry=>entry.card);
}
export function choosePracticeCard(pack,{topic='all',offset=0}={}){
 if(!pack?.cards?.length)throw Error('missing-knowledge');
 const cards=pack.cards.filter(c=>topic==='all'||c.topic===topic);
 if(!cards.length)return null;
 const position=Math.abs(Number.isInteger(offset)?offset:0)%cards.length;
 return cards[position];
}
