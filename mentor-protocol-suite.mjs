/** Independent Protocol Lab + review with optional MENTOR guidance.
 * Scripted source-literacy and communication practice, NOT a clinical decision engine.
 * No backend, AI chat, diagnosis, treatment, or changes to SAEK/EOPPEP marks.
 */
import {getTopic} from './protocols-data.mjs';
import {contextFromQuery,makeJourneyUrl,returnPage} from './mentor/context/journey.mjs';
import {createStages,roleFor} from './mentor-scenario-paths.mjs';
import {speakGreek,stopGreek} from './mentor-voice.mjs';
import {downloadDebriefReport} from './mentor-debrief-export.mjs';
import {mountInterview,restoreInterview} from './mentor-patient-interview.mjs';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const topic=getTopic(params.get('topic'));
const view=params.get('view')==='debrief'?'debrief':'lab';
const journeyContext=contextFromQuery(params)||{topic:topic.id,from:'',focus:''};
// v2 attempts are independent per role; old v1 attempts remain untouched.
const role=roleFor(params.get('role')).id;
const storeKey='ekab:mentor:protocol-foundation:v2:'+topic.id+':'+role;
const stages=createStages(topic,role);
function emptySession(){return{version:2,topic:topic.id,role,mode:'guided',index:0,answers:[],completed:false,updated:new Date().toISOString()};}
function read(){
 try{
  const obj=JSON.parse(localStorage.getItem(storeKey)||'null');
  if(!obj||obj.version!==2||obj.topic!==topic.id||obj.role!==role||!Array.isArray(obj.answers))return emptySession();
  const answers=obj.answers.slice(0,stages.length).filter((a,i)=>a&&a.stage===i&&stages[i].choices.some(c=>c[0]===a.choice));
  return{...emptySession(),mode:obj.mode==='assessment'?'assessment':'guided',answers,index:Math.min(stages.length,answers.length),completed:answers.length===stages.length};
 }catch{return emptySession();}
}
let session=read();
function save(){
 session.updated=new Date().toISOString();
 try{localStorage.setItem(storeKey,JSON.stringify(session));$('lab-storage').textContent='Αποθήκευση σε αυτή τη συσκευή · ξεχωριστά από ΣΑΕΚ/ΕΟΠΠΕΠ.';}
 catch{$('lab-storage').textContent='Η αποθήκευση δεν είναι διαθέσιμη στον browser. Η προσπάθεια ισχύει μόνο όσο μένει ανοιχτή η σελίδα.';}
}
const href=(kind)=>makeJourneyUrl('mentor-protocol-suite.html',journeyContext,kind)+'&role='+encodeURIComponent(role);
$('suite-title').textContent=view==='lab'?'Εργαστήριο Πρωτοκόλλων':'Ανασκόπηση Πρωτοκόλλου';
$('suite-topic').textContent=topic.name;
$('suite-context').textContent='Εκπαιδευτικό σενάριο: '+topic.scenario+'. Εστίαση: '+topic.focus+'.'+
 (journeyContext.focus?' Συνδεδεμένη ενότητα: '+journeyContext.focus+'.':'');
