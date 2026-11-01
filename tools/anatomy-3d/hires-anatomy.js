/* ΕΚΑΒ Σπουδή: anatomy mesh viewer, research preview.
   Genuine anatomical meshes. Adult male: BodyParts3D; female: HuBMAP female organs +
   anatomically fitted/transformed male-derived bones and other systems (not native female scans).
   Data CC BY 4.0, code original. No reads/writes to student progress or accounts. */
import { anatomicalGreek, anatomyName, eligibleQuizName } from './greek-names.js';
const threeURL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PROVIDERS={
  male:{
    root:'https://cdn.jsdelivr.net/gh/slorksmo/Human-Atlas@5bb5713aab18d7fe9380c3339eb09f173491ea06/public/models/',
    dataset:'BodyParts3D 4.0',credit:'BodyParts3D © Database Center for Life Science (DBCLS), CC BY 4.0. Προσαρμογή: slorksmo/Human-Atlas.',expectedParts:2234,
    warning:'Ανδρικό πρότυπο BodyParts3D 4.0. Πλήρης κάλυψη των μοντελοποιημένων συστημάτων, όχι όλων των ανθρώπινων ανατομικών παραλλαγών.'
  },
  female:{
    root:'https://cdn.jsdelivr.net/gh/HiMahendraBeniwal/female-atlas@b0a20fa3a009ca5f6bfa07b7479312e04c862af2/public/models/',
    dataset:'Female Atlas (HuBMAP + BodyParts3D)',credit:'HuBMAP Female v1.5 © Kristen Browne & Heidi Schlehlein· BodyParts3D © DBCLS· προσαρμογές Mahendra Beniwal. CC BY 4.0.',
    expectedParts:3004,
    warning:'Σύνθετο γυναικείο μοντέλο: τα γυναικεία όργανα είναι HuBMAP/Visible Human· μέρος του σκελετού, των μυών και των αγγείων έχει προσαρμοστεί από ανδρικό BodyParts3D. Πλήρης κατανομή εκπαιδευτικών συστημάτων, ΟΧΙ ολοκληρωμένη αυθεντική γυναικεία σάρωση.'
  }
};
const $=id=>document.getElementById(id);
const systems={
 skeletal:['skeletal'],nervous:['nervous','brain'],respiratory:['respiratory'],circulatory:['cardiac','arterial','venous'],digestive:['digestive'],
 urinary:['urinary'],reproductive:['reproductive'],muscular:['muscular'],cardiac:['cardiac'],
 arterial:['arterial'],venous:['venous'],lymphatic:['lymphatic'],endocrine:['endocrine'],integumentary:['integumentary'],
 sensory:['sensory','brain'],connective:['connective'],pregnancy:['pregnancy']
};
const sysNames={skeletal:'Σκελετικό',muscular:'Μυϊκό',arterial:'Αρτηρίες',venous:'Φλέβες',cardiac:'Καρδιά',respiratory:'Αναπνευστικό',
 nervous:'Νευρικό',brain:'Εγκέφαλος',digestive:'Πεπτικό',urinary:'Ουροποιητικό',reproductive:'Αναπαραγωγικό',
 lymphatic:'Λεμφικό',endocrine:'Ενδοκρινικό',integumentary:'Δέρμα',sensory:'Αισθητήρια όργανα',connective:'Συνδετικός ιστός',pregnancy:'Κύηση'};
const colors={skeletal:0xe6dec4,muscular:0xb26a60,arterial:0xcb5454,venous:0x4e7da6,cardiac:0xd16b72,
 nervous:0xe1bc66,brain:0xc5a7dd,respiratory:0xabc9d7,digestive:0xc5a778,urinary:0xc18b69,
 reproductive:0xd9a1a9,lymphatic:0x9ac4a3,endocrine:0xbfa8d4,integumentary:0x91c5b5,sensory:0xbad4cb,connective:0xc9c6af,pregnancy:0xddaebb};
