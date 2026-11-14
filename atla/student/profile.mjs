/**
 * ATLA canonical read-only learner view (schema 1).
 * Reconciles existing SAEK/EOPPEP evidence without migrating or duplicating
 * grades, notes, account identity or sync state. Never writes storage.
 * Reading, answering once, or recall alone does not prove competence.
 */
import {analyseLearning,choosePrimary,validQuestion} from '../learning/next-step.mjs';
import {loadLearning} from './memory.mjs';
import {practiceSummary,practiceLines,PRACTICE_SOURCES} from './practice.mjs';

const EOP_KEY='ekab-eoppep-official-v15';
const SAEK_KEY='ekab.saek.exams.v1';
const RESUME_KEY='ekab.study.resume.v1';
const READ_KEY=/^ekab\.saek\.read\.v1\.(?:0[1-9]|1\d|20)\.(?:[1-9]|[1-9]\d)$/;
const SAEK_EXAM=/^saek-(?:0[1-9]|1\d|20)-(?:[1-9]|[1-9]\d)$/;
const EOP_TOPIC=/\bEOP-[AB]-\d{3}\b/i;
function objectAt(storage,key){
 try{
  const raw=storage.getItem(key);
  if(!raw||raw.length>2_000_000)return {};
  const value=JSON.parse(raw);
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 }catch{return {};}
}
function count(v){
 const n=Number(v);
 return Number.isSafeInteger(n)&&n>0?Math.min(n,100000):0;
}
function saekReadKeys(storage){
 const keys=[];
 try{
  for(let i=0,n=Math.min(storage.length||0,5000);i<n;i++){
   const key=storage.key(i);
   if(READ_KEY.test(key)&&storage.getItem(key)==='1')keys.push(key);
  }
 }catch{/* Storage denied: unknown is safer than made-up progress. */}
 return keys;
}

/** Recomputed on demand from the same legacy data: never a second grade store. */
export function canonicalLearnerProfile(storage,{scheduler=null,now=new Date()}={}){
 const store=storage&&typeof storage.getItem==='function'?storage:{getItem:()=>null};
 const eop=objectAt(store,EOP_KEY);
 const exams=objectAt(store,SAEK_KEY);
 const history=exams.history&&typeof exams.history==='object'&&!Array.isArray(exams.history)?exams.history:{};
 const stats=analyseLearning({
  eopRecords:eop,saekReadKeys:saekReadKeys(store),saekHistory:history,
  resume:objectAt(store,RESUME_KEY),scheduler,now
 });
 const eopNeedsReview=[];
 let repeatedAssessmentItems=0,correctEvidenceItems=0;
 for(const [id,row] of Object.entries(eop)){
  if(!validQuestion(id)||!row||typeof row!=='object'||Array.isArray(row))continue;
  const attempts=count(row.selfAttempts),correct=Math.min(attempts,count(row.selfCorrect));
  if(attempts>=2){
   repeatedAssessmentItems++;
   if(correct<attempts)eopNeedsReview.push(id);
   if(correct>=2)correctEvidenceItems++;
  }
 }
 const saekNeedsReview=[];
 for(const [id,row] of Object.entries(history)){
  if(!SAEK_EXAM.test(id)||!row||typeof row!=='object'||Array.isArray(row))continue;
  if(count(row.incorrect)>=2)saekNeedsReview.push(id);
 }
 const readOnlyRecommendation=choosePrimary(stats);
 return Object.freeze({
  schema:1,
  sources:Object.freeze([EOP_KEY,SAEK_KEY,RESUME_KEY,'ekab.saek.read.v1.*',...PRACTICE_SOURCES]),
  stats,
  preferences:loadLearning(store),
  recommendation:readOnlyRecommendation,
  practice:practiceSummary(store),
  understanding:Object.freeze({
   status:repeatedAssessmentItems?'partial-evidence':'insufficient-evidence',
   repeatedAssessmentItems,
   correctEvidenceItems,
   eopNeedsReview:Object.freeze(eopNeedsReview.sort()),
   saekNeedsReview:Object.freeze(saekNeedsReview.sort()),
   limitations:'Η ανάγνωση ή μεμονωμένη απάντηση δεν αποδεικνύει κατάκτηση γνώσης ή κλινικής δεξιότητας.'
  })
 });
}

/** Adapt only the requested topic; never lower scores or modify stored progress. */
export function teachingLevelFor(profile,question){
 const preferred=profile?.preferences?.level||'student';
 if(preferred!=='student')return preferred;
 const match=String(question||'').toUpperCase().match(EOP_TOPIC);
 if(match&&profile?.understanding?.eopNeedsReview?.includes(match[0]))return 'beginner';
 return preferred;
}

/** No implicit exposure of grades: provide a summary only on an explicit question. */
export function localStudyInsight(question,profile){
 const q=String(question||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');
 if(!/(προοδ|εχω μαθει|εχω διαβασει|που δυσκολευ|τι να επαναλαβ|ποσο εχω προχωρ)/.test(q))return null;
 const s=profile.stats,u=profile.understanding;
 const next=profile.recommendation;
 return 'Από το τοπικό ιστορικό της συσκευής: '+
  s.saek.read+' αναγνωσμένα κεφάλαια ΣΑΕΚ, '+
  s.eoppep.attempted+' ερωτήσεις ΕΟΠΠΕΠ με καταγεγραμμένη εξάσκηση. '+
  'Εντοπίζονται '+u.eopNeedsReview.length+' θέματα ΕΟΠΠΕΠ με επαναλαμβανόμενες αλλά όχι όλες σωστές προσπάθειες και '+
  u.saekNeedsReview.length+' θέματα ΣΑΕΚ με πολλαπλά ιστορικά λάθη. '+
  practiceLines(profile.practice).map(line=>line+' ').join('')+
  'Προτεινόμενο επόμενο βήμα: '+next.label+'. '+
  'Αυτές είναι ενδείξεις μελέτης, όχι απόδειξη γνώσης ή κλινικής επάρκειας. Δεν άλλαξα βαθμούς ή πρόοδο.';
}
