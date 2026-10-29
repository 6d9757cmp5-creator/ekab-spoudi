/* Shared, beginner-friendly AI feedback for EOPPEP, SAEK exams and seminars.
   The backend controls the reference; student content is always rendered as text, never HTML. */
(function(){
'use strict';
const labels={correct:'Σωστή',partial:'Μερικώς σωστή',incorrect:'Χρειάζεται διόρθωση',uncertain:'Απαιτεί επανέλεγχο'};
const allowed=new Set(Object.keys(labels));
const AI_LIMIT_MESSAGE="Μικρό διάλειμμα από την αξιολόγηση! 📚 Οι διαθέσιμες αξιολογήσεις έχουν φτάσει προσωρινά στο όριό τους. Είναι μια καλή ευκαιρία να κάνεις μια επανάληψη στη θεωρία σου και να επιστρέψεις αργότερα για νέα προσπάθεια. Η απάντησή σου παραμένει αποθηκευμένη και δεν έχει βαθμολογηθεί.";
const STUDENT_LIMIT_MESSAGE="Μικρό διάλειμμα από την αξιολόγηση! 📚 Οι διαθέσιμες αξιολογήσεις έχουν φτάσει προσωρινά στο όριό τους. Είναι μια καλή ευκαιρία να κάνεις μια επανάληψη στη θεωρία σου και να επιστρέψεις αργότερα για νέα προσπάθεια. Η απάντησή σου παραμένει αποθηκευμένη και δεν έχει βαθμολογηθεί.";
function available(){return /^[a-zA-Z0-9._-]{3,64}$/.test(window.EkabAIConfig?.functionId||'')||
 /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]+\.workers\.dev\/?$/.test(window.EkabAIConfig?.workerUrl||'')}
async function evaluate(input){
 if(!available())throw new Error('Η υπηρεσία αξιολόγησης δεν είναι διαθέσιμη αυτή τη στιγμή. Η απάντηση παραμένει χωρίς βαθμό.');
 if(navigator.onLine===false)throw new Error('Χρειάζεται σύνδεση στο διαδίκτυο για αξιολόγηση AI.');
 const answer=typeof input?.answer==='string'?input.answer.trim():'';
 if(answer.length<3||answer.length>3500)throw new Error('Γράψε μια απάντηση από 3 έως 3500 χαρακτήρες.');
 let client;
 try{({client}=await import('./appwrite-client.js'));}catch{throw new Error('Δεν φορτώθηκε η υπηρεσία λογαριασμού. Δοκίμασε ενημέρωση.');}
 const workerUrl=window.EkabAIConfig.workerUrl;
 if(workerUrl){
  try{
  let jwt;
  try{
   const {Account}=await import('./vendor/appwrite-29.1.0/account.js');
   jwt=(await new Account(client).createJWT()).jwt;
  }catch{throw new Error('Συνδέσου στον λογαριασμό σου για ασφαλή αξιολόγηση AI.');}
  let response;
  try{response=await fetch(workerUrl,{method:'POST',headers:{'Content-Type':'application/json','X-Appwrite-JWT':jwt},
   body:JSON.stringify({...input,answer}),cache:'no-store'});}
  catch{throw new Error('Δεν ήταν δυνατή η σύνδεση με την υπηρεσία αξιολόγησης. Η απάντησή σου παραμένει στη συσκευή.');}
  let result;
  try{result=await response.json();}catch{throw new Error('Η υπηρεσία επέστρεψε μη αναγνωρίσιμη απάντηση.');}
  if(!response.ok||!allowed.has(result.verdict)){
   if(result.code==='all_ai_limits')throw new Error(AI_LIMIT_MESSAGE);
   if(result.code==='student_ai_limit'||response.status===429)throw new Error(STUDENT_LIMIT_MESSAGE);
   if(response.status===401||response.status===403)throw new Error('Συνδέσου στον λογαριασμό σου για ασφαλή αξιολόγηση AI.');
   throw new Error(result.error||'Η αξιολόγηση δεν ολοκληρώθηκε. Η απάντηση παραμένει χωρίς βαθμολογία.');
  }
  if(result.criticalError&&result.verdict==='correct')result.verdict='uncertain';
  return {...result,studentAnswer:answer};
  }catch(error){
   // Keep the existing Appwrite grader available if the new Worker is temporarily unavailable.
   if(error.message==='Συνδέσου στον λογαριασμό σου για ασφαλή αξιολόγηση AI.'||error.message===STUDENT_LIMIT_MESSAGE)throw error;
  }
 }
 const functionId=window.EkabAIConfig.functionId;
 const url=new URL(client.config.endpoint+'/functions/'+encodeURIComponent(functionId)+'/executions');
 const payload={body:JSON.stringify({...input,answer}),async:false,path:'/',method:'POST',headers:{'content-type':'application/json'}};
 let execution;
 try{execution=await client.call('POST',url,{'X-Appwrite-Project':client.config.project,'content-type':'application/json',accept:'application/json'},payload);}
 catch(e){
  if(e.code===401||e.code===403)throw new Error('Συνδέσου στον λογαριασμό σου για ασφαλή αξιολόγηση AI.');
  if(e.code===429)throw new Error(STUDENT_LIMIT_MESSAGE);
  throw new Error('Δεν ήταν δυνατή η σύνδεση με την υπηρεσία αξιολόγησης. Η απάντησή σου παραμένει στη συσκευή.');
 }
 let result;
 try{result=JSON.parse(execution.responseBody||'{}');}catch{throw new Error('Η υπηρεσία επέστρεψε μη αναγνωρίσιμη απάντηση.');}
 if(execution.responseStatusCode!==200||execution.status!=='completed'||!allowed.has(result.verdict)){
  // Only explicit limit codes display the study-break message. Network,
  // provider failures, and invalid responses retain their own clear errors.
  if(result.code==='all_ai_limits')throw new Error(AI_LIMIT_MESSAGE);
  if(result.code==='student_ai_limit'||execution.responseStatusCode===429)throw new Error(STUDENT_LIMIT_MESSAGE);
  throw new Error(result.error||'Η αξιολόγηση δεν ολοκληρώθηκε. Η απάντηση παραμένει χωρίς βαθμολογία.');
 }
 if(result.criticalError&&result.verdict==='correct')result.verdict='uncertain';
 // Only appended in the browser. The server does not receive any extra personal history.
 return {...result,studentAnswer:answer};
}
function render(container,result){
 if(!container||!result)return;
 container.replaceChildren();container.hidden=false;
 const verdict=allowed.has(result.verdict)?result.verdict:'uncertain';
 container.className='ai-grading-result ai-grading-'+verdict;
 const title=document.createElement('strong');title.className='ai-grading-title';
 title.textContent='Αποτέλεσμα αξιολόγησης: '+(verdict==='uncertain'?'Χωρίς βαθμολογία':labels[verdict]);
 container.append(title);
 const section=(heading,body,css='')=>{
  if(typeof body!=='string'||!body.trim())return;
  const block=document.createElement('section');block.className='ai-grading-section'+(css?' '+css:'');
  const name=document.createElement('strong');name.className='ai-grading-heading';name.textContent=heading;
  const para=document.createElement('p');para.textContent=body.trim();
  block.append(name,para);container.append(block);
 };
 section('Η απάντησή σου',result.studentAnswer,'ai-grading-student');
 // Prefer the reviewed, server-controlled educational reference when available.
 const correct=result.referenceAnswer||result.modelAnswer;
 section('Σωστή απάντηση',correct,'ai-grading-reference');
 section('Γιατί',result.explanation,'ai-grading-why');
 const takeaway=typeof result.takeaway==='string'&&result.takeaway.trim()?result.takeaway:
   Array.isArray(result.missingPoints)&&result.missingPoints.length?result.missingPoints[0]:'';
 // The takeaway only appears if it adds information, avoiding repeated paragraphs.
 if(takeaway&&takeaway.trim()!==correct?.trim()&&takeaway.trim()!==result.explanation?.trim())
  section('Τι να θυμάσαι',takeaway,'ai-grading-takeaway');
 if(result.criticalError){
  const warning=document.createElement('p');warning.className='ai-grading-warning';
  warning.textContent='Προσοχή: πιθανό κρίσιμο σφάλμα ασφάλειας. Συμβουλεύσου το εκπαιδευτικό υλικό και τον εκπαιδευτή.';
  container.append(warning);
 }
 if(verdict==='uncertain'){
  const note=document.createElement('p');note.className='ai-grading-ungraded';
  note.textContent='Δεν καταχωρίστηκε βαθμολογία. Συνέχισε στην επόμενη ερώτηση.';
  container.append(note);
 }
 const caveat=document.createElement('small');
 caveat.textContent='Εκπαιδευτική αξιολόγηση, όχι επίσημη βαθμολογία ή πιστοποίηση.';
 container.append(caveat);
}
window.EkabAIGrade=Object.freeze({available,evaluate,render,labels});
})();

