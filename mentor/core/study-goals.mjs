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
export function planForGoals(prefs){
  const clean=normalizeStudyPreferences(prefs);
  const fractions=clean.mode==='guided'?[.6,.28]:clean.mode==='practice'?[.4,.4]:[.15,.65];
  const first=Math.round(clean.minutes*fractions[0]);
  const second=Math.round(clean.minutes*fractions[1]);
  const minutes=[first,second,clean.minutes-first-second];
  return clean.goals.map(id=>({
    id,label:LABELS[id],href:LINKS[id],
    tasks:TASKS[clean.mode].map((name,i)=>({name,minutes:minutes[i]}))
  }));
}
