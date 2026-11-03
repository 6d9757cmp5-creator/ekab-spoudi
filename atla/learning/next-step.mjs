/**
 * ATLA — read-only study guidance.
 * Derives next actions from EXISTING SAEK/EOPPEP state. Does not write or grade.
 * Aggregate recommendations stay local to the user's browser; no AI requests.
 */
export const EOP_LIMITS=Object.freeze({A:105,B:209});
const COURSE=/^(0[1-9]|1[0-9]|20)$/;
export function validQuestion(id){
 const match=/^EOP-([AB])-(\d{3})$/.exec(String(id||''));
 return Boolean(match&&Number(match[2])>=1&&Number(match[2])<=EOP_LIMITS[match[1]]);
}
export function validChapterId(id){return /^ekab\.saek\.read\.v1\.(0[1-9]|1\d|20)\.([1-9]|[1-9]\d)$/.test(String(id||''));}
export function readDestination(resume){
 if(!resume||typeof resume!=='object')return null;
 if(resume.kind==='saek'&&COURSE.test(String(resume.course))&&Number.isInteger(Number(resume.chapter))&&Number(resume.chapter)>=1&&Number(resume.chapter)<=50){
  return {href:'saek-course-'+resume.course+'.html#lesson-'+Number(resume.chapter),label:'Συνέχεια κεφαλαίου ΣΑΕΚ',source:'resume'};
 }
 if(resume.kind==='eoppep'&&resume.mode==='reader'&&validQuestion(resume.question)){
  return {href:'theory.html?question='+encodeURIComponent(resume.question),label:'Συνέχεια μελέτης ΕΟΠΠΕΠ',source:'resume'};
 }
 if(resume.kind==='eoppep'&&resume.mode==='catalog')return {href:'theory.html?view=catalog',label:'Συνέχεια θεωρίας ΕΟΠΠΕΠ',source:'resume'};
 return null;
}
export function analyseLearning({eopRecords={},saekReadKeys=[],saekHistory={},resume=null,scheduler=null,now=new Date()}={}){
 const keys=Array.isArray(saekReadKeys)?saekReadKeys:[];
 const seen=new Set(keys.filter(validChapterId));
 const read=seen.size;
 const records=eopRecords&&typeof eopRecords==='object'&&!Array.isArray(eopRecords)?eopRecords:{};
 const due=[],weak=[],examMistakes=[];
 let studied=0,attempted=0,mastered=0;
 for(const [id,value] of Object.entries(records)){
  if(!validQuestion(id)||!value||typeof value!=='object'||Array.isArray(value))continue;
  const attempts=Number(value.selfAttempts);
  if(Number.isFinite(attempts)&&attempts>0)attempted++;
  try{
   if(scheduler?.evaluate?.(value,now)?.studied)studied++;
   if(scheduler?.evaluate?.(value,now)?.mastered)mastered++;
   if(scheduler?.isDue?.(value,now))due.push({id,at:Date.parse(value.nextReviewAt||'')||0});
  }catch{/* No false claims of due reviews if scheduler is unavailable. */}
 }
 const history=saekHistory&&typeof saekHistory==='object'?saekHistory:{};
 for(const [id,value] of Object.entries(history)){
  if(!/^saek-(0[1-9]|1\d|20)-([1-9]|[1-9]\d)$/.test(id)||!value||typeof value!=='object')continue;
  if(Number(value.incorrect)>0)examMistakes.push(id);
 }
 due.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 examMistakes.sort();
 const target=readDestination(resume);
 const saekResume=target?.href.startsWith('saek-course-')?target:null;
 const eopResume=target?.href.startsWith('theory.html')?target:null;
 const dueFirst=due[0]?.id;
 const saekRecommendation=saekResume||{
  href:examMistakes.length?'saek-exams.html':'saek.html',
  label:examMistakes.length?'Επανέλαβε ερωτήσεις ΣΑΕΚ':'Διάλεξε κεφάλαιο ΣΑΕΚ',
  source:examMistakes.length?'historical-errors':'course-browser'
 };
 const eopRecommendation=dueFirst?{
  href:'theory.html?question='+encodeURIComponent(dueFirst),
  label:'Επανάλαβε την ερώτηση '+dueFirst.replace('EOP-','').replace('-',' · '),
  source:'due-review'
 }:(eopResume||{href:'eoppep.html',label:'Άνοιξε προετοιμασία ΕΟΠΠΕΠ',source:'course-browser'});
 return {
  saek:{read,readTotal:247,examMistakes:examMistakes.length,recommendation:saekRecommendation},
  eoppep:{studied,mastered,attempted,due:due.length,firstDue:dueFirst||'',recommendation:eopRecommendation},
  resume:target
 };
}
export function choosePrimary(stats,goal=''){
 if(goal==='saek'||goal==='eoppep')return {goal,...stats[goal].recommendation};
 if(stats.eoppep.due)return {goal:'eoppep',...stats.eoppep.recommendation};
 if(stats.resume?.href?.startsWith('saek-course-'))return {goal:'saek',...stats.saek.recommendation};
 if(stats.resume?.href?.startsWith('theory.html'))return {goal:'eoppep',...stats.eoppep.recommendation};
 if(stats.saek.examMistakes)return {goal:'saek',...stats.saek.recommendation};
 return {goal:'saek',...stats.saek.recommendation};
}
