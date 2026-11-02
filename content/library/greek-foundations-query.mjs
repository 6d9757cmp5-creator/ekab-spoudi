/**
 * Source-backed candidate card directory. NOT a live ATLAS tutor or grader.
 * Public/production selection fails closed until per-card approvals exist.
 */
import {KNOWLEDGE_CARDS,KNOWLEDGE_DOMAINS,KNOWLEDGE_PACK,KNOWLEDGE_SOURCES} from './greek-foundations-30.mjs';
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR').replace(/ς/g,'σ').trim();
export function verifyCandidatePack(){
 if(KNOWLEDGE_PACK.production_clinical_approval!==false||KNOWLEDGE_PACK.publishable!==false||
  KNOWLEDGE_PACK.automatic_ai_context!==false||KNOWLEDGE_PACK.model_training!==false||
  KNOWLEDGE_PACK.curriculum_match_verified!==false||KNOWLEDGE_PACK.clinical_review!=='pending')
  throw Error('Candidate cards must not be marked as clinically approved or published');
 if(KNOWLEDGE_CARDS.length!==30||Object.keys(KNOWLEDGE_SOURCES).length!==9||Object.keys(KNOWLEDGE_DOMAINS).length!==8)
  throw Error('Expected exactly 30 source-backed candidates, 9 references and 8 domains');
 const seen=new Set();
 for(const card of KNOWLEDGE_CARDS){
  if(seen.has(card.id)||!Object.hasOwn(KNOWLEDGE_DOMAINS,card.domain)||!Array.isArray(card.source_ids)||!card.source_ids.length||
   card.status!=='draft-historical-clinical-review-pending'||card.reviewed_at!==null||
   card.medical_decision_support!==false||card.clinical_instructions!==false||
   typeof card.recall_question!=='string'||card.recall_question.length<15||
   typeof card.explanation!=='string'||card.explanation.length<40)throw Error('Invalid or unsafe candidate card '+card.id);
  seen.add(card.id);
  for(const sourceId of card.source_ids){
   const source=KNOWLEDGE_SOURCES[sourceId];
   if(!source||!source.scope||!source.license)throw Error('Missing source metadata '+card.id);
   const url=new URL(source.url);
   if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error('Invalid source URL for '+card.id);
  }
 }
 return Object.freeze({candidates:KNOWLEDGE_CARDS.length,reference_catalog:Object.keys(KNOWLEDGE_SOURCES).length,domains:Object.keys(KNOWLEDGE_DOMAINS).length,published:0,independent_review_completed:0});
}
/** For editorial inspection only; never automatically inject into a learner's live AI context. */
export function previewCandidateCards({query='',domain='all',limit=30}={}){
 if(domain!=='all'&&!Object.hasOwn(KNOWLEDGE_DOMAINS,domain))return [];
 const q=fold(query).slice(0,150);
 const matches=KNOWLEDGE_CARDS.filter(c=>(domain==='all'||c.domain===domain)&&
  (!q||[c.title,...c.aliases].some(x=>fold(x).includes(q))));
 return matches.slice(0,Math.min(30,Math.max(0,Number.isFinite(limit)?Math.floor(limit):30)));
}
/** Fail-closed publication interface. The unreviewed PR #124 cards MUST not appear here. */
export function approvedCards(){
 if(KNOWLEDGE_PACK.publishable!==true||KNOWLEDGE_PACK.clinical_review!=='approved'||KNOWLEDGE_PACK.automatic_ai_context!==true)return [];
 return KNOWLEDGE_CARDS.filter(c=>c.status==='approved-for-education'&&
  typeof c.reviewed_at==='string'&&c.reviewed_at.length>=10&&
  c.clinical_instructions===false&&c.medical_decision_support===false);
}
