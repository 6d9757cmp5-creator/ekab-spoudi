/* EKAB semantic evaluation client: signed-in user -> Appwrite execution -> AI result.
   Never claim automatic grading if the backend function isn't configured.
 */
(function(){
'use strict';
const labels={correct:'Σωστή',partial:'Μερικώς σωστή',incorrect:'Λανθασμένη',uncertain:'Απαιτεί επανέλεγχο'};
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
 return result;
}
function render(container,result){
 container.replaceChildren();container.hidden=false;
 const title=document.createElement('strong');title.className='ai-grading-title';
 title.textContent='AI αξιολόγηση: '+labels[result.verdict];
 container.className='ai-grading-result ai-grading-'+result.verdict;
 container.append(title);
 const add=text=>{if(!text)return;const p=document.createElement('p');p.textContent=text;container.append(p);};
 add(result.explanation);
 if(result.verdict==='uncertain')add('Δεν προκύπτει αξιόπιστη βαθμολογία. Αν κάποιο σημείο της απάντησής σου είναι ασαφές, γράψε το πιο συγκεκριμένα και προσεκτικά και πάτησε ξανά έλεγχο.');
 for(const [key,caption] of [['correctPoints','Τι απάντησες σωστά'],['missingPoints','Τι λείπει ή χρειάζεται διόρθωση']]){
  const items=Array.isArray(result[key])?result[key].slice(0,5):[];
  if(!items.length)continue;
  const sub=document.createElement('b');sub.textContent=caption;container.append(sub);
  const ul=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=String(item).slice(0,300);ul.append(li);}container.append(ul);
 }
 if(result.criticalError)add('Προσοχή: εντοπίστηκε πιθανό σφάλμα ασφάλειας.');
 add(result.safetyNote);
 const caveat=document.createElement('small');caveat.textContent='Εκπαιδευτική εκτίμηση AI, όχι επίσημη βαθμολογία ή πιστοποίηση. Το AI μπορεί να κάνει λάθη.';container.append(caveat);
}
window.EkabAIGrade=Object.freeze({available,evaluate,render,labels});
})();
