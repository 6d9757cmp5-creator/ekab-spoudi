import {TOPICS,initialTutor,tutorReply} from './mentor/tutor-core.mjs';
const $=id=>document.getElementById(id);
const KEY='ekab.mentor.tutor.prototype.v1';
let state=initialTutor();
try{const saved=JSON.parse(sessionStorage.getItem(KEY)||'null');if(saved&&TOPICS[saved.topic]&&Array.isArray(saved.turns))state={...initialTutor(),...saved,turns:saved.turns.slice(-40)};}catch{}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch{$('tutor-status').textContent='Η αποθήκευση συνομιλίας δεν είναι διαθέσιμη.';}}
function render(){
 $('topic').value=state.topic;$('level').value=state.level;
 const log=$('conversation');log.replaceChildren();
 if(!state.turns.length){const p=document.createElement('p');p.textContent='Καλησπέρα! Πες μου τι θέλεις να μάθεις ή ζήτησε να σε εξετάσω.';log.append(p);}
 for(const turn of state.turns){const p=document.createElement('p');p.className='tutor-turn '+turn.role;p.textContent=(turn.role==='tutor'?'Καθηγητής: ':'Μαθητής: ')+turn.text;log.append(p);}
 const reviews=$('reviews');reviews.replaceChildren();
 for(const [topic,item] of Object.entries(state.reviews)){const p=document.createElement('p');p.textContent=TOPICS[topic]?.label+': '+item.attempts+' δοκιμές'+(item.needsReview?' · χρειάζεται επανάληψη':' · σχετική απάντηση');reviews.append(p);}
}
$('tutor-form').addEventListener('submit',event=>{event.preventDefault();const input=$('tutor-input');const result=tutorReply(state,input.value);state=result.state;input.value='';save();render();});
$('topic').addEventListener('change',event=>{state.topic=event.target.value;save();render();});
$('level').addEventListener('change',event=>{state.level=event.target.value;save();render();});
$('reset').addEventListener('click',()=>{if(!confirm('Να διαγραφεί μόνο η συνομιλία του καθηγητή;'))return;state=initialTutor();sessionStorage.removeItem(KEY);render();});
$('speak').addEventListener('click',()=>{const text=[...state.turns].reverse().find(t=>t.role==='tutor')?.text;if(!text||!('speechSynthesis'in window)){ $('tutor-status').textContent='Δεν υπάρχει διαθέσιμη απάντηση ή φωνητική σύνθεση.';return;}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='el-GR';speechSynthesis.speak(utterance);});
$('voice').addEventListener('click',()=>{const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){$('tutor-status').textContent='Η υπαγόρευση δεν υποστηρίζεται σε αυτόν τον browser.';return;}const recognition=new SpeechRecognition();recognition.lang='el-GR';recognition.onresult=e=>{$('tutor-input').value=e.results[0][0].transcript;$('tutor-status').textContent='Το κείμενο αναγνωρίστηκε. Έλεγξέ το πριν την αποστολή.';};recognition.onerror=()=>{$('tutor-status').textContent='Η υπαγόρευση απέτυχε ή δεν δόθηκε άδεια.';};recognition.start();});
render();