const returnHref=returnPage(journeyContext);
if(returnHref){
 const back=document.createElement('a');
 back.href=new URL(returnHref,location.href).href;
 back.textContent='← Πίσω στην αρχική εκπαιδευτική ενότητα';
 back.style.cssText='display:inline-block;margin:7px 12px 10px 0;padding:9px 12px;border-radius:10px;background:#e3f1ef;color:#135868;font-weight:800;text-decoration:none;';
 $('suite-context').insertAdjacentElement('afterend',back);
}
$('suite-lab-link').href=href('lab');$('suite-debrief-link').href=href('debrief');
$('suite-lab-link').removeAttribute('aria-current');$('suite-debrief-link').removeAttribute('aria-current');
$(view==='lab'?'suite-lab-link':'suite-debrief-link').setAttribute('aria-current','page');
$('suite-mentor-link').href=makeJourneyUrl('mentor-lab.html',journeyContext);
$('lab-screen').hidden=view!=='lab';$('debrief-screen').hidden=view!=='debrief';
$('debrief-repeat').href=href('lab');
function mentorSay(msg){$('mentor-comment').textContent=msg;}
function option(chosen,index){return stages[index].choices.find(c=>c[0]===chosen);}
function showLab(){
 const completed=session.index>=stages.length;
 $('lab-stage').textContent=completed?'Ολοκληρώθηκε':'Στάδιο '+(session.index+1)+' / '+stages.length;
 $('lab-progress').style.width=Math.round(100*session.index/stages.length)+'%';
 $('lab-mode').value=session.mode;
 $('lab-role').value=role;
 $('lab-role-note').textContent=roleFor(role).description+' Πρόκειται για εκπαιδευτική οπτική, όχι πιστοποίηση αρμοδιοτήτων.';
 $('lab-mode').disabled=session.answers.length>0;
 $('lab-choices').replaceChildren();
 $('lab-feedback').hidden=true;
 $('lab-next').hidden=true;
 if(completed){
  $('lab-header').textContent='Η εξάσκηση ολοκληρώθηκε';
  $('lab-prompt').textContent='Οι τέσσερις αποφάσεις καταγράφηκαν. Η ανάλυση βρίσκεται στο Ανασκόπηση Πρωτοκόλλου.';
  const a=document.createElement('a');a.className='btn';a.href=href('debrief');a.textContent='Άνοιγμα Ανασκόπηση Πρωτοκόλλου';
  $('lab-choices').append(a);
  mentorSay('Ολοκλήρωσες την άσκηση. Στο DEBRIEF θα εξετάσουμε τη λογική κάθε επιλογής.');
  return;
 }
 const stage=stages[session.index];
 $('lab-header').textContent=stage.title;$('lab-prompt').textContent=stage.prompt;
 if(session.mode==='guided')mentorSay('Σκέψου τι μπορείς να τεκμηριώσεις. '+stage.title+'.');
 else mentorSay('Αυτοαξιολόγηση: διάλεξε μία απάντηση. Η αιτιολόγηση εμφανίζεται στην ανασκόπηση.');
 for(const choice of stage.choices){
  const button=document.createElement('button');button.className='choice';button.type='button';
  button.textContent=choice[1];button.addEventListener('click',()=>choose(choice[0]));
  $('lab-choices').append(button);
 }
}
function choose(choiceId){
 if(session.index>=stages.length)return;
 const stage=stages[session.index],chosen=option(choiceId,session.index);
 if(!chosen)return;
 const current=session.index;
 session.answers.push({stage:current,choice:choiceId,pass:chosen[2],dimension:stage.dimension});
 session.index+=1;session.completed=session.index>=stages.length;save();
 [...$('lab-choices').querySelectorAll('button')].forEach(b=>b.disabled=true);
 const feedback=session.mode==='guided'?chosen[3]:'Η επιλογή σου καταγράφηκε. Η αναλυτική αιτιολόγηση θα εμφανιστεί στο DEBRIEF.';
 $('lab-feedback').textContent=feedback;$('lab-feedback').className='feedback'+(chosen[2]?'':' review');$('lab-feedback').hidden=false;
 mentorSay(feedback);
 $('lab-stage').textContent='Ολοκληρώθηκε το βήμα '+session.index+' / '+stages.length;
 $('lab-progress').style.width=Math.round(100*session.index/stages.length)+'%';
 $('lab-next').textContent=session.completed?'Δες το Ανασκόπηση Πρωτοκόλλου':'Επόμενο εκπαιδευτικό βήμα →';
 $('lab-next').hidden=false;
}
function readStoredInterview(){
 try{
  const key='ekab:mentor:interview:v1:'+topic.id+':'+role;
  return restoreInterview(JSON.parse(localStorage.getItem(key)||'null'),topic,role);
 }catch{return restoreInterview(null,topic,role);}
}
function renderInterviewReview(interview){
 const list=$('debrief-interview-history');list.replaceChildren();
 if(!interview.turns.length){const li=document.createElement('li');li.textContent='Δεν έχει καταγραφεί συνθετική συνομιλία για αυτό το επίπεδο μαθητή.';list.append(li);return;}
 for(const turn of interview.turns){
  const li=document.createElement('li'),heading=document.createElement('strong'),body=document.createElement('p');
  heading.textContent=(turn.stage+1)+'. '+(turn.ok?'Εκπαιδευτικός στόχος':'Για επανάληψη');
  body.textContent=turn.reply+' '+turn.feedback;
  li.append(heading,body);list.append(li);
 }
}
function renderDebrief(){
 const interview=readStoredInterview();
 renderInterviewReview(interview);
 $('debrief-export').disabled=!(session.answers.length||interview.turns.length);
 const summary=$('debrief-summary'),history=$('debrief-history');summary.replaceChildren();history.replaceChildren();
 if(!session.answers.length){
  const p=document.createElement('p');p.textContent='Δεν έχεις ακόμη καταχωρισμένη προσπάθεια για αυτό το θέμα. Μπορείς να ξεκινήσεις από το PROTOCOL LAB.';history.append(p);
  $('debrief-advice').textContent='Ο MENTOR θα δείξει αναλυτικά τα βήματα όταν ολοκληρώσεις την πρώτη άσκηση.';
  mentorSay('Δεν υπάρχουν αποφάσεις για ανασκόπηση. Ξεκίνα μια εκπαιδευτική αποστολή.');
  return;
 }
 const pass=session.answers.filter(a=>a.pass).length;
 const metrics=[['Βήματα',session.answers.length+'/'+stages.length],['Εκπαιδευτικές επιλογές',pass+'/'+session.answers.length],['Για επανάληψη',session.answers.length-pass]];
 for(const [label,value] of metrics){
  const div=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');
  strong.textContent=value;span.textContent=label;div.append(strong,span);summary.append(div);
 }
 session.answers.forEach(a=>{
  const stage=stages[a.stage],picked=option(a.choice,a.stage);
  const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('p'),review=document.createElement('p');
  title.textContent=(a.stage+1)+'. '+stage.dimension+' · '+(a.pass?'Εκπαιδευτικός στόχος':'Χρειάζεται επανάληψη');
  detail.textContent='Επιλογή: '+(picked?.[1]||'Απροσδιόριστη');
  review.textContent=picked?.[3]||'Δεν υπάρχουν σχόλια';
  li.append(title,detail,review);history.append(li);
 });
 const weak=session.answers.find(a=>!a.pass);
 const message=weak?'MENTOR: Σημείο προς επανάληψη — '+stages[weak.stage].dimension+'. Αναθεώρησε την επιλογή, έλεγξε την πρωτογενή πηγή και ξαναδοκίμασε.':
 'MENTOR: Ολοκλήρωσες τους εκπαιδευτικούς στόχους αυτής της δοκιμής. Αυτό δεν αποτελεί κλινική πιστοποίηση.';
 $('debrief-advice').textContent=message;mentorSay(message);
 if(weak){
  const button=document.createElement('button');button.type='button';button.className='btn soft';
  button.textContent='Επανέλαβε από το βήμα '+(weak.stage+1);
  button.addEventListener('click',()=>{
   session.answers=session.answers.slice(0,weak.stage);session.index=weak.stage;session.completed=false;save();location.href=href('lab');
  });
  $('debrief-repeat').insertAdjacentElement('afterend',button);
 }
}
$('lab-role').addEventListener('change',e=>{
 const selected=roleFor(e.target.value).id;
 if(selected!==role)location.href='mentor-protocol-suite.html?topic='+encodeURIComponent(topic.id)+'&view='+view+'&role='+encodeURIComponent(selected);
});
$('lab-mode').addEventListener('change',e=>{if(!session.answers.length){session.mode=e.target.value;save();showLab();}});
$('lab-next').addEventListener('click',()=>{if(session.completed)location.href=href('debrief');else showLab();});
$('lab-restart').addEventListener('click',()=>{
 if(session.answers.length&&!confirm('Να ξεκινήσεις ξανά; Θα αντικατασταθεί μόνο η τοπική δοκιμή αυτού του πρωτοκόλλου.'))return;
 const mode=session.mode;session=emptySession();session.mode=mode;save();showLab();
});
$('debrief-export').addEventListener('click',()=>{
 try{
  const filename=downloadDebriefReport({topic,role:roleFor(role),session,stages,interviewTurns:readStoredInterview().turns});
  $('debrief-export-status').textContent='Δημιουργήθηκε στη συσκευή σου το αρχείο '+filename+'. Δεν περιλαμβάνει δεδομένα ασθενών.';
 }catch{
  $('debrief-export-status').textContent='Δεν υπάρχουν έγκυρες εκπαιδευτικές επιλογές για εξαγωγή.';
 }
});
$('mentor-speak').addEventListener('click',()=>{
 const text=$('mentor-comment').textContent;
 const started=speakGreek(text,{env:window,requireMale:true,requireGreek:true,rate:.96,onError:()=>{$('mentor-voice-status').textContent='Η ελληνική φωνή δεν ήταν διαθέσιμη στη συσκευή.';}});
 $('mentor-voice-status').textContent=started?'Αναπαραγωγή ελληνικής φωνής MENTOR…':'Δεν βρέθηκε συμβατή ανδρική ελληνική φωνή. Το σχόλιο παραμένει διαθέσιμο ως κείμενο.';
});
$('mentor-stop').addEventListener('click',()=>{stopGreek(window);$('mentor-voice-status').textContent='Η ομιλία σταμάτησε.';});
window.addEventListener('pagehide',()=>stopGreek(window));
if(view==='lab'){
 showLab();
 mountInterview(document.getElementById('mentor-interview-root'),{topic,role});
}else renderDebrief();
