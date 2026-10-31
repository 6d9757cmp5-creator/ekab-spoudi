/**
 * Controlled navigation adapter: MENTOR can only suggest links from this fixed allowlist
 * of same-site pages. The learner must press the link; MENTOR never navigates by itself.
 */
export const ROUTES=Object.freeze([
 {label:"Ανατομία",href:"anatomia.html",keywords:["ανατομι"]},
 {label:"Φυσιολογία",href:"fysiologia.html",keywords:["φυσιολογι"]},
 {label:"Φαρμακολογία",href:"farmaka.html",keywords:["φαρμακ"]},
 {label:"ECG Lab",href:"mentor-ecg.html",keywords:["ecg","καρδιογραφ","ηκγ"]},
 {label:"Μαθήματα ΣΑΕΚ",href:"saek.html",keywords:["σαεκ","μαθηματα","μαθημα"]},
 {label:"Εξετάσεις ΣΑΕΚ",href:"saek-exams.html",keywords:["εξετασεις σαεκ","εξεταση σαεκ"]},
 {label:"Πιστοποίηση ΕΟΠΠΕΠ",href:"eoppep.html",keywords:["εοππεπ"]},
 {label:"Προετοιμασία σεμιναρίων",href:"seminar-prep.html",keywords:["σεμιναρ"]},
 {label:"Εργαστήριο αποστολών MENTOR",href:"mentor-lab.html",keywords:["εργαστηρι","αποστολ"]},
 {label:"Προσομοίωση ΕΚΑΒ Live",href:"mentor-live.html",keywords:["live","προσομοιωση","τραυματιες"]},
 {label:"Προφορική εξάσκηση",href:"mentor-oral.html",keywords:["προφορικ"]},
 {label:"Βιβλιογραφία MENTOR",href:"mentor-library.html",keywords:["βιβλιογραφι","πηγες"]},
 {label:"Άτλας σεναρίων",href:"mentor-scenarios.html",keywords:["σεναρι","ατλας"]},
 {label:"Χρήσιμα τηλέφωνα",href:"contacts.html",keywords:["τηλεφων","επαφες"]},
 {label:"Αναζήτηση",href:"search.html",keywords:["αναζητηση","ψαξε"]},
 {label:"Αρχική",href:"index.html",keywords:["αρχικη","αρχικο μενου"]}
]);

const norm=v=>String(v??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ς/g,"σ").toLocaleLowerCase("el");
const VERB=/(ανοιξε|ανοιγμα|πηγαινε|παμε|παω|μεταβαση|μετεβαινω|δειξε\s+μου|open|go\s+to)/;

/** Returns an allowlisted route, or null when the text is not a navigation request. */
export function matchNavigation(text){
 const n=norm(text).slice(0,200);
 if(!VERB.test(n))return null;
 let best=null,len=0;
 for(const route of ROUTES){
  for(const key of route.keywords){
   if(n.includes(norm(key))&&key.length>len){best=route;len=key.length;}
  }
 }
 return best?{label:best.label,href:best.href}:null;
}
