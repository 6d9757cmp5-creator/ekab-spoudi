/**
 * MENTOR local-first terminology answers. 0 AI requests and 0 AI credits.
 * The primary 203-term catalog is medical-terms.json. These small, explicitly
 * attributed fallback entries cover essential acronyms if JSON is temporarily
 * inaccessible (offline, service-worker update, or a nested page).
 * Not a clinical treatment protocol or a replacement for an instructor.
 */
import {interpretQuestion,coachResponse} from "./guided-coach.mjs";
const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ς/g,"σ").toLocaleLowerCase("el").trim();
const valid=s=>typeof s==="string"&&s.length>0&&s.length<=350;
export const OFFLINE_CORE_TERMS=Object.freeze([
 {term:"Καρδιοπνευμονική αναζωογόνηση",symbols:["ΚΑΡΠΑ","CPR"],definition:"Θωρακικές συμπιέσεις και, όπου ενδείκνυται, αερισμοί για υποστήριξη της κυκλοφορίας σε καρδιακή ανακοπή.",source:"https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines",sourceType:"category"},
 {term:"Πρωτογενής εκτίμηση ABCDE",symbols:["ABCDE"],definition:"Δομημένη αρχική εκτίμηση αεραγωγού, αναπνοής, κυκλοφορίας, νευρολογικής κατάστασης και έκθεσης.",source:"https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines",sourceType:"category"},
 {term:"Αυτόματος εξωτερικός απινιδωτής",symbols:["AED","ΑΕΑ"],aliases:["απινιδωτής"],definition:"Συσκευή που αναλύει τον καρδιακό ρυθμό και καθοδηγεί τη χορήγηση ηλεκτρικού shock όταν ενδείκνυται.",source:"https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines",sourceType:"category"},
 {term:"Αεραγωγός",aliases:["Airway","αναπνευστική οδός"],definition:"Η διαδρομή από την οποία περνά ο αέρας προς και από τους πνεύμονες.",source:"https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system"},
 {term:"Καρδιακή ανακοπή",definition:"Αιφνίδια διακοπή της αποτελεσματικής λειτουργίας της καρδιάς και της κυκλοφορίας.",source:"https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines",sourceType:"category"},
 {term:"Κορεσμός οξυγόνου",symbols:["SpO₂","SpO2","SaO₂","SaO2"],definition:"Ποσοστό των θέσεων της αιμοσφαιρίνης που είναι κατειλημμένες από οξυγόνο· ο συμβολισμός εξαρτάται από τη μέθοδο μέτρησης.",source:"https://medlineplus.gov/vitalsigns.html",sourceType:"category"},
 {term:"Κλίμακα Γλασκώβης",symbols:["GCS"],definition:"Κλίμακα αξιολόγησης της οφθαλμικής, λεκτικής και κινητικής ανταπόκρισης.",source:"https://medlineplus.gov/neurologicdiseases.html",sourceType:"category"},
 {term:"Αρτηριακή πίεση",symbols:["BP","ΑΠ"],definition:"Η πίεση που ασκεί το αίμα στα τοιχώματα των αρτηριών.",source:"https://medlineplus.gov/vitalsigns.html",sourceType:"category"}
]);
function exactPhrase(text,name){
 const n=normalize(name);
 if(n.length<2)return false;
 const cleaned=n.replace(/[.*+?^$()|[\]{}\\]/g,"\\$&");
 return new RegExp("(^|[^\\p{L}\\p{N}])"+cleaned+"(?=$|[^\\p{L}\\p{N}])","u").test(text);
}
const namesFor=item=>[
 {value:item.term,kind:"term"},...(Array.isArray(item.symbols)?item.symbols.map(value=>({value,kind:"symbol"})):[]),
 ...(Array.isArray(item.aliases)?item.aliases.map(value=>({value,kind:"alias"})):[]),
 {value:item.en,kind:"english"}
];
export function matchMedicalTerm(question,items=[]){
 const text=normalize(question).slice(0,350);
 if(!text||!Array.isArray(items))return null;
 const found=[];
 for(const item of items){
  if(!item||!valid(item.term)||!valid(item.definition))continue;
  for(const {value,kind} of namesFor(item)){
   if(!valid(value)||!exactPhrase(text,value))continue;
   const score=normalize(value).length+
    (kind==="term"?100:kind==="symbol"?75:kind==="alias"?50:20)+
    (normalize(item.term).includes(normalize(value))?5:0);
   found.push({item,score});
  }
 }
 found.sort((a,b)=>b.score-a.score||a.item.term.localeCompare(b.item.term,"el"));
 return found[0]?.item||null;
}

