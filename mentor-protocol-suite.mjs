/** MENTOR shared foundation lab + debrief.
 * Scripted source-literacy and communication practice, NOT a clinical decision engine.
 * No backend, AI chat, diagnosis, treatment, or changes to SAEK/EOPPEP marks.
 */
import {getTopic} from './protocols-data.mjs';
import {speakGreek,stopGreek} from './mentor-voice.mjs';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const topic=getTopic(params.get('topic'));
const view=params.get('view')==='debrief'?'debrief':'lab';
const storeKey='ekab:mentor:protocol-foundation:v1:'+topic.id;
const stages=[
 {title:'Πηγή και εγκυρότητα',prompt:'Πριν από τη μελέτη του θέματος, τι χρειάζεται να εξακριβώσεις;',dimension:'Τεκμηρίωση',choices:[
  ['source','Πρωτογενής πηγή, ισχύουσα έκδοση και φορέας έγκρισης.',true,'Σωστή πρακτική τεκμηρίωσης: η εκπαιδευτική ύλη δεν αποδεικνύει αυτόματα επιχειρησιακή έγκριση.'],
  ['social','Μια ανάρτηση χωρίς ημερομηνία και συγγραφέα.',false,'Η ανώνυμη ανάρτηση δεν αρκεί για επίσημη κλινική τεκμηρίωση.'],
  ['memory','Ό,τι θυμάμαι από προηγούμενο μάθημα, χωρίς επαλήθευση.',false,'Η μνήμη βοηθά τη μελέτη, αλλά όχι την επιβεβαίωση της ισχύουσας έκδοσης.']
 ]},
 {title:'Οργάνωση πληροφοριών',prompt:'Εκπαιδευτικό πλαίσιο: '+topic.scenario+'. Ποια αναφορά βοηθά περισσότερο την ομάδα;',dimension:'Επικοινωνία',choices:[
  ['report','Σαφείς παρατηρήσεις, χρονική ακολουθία και ό,τι γνωρίζουμε ή δεν γνωρίζουμε.',true,'Η δομημένη, ακριβής παράδοση μειώνει τις παρανοήσεις. Δεν προκύπτει διάγνωση από την άσκηση.'],
  ['guess','Μια βέβαιη διάγνωση χωρίς επαρκή δεδομένα.',false,'Δεν αποδίδουμε βεβαιότητα που δεν τεκμηριώνεται από την εκπαιδευτική αναφορά.'],
  ['omit','Παραλείπω τις αβεβαιότητες για να τελειώσω γρήγορα.',false,'Οι αβεβαιότητες αποτελούν κρίσιμο στοιχείο διαφανούς επικοινωνίας.']
 ]},
 {title:'Όρια ρόλου και ασφάλεια',prompt:'Στο πλαίσιο της άσκησης προκύπτει ερώτηση για ιατρική ενέργεια εκτός των επαληθευμένων αρμοδιοτήτων σου. Τι κάνεις;',dimension:'Ασφάλεια',choices:[
  ['scope','Ελέγχω αρμοδιότητα, εκπαίδευση και ισχύουσες οδηγίες· αναζητώ την αρμόδια καθοδήγηση.',true,'Ο ρόλος και οι εξουσιοδοτήσεις πρέπει να επιβεβαιώνονται πριν από οποιαδήποτε πραγματική κλινική εφαρμογή.'],
  ['invent','Αυτοσχεδιάζω δοσολογία ή επεμβατική ενέργεια.',false,'Η εκπαιδευτική εφαρμογή δεν εγκρίνει αυτοσχεδιασμό σε φάρμακα ή επεμβατικές πράξεις.'],
  ['copy','Αντιγράφω μη ελεγμένη διαδικασία από μια τυχαία ιστοσελίδα.',false,'Μη επαληθευμένο υλικό δεν υποκαθιστά επίσημο πρωτόκολλο και επαγγελματική εκπαίδευση.']
 ]},
 {title:'Κριτικός αναστοχασμός',prompt:'Στο τέλος της μελέτης ποια είναι η χρησιμότερη επόμενη κίνηση;',dimension:'Αναστοχασμός',choices:[
  ['reflect','Ελέγχω όσα δεν κατάλαβα, συγκρίνω με την πηγή και επαναλαμβάνω τα δύσκολα βήματα.',true,'Η στοχευμένη επανάληψη βοηθά να εδραιώσεις την εκπαιδευτική γνώση.'],
  ['badge','Θεωρώ τη δοκιμή πιστοποίηση κλινικής επάρκειας.',false,'Η βαθμολογία αυτής της άσκησης δεν αποτελεί πιστοποίηση ή άδεια άσκησης επαγγέλματος.'],
  ['skip','Δεν ανατρέχω ποτέ ξανά στις πηγές επειδή ολοκλήρωσα μία δοκιμή.',false,'Οι πηγές και η εκπαίδευση χρειάζονται επανέλεγχο και επανάληψη.']
 ]}
];
function emptySession(){return{version:1,topic:topic.id,mode:'guided',index:0,answers:[],completed:false,updated:new Date().toISOString()};}
function read(){
 try{
  const obj=JSON.parse(localStorage.getItem(storeKey)||'null');
  if(!obj||obj.version!==1||obj.topic!==topic.id||!Array.isArray(obj.answers))return emptySession();
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
const href=(kind)=>'mentor-protocol-suite.html?topic='+encodeURIComponent(topic.id)+'&view='+kind;
$('suite-title').textContent=view==='lab'?'MENTOR | PROTOCOL LAB':'MENTOR DEBRIEF';
$('suite-topic').textContent=topic.name;
$('suite-context').textContent='Εκπαιδευτικό σενάριο: '+topic.scenario+'. Εστίαση: '+topic.focus+'.';
$('suite-lab-link').href=href('lab');$('suite-debrief-link').href=href('debrief');
$('suite-lab-link').removeAttribute('aria-current');$('suite-debrief-link').removeAttribute('aria-current');
$(view==='lab'?'suite-lab-link':'suite-debrief-link').setAttribute('aria-current','page');
$('suite-mentor-link').href='mentor-lab.html?topic='+encodeURIComponent(topic.id)+'#mentor-presence';
$('lab-screen').hidden=view!=='lab';$('debrief-screen').hidden=view!=='debrief';
$('debrief-repeat').href=href('lab');
function mentorSay(msg){$('mentor-comment').textContent=msg;}
function option(chosen,index){return stages[index].choices.find(c=>c[0]===chosen);}
function showLab(){
 const completed=session.index>=stages.length;
 $('lab-stage').textContent=completed?'Ολοκληρώθηκε':'Στάδιο '+(session.index+1)+' / '+stages.length;
 $('lab-progress').style.width=Math.round(100*session.index/stages.length)+'%';
 $('lab-mode').value=session.mode;
 $('lab-mode').disabled=session.answers.length>0;
 $('lab-choices').replaceChildren();
 $('lab-feedback').hidden=true;
 $('lab-next').hidden=true;
 if(completed){
  $('lab-header').textContent='Η εξάσκηση ολοκληρώθηκε';
  $('lab-prompt').textContent='Οι τέσσερις αποφάσεις καταγράφηκαν. Η ανάλυση βρίσκεται στο MENTOR DEBRIEF.';
  const a=document.createElement('a');a.className='btn';a.href=href('debrief');a.textContent='Άνοιγμα MENTOR DEBRIEF';
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
 $('lab-next').textContent=session.completed?'Δες το MENTOR DEBRIEF':'Επόμενο εκπαιδευτικό βήμα →';
 $('lab-next').hidden=false;
}
function renderDebrief(){
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
$('lab-mode').addEventListener('change',e=>{if(!session.answers.length){session.mode=e.target.value;save();showLab();}});
$('lab-next').addEventListener('click',()=>{if(session.completed)location.href=href('debrief');else showLab();});
$('lab-restart').addEventListener('click',()=>{
 if(session.answers.length&&!confirm('Να ξεκινήσεις ξανά; Θα αντικατασταθεί μόνο η τοπική δοκιμή αυτού του θέματος MENTOR.'))return;
 const mode=session.mode;session=emptySession();session.mode=mode;save();showLab();
});
$('mentor-speak').addEventListener('click',()=>{
 const text=$('mentor-comment').textContent;
 const started=speakGreek(text,{env:window,requireMale:true,requireGreek:true,rate:.96,onError:()=>{$('mentor-voice-status').textContent='Η ελληνική φωνή δεν ήταν διαθέσιμη στη συσκευή.';}});
 $('mentor-voice-status').textContent=started?'Αναπαραγωγή ελληνικής φωνής MENTOR…':'Δεν βρέθηκε συμβατή ανδρική ελληνική φωνή. Το σχόλιο παραμένει διαθέσιμο ως κείμενο.';
});
$('mentor-stop').addEventListener('click',()=>{stopGreek(window);$('mentor-voice-status').textContent='Η ομιλία σταμάτησε.';});
window.addEventListener('pagehide',()=>stopGreek(window));
if(view==='lab')showLab();else renderDebrief();
