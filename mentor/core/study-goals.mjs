/** Isolated, optional Mentor study preferences. No medical or grade decisions. */
export const PREF_KEY='ekab.mentor.preferences.v1';
const VALID_GOALS=['saek','eoppep','seminars'];
const VALID_MODES=['guided','practice','exam'];
const VALID_MINUTES=[10,15,25,30];
const LABELS={saek:'ΣΑΕΚ',eoppep:'ΕΟΠΠΕΠ',seminars:'Σεμινάρια'};
const LINKS={saek:'saek.html',eoppep:'eoppep.html',seminars:'seminar-prep.html'};
const TASKS={
  guided:['Μελέτη με καθοδήγηση','Έλεγχος κατανόησης','Επανάληψη'],
  practice:['Στοχευμένη μελέτη','Εξάσκηση','Ανασκόπηση'],
  exam:['Προετοιμασία','Δοκιμαστική αυτοαξιολόγηση','Ανασκόπηση']
};
export function normalizeStudyPreferences(raw){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const goals=Array.isArray(source.goals)?
    [...new Set(source.goals.filter(v=>typeof v==='string'&&VALID_GOALS.includes(v)))]:['saek'];
  const minutes=VALID_MINUTES.includes(source.minutes)?source.minutes:25;
  const mode=VALID_MODES.includes(source.mode)?source.mode:'guided';
  return {goals,minutes,mode};
}
export function readStudyPreferences(storage){
  try{
    const raw=storage.getItem(PREF_KEY);
    return normalizeStudyPreferences(raw&&raw.length<=2000?JSON.parse(raw):null);
  }catch{return normalizeStudyPreferences(null);}
}
export function saveStudyPreferences(storage,prefs){
  const clean=normalizeStudyPreferences(prefs);
  try{storage.setItem(PREF_KEY,JSON.stringify(clean));return true;}
  catch{return false;}
}
/** Split one actual time budget across ALL selected goals, never once per goal. */
export function planForGoals(prefs){
  const clean=normalizeStudyPreferences(prefs);
  if(!clean.goals.length)return [];
  const weights=clean.mode==='guided'?[.6,.28,.12]:clean.mode==='practice'?[.4,.4,.2]:[.15,.65,.2];
  return clean.goals.map((id,index)=>{
    const budget=Math.floor(clean.minutes/clean.goals.length)+(index<clean.minutes%clean.goals.length?1:0);
    // Every step receives at least one minute (minimum budget: 10 / 3 goals).
    const remaining=budget-3;
    const portions=weights.map(w=>w*remaining);
    const base=portions.map(Math.floor);
    const extra=remaining-base.reduce((sum,n)=>sum+n,0);
    const order=[0,1,2].sort((a,b)=>(portions[b]-base[b])-(portions[a]-base[a])||a-b);
    for(let k=0;k<extra;k++)base[order[k]]++;
    const allocation=base.map(n=>n+1);
    return {id,label:LABELS[id],href:LINKS[id],total_minutes:budget,
      tasks:TASKS[clean.mode].map((name,i)=>({name,minutes:allocation[i]}))
    };
  });
}