const GREEK={
 'skull':'Κρανίο','cranium':'Κρανίο','frontal bone':'Μετωπιαίο οστό','parietal bone':'Βρεγματικό οστό',
 'temporal bone':'Κροταφικό οστό','occipital bone':'Ινιακό οστό','sphenoid bone':'Σφηνοειδές οστό',
 'mandible':'Κάτω γνάθος','maxilla':'Άνω γνάθος','nasal bone':'Ρινικό οστό','zygomatic bone':'Ζυγωματικό οστό',
 'clavicle':'Κλείδα','scapula':'Ωμοπλάτη','sternum':'Στέρνο','rib':'Πλευρά','cervical vertebra':'Αυχενικός σπόνδυλος',
 'thoracic vertebra':'Θωρακικός σπόνδυλος','lumbar vertebra':'Οσφυϊκός σπόνδυλος',
 'sacrum':'Ιερό οστό','coccyx':'Κόκκυγας','pelvis':'Πύελος','ilium':'Λαγόνιο οστό',
 'ischium':'Ισχιακό οστό','pubis':'Ηβικό οστό','humerus':'Βραχιόνιο οστό',
 'ulna':'Ωλένη','radius':'Κερκίδα','femur':'Μηριαίο οστό','patella':'Επιγονατίδα',
 'tibia':'Κνήμη','fibula':'Περόνη','calcaneus':'Πτέρνα','talus':'Αστράγαλος',
 'brain':'Εγκέφαλος','cerebrum':'Εγκεφαλικά ημισφαίρια','cerebellum':'Παρεγκεφαλίδα',
 'medulla oblongata':'Προμήκης μυελός','spinal cord':'Νωτιαίος μυελός',
 'heart':'Καρδιά','aorta':'Αορτή','pulmonary artery':'Πνευμονική αρτηρία',
 'superior vena cava':'Άνω κοίλη φλέβα','inferior vena cava':'Κάτω κοίλη φλέβα',
 'trachea':'Τραχεία','lung':'Πνεύμονας','bronchus':'Βρόγχος','larynx':'Λάρυγγας',
 'diaphragm':'Διάφραγμα','esophagus':'Οισοφάγος','stomach':'Στομάχι',
 'liver':'Ήπαρ','gallbladder':'Χοληδόχος κύστη','spleen':'Σπλήνας',
 'pancreas':'Πάγκρεας','small intestine':'Λεπτό έντερο','large intestine':'Παχύ έντερο',
 'colon':'Κόλον','rectum':'Ορθό','kidney':'Νεφρός','ureter':'Ουρητήρας',
 'urinary bladder':'Ουροδόχος κύστη','urethra':'Ουρήθρα',
 'uterus':'Μήτρα','cervix':'Τράχηλος της μήτρας','ovary':'Ωοθήκη',
 'vagina':'Κόλπος','uterine tube':'Σάλπιγγα','fallopian tube':'Σάλπιγγα',
 'breast':'Μαστός','mammary gland':'Μαστικός αδένας',
 'prostate':'Προστάτης','testis':'Όρχις','penis':'Πέος',
 'thyroid gland':'Θυρεοειδής αδένας','adrenal gland':'Επινεφρίδιο'};
const TRANSLATE=Object.entries(GREEK).sort((a,b)=>b[0].length-a[0].length);
const ui={sex:'male',mode:'skeleton',system:'all',selected:null,isolate:false,opacity:.14,tab:'explore',quiz:false,answered:false,target:null,score:0,attempts:0,prev:null};

/* Safe, shareable chapter links. Values are allow-listed; no storage and no open redirect. */
function readDeepLink(){
 const q=new URLSearchParams(location.search),mode=q.get('mode'),sex=q.get('sex'),system=q.get('system'),focus=q.get('focus'),from=q.get('from'),chapter=q.get('chapter');
 const validSystems=new Set(Object.keys(systems));
 return {
  mode:['skeleton','organs','both'].includes(mode)?mode:null,
  sex:['male','female'].includes(sex)?sex:null,
  system:validSystems.has(system)?system:null,
  focus:/^(skull|vertebra|spinalcord|lung|rib|heart|aorta|brain|liver|stomach|trachea|kidney|uterus|thyroid|femur|humerus|pelvis)$/.test(focus||'')?focus:null,
  from:/^(01|02|05|10|14|17|18)$/.test(from||'')?from:null,
  chapter:/^(?:[1-9]|1\d|2\d)$/.test(chapter||'')?Number(chapter):null
 }
}
const deep=readDeepLink();
if(deep.mode)ui.mode=deep.mode;
if(deep.sex)ui.sex=deep.sex;
if(deep.system)ui.system=deep.system;
let requestedFocus=deep.focus;
const FOCUS_TERMS={
 skull:/\b(cranium|skull|frontal bone|parietal bone)\b/i,
 vertebra:/\bvertebra\b|\bvertebral\b/i,
 spinalcord:/\bspinal cord\b/i,
 lung:/\blung(s)?\b|\b(left|right) pulmonary lobe\b/i,
 rib:/\brib(s)?\b|\bcostal cartilage\b/i,
 heart:/\bheart\b|\b(left|right) ventricle\b/i,
 aorta:/\baorta\b|\baortic\b/i,
 brain:/\bbrain\b|\bcerebrum\b/i,
 liver:/\bliver\b/i,
 stomach:/\bstomach\b/i,
 trachea:/\btrachea\b/i,
 kidney:/\bkidney\b|\brenal\b/i,
 uterus:/\buterus\b|\buterine body\b/i,
 thyroid:/\bthyroid gland\b/i,
 femur:/\bfemur\b/i,
 humerus:/\bhumerus\b/i,
 pelvis:/\bpelvis\b|\bilium\b|\bhip bone\b/i
};
function configureLessonReturn(){
 const link=$('chapterReturn');
 if(!link||!deep.from||!deep.chapter)return;
 link.href='../../saek-course-'+deep.from+'.html#lesson-'+deep.chapter;
 link.textContent='← Επιστροφή στο μάθημα · Κεφάλαιο '+deep.chapter;
 link.hidden=false
}
function focusRequestedStructure(){
 if(!requestedFocus||!atlas||!FOCUS_TERMS[requestedFocus])return;
 const regex=FOCUS_TERMS[requestedFocus];
 const matched=atlas.parts.filter(p=>partVisible(p)&&regex.test(p.name));
 const ranked=matched.sort((a,b)=>{
  const aName=a.name.toLowerCase(),bName=b.name.toLowerCase();
  const key=requestedFocus.toLowerCase();
  const exactA=aName===key?0:aName.startsWith(key)?1:2;
  const exactB=bName===key?0:bName.startsWith(key)?1:2;
  return exactA-exactB||a.name.length-b.name.length
 });
 if(ranked.length){choose(ranked[0].id);return}
 // Keep the correct system visible; do not highlight the wrong anatomical structure.
 $('detailName').textContent='Σχετικό ανατομικό σύστημα';
 $('detailDescription').textContent='Το σύστημα του μαθήματος έχει ανοίξει, αλλά δεν βρέθηκε ασφαλής αντιστοίχιση ενός συγκεκριμένου 3D πλέγματος για αυτό το σημείο.';
}

