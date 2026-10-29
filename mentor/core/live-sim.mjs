/**
 * MENTOR OS: deterministic Greek two-person incident teaching simulator.
 * Synthetic observations, NOT a validated physiological model or triage tool.
 * No drug/treatment decisions, automatic patient prioritization, AI, scores or legacy writes.
 */
export const KEY='ekab.mentor.live-two-patients.v1';
export const CASE=Object.freeze({
  id:'crete-road-two',version:1,
  title:'Τροχαίο με δύο εμπλεκόμενους · Κρήτη',
  description:'Συνθετικό εκπαιδευτικό συμβάν σε δρόμο της Κρήτης. Υπάρχει διέλευση οχημάτων και αναφέρονται δύο τραυματίες. Οι παρατηρήσεις και οι τιμές είναι εξ ολοκλήρου επινοημένες.',
  people:[
    {id:'a',name:'Άτομο Α',description:'Ενήλικας δίπλα σε όχημα, αναφέρει δυσφορία.',trend:[{hr:106,rr:22,spo2:96},{hr:110,rr:23,spo2:95},{hr:114,rr:24,spo2:94},{hr:118,rr:25,spo2:93},{hr:122,rr:26,spo2:92}]},
    {id:'b',name:'Άτομο Β',description:'Ενήλικας σε μικρή απόσταση, επικοινωνεί.',trend:[{hr:88,rr:18,spo2:98},{hr:90,rr:18,spo2:98},{hr:93,rr:19,spo2:97},{hr:95,rr:19,spo2:97},{hr:97,rr:20,spo2:96}]}
  ]
});
export const STAGES=Object.freeze([
 {id:'safety',title:'1. Εκτίμηση σκηνής',question:'Πριν προσεγγίσεις το συνθετικό συμβάν, ποια οργανωτική ενέργεια προηγείται;',
  choices:[
   {id:'check-safety',label:'Αναγνωρίζω κινδύνους και εξασφαλίζω ασφαλή προσέγγιση στο πλαίσιο της εκπαίδευσής μου.',outcome:'practice',feedback:'Σωστή οργανωτική κατεύθυνση: προηγείται η αναγνώριση κινδύνων. Δεν αποτελεί πλήρη πραγματική διαδικασία.'},
   {id:'rush',label:'Μπαίνω αμέσως στον χώρο χωρίς να εξετάσω κινδύνους.',outcome:'review',feedback:'Επανάλαβε το βήμα: η ασφάλεια της σκηνής δεν πρέπει να παρακάμπτεται.'}
  ]},
 {id:'coordination',title:'2. Συντονισμός',question:'Αναφέρονται δύο εμπλεκόμενοι. Τι περιλαμβάνει η αρχική οργανωτική ενημέρωση;',
  choices:[
   {id:'report-two',label:'Ενημερώνω με σαφήνεια τον συντονισμό για δύο αναφερόμενους εμπλεκόμενους και τις γνωστές συνθήκες.',outcome:'practice',feedback:'Η καταγραφή του αριθμού ατόμων και των επιβεβαιωμένων πληροφοριών υποστηρίζει τον συντονισμό.'},
   {id:'omit-second',label:'Αναφέρω μόνο το ένα άτομο, χωρίς να καταγράψω την ύπαρξη του δεύτερου.',outcome:'review',feedback:'Επανεξέτασε την πληρότητα της οργανωτικής αναφοράς.'}
  ]},
 {id:'observations',title:'3. Παρακολούθηση δύο ατόμων',question:'Οι συνθετικές τιμές μεταβάλλονται με τον χρόνο. Πώς περιγράφεις όσα βλέπεις;',
  choices:[
   {id:'record-both',label:'Καταγράφω ξεχωριστά τις παρατηρήσεις και τις χρονικές μεταβολές και για τα δύο άτομα.',outcome:'practice',feedback:'Η τεκμηρίωση των διαθέσιμων παρατηρήσεων χωρίς υποθέσεις είναι ο εκπαιδευτικός στόχος.'},
   {id:'guess-diagnosis',label:'Αποδίδω βέβαιη διάγνωση από τις επινοημένες τιμές, χωρίς επιπλέον δεδομένα.',outcome:'review',feedback:'Δεν συνάγεται πραγματική διάγνωση από αυτό το μοντέλο. Επανέλαβε την αντικειμενική καταγραφή.'}
  ]},
 {id:'handover',title:'4. Παράδοση',question:'Τι παραδίδεις στην επόμενη ομάδα ως εκπαιδευτική αναφορά;',
  choices:[
   {id:'verified-handover',label:'Το συμβάν, τον αριθμό ατόμων, τις καταγεγραμμένες παρατηρήσεις, τις μεταβολές και τις επικοινωνίες.',outcome:'practice',feedback:'Ολοκληρώθηκε η οργανωτική άσκηση με αναφορά των διαθέσιμων στοιχείων.'},
   {id:'invent',label:'Δίνω επινοημένες ενέργειες και διαγνώσεις σαν να είχαν παρατηρηθεί.',outcome:'review',feedback:'Η παράδοση πρέπει να διαχωρίζει πραγματικά καταγεγραμμένα δεδομένα από υποθέσεις.'}
  ]}
]);
const MAX_EVENTS=16;
export function newLiveSession(){
 return {schema_version:1,case_id:CASE.id,case_version:CASE.version,stage:0,events:[],completed:false};
}
export function stepLive(session,choiceId){
 if(!session||session.schema_version!==1||session.case_id!==CASE.id||session.case_version!==CASE.version||
  !Array.isArray(session.events)||!Number.isInteger(session.stage)||session.stage<0||session.stage>STAGES.length||
  typeof choiceId!=='string'||session.completed||session.events.length>=MAX_EVENTS)throw Error('invalid-live-session');
 const stage=STAGES[session.stage];
 if(!stage)throw Error('invalid-live-stage');
 const choice=stage.choices.find(x=>x.id===choiceId);
 if(!choice)throw Error('invalid-live-choice');
 const event={seq:session.events.length+1,stage_id:stage.id,choice_id:choice.id,outcome:choice.outcome};
 const nextStage=session.stage+(choice.outcome==='practice'?1:0);
 return {schema_version:1,case_id:CASE.id,case_version:CASE.version,stage:nextStage,
   events:[...session.events,event],completed:nextStage===STAGES.length};
}
export function replayLive(raw){
 if(!raw||raw.case_id!==CASE.id||raw.case_version!==CASE.version||
  !Array.isArray(raw.events)||raw.events.length>MAX_EVENTS)throw Error('invalid-saved-live-session');
 let state=newLiveSession();
 for(const given of raw.events){
  if(!given||typeof given.choice_id!=='string')throw Error('invalid-saved-live-event');
  state=stepLive(state,given.choice_id);
  const created=state.events.at(-1);
  if(['seq','stage_id','choice_id','outcome'].some(key=>created[key]!==given[key]))throw Error('tampered-live-event');
 }
 if(state.stage!==raw.stage||state.completed!==raw.completed||
  raw.schema_version!==1)throw Error('tampered-live-session');
 return state;
}
export function liveSnapshot(session){
 const state=replayLive(session),elapsed=state.events.length*2;
 const index=Math.min(state.events.length,4);
 return {minute:elapsed,completed:state.completed,stage:state.stage,
  people:CASE.people.map(p=>({id:p.id,name:p.name,description:p.description,
   ...p.trend[index],initial:p.trend[0]})),
  timeline:state.events.map(e=>({minute:e.seq*2,title:STAGES.find(s=>s.id===e.stage_id)?.title,
   outcome:e.outcome,feedback:STAGES.find(s=>s.id===e.stage_id)?.choices.find(c=>c.id===e.choice_id)?.feedback})),
  practice:state.events.filter(x=>x.outcome==='practice').length,
  review:state.events.filter(x=>x.outcome==='review').length
 };
}
export function loadLive(storage){
 try{const data=storage.getItem(KEY);return data?replayLive(JSON.parse(data)):newLiveSession();}
 catch{return newLiveSession();}
}
export function saveLive(storage,session){
 const clean=replayLive(session);
 try{storage.setItem(KEY,JSON.stringify(clean));return true;}
 catch{return false;}
}
export function clearLive(storage){
 try{storage.removeItem(KEY);return true;}catch{return false;}
}
