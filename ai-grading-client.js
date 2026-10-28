/* Shared, beginner-friendly AI feedback for EOPPEP, SAEK exams and seminars.
   The backend controls the reference; student content is always rendered as text, never HTML. */
(function(){
'use strict';
const labels={correct:'Σωστή',partial:'Μερικώς σωστή',incorrect:'Χρειάζεται διόρθωση',uncertain:'Απαιτεί επανέλεγχο'};
const allowed=new Set(Object.keys(labels));
function available(){return /^[a-zA-Z0-9._-]{3,64}$/.test(window.EkabAIConfig?.functionId||'')}
async function evaluate(input){
 if(!available())throw new Error('Η αξιολόγηση με AI δεν έχει ενεργοποιηθεί ακόμη. Η απάντηση παραμένει χωρίς βαθμό.');
 if(navigator.onLine===false)throw new Error('Χρειάζεται σύνδεση στο διαδίκτυο για αξιολόγηση AI.');
 const answer=typeof input?.answer==='string'?input.answer.trim():'';
 if(answer.length<3||answer.length>3500)throw new Error('Γράψε μια απάντηση από 3 έως 3500 χαρακτήρες.');
 let client;
 try{({client}=await import('./appwrite-client.js'));}catch{throw new Error('Δεν φορτώθηκε η υπηρεσία λογαριασμού. Δοκίμασε ενημέρωση.');}
 const functionId=window.EkabAIConfig.functionId;
 const url=new URL(client.config.endpoint+'/functions/'+encodeURIComponent(functionId)+'/executions');
 const payload={body:JSON.stringify({...input,answer}),async:false,path:'/',method:'POST',headers:{'content-type':'application/json'}};
 let execution;
 try{execution=await client.call('POST',url,{'X-Appwrite-Project':client.config.project,'content-type':'application/json',accept:'application/json'},payload);}
 catch(e){
  if(e.code===401||e.code===403)throw new Error('Συνδέσου στον λογαριασμό σου για ασφαλή αξιολόγηση AI.');
  throw new Error('Δεν ήταν δυνατή η σύνδεση με την αξιολόγηση AI. Η απάντησή σου παραμένει στη συσκευή.');
 }
 let result;
 try{result=JSON.parse(execution.responseBody||'{}');}catch{throw new Error('Η υπηρεσία επέστρεψε μη αναγνωρίσιμη απάντηση.');}
 if(execution.responseStatusCode!==200||execution.status!=='completed'||!allowed.has(result.verdict)){
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
 title.textContent='Αξιολόγηση της απάντησής σου: '+labels[verdict];container.append(title);
 const add=(content,css='')=>{
  if(typeof content!=='string'||!content.trim())return;
  const p=document.createElement('p');if(css)p.className=css;
  p.textContent=content.trim();container.append(p);
 };
 const section=(caption,value,css='')=>{
  if(typeof value!=='string'||!value.trim())return;
  const block=document.createElement('section');block.className='ai-grading-section'+(css?' '+css:'');
  const heading=document.createElement('strong');heading.className='ai-grading-heading';heading.textContent=caption;
  const p=document.createElement('p');p.textContent=value.trim();
  block.append(heading,p);container.append(block);
 };
 const points=(caption,values,css='')=>{
  const filtered=Array.isArray(values)?values.filter(x=>typeof x==='string'&&x.trim()).slice(0,5):[];
  if(!filtered.length)return;
  const block=document.createElement('section');block.className='ai-grading-section'+(css?' '+css:'');
  const heading=document.createElement('strong');heading.className='ai-grading-heading';heading.textContent=caption;
  const ul=document.createElement('ul');
  for(const item of filtered){const li=document.createElement('li');li.textContent=item.trim().slice(0,300);ul.append(li);}
  block.append(heading,ul);container.append(block);
 };
 section('Η απάντησή σου',result.studentAnswer,'ai-grading-student');
 const suggested=result.modelAnswer||result.referenceAnswer;
 section(verdict==='uncertain'?'Εκπαιδευτική απάντηση αναφοράς (όχι βαθμολογία)':'Ενδεικτική σωστή απάντηση',suggested,'ai-grading-reference');
 section('Γιατί;',result.explanation,'ai-grading-why');
 if(verdict==='partial'||verdict==='correct')points('Τι έγραψες σωστά',result.correctPoints,'ai-grading-good');
 if(verdict==='incorrect'||verdict==='partial')points('Τι χρειάζεται διόρθωση',result.missingPoints,'ai-grading-needs');
 section('Παράδειγμα για να το καταλάβεις',result.example,'ai-grading-example');
 section('Τι να θυμάσαι',result.takeaway,'ai-grading-takeaway');
 if(verdict==='uncertain')add('Δεν καταχωρίζεται αυτόματα βαθμολογία. Διευκρίνισε την απάντησή σου και δοκίμασε ξανά.');
 if(result.criticalError)add('Προσοχή: εντοπίστηκε πιθανό σφάλμα ασφάλειας. Συμβουλέψου την εκπαιδευτική πηγή και τον εκπαιδευτή.','ai-grading-warning');
 add(result.safetyNote,'ai-grading-safety');
 const caveat=document.createElement('small');
 caveat.textContent='Εκπαιδευτική εκτίμηση AI, όχι επίσημη βαθμολογία ή πιστοποίηση. Το AI μπορεί να κάνει λάθη.';
 container.append(caveat);
}
window.EkabAIGrade=Object.freeze({available,evaluate,render,labels});
})();
