/**
 * ATLA read-only view of practice outside SAEK/EOPPEP: simulator, two-patient mission,
 * protocol lab, ECG lab and personal notes. Seminars are deliberately not read.
 * Never writes storage, never reads note text and never leaves the device.
 * Oral practice keeps no record, and the LAB missions live in IndexedDB, so neither is read here.
 */
const SIM_LIBRARY_KEY='ekab.mentor.next-library-v1',SIM_ACTIVE_KEY='ekab.mentor.next-v1';
const MISSION_KEY='ekab.mentor.live-two-patients.v1';
const ECG_KEY='ekab.mentor.ecg-practice.v1';
const NOTES_KEY='ekab.personal-notes.v1';
const PROTOCOL_KEY=/^ekab:mentor:protocol-foundation:v2:[a-z0-9-]{1,40}:[a-z0-9-]{1,30}$/;
// Same steps and labels as the simulator's own summary.
const SIM_STEPS=[['safety','Ασφάλεια σκηνής'],['communication','Συνομιλία'],['assessment','Εκτίμηση'],['monitoring','Παρακολούθηση'],['coordination','Συντονισμός'],['reassessment','Επανεκτίμηση'],['handover','Παράδοση']];

const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function parsed(storage,key){
 try{
  const raw=storage.getItem(key);
  if(!raw||raw.length>2_000_000)return null;
  return JSON.parse(raw);
 }catch{return null;}
}
function keys(storage){
 const out=[];
 try{for(let i=0,n=Math.min(storage.length||0,5000);i<n;i++){const k=storage.key(i);if(typeof k==='string')out.push(k);}}
 catch{/* Storage denied: unknown is safer than made-up progress. */}
 return out;
}

function simulator(storage){
 const byCase=new Map();
 const library=parsed(storage,SIM_LIBRARY_KEY);
 if(plain(library))for(const s of Object.values(library))if(plain(s)&&typeof s.caseId==='string')byCase.set(s.caseId,s);
 const active=parsed(storage,SIM_ACTIVE_KEY);
 if(plain(active)&&typeof active.caseId==='string'&&!byCase.has(active.caseId))byCase.set(active.caseId,active);
 const sessions=[...byCase.values()].filter(s=>s.v===1&&plain(s.flags)&&Array.isArray(s.events)&&s.events.length>0);
 const finished=sessions.filter(s=>s.finished===true);
 const toRepeat=SIM_STEPS.filter(([key])=>finished.some(s=>!s.flags[key])).map(([,label])=>label);
 return Object.freeze({cases:sessions.length,finished:finished.length,toRepeat:Object.freeze(toRepeat)});
}
function mission(storage){
 const s=parsed(storage,MISSION_KEY);
 if(!plain(s)||s.schema_version!==1||!Array.isArray(s.events)||!s.events.length)return Object.freeze({started:false,completed:false,reviewChoices:0});
 const reviewChoices=s.events.filter(e=>plain(e)&&e.outcome==='review').length;
 return Object.freeze({started:true,completed:s.completed===true,reviewChoices});
}
function protocols(storage){
 let started=0,completed=0;
 for(const key of keys(storage)){
  if(!PROTOCOL_KEY.test(key))continue;
  const s=parsed(storage,key);
  if(!plain(s)||s.version!==2||!Array.isArray(s.answers)||!s.answers.length)continue;
  started++;if(s.completed===true)completed++;
 }
 return Object.freeze({started,completed});
}
function ecg(storage){
 const s=parsed(storage,ECG_KEY);
 if(!plain(s)||s.schema_version!==1||!Array.isArray(s.answers))return Object.freeze({answered:0,right:0,completed:false});
 const answers=s.answers.filter(plain);
 return Object.freeze({answered:answers.length,right:answers.filter(a=>a.correct===true).length,completed:s.completed===true});
}
function notes(storage){
 const all=parsed(storage,NOTES_KEY);
 // Counts only; titles and text stay private.
 const count=plain(all)?Object.values(all).filter(n=>plain(n)&&typeof n.title==='string'&&n.section!=='seminar').length:0;
 return Object.freeze({count});
}

export const PRACTICE_SOURCES=Object.freeze([SIM_LIBRARY_KEY,SIM_ACTIVE_KEY,MISSION_KEY,'ekab:mentor:protocol-foundation:v2:*',ECG_KEY,NOTES_KEY]);

export function practiceSummary(storage){
 const store=storage&&typeof storage.getItem==='function'?storage:{getItem:()=>null};
 return Object.freeze({simulator:simulator(store),mission:mission(store),protocols:protocols(store),ecg:ecg(store),notes:notes(store)});
}

/** One sentence per tool that has records; empty when nothing was practised. */
export function practiceLines(p){
 const lines=[];
 if(p?.simulator?.cases){
  const s=p.simulator;
  lines.push('Προσομοιωτής: '+s.cases+' περιστατικά ('+s.finished+' ολοκληρωμένα)'+(s.toRepeat.length?', για επανάληψη: '+s.toRepeat.join(', '):'')+'.');
 }
 if(p?.mission?.started){
  const m=p.mission;
  lines.push('Αποστολή δύο τραυματιών: '+(m.completed?'ολοκληρώθηκε':'σε εξέλιξη')+(m.reviewChoices?', '+m.reviewChoices+' επιλογές χρειάστηκαν επανάληψη':'')+'.');
 }
 if(p?.protocols?.started)lines.push('Εργαστήριο πρωτοκόλλων: '+p.protocols.started+' θέματα ('+p.protocols.completed+' ολοκληρωμένα).');
 if(p?.ecg?.answered)lines.push('ΗΚΓ: '+p.ecg.right+'/'+p.ecg.answered+' σωστές μετρήσεις συχνότητας.');
 if(p?.notes?.count)lines.push('Σημειώσεις: '+p.notes.count+'.');
 return lines;
}