let THREE,renderer,scene,camera,atlas,meshChunks=[],materials=[],meshData=[],partsById=new Map(),allMeshes=[],anim=0,token=0,abort=null,loading=false,selectedPartIndex=-1;
let orbit={az:0,polar:Math.PI/2,r:3.7,y:.9,active:new Map(),lastX:0,lastY:0,pinch:0,moved:false};
const maxItems=140;
function greekLabel(name){return anatomyName(name).label;}
function partVisible(p){if(!p)return false;if(ui.system!=='all')return (systems[ui.system]||[]).includes(p.system);
if(ui.mode==='skeleton')return p.system==='skeletal';
if(ui.mode==='organs')return p.system!=='skeletal'&&p.system!=='muscular'&&p.system!=='integumentary'&&p.system!=='connective'&&p.system!=='pregnancy';
return p.system!=='muscular'&&p.system!=='integumentary'&&p.system!=='connective'&&p.system!=='pregnancy'}
function systemVisible(s){if(s==='integumentary')return ui.system==='integumentary'||(ui.opacity>0&&!ui.isolate&&ui.system==='all');if(ui.system!=='all')return (systems[ui.system]||[]).includes(s);if(ui.mode==='skeleton')return s==='skeletal';if(ui.mode==='organs')return s!=='skeletal'&&s!=='muscular'&&s!=='integumentary'&&s!=='connective'&&s!=='pregnancy';return s!=='muscular'&&s!=='integumentary'&&s!=='connective'&&s!=='pregnancy'}
function validPart(p){return p&&partVisible(p)}
function countMessage(){const p=atlas?.parts||[];return p.filter(partVisible).length+' δομές'}
function loadingUI(show,title,sub){$('loading').hidden=!show;loading=show;if(show){$('loading').querySelector('strong').textContent=title||'Φόρτωση πραγματικής ανατομίας…';$('loading').querySelector('small').textContent=sub||'Λήψη τρισδιάστατων ανατομικών πλεγμάτων'}}
function setControls(){document.querySelectorAll('[data-sex]').forEach(b=>{const ok=b.dataset.sex===ui.sex;b.classList.toggle('active',ok);b.setAttribute('aria-pressed',String(ok))});document.querySelectorAll('[data-mode]').forEach(b=>{const ok=b.dataset.mode===ui.mode;b.classList.toggle('active',ok);b.setAttribute('aria-pressed',String(ok))});$('systemFilter').value=ui.system;$('modelTag').textContent=(ui.sex==='male'?'ΑΝΔΡΙΚΟ':'ΓΥΝΑΙΚΕΙΟ')+' · '+(ui.system!=='all'?(sysNames[ui.system]||ui.system).toLocaleUpperCase('el'):(ui.mode==='skeleton'?'ΣΚΕΛΕΤΟΣ':ui.mode==='organs'?'ΟΡΓΑΝΑ':'ΣΥΝΔΥΑΣΜΟΣ'))}
const TOPIC_LINKS={skeletal:2,muscular:9,connective:9,respiratory:3,digestive:12,cardiac:10,arterial:10,venous:10,nervous:8,brain:8,urinary:13,reproductive:13};
const INTRO={skeletal:'Οστό που συμμετέχει στη στήριξη, στην προστασία ή στην κίνηση του σώματος.',cardiac:'Η καρδιά προωθεί το αίμα στην πνευμονική και στη συστηματική κυκλοφορία.',respiratory:'Δομή που συμμετέχει στη μεταφορά αέρα ή στην αναπνοή.',digestive:'Δομή που συμμετέχει στην πέψη, στην απορρόφηση ή στη μεταφορά τροφής.',nervous:'Δομή του συστήματος που μεταφέρει και επεξεργάζεται νευρικά σήματα.',urinary:'Δομή που συμμετέχει στη δημιουργία, στη μεταφορά ή στην αποβολή ούρων.',reproductive:'Δομή που ανήκει στο αναπαραγωγικό σύστημα.'};
function describeSelected(){
 const p=partsById.get(ui.selected),card=$('detailCard');card.hidden=!p;
 const banner=$('selectedBanner');banner.hidden=!p||ui.quiz;
 if(!p)return;
 $('selectedName').textContent=anatomyName(p.name,p.system,sysNames).label;
 const n=anatomyName(p.name,p.system,sysNames);
 $('detailIcon').textContent=p.system==='skeletal'?'🦴':p.system==='cardiac'?'❤️':'◈';
 $('detailName').textContent=n.label;
 $('detailSystem').textContent=n.systemName;
 $('detailDescription').textContent=(/\b(gingiva|tooth|teeth)\b/i.test(p.name)?'Δομή της στοματικής κοιλότητας, που αφορά τα ούλα ή την οδοντοστοιχία.':(INTRO[p.system]||'Εκπαιδευτική προβολή της θέσης και των σχέσεων αυτής της ανατομικής δομής.'))+(n.el?'':' Δεν υπάρχει ακόμη ελεγμένη ελληνική ονομασία για το συγκεκριμένο πλέγμα.');
 $('detailOriginal').textContent='Πρωτότυπη ονομασία πηγής: '+p.name;
 const lesson=$('detailStudy'),chapter=TOPIC_LINKS[p.system];
 lesson.hidden=!chapter;
 if(chapter){lesson.href='../../saek-course-01.html#lesson-'+chapter;lesson.textContent='Μελέτη σχετικού κεφαλαίου ΣΑΕΚ ↗';}
}
function list(){
 const q=$('anatomySearch').value.trim().toLocaleLowerCase('el'),onlyGreek=$('greekOnly')?.checked!==false;
 const filtered=(atlas?.parts||[]).filter(p=>{
  if(!validPart(p))return false;
  const n=anatomyName(p.name,p.system,sysNames);
  if(onlyGreek&&!n.el)return false;
  return !q||(n.label+' '+n.english+' '+p.id+' '+n.systemName).toLocaleLowerCase('el').includes(q)
 });
 filtered.sort((a,b)=>greekLabel(a.name).localeCompare(greekLabel(b.name),'el'));
 const el=$('anatomyList');el.replaceChildren();
 const total=(atlas?.parts||[]).filter(validPart).length;
 $('itemCount').textContent=filtered.length+' από '+total+' δομές';
 if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=atlas?'Δεν υπάρχουν αντίστοιχες μεταφρασμένες δομές. Απενεργοποίησε το φίλτρο για τα πρωτότυπα ονόματα.':'Φόρτωση ανατομικών στοιχείων…';el.append(empty);return;}
 const doc=document.createDocumentFragment();
 for(const p of filtered.slice(0,maxItems)){
  const n=anatomyName(p.name,p.system,sysNames);
  const btn=document.createElement('button');btn.type='button';btn.className=ui.selected===p.id?'active':'';
  const icon=document.createElement('span');icon.className='item-icon';icon.textContent=p.system==='skeletal'?'🦴':p.system==='cardiac'?'❤️':'◈';
  const text=document.createElement('span');text.className='item-text';
  const name=document.createElement('span');name.className='item-name';name.textContent=n.label;
  const meta=document.createElement('span');meta.className='item-system';
  meta.textContent=n.systemName+(n.el?' · '+n.english:' · '+n.english+' (χωρίς ελληνική μετάφραση)');
  text.append(name,meta);btn.append(icon,text);
  btn.addEventListener('click',()=>choose(p.id));doc.append(btn);
 }
 el.append(doc);
 if(filtered.length>maxItems){const tip=document.createElement('p');tip.className='empty';tip.textContent='Εμφανίζονται οι πρώτες '+maxItems+' δομές. Αναζήτησε το συγκεκριμένο σημείο για περισσότερα.';el.append(tip);}
}
function setMode(mode){requestedFocus=null;if(ui.quiz)resetQuiz();ui.mode=mode;ui.system='all';ui.selected=null;ui.isolate=false;selectedPartIndex=-1;setControls();describeSelected();list();updateScene()}
function setSystem(system){
 requestedFocus=null;
 if(ui.quiz)resetQuiz();
 ui.system=system;
 // A focused system must not leave a contradictory "Skeleton" selection on organs.
 if(system==='skeletal')ui.mode='skeleton';
 else if(['muscular','integumentary','connective','pregnancy'].includes(system))ui.mode='both';
 else if(system!=='all')ui.mode='organs';
 ui.selected=null;ui.isolate=false;selectedPartIndex=-1;
 setControls();describeSelected();list();updateScene();
}
function setTab(which){if(which==='explore'&&ui.quiz)resetQuiz();ui.tab=which;const isQuiz=which==='quiz';$('explorePanel').hidden=isQuiz;$('quizPanel').hidden=!isQuiz;$('exploreTab').setAttribute('aria-selected',String(!isQuiz));$('quizTab').setAttribute('aria-selected',String(isQuiz));list()}
function choose(id){const p=partsById.get(id);if(!validPart(p))return;if(ui.quiz&&!ui.answered){answer(id);return}ui.selected=id;selectedPartIndex=p._index;describeSelected();list();updateScene()}
function chooseSex(sex){if(ui.sex===sex)return;ui.sex=sex;ui.system='all';ui.selected=null;ui.isolate=false;ui.quiz=false;ui.answered=false;resetQuiz();setControls();describeSelected();loadModel()}
// The selection is always emphasized; surrounding structures are never isolated or hidden.
function updateScene(){
 const focus=$('isolateBtn'),part=partsById.get(ui.selected);
 focus.disabled=!part;focus.title=part?'Μετακίνησε την κάμερα κοντά στην επιλογή':'Επίλεξε πρώτα ένα οστό ή όργανο';
 if(!renderer)return;
 for(const item of meshChunks){
  item.visible=systemVisible(item.userData.system);
  const m=item.material,isSkin=item.userData.system==='integumentary';
  const transparent=isSkin||(ui.mode==='both'&&item.userData.system==='skeletal');
  if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true}
  m.opacity=isSkin?ui.opacity:(ui.mode==='both'&&item.userData.system==='skeletal'?.62:1);
  m.depthWrite=!transparent;
  if(m.userData.uniforms)m.userData.uniforms.selected.value=selectedPartIndex;
 }
 updateHotspot();requestPaint();
}
function resetQuiz(){
 ui.quiz=false;ui.answered=false;ui.target=null;ui.score=0;ui.attempts=0;ui.prev=null;
 selectedPartIndex=-1;ui.selected=null;ui.isolate=false;describeSelected();
 $('quizScore').textContent='0';$('quizAttempts').textContent='0';
 $('quizStart').hidden=false;$('quizStop').hidden=true;$('quizNext').hidden=true;
 $('quizOptions').replaceChildren();$('quizOptions').hidden=true;$('quizSee3D').hidden=true;$('quizBackToAnswers').hidden=true;
 $('quizFeedback').textContent='';$('quizFeedback').className='quiz-feedback';
 $('quizQuestion').textContent='Αναγνώρισε ένα σημείο στο 3D';
 $('quizInstruction').textContent='Απάντησε σε τέσσερις επιλογές με ελληνικές ονομασίες.';
 updateScene();
}
function quizPool(){
 const unique=new Map();
 for(const p of atlas?.parts||[]){
  if(!validPart(p)||!p._loaded||!eligibleQuizName(p.name,p.system))continue;
  const name=anatomicalGreek(p.name);
  if(!unique.has(name))unique.set(name,p);
 }
 return [...unique.values()];
}
function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function nextQuiz(){
 const pool=quizPool();
 if(pool.length<4){
  ui.quiz=false;
  $('quizQuestion').textContent='Δεν υπάρχουν ακόμη τέσσερα κατάλληλα σημεία';
  $('quizFeedback').textContent='Περίμενε να ολοκληρωθεί η φόρτωση ή επίλεξε σκελετό / όργανα με περισσότερες ελληνικές ονομασίες.';
  $('quizStart').hidden=false;$('quizStop').hidden=true;$('quizNext').hidden=true;
  $('quizOptions').hidden=true;$('quizSee3D').hidden=true;$('quizBackToAnswers').hidden=true;return;
 }
 const available=pool.filter(p=>p.id!==ui.prev);
 const p=available[Math.floor(Math.random()*available.length)]||pool[0];
 const alternatives=shuffled(pool.filter(x=>x.id!==p.id)).slice(0,3);
 const choices=shuffled([p,...alternatives]);
 ui.quiz=true;ui.target=p.id;ui.prev=p.id;ui.answered=false;ui.selected=null;
 selectedPartIndex=p._index;
 $('quizQuestion').textContent='Ποια δομή φωτίζεται με πράσινο στο 3D;';
 $('quizInstruction').textContent='Δες το φωτισμένο σημείο και διάλεξε τη σωστή ελληνική ονομασία.';
 $('quizFeedback').textContent='';$('quizFeedback').className='quiz-feedback';
 $('quizStart').hidden=true;$('quizStop').hidden=false;$('quizNext').hidden=true;
 $('quizSee3D').hidden=false;$('quizBackToAnswers').hidden=false;
 const box=$('quizOptions');box.replaceChildren();box.hidden=false;
 for(const choice of choices){
  const button=document.createElement('button');button.type='button';
  button.className='quiz-choice';button.textContent=anatomicalGreek(choice.name);
  button.dataset.partId=choice.id;
  button.addEventListener('click',()=>answer(choice.id));box.append(button);
 }
 describeSelected();updateScene();focusPart(p);
}
function answer(id){
 if(!ui.quiz||ui.answered)return;
 ui.answered=true;ui.attempts++;
 const ok=id===ui.target;if(ok)ui.score++;
 $('quizAttempts').textContent=ui.attempts;$('quizScore').textContent=ui.score;
 const correct=partsById.get(ui.target);
 $('quizFeedback').className='quiz-feedback '+(ok?'good':'bad');
 $('quizFeedback').textContent=ok?'Σωστά! '+anatomicalGreek(correct.name):'Η σωστή απάντηση είναι: '+anatomicalGreek(correct.name);
 for(const button of $('quizOptions').querySelectorAll('button')){
  button.disabled=true;
  if(button.dataset.partId===ui.target)button.classList.add('correct');
  else if(button.dataset.partId===id)button.classList.add('incorrect');
 }
 $('quizNext').hidden=false;
 ui.selected=ui.target;selectedPartIndex=correct._index;
 describeSelected();updateScene();
}
function initUI(){document.querySelectorAll('[data-sex]').forEach(b=>b.addEventListener('click',()=>chooseSex(b.dataset.sex)));document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$('systemFilter').addEventListener('change',e=>setSystem(e.target.value));$('anatomySearch').addEventListener('input',list);$('greekOnly').addEventListener('change',list);$('exploreTab').addEventListener('click',()=>setTab('explore'));$('quizTab').addEventListener('click',()=>setTab('quiz'));$('outline').addEventListener('input',e=>{ui.opacity=+e.target.value/100;$('outlineValue').value=e.target.value+'%';updateScene()});$('isolateBtn').addEventListener('click',()=>{const p=partsById.get(ui.selected);if(p)focusPart(p)});$('clearSelection').addEventListener('click',()=>{ui.selected=null;selectedPartIndex=-1;describeSelected();list();updateScene()});$('quizStart').addEventListener('click',()=>{ui.score=0;ui.attempts=0;$('quizAttempts').textContent='0';$('quizScore').textContent='0';nextQuiz()});$('quizNext').addEventListener('click',nextQuiz);$('quizSee3D').addEventListener('click',()=>document.getElementById('anatomyViewport').scrollIntoView({behavior:'smooth',block:'center'}));$('quizBackToAnswers').addEventListener('click',()=>document.getElementById('quizOptions').scrollIntoView({behavior:'smooth',block:'center'}));$('quizStop').addEventListener('click',resetQuiz);$('zoomIn').addEventListener('click',()=>{orbit.r=Math.max(.12,orbit.r*.75);cameraMove()});$('zoomOut').addEventListener('click',()=>{orbit.r=Math.min(40,orbit.r*1.35);cameraMove()});$('resetView').addEventListener('click',resetCamera);$('frontView').addEventListener('click',()=>{orbit.az=0;orbit.polar=Math.PI/2;cameraMove()});$('backView').addEventListener('click',()=>{orbit.az=Math.PI;orbit.polar=Math.PI/2;cameraMove()});$('retryBtn').addEventListener('click',loadModel);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();$('anatomySearch').focus()}if(e.target===$('anatomyViewport')){const keys={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};const v=keys[e.key];if(v){e.preventDefault();orbit.az+=v[0];orbit.polar=Math.min(Math.PI-.05,Math.max(.05,orbit.polar+v[1]));cameraMove()}}});
resetQuiz();setControls();describeSelected();list();configureLessonReturn()}
function resetCamera(){orbit.az=0;orbit.polar=Math.PI/2;orbit.r=innerWidth<=560?3:3.7;orbit.y=.85;cameraMove()}
function cameraMove(){if(!camera)return;const d=orbit.r,a=orbit.az,p=orbit.polar;camera.position.set(d*Math.sin(p)*Math.sin(a),orbit.y+d*Math.cos(p),d*Math.sin(p)*Math.cos(a));camera.lookAt(0,orbit.y,0);requestPaint();updateHotspot()}
let dirty=true;
function requestPaint(){dirty=true}
function animate(){anim=requestAnimationFrame(animate);if(dirty&&renderer&&scene&&!document.hidden){renderer.render(scene,camera);dirty=false;updateHotspot()}}
function updateHotspot(){const h=$('hotspot');if(!THREE||!ui.selected||!atlas||!camera){h.hidden=true;return}const p=partsById.get(ui.selected);if(!p?.bounds){h.hidden=true;return}const a=p.bounds[0],b=p.bounds[1],center=new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2).project(camera);if(center.z<-1||center.z>1){h.hidden=true;return}const rect=$('renderMount').getBoundingClientRect();h.hidden=false;h.textContent=greekLabel(p.name);h.style.left=Math.min(rect.width-55,Math.max(55,(center.x+1)/2*rect.width))+'px';h.style.top=Math.min(rect.height-35,Math.max(45,(1-center.y)/2*rect.height))+'px'}
function focusPart(p){const a=p.bounds[0],b=p.bounds[1];const w=Math.max(b[0]-a[0],b[1]-a[1],b[2]-a[2]);orbit.y=(a[1]+b[1])/2;orbit.r=Math.max(.75,Math.min(3.7,w*2.6+.65));cameraMove()}
function pointerControls(){const c=renderer.domElement;const pointers=orbit.active;c.style.touchAction='none';c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);orbit.lastX=e.clientX;orbit.lastY=e.clientY;orbit.moved=false;orbit.pinch=0});c.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const v=[...pointers.values()],d=Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1]);if(orbit.pinch)orbit.r=Math.max(.1,Math.min(40,orbit.r*orbit.pinch/d));orbit.pinch=d;orbit.moved=true;cameraMove();return}const dx=e.clientX-orbit.lastX,dy=e.clientY-orbit.lastY;orbit.lastX=e.clientX;orbit.lastY=e.clientY;if(Math.abs(dx)+Math.abs(dy)>2)orbit.moved=true;orbit.az-=dx*.007;orbit.polar=Math.min(Math.PI-.04,Math.max(.04,orbit.polar-dy*.006));cameraMove()});c.addEventListener('pointerup',e=>{if(!orbit.moved&&pointers.size===1)raypick(e);pointers.delete(e.pointerId);orbit.pinch=0});c.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);orbit.pinch=0});c.addEventListener('wheel',e=>{e.preventDefault();orbit.r=Math.max(.1,Math.min(40,orbit.r*Math.exp(e.deltaY*.001)));cameraMove()},{passive:false})}
function raypick(e){if(!THREE||!camera)return;const rect=renderer.domElement.getBoundingClientRect();const m=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(m,camera);
for(const hit of ray.intersectObjects(allMeshes.filter(x=>x.visible&&x.userData.system!=='integumentary'),false)){if(!hit.face)continue;const i=hit.object.geometry.getAttribute('partIndex').getX(hit.face.a);const part=atlas.parts[Math.round(i)];if(part&&partVisible(part)){choose(part.id);break}}}
function freeModel(){for(const mesh of meshChunks){scene.remove(mesh);mesh.geometry.dispose()}for(const m of materials)m.dispose();meshChunks=[];materials=[];allMeshes=[];atlas=null;partsById.clear();selectedPartIndex=-1;ui.selected=null;ui.isolate=false;describeSelected();list();$('hotspot').hidden=true;requestPaint()}
// Orange high-contrast selection in the same shader: no hiding other meshes.
function newMaterial(system){
 const m=new THREE.MeshStandardMaterial({color:colors[system]||0xa9b4bc,roughness:.6,metalness:.02,side:THREE.DoubleSide,transparent:system==='integumentary',opacity:system==='integumentary'?.14:1});
 const uniforms={selected:{value:-1}};m.userData.uniforms=uniforms;
 m.onBeforeCompile=shader=>{
  shader.uniforms.anatomySelected=uniforms.selected;
  shader.vertexShader='attribute float partIndex; varying float anatomyPartIndex;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nanatomyPartIndex=partIndex;');
  shader.fragmentShader='varying float anatomyPartIndex; uniform float anatomySelected;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(abs(anatomyPartIndex-anatomySelected)<0.5) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.60,0.17),0.88);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(abs(anatomyPartIndex-anatomySelected)<0.5) totalEmissiveRadiance += vec3(0.32,0.15,0.025);');
 };
 materials.push(m);return m;
}
function makeGroup(system,parts,buffer){let vertices=0,indices=0;for(const p of parts){vertices+=p.vertexCount;indices+=p.indexCount}const pos=new Float32Array(vertices*3),norm=new Int16Array(vertices*3),partIndex=new Float32Array(vertices),index=new Uint32Array(indices);
let vi=0,ii=0;for(const p of parts){pos.set(new Float32Array(buffer,p.positions,p.vertexCount*3),vi*3);norm.set(new Int16Array(buffer,p.normals,p.vertexCount*3),vi*3);partIndex.fill(p._index,vi,vi+p.vertexCount);const input=new Uint32Array(buffer,p.indices,p.indexCount);for(let k=0;k<input.length;k++)index[ii+k]=input[k]+vi;vi+=p.vertexCount;ii+=p.indexCount;p._loaded=true}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(norm,3,true));g.setAttribute('partIndex',new THREE.BufferAttribute(partIndex,1));g.setIndex(new THREE.BufferAttribute(index,1));g.computeBoundingSphere();
const mesh=new THREE.Mesh(g,newMaterial(system));mesh.userData.system=system;mesh.frustumCulled=false;mesh.visible=systemVisible(system);scene.add(mesh);meshChunks.push(mesh);allMeshes.push(mesh)}
async function chunkBuffer(chunk,root,signal){const fname=String(chunk.gzip||chunk.url+'.gz').split('/').pop();const path=root+fname;
let response=await fetch(path,{signal});if(!response.ok)throw Error('Αποτυχία λήψης 3D δεδομένων ('+response.status+').');
let buf=await response.arrayBuffer();const bytes=new Uint8Array(buf);if(bytes[0]===0x1f&&bytes[1]===0x8b){if(typeof DecompressionStream==='undefined')throw Error('Η συσκευή δεν υποστηρίζει αποσυμπίεση gzip.');buf=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}
if(buf.byteLength!==chunk.bytes)throw Error('Λανθασμένο μέγεθος ανατομικού αρχείου.');return buf}
async function loadModel(){const current=++token;if(abort)abort.abort();abort=new AbortController();const signal=abort.signal;freeModel();$('errorBox').hidden=true;const p=PROVIDERS[ui.sex];loadingUI(true,'Φόρτωση '+(ui.sex==='male'?'ανδρικού':'γυναικείου')+' άτλαντα…','Επιστημονικά δεδομένα '+p.dataset+'. Πρώτη λήψη: δεκάδες MB.');
try{const response=await fetch(p.root+'atlas.json',{signal});if(!response.ok)throw Error('Δεν φορτώθηκε το μητρώο ανατομικών δομών.');const data=await response.json();if(current!==token)return;if(!Array.isArray(data.parts)||!Array.isArray(data.chunks)||data.parts.length!==p.expectedParts)throw Error('Ο κατάλογος μοντέλων διαφέρει από τον ελεγμένο.');atlas=data;data.parts.forEach((x,i)=>{x._index=i;partsById.set(x.id,x)});list();const load=async i=>{const buf=await chunkBuffer(data.chunks[i],p.root,signal);if(current!==token)return;const groups=new Map();for(const part of data.parts){if(part.chunk!==i)continue;const entry=groups.get(part.system)||[];entry.push(part);groups.set(part.system,entry)}
for(const [system,parts] of groups)makeGroup(system,parts,buf);if(current!==token)return;completed++;loadingUI(true,'3D Ανατομία · '+Math.round(completed/data.chunks.length*100)+'%','Φορτώθηκαν '+completed+'/'+data.chunks.length+' αρχεία · '+data.parts.length.toLocaleString('el-GR')+' δομές');updateScene()};
let completed=0;let cursor=0;await Promise.all(Array.from({length:2},async()=>{while(cursor<data.chunks.length&&current===token){const i=cursor++;await load(i)}}));if(current!==token)return;loadingUI(false);$('errorBox').hidden=true;list();updateScene();focusRequestedStructure()}catch(e){if(signal.aborted||current!==token)return;console.error('Anatomy mesh:',e);loadingUI(false);$('errorBox').hidden=false;$('errorBox').querySelector('strong').textContent='Δεν φορτώθηκε ο πλήρης 3D άτλας.';$('errorBox').querySelector('p').textContent=(e?.message||'Πρόβλημα δικτύου.')+' Η πραγματική ανατομία απαιτεί ενεργή σύνδεση και υποστήριξη WebGL. Δεν εμφανίζουμε ψεύτικο μοντέλο ως υποκατάστατο.'}}
async function start(){initUI();try{THREE=await import(threeURL);const canvas=$('renderMount');renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<768?1.3:1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;canvas.append(renderer.domElement);scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xf5f9ff,0x334858,2.1));const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(1,4,4);scene.add(sun);const rim=new THREE.DirectionalLight(0x85c4ee,1.5);rim.position.set(-3,2,-4);scene.add(rim);camera=new THREE.PerspectiveCamera(36,1,.005,100);resetCamera();pointerControls();const resize=()=>{let r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();requestPaint()};new ResizeObserver(resize).observe(canvas);resize();animate();await loadModel()}catch(e){console.error(e);loadingUI(false);$('errorBox').hidden=false;$('errorBox').querySelector('strong').textContent='Δεν ξεκίνησε η 3D μηχανή.';$('errorBox').querySelector('p').textContent='Απαιτείται υποστηριζόμενο WebGL και σύνδεση με την εξωτερική βιβλιοθήκη Three.js.'}}
start();
