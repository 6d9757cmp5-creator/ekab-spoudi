/**
 * MENTOR OS clinician library: deterministic source routing, NOT a clinician.
 * Does not generate diagnoses, medications, prescriptions or clinical answers.
 * Sources are linked publisher indexes; no guideline full text is embedded.
 */
export const CLINICAL_STATUS='human-review-pending';
const HOSTS=new Set([
 'www.msdmanuals.com','www.escardio.org','ginasthma.org','goldcopd.org','kdigo.org',
 'professional.diabetes.org','www.idsociety.org','www.hematology.org','www.acog.org',
 'www.nice.org.uk','www.ema.europa.eu','www.who.int','www.cdc.gov','www.erc.edu'
]);
const STOP=new Set([
 'τι','ειναι','γιατι','πωσ','ποιο','ποια','ποιοσ','ποιοι','αυτο','αυτη','αυτοσ',
 'θελω','θελει','θελουμε','να','μου','ενα','μια','τον','την','τησ','του','των','και',
 'με','για','στο','στην','στον','στη','απο','οταν','θα','αν','σε','που','αλλοσ','γιατροσ',
 'γιατρόσ','βρισκω','υπαρχει','μπορω','χρειαζεται','ρωταω','ρωτησω','εξετασουμε','ποσο',
 'πρεπει','προτεινει','ασθενησ','ασθενουσ','περιστατικο','περιστατικου','υψηλο','χαμηλο'
]);
const SYNONYMS=Object.freeze({
 'θωρακα':['καρδιολογία','στηθάγχη'], 'στηθοσ':['πόνος','cardiology'],
 'καρδια':['cardiology','καρδιακή'], 'ανακοπη':['emergency','cardiology'],
 'αεραγωγοσ':['αερισμός','pulmonology'],'δυσπνοια':['pulmonology','αναπνοή'],
 'ασθμα':['pulmonology'],'διαβητησ':['endocrinology','διαβήτης'],
 'νεφρα':['nephrology','νεφρική'],'κρεατινινη':['nephrology','κρεατινίνη'],
 'εγκεφαλικο':['neurology','stroke'],'εμβολη':['pulmonology','θρόμβωση'],
 'παιδι':['pediatrics','παιδιατρική'],'κυηση':['obgyn','κύηση'],
 'αντιβιοτικο':['infectious','αντιβιοτικά'],'δοση':['pharmacology','δοσολογία'],
 'καρκινοσ':['oncology','ογκολογία'],'αιμοσφαιρινη':['hematology','αναιμία'],
 'σηψη':['infectious','σήψη'],'οξυγονο':['critical','οξυγόνωση'],
 'εκζεμα':['derm','εξάνθημα'],'καταθλιψη':['psychiatry'],
 'αυτοανοσο':['rheumatology','αυτοαντισώματα']
});
const TOP=/^[a-z][a-z0-9-]{2,40}$/;
export function normalize(input){
 return String(input??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}
export function terms(input){
 const q=normalize(String(input??'').slice(0,260));
 const raw=q.split(' ').filter(s=>s.length>=3&&!STOP.has(s)).slice(0,25);
 const extra=[];
 for(const [stem,words] of Object.entries(SYNONYMS))
  if(raw.some(w=>w.startsWith(stem)||stem.startsWith(w)))extra.push(...words.map(normalize));
 return [...new Set([...raw,...extra])].filter(x=>x.length>=3).slice(0,30);
}
function urlsSecure(value){
 try{const u=new URL(value);return u.protocol==='https:'&&HOSTS.has(u.hostname);}
 catch{return false;}
}
export function validateClinicalDesk({sources,library}){
 if(!sources||sources.schema_version!==1||sources.package!=='mentor-clinical-desk-v1'||
 sources.clinical_retrieval_enabled!==false||sources.model_training_enabled!==false||
 !Array.isArray(sources.sources)||sources.sources.length!==14||
 !library||library.schema_version!==1||library.package!=='mentor-clinical-desk-v1'||
 library.ai_model!==false||library.medical_license!==false||library.clinical_use_allowed!==false||
 library.official_grade_effect!==false||library.status!==CLINICAL_STATUS||
 !Array.isArray(library.specialties)||library.specialties.length!==17||
 !Array.isArray(library.records)||library.records.length!==51)
  throw Error('invalid-clinical-desk');
 const refs=new Map(),specialties=new Set(),ids=new Set();
 for(const s of sources.sources){
  if(!TOP.test(s.id)||refs.has(s.id)||!urlsSecure(s.url)||
  s.medical_review!=='pending'||s.content_ingested!==false||s.link_verified!==true||
  !Array.isArray(s.specialties)||!s.specialties.length)throw Error('invalid-clinical-source');
  refs.set(s.id,s);
 }
 for(const sp of library.specialties){
  if(!TOP.test(sp.id)||specialties.has(sp.id)||typeof sp.label!=='string'||sp.label.length<5)
   throw Error('invalid-clinical-specialty');
  specialties.add(sp.id);
 }
 for(const rec of library.records){
  if(!TOP.test(rec.id)||ids.has(rec.id)||!specialties.has(rec.specialty)||
   typeof rec.question!=='string'||rec.question.length<30||
   typeof rec.framework!=='string'||rec.framework.length<120||
   typeof rec.verify!=='string'||rec.verify.length<50||
   typeof rec.caution!=='string'||rec.caution.length<50||
   !Array.isArray(rec.source_ids)||!rec.source_ids.length||
   rec.source_ids.some(x=>!refs.has(x))||
   !Array.isArray(rec.keywords)||rec.keywords.length<2||
   rec.review_status!==CLINICAL_STATUS||rec.clinical_use_allowed!==false||
   rec.audience!=='education-and-reference-routing-only'||
   rec.citation_granularity!=='topical-guideline-index-not-claim-level')
   throw Error('invalid-clinical-record');
  ids.add(rec.id);
 }
 for(const specialty of specialties){
  if(library.records.filter(x=>x.specialty===specialty).length!==3)
   throw Error('incomplete-clinical-specialty');
 }
 return Object.freeze({sources,library});
}
function score(r,q,words,focus){
 const name=normalize(r.question),body=normalize(r.framework),
  tags=normalize(r.keywords.join(' ')),checks=normalize(r.verify),
  specialty=normalize(focus||r.specialty);
 let n=0,match=0;
 for(const word of words){
  const hits=[name.includes(word),tags.includes(word),body.includes(word),checks.includes(word),specialty.includes(word)];
  if(hits.some(Boolean))match++;
  if(hits[0])n+=7;
  if(hits[1])n+=6;
  if(hits[2])n+=3;
  if(hits[3])n+=1;
  if(hits[4])n+=3;
 }
 if(!words.length)return 0;
 if(match<Math.max(1,Math.ceil(words.length*.45)))return 0;
 if(q.length>7 && name.includes(q))n+=12;
 return n;
}
export function searchClinical(library,{query='',specialty='all',limit=6}={}){
 if(!library?.records)throw Error('missing-clinical-library');
 const filtered=library.records.filter(r=>specialty==='all'||r.specialty===specialty);
 const q=normalize(String(query??'').slice(0,260));
 const words=terms(q);
 const count=Math.max(1,Math.min(12,limit|0));
 if(!words.length)return filtered.slice(0,count);
 return filtered.map(r=>({r,score:score(r,q,words,r.specialty)}))
  .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id))
  .slice(0,count).map(x=>x.r);
}
export function isDirectTreatmentRequest(question){
 const q=normalize(String(question??'').slice(0,260));
 const act=/(?:να δωσω|να χορηγησω|να παρει|να παρει ο|να συνταγογραφησω|να κανω θεραπε)/.test(q);
 const medication=/(?:θεραπ|φαρμακ|αντιβιοτ|αντιπηκτ|δοσολογ|δοση|mg|συμπληρωμ)/.test(q);
 return Boolean((act&&medication) ||
  /(?:ποση δοση|ποσα mg|ποιο φαρμακο να|τι φαρμακο να)/.test(q));
}
export function lookupClinical({sources,library,question}){
 if(!sources?.sources||!library?.records)throw Error('missing-desk');
 const q=String(question??'').trim().slice(0,260);
 if(q.length<4||isDirectTreatmentRequest(q))return null;
 const rec=searchClinical(library,{query:q,limit:1})[0];
 if(!rec)return null;
 const refs=rec.source_ids.map(id=>sources.sources.find(s=>s.id===id))
  .filter(Boolean).map(s=>({id:s.id,title:s.title,url:s.url,year:s.year}));
 return {id:rec.id,question:rec.question,framework:rec.framework,
  verify:rec.verify,caution:rec.caution,references:refs,review_status:CLINICAL_STATUS,
  clinical_decision:false,source_level:'topic-directory',medical_license:false};
}
export function fallbackSources(sources){
 return sources.sources.filter(s=>['msd','nice'].includes(s.id)).map(s=>({id:s.id,title:s.title,url:s.url}));
}
