/**
 * No-LLM Greek knowledge lookup for Mentor.
 * Pure/read-only; does not inspect localStorage, write grades, or diagnose.
 */
import {KNOWLEDGE_PACK,KNOWLEDGE_CARDS,KNOWLEDGE_SOURCES,KNOWLEDGE_DOMAINS} from './foundation-pack.mjs';
const STOPWORDS=new Set(['τι','ποιο','ποια','ποιοσ','ειναι','πρεπει','θελω','μου','σε','τον','την','το','της','του','τα','για','απο','που','πως','εξηγησε','εξηγησεμου','λεει','σημαινει','δωσε','μια','ενα','και','οταν','αυτο','αναλυτικα','σημαντικο']);
export function normalizeGreek(text){
 return String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('el-GR').replace(/ς/g,'σ')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
const terms=s=>normalizeGreek(s).split(' ').filter(w=>w.length>2&&!STOPWORDS.has(w));
export function assertKnowledgePack(pack=KNOWLEDGE_PACK){
 if(!pack||pack.production_clinical_approval!==false||pack.model_training!==false||
  pack.clinical_review!=='pending'||pack.publisher_book_text_imported!==false)throw Error('knowledge-pack-approval-gate');
 if(!Array.isArray(pack.knowledge_cards)||pack.knowledge_cards.length!==29)throw Error('knowledge-card-count');
 const ids=new Set();
 for(const card of pack.knowledge_cards){
  if(!/^[a-z][a-z0-9-]{3,70}$/.test(card.id)||ids.has(card.id)||
   !Object.hasOwn(KNOWLEDGE_DOMAINS,card.domain)||card.status!=='draft-historical-clinical-review-pending'||
   card.clinical_instructions!==false||card.medical_decision_support!==false||card.reviewed_at!==null||
   typeof card.explanation!=='string'||card.explanation.length<65||
   typeof card.recall_question!=='string'||card.recall_question.length<20||
   !Array.isArray(card.source_ids)||card.source_ids.length===0||
   !Array.isArray(card.aliases)||card.aliases.length===0)
   throw Error('invalid-knowledge-card-'+card.id);
  ids.add(card.id);
  for(const sid of card.source_ids){
   const source=KNOWLEDGE_SOURCES[sid];
   if(!source||!/^https:\/\//.test(source.url)||!source.license||!source.scope)
    throw Error('invalid-knowledge-source-'+card.id);
  }
 }
 return true;
}
function matches(q,card){
 const qText=normalizeGreek(q),qTokens=new Set(terms(q));
 if(!qText||qTokens.size===0)return 0;
 let score=0;
 for(const alias of card.aliases){
  const a=normalizeGreek(alias);
  if(!a||a.length<3)continue;
  // Exact phrase: top priority; no substring against unrelated word boundaries.
  if((' '+qText+' ').includes(' '+a+' '))score+=a.length>=8?18:12;
  const ts=terms(a);
  if(ts.length>0 && ts.every(t=>qTokens.has(t)))score+=ts.length*5;
 }
 const title=normalizeGreek(card.title);
 const titleTerms=terms(title);
 for(const t of titleTerms)if(qTokens.has(t))score+=3;
 const domain=normalizeGreek(KNOWLEDGE_DOMAINS[card.domain]);
 if((' '+qText+' ').includes(' '+domain+' '))score+=3;
 return score;
}
export function searchKnowledge(question,{domain='all',limit=6}={}){
 const q=String(question??'').slice(0,300);
 if(!q.trim())return [];
 if(domain!=='all'&&!Object.hasOwn(KNOWLEDGE_DOMAINS,domain))return [];
 const selected=KNOWLEDGE_CARDS.map(card=>({card,score:matches(q,card)}))
  .filter(x=>x.score>=5&&(domain==='all'||x.card.domain===domain))
  .sort((a,b)=>b.score-a.score||a.card.id.localeCompare(b.card.id));
 return selected.slice(0,Math.min(12,Math.max(1,Math.floor(limit)||6))).map(x=>({...x.card,match_score:x.score}));
}
export function isHighRiskRequest(question){
 const q=normalizeGreek(question);
 if(!q)return false;
 // Refuse direct drug administration or invasive intervention instructions even if theoretical.
 const procedure=/(δοσολογ|ποσα\s+(mg|ml|μg)|πόσα\s+mg|χορηγησ|χορηγησω|διασωληνωσ|κανω\s+διασωληνωσ|επιδεσμο\s+θωρακα|βελονα\s+στο\s+θωρακα)/;
 const realPatient=/(ο\s+ασθενησ\s+μου|εχω\s+ασθενη|ασθενησ\s+τωρα|δεν\s+αναπνεει\s+τωρα|μου\s+συμβαινει\s+τωρα|αυτη\s+τη\s+στιγμη)/;
 return procedure.test(q)||realPatient.test(q);
}
export function knowledgeResponse(query,{intent='explain'}={}){
 if(isHighRiskRequest(query))return {
  kind:'safety',text:'Για πραγματικό επείγον περιστατικό χρειάζεται άμεση επικοινωνία με τις αρμόδιες υπηρεσίες (112 ή 166 στην Ελλάδα) και εφαρμογή μόνο της προβλεπόμενης εκπαίδευσης/πρωτοκόλλων. Ο δοκιμαστικός Mentor δεν δίνει δοσολογίες, οδηγίες επεμβατικών πράξεων ή εξατομικευμένη θεραπεία.',
  sources:[]
 };
 if(!['explain','exercise','unknown'].includes(intent))return null;
 const hits=searchKnowledge(query,{limit:2});
 if(!hits.length)return null;
 const hit=hits[0];
 // Ambiguous queries should never fabricate a single definitive teaching topic.
 if(hits[1]&&hits[0].match_score===hits[1].match_score&&hits[0].domain!==hits[1].domain)
  return {kind:'suggestions',text:'Βρήκα περισσότερες από μία πιθανές έννοιες: '+hits.map(x=>x.title).join(' ή ')+'. Δώσε πιο συγκεκριμένο όρο.',sources:[]};
 const refs=hit.source_ids.map(id=>({id,title:KNOWLEDGE_SOURCES[id].title,url:KNOWLEDGE_SOURCES[id].url}));
 const text=intent==='exercise'?
  'Άσκηση ανάκλησης — '+hit.title+': '+hit.recall_question+' Σημεία ελέγχου: '+hit.recall_guide:
  hit.title+': '+hit.explanation+' Ερώτηση για αυτοέλεγχο: '+hit.recall_question;
 return {kind:'knowledge',card_id:hit.id,title:hit.title,text,sources:refs,
  disclaimer:'Πρωτότυπη εκπαιδευτική περίληψη, με παραπομπές. Εκκρεμεί ανεξάρτητη κλινική επιμέλεια. Δεν είναι οδηγία θεραπείας.'};
}
