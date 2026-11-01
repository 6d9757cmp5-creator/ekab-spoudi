/* V1: one MENTOR interface, separate self-reported learning memory. No AI. */
const engine=window.MentorAdaptive;
const $=id=>document.getElementById(id);
const STORE='ekab.mentor.unified.v1';
const ROUTES=Object.freeze({
 anatomy:'ui-tools/anatomy-3d/index.html',
 ecg:'mentor-ecg.html',
 resuscitation:'seminar-prep.html',
 trauma:'mentor-live.html',
 pharmacology:'farmaka.html',
 certification:'eoppep.html',
 triage:'mentor-lab.html#module-mci',
 equipment:'mentor-lab.html#module-equipment',
 missions:'mentor-live.html',
 learning:'saek.html'
});
let memory=engine.newMemory();
let current=null;
try{memory=engine.safeMemory(JSON.parse(localStorage.getItem(STORE)||'null'));}catch{}
function save(){try{localStorage.setItem(STORE,JSON.stringify(memory));return true;}catch{return false;}}
function note(message){$('mentor-personal-status').textContent=message;}
function render(){
 const suggestion=engine.recommend(memory,{});
 if(!current)current=engine.guide(memory,'',{});
 $('mentor-personal-suggestion').textContent=engine.TOPICS[suggestion.id].label;
 $('mentor-personal-reason').textContent=suggestion.reason;
 $('mentor-personal-active').textContent=current.label;
 $('mentor-personal-text').textContent=current.message;
 $('mentor-personal-style').value=memory.style;
 $('mentor-personal-goal').value=memory.goal;
 const entries=Object.values(memory.topics);
 $('mentor-personal-studied').textContent=String(entries.filter(x=>x.visits>0).length);
 $('mentor-personal-due').textContent=String(entries.filter(x=>x.due&&x.due<=engine.todayString()).length);
 const a=$('mentor-personal-open');
 a.href=ROUTES[current.id]||'saek.html';
 a.textContent='Άνοιξε: '+current.label;
}
function study(value){
 const input=String(value||'').trim();
 if(!input){note('Γράψε ένα θέμα, π.χ. ανατομία, τραύμα ή ΕΟΠΠΕΠ.');return;}
 current=engine.guide(memory,input,{});
 memory=engine.recordVisit(memory,current.id);
 current=engine.guide(memory,input,{});
 note(save()?'Η προσωπική σου εξάσκηση καταγράφηκε στη συσκευή.':'Η προσωρινή αποθήκευση δεν είναι διαθέσιμη.');
 $('mentor-personal-query').value='';
 render();
}
$('mentor-personal-form').addEventListener('submit',event=>{event.preventDefault();study($('mentor-personal-query').value);});
$('mentor-personal-recommend').addEventListener('click',()=>{
 const id=engine.recommend(memory,{}).id;
 memory=engine.recordVisit(memory,id);
 current=engine.guide(memory,'',{});
 note(save()?'Πρόταση ενεργή.':'Η αποθήκευση δεν είναι διαθέσιμη.');
 render();
});
document.querySelectorAll('[data-mentor-self-review]').forEach(button=>button.addEventListener('click',()=>{
 const quality=button.dataset.mentorSelfReview;
 memory=engine.recordReview(memory,current.id,quality);
 const due=memory.topics[current.id]?.due||'';
 const stored=save();
 note(stored?'Προγραμματίστηκε προσωπική επανάληψη: '+due+'. Δεν ενημερώθηκαν βαθμοί ΣΑΕΚ/ΕΟΠΠΕΠ.':'Η αποθήκευση δεν είναι διαθέσιμη.');
 current=engine.guide(memory,'',{});
 render();
}));
$('mentor-personal-style').addEventListener('change',event=>{
 memory=engine.safeMemory({...memory,style:event.target.value});
 current=null;note(save()?'Το ύφος προσαρμόστηκε.':'Η αποθήκευση δεν είναι διαθέσιμη.');render();
});
$('mentor-personal-goal').addEventListener('change',event=>{
 memory=engine.safeMemory({...memory,goal:event.target.value});
 current=null;note(save()?'Η προτεραιότητα μελέτης άλλαξε.':'Η αποθήκευση δεν είναι διαθέσιμη.');render();
});
$('mentor-personal-forget').addEventListener('click',()=>{
 if(!confirm('Διαγραφή μόνο της προσωπικής μνήμης του MENTOR;'))return;
 memory=engine.newMemory();current=null;
 try{localStorage.removeItem(STORE);}catch{}
 note('Η μνήμη του MENTOR μηδενίστηκε. Οι βαθμοί της ΕΚΑΒ Σπουδή παρέμειναν ανεπηρέαστοι.');
 render();
});
if(!engine||!engine.TOPICS)throw Error('MENTOR adaptive engine missing');
render();
