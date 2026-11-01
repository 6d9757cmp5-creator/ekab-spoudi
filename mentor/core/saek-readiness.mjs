/** 
 * ATLA SAEK read-only teaching-depth adapter.
 * Reuses EkabSaekExamEngine.getLevel (existing official practice heuristic).
 * Does not copy grading rules, claim competence, or touch stored grades.
 */
const COURSE=/^(?:0[1-9]|1\d|20)$/;
const DEPTH=Object.freeze({
 foundation:Object.freeze({id:'foundation',label:'Θεμέλια',guidance:'Απλή θεωρία και βασικές ερωτήσεις',next:'Μάθε την κύρια έννοια και κάνε έναν σύντομο αυτοέλεγχο.'}),
 reinforce:Object.freeze({id:'reinforce',label:'Εμπέδωση',guidance:'Περισσότερο «γιατί» και στοχευμένη εξάσκηση',next:'Δοκίμασε σύνδεση εννοιών και επανάλαβε όσα απάντησες λάθος.'}),
 extend:Object.freeze({id:'extend',label:'Προτεινόμενη εμβάθυνση',guidance:'Σύνθετα παραδείγματα και προαιρετική εφαρμογή',next:'Δοκίμασε ένα εκπαιδευτικό σενάριο και προγραμμάτισε νέα επανάληψη.'})
});
/**
 * Per-course suggested teaching depth, NOT mastery.
 * In particular, passing exams in Anatomy never upgrades Trauma or another course.
 */
export function readinessForCourse(courseId,history,getLevel){
 if(typeof courseId!=='string'||!COURSE.test(courseId))throw Error('Invalid SAEK course');
 if(typeof getLevel!=='function')throw Error('Missing existing exam engine');
 const records=history&&typeof history==='object'&&!Array.isArray(history)?history:{};
 const matches=Object.keys(records).filter(k=>k.startsWith('saek-'+courseId+'-')&&/^saek-(?:0[1-9]|1\d|20)-\d{1,2}$/.test(k)).slice(0,50);
 const questions=matches.filter(id=>{
  const h=records[id];return h&&typeof h==='object'&&!Array.isArray(h)&&
   ['correct','partial','incorrect'].some(k=>Number(h[k])>0&&Number.isFinite(Number(h[k])));
 }).map(id=>({id}));
 const {level=1,total=0,distinct=0,ratio=0}=getLevel(records,questions);
 const stage=level===3?'extend':level===2?'reinforce':'foundation';
 return Object.freeze({courseId,stage,...DEPTH[stage],total,distinct,ratio,
  estimated_only:true,clinically_qualified:false});
}
export const SAEK_DEPTH_LABELS=DEPTH;
