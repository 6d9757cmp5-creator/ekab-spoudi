/**
 * MENTOR Next — original prehospital teaching sandbox, not Body Interact code.
 * Synthetic observations only. NO clinical physiological model, triage, drug or treatment.
 * All changes to indicators are simulated passage of time, not treatment effects.
 */
export const STORE_KEY='ekab.mentor.next-v1';
export const CASE={
 id:'crete-two-persons-next-v1',title:'Τροχαίο στην Κρήτη · Δύο εμπλεκόμενοι',
 briefing:'Δύο ενήλικες κοντά σε όχημα. Η κυκλοφορία συνεχίζεται. Δεν έχουν επιβεβαιωθεί τραύματα ή διαγνώσεις.',
 patients:[
  {id:'a',name:'Άτομο Α',age:'Ενήλικας',setting:'Δίπλα στο όχημα',description:'Μιλά, αναφέρει ενόχληση. Άλλα στοιχεία απαιτούν παρατήρηση.',v:{hr:106,rr:23,spo2:97},slope:{hr:0.8,rr:0.23,spo2:-0.18},dialogue:{feeling:'«Έχω μια ενόχληση, αλλά μπορώ να μιλήσω.»',event:'«Έγινε σύγκρουση. Δεν θυμάμαι ακριβώς πώς.»'}},
  {id:'b',name:'Άτομο Β',age:'Ενήλικας',setting:'Λίγο πιο πέρα',description:'Επικοινωνεί, δεν έχει δώσει σαφές ιστορικό.',v:{hr:92,rr:19,spo2:98},slope:{hr:0.45,rr:0.12,spo2:-0.08},dialogue:{feeling:'«Είμαι αναστατωμένος. Δεν ξέρω αν χτύπησα.»',event:'«Άκουσα τον θόρυβο και βρέθηκα εδώ.»'}}
 ]
};
export const TOOLS=[
 {id:'view',icon:'◉',label:'Προβολές'},
 {id:'position',icon:'♧',label:'Στάση'},
 {id:'dialogue',icon:'◌',label:'Συνομιλία'},
 {id:'exam',icon:'✚',label:'Εξέταση'},
 {id:'monitor',icon:'▤',label:'Monitoring'},
 {id:'tests',icon:'◇',label:'Εξετάσεις'},
 {id:'call',icon:'☎',label:'Επικοινωνία'},
 {id:'interventions',icon:'▣',label:'Ενέργειες'},
 {id:'meds',icon:'⊘',label:'Φάρμακα'},
 {id:'records',icon:'▤',label:'Φάκελος'},
 {id:'debrief',icon:'◎',label:'Debrief'}
];
export const ACTIONS={
 position:[
  {id:'standing',label:'Οπτική στάση: όρθιος',min:1,description:'Αλλαγή μοντέλου μόνο για προβολή. Δεν προσομοιώνει ιατρική μετακίνηση ασθενούς.'},
  {id:'seated',label:'Οπτική στάση: καθιστός',min:1,description:'Εικονική αλλαγή θέσης για εκπαιδευτική προβολή, χωρίς κλινική συνέπεια.'},
  {id:'reclined',label:'Οπτική στάση: ξαπλωμένος',min:1,description:'Εικονική αλλαγή θέσης για εκπαιδευτική προβολή, όχι υπόδειξη μετακίνησης τραυματία.'}
 ],
 dialogue:[
  {id:'symptoms',label:'Τι αισθάνεστε;',min:1,flag:'communication',description:'Συμπτωματολογία από τον ίδιο τον εμπλεκόμενο.'},
  {id:'event',label:'Τι συνέβη;',min:1,flag:'communication',description:'Προφορική περιγραφή του γεγονότος.'},
  {id:'history',label:'Ιστορικό / αλλεργίες',min:1,flag:'communication',description:'Το συγκεκριμένο σενάριο δεν περιέχει επαληθευμένο ιατρικό ιστορικό.'}
 ],
 exam:[
  {id:'scene',label:'Έλεγχος ασφάλειας σκηνής',min:1,flag:'safety',description:'Καταγράφηκε έλεγχος κινδύνων. Η σκηνή δεν χαρακτηρίζεται αυτομάτως ασφαλής.'},
  {id:'initial',label:'Αρχική οπτική εκτίμηση',min:1,flag:'assessment',description:'Απλή παρατήρηση· όχι κλινική διάγνωση.'},
  {id:'airway',label:'Παρατήρηση αεραγωγού / ομιλίας',min:1,flag:'assessment',description:'Η δυνατότητα ομιλίας είναι το μόνο διαθέσιμο συνθετικό εύρημα.'},
  {id:'breathing',label:'Παρατήρηση αναπνοής',min:1,flag:'assessment',description:'Συνθετική παρατήρηση αναπνευστικού ρυθμού, χωρίς ακρόαση.'},
  {id:'reassess',label:'Επανεκτίμηση',min:2,flag:'reassessment',description:'Καταγράφηκε επανεκτίμηση. Δεν προκύπτει κλινική επιβεβαίωση από την άσκηση.'},
  {id:'head',label:'Οπτικός έλεγχος κεφαλής/αυχένα',min:1,flag:'assessment',description:'Δεν υπάρχει επαληθευμένο ειδικό εύρημα κεφαλής ή αυχένα στο συνθετικό σενάριο.'},
  {id:'chest',label:'Οπτικός έλεγχος θώρακα',min:1,flag:'assessment',description:'Διαθέσιμος μόνο ο συνθετικός αναπνευστικός ρυθμός. Δεν έχει μοντελοποιηθεί ακρόαση.'},
  {id:'limbs',label:'Οπτικός έλεγχος άκρων',min:1,flag:'assessment',description:'Δεν υπάρχουν επαληθευμένα ευρήματα άκρων στο σενάριο.'}
 ],
 monitor:[
  {id:'attach',label:'Ενεργοποίηση συνθετικού monitor',min:1,flag:'monitoring',description:'Εμφανίζονται μόνο συνθετικά HR, RR και SpO₂.'},
  {id:'record',label:'Καταγραφή ζωτικών',min:1,flag:'monitoring',description:'Αποτύπωση του τρέχοντος εκπαιδευτικού στιγμιότυπου.'},
  {id:'bp',label:'Έλεγχος ΑΠ / ΗΚΓ',min:1,description:'Αρτηριακή πίεση και πραγματικό ΗΚΓ δεν έχουν μοντελοποιηθεί.'}
 ],
 tests:[
  {id:'labs',label:'Διερεύνηση διαθέσιμων εξετάσεων',min:1,description:'Δεν υπάρχουν αξιόπιστα εργαστηριακά αποτελέσματα στο εκπαιδευτικό περιστατικό.'},
  {id:'imaging',label:'Διερεύνηση απεικόνισης',min:1,description:'Δεν υπάρχει προσομοίωση απεικονιστικού ελέγχου.'}
 ],
 call:[
  {id:'coordination',label:'Πρόβα ενημέρωσης συντονισμού',min:1,flag:'coordination',description:'Εικονική καταγραφή μηνύματος, χωρίς τηλεφωνική κλήση.'},
  {id:'support',label:'Πρόβα αιτήματος υποστήριξης',min:1,flag:'coordination',description:'Μόνο προσομοιωμένη επικοινωνία.'}
 ],
 interventions:[
  {id:'safety',label:'Καταγραφή διαχείρισης κινδύνων σκηνής',min:2,flag:'safety',description:'Οργανωτικό βήμα. Δεν πραγματοποιείται φυσική παρέμβαση.'},
  {id:'handover',label:'Δομημένη παράδοση επιβεβαιωμένων στοιχείων',min:2,flag:'handover',description:'Συνθετική παράδοση βασισμένη μόνο στις καταγραφές.'},
  {id:'review',label:'Επανέλεγχος διαθέσιμων ευρημάτων',min:2,flag:'reassessment',description:'Ανασκόπηση πληροφοριών, χωρίς θεραπεία.'}
 ]
};
export function newSession(){return {v:1,caseId:CASE.id,minute:0,playing:false,person:'a',view:'scene',events:[],flags:{},finished:false};}
export function validSession(s){
 return !!s&&s.v===1&&s.caseId===CASE.id&&Number.isInteger(s.minute)&&s.minute>=0&&s.minute<=45&&
 Array.isArray(s.events)&&s.events.length<=120&&['a','b'].includes(s.person)&&['scene','full','head','torso','legs'].includes(s.view)&&
 !!s.flags&&typeof s.flags==='object'&&typeof s.playing==='boolean'&&typeof s.finished==='boolean'&&
 s.events.every(e=>e&&Number.isInteger(e.minute)&&e.minute>=0&&e.minute<=45&&['a','b'].includes(e.person)&&
 typeof e.label==='string'&&e.label.length<=160&&typeof e.detail==='string'&&e.detail.length<=600&&typeof e.tool==='string'&&e.tool.length<=28);
}
export function loadSession(store){try{const s=JSON.parse(store.getItem(STORE_KEY));return validSession(s)?{...s,playing:false}:newSession();}catch{return newSession();}}
export function saveSession(store,s){try{store.setItem(STORE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
export function patientVitals(s,id){
 const p=CASE.patients.find(x=>x.id===id);
 if(!p)throw Error('unknown-person');
 // Illustrative fixed time trend; never varies according to clinical intervention.
 const t=s.minute;
 return {hr:Math.round(p.v.hr+p.slope.hr*t),rr:Math.round(p.v.rr+p.slope.rr*t),
 spo2:Math.round(clamp(p.v.spo2+p.slope.spo2*t,88,100))};
}
export function nextMinute(s,amount=1){
 if(!validSession(s)||!Number.isInteger(amount)||amount<1||amount>5)throw Error('invalid-tick');
 if(s.finished)return s;
 const minute=clamp(s.minute+amount,0,30);
 return {...s,minute,playing:minute>=30?false:s.playing,finished:minute>=30};
}
export function setFocus(s,person,view){
 if(!validSession(s)||!['a','b'].includes(person)||!['scene','full','head','torso','legs'].includes(view))throw Error('invalid-focus');
 return {...s,person,view};
}
export function setPlaying(s,playing){if(!validSession(s)||typeof playing!=='boolean')throw Error('invalid-play');return {...s,playing:s.finished?false:playing};}
export function execute(s,tool,id){
 if(!validSession(s)||s.finished)throw Error('session-finished-or-invalid');
 const action=ACTIONS[tool]?.find(a=>a.id===id);
 if(!action)throw Error('invalid-action');
 const minute=clamp(s.minute+action.min,0,30),p=CASE.patients.find(x=>x.id===s.person);
 let detail=action.description;
 if(tool==='dialogue'){
  detail=id==='symptoms'?p.dialogue.feeling:id==='event'?p.dialogue.event:'«Δεν υπάρχουν επιβεβαιωμένα στοιχεία για το ιατρικό μου ιστορικό.»';
 }
 if(tool==='exam'&&id==='initial')detail=p.description;
 if(tool==='monitor'&&id==='record'){
  const v=patientVitals(s,s.person);detail='Συνθετική καταγραφή: HR '+v.hr+', RR '+v.rr+', SpO₂ '+v.spo2+'%.';
 }
 const events=[...s.events,{minute,person:s.person,tool,actionId:id,label:action.label,detail}];
 const flags={...s.flags,...(action.flag?{[action.flag]:true}:{})};
 return {...s,minute,events,flags,finished:minute>=30,playing:minute>=30?false:s.playing};
}
export function askPatient(s,text){
 if(!validSession(s)||s.finished)throw Error('session-finished-or-invalid');
 const q=String(text||'').trim().slice(0,200);
 if(!q)throw Error('empty-question');
 const p=CASE.patients.find(x=>x.id===s.person);
 const symptom=/πον|αισθ|νιώθ|ενοχλ|symptom|feel/i.test(q),event=/συνέβ|έγινε|τροχα|ατύχημ|accident/i.test(q),
 history=/ιστορ|αλλεργ|φάρμακ|παίρν|history|allerg/i.test(q);
 const detail=symptom?p.dialogue.feeling:event?p.dialogue.event:history?'«Δεν υπάρχει επιβεβαιωμένο ιστορικό στο σενάριο.»':'«Δεν έχω διαθέσιμη απάντηση σε αυτή την ερώτηση στο εκπαιδευτικό σενάριο.»';
 const minute=clamp(s.minute+1,0,30);
 return {...s,minute,flags:{...s.flags,communication:true},events:[...s.events,{minute,person:s.person,tool:'dialogue',label:'Ελεύθερη ερώτηση: '+q.slice(0,110),detail}],finished:minute>=30,playing:minute>=30?false:s.playing};
}
export function summarize(s){
 if(!validSession(s))throw Error('invalid-session');
 const expected=[['safety','Ασφάλεια σκηνής'],['communication','Συνομιλία'],['assessment','Εκτίμηση'],['monitoring','Παρακολούθηση'],['coordination','Συντονισμός'],['reassessment','Επανεκτίμηση'],['handover','Παράδοση']];
 const covered=expected.filter(([key])=>!!s.flags[key]).map(([,label])=>label);
 const missing=expected.filter(([key])=>!s.flags[key]).map(([,label])=>label);
 return {covered,missing,events:s.events.length,minute:s.minute,
 disclaimer:'Έλεγχος ολοκλήρωσης εκπαιδευτικών βημάτων — όχι κλινική βαθμολογία ή πιστοποίηση.'};
}
export function reportText(s){
 const r=summarize(s);return ['MENTOR NEXT · ΣΥΝΘΕΤΙΚΗ ΑΠΟΣΤΟΛΗ',CASE.title,r.disclaimer,
 'Χρόνος: '+r.minute+' εικονικά λεπτά','Καταγραφές: '+r.events,
 'Βήματα που καταγράφηκαν: '+(r.covered.join(', ')||'Κανένα'),
 'Για επανάληψη: '+(r.missing.join(', ')||'Κανένα'),'',
 ...s.events.map((e,i)=>(i+1)+'. '+String(e.minute).padStart(2,'0')+'΄ · '+e.person.toUpperCase()+' · '+e.label+'\n'+e.detail)
 ].join('\n')+'\n';
}