/**
 * Do not answer a complex question about treatments, real patients or
 * procedures with a misleading one-sentence definition just because the
 * question happens to mention "ΚΑΡΠΑ" or another known term.
 */
export function isSimpleTermQuestion(question,item){
 if(!item)return false;
 let q=normalize(question).replace(/[;?!.,:«»"“”]/g," ").replace(/\s+/g," ").trim();
 q=q.replace(/^(?:(?:πες μου\s+)?τι\s+(?:ειναι|σημαινει|θα πει)|εξηγησε\s+(?:μου\s+)?τι\s+ειναι|δωσε\s+(?:μου\s+)?(?:τον\s+)?ορισμο\s+(?:του|τησ|για)?|ορισμοσ)\s+/, "");
 q=q.replace(/^(?:ο|η|το|τον|την|του|τησ)\s+/,"").replace(/\s+με απλα λογια$/,"").trim();
 return namesFor(item).some(({value})=>valid(value)&&q===normalize(value));
}
export function answerStudyQuestion(question,{items=[],overview=null}={}){
 const q=String(question||"").trim().slice(0,300);
 if(!q)return {text:"Γράψε μία ερώτηση για να ξεκινήσουμε.",source:null,type:"empty"};
 const intent=interpretQuestion(q),n=normalize(q);
 const progress=/προοδο|πωσ τα παω|αποτελεσμα|τι να διαβασ|τι να μελετησ/.test(n);
 const pool=Array.isArray(items)&&items.length?items:OFFLINE_CORE_TERMS;
 const matched=matchMedicalTerm(q,pool);
 if(matched&&!progress&&isSimpleTermQuestion(q,matched)){
  return {text:matched.term+": "+matched.definition+" Σύντομος εκπαιδευτικός ορισμός, όχι οδηγία αντιμετώπισης πραγματικού περιστατικού.",
   source:valid(matched.source)&&/^https:\/\//.test(matched.source)?matched.source:null,type:"term",term:matched.term,offline:pool===OFFLINE_CORE_TERMS};
 }
 if(["focus","progress","exercise"].includes(intent.intent)||(intent.intent==="explain"&&intent.topic&&!matched)){
  return {text:coachResponse({intent:intent.intent,topic:intent.topic,overview}),source:null,type:"study"};
 }
 return {text:"Για την ερώτησή σου χρειάζεται αναλυτική, επαληθευμένη εξήγηση· δεν θα υποθέσω ιατρικές οδηγίες. Για σύντομο ορισμό γράψε μόνο τον όρο (π.χ. «ΚΑΡΠΑ», «ABCDE», «AED»). Μπορείς επίσης να μελετήσεις το αντίστοιχο κεφάλαιο. Το AI χρησιμοποιείται μόνο όταν είναι διαθέσιμο και η τοπική βιβλιοθήκη δεν αρκεί.",
   source:null,type:"unavailable"};
}
let cached=null,loading=null;
export async function loadMentorTermLibrary({fetcher=globalThis.fetch}={}){
 if(cached)return cached;
 if(typeof fetcher!=="function")return OFFLINE_CORE_TERMS;
 if(loading)return loading;
 // Absolute URL relative to this module also works from nested anatomy/ECG pages.
 const url=new URL("../../medical-terms.json",import.meta.url).href;
 loading=(async()=>{
  try{
   const response=await fetcher(url,{cache:"default"});
   if(!response?.ok)return OFFLINE_CORE_TERMS;
   const data=await response.json();
   const items=Array.isArray(data?.items)?data.items.filter(x=>x&&valid(x.term)&&valid(x.definition)):[];
   if(items.length){cached=items;return cached;}
   return OFFLINE_CORE_TERMS;
  }catch{return OFFLINE_CORE_TERMS;}
 })();
 try{return await loading;}finally{loading=null;}
}
