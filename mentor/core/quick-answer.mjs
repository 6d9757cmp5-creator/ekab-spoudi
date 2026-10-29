/** MENTOR: answers grounded in local Greek medical terminology. Not AI. */
import {interpretQuestion,coachResponse} from "./guided-coach.mjs";
const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ς/g,"σ").toLocaleLowerCase("el").trim();
const valid=s=>typeof s==="string"&&s.length>0&&s.length<=350;
function exactPhrase(text,name){
  const n=normalize(name);
  if(n.length<2)return false;
  const cleaned=n.replace(/[.*+?^$()|[\]{}\\]/g,"\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])"+cleaned+"(?=$|[^\\p{L}\\p{N}])","u").test(text);
}
export function matchMedicalTerm(question,items=[]){
  const text=normalize(question).slice(0,350);
  if(!text||!Array.isArray(items))return null;
  const found=[];
  for(const item of items){
    if(!item||!valid(item.term)||!valid(item.definition))continue;
    const names=[item.term,item.en,...(Array.isArray(item.symbols)?item.symbols:[]),...(Array.isArray(item.aliases)?item.aliases:[])];
    for(const name of names){
      if(!valid(name))continue;
      if(exactPhrase(text,name))found.push({item,score:normalize(name).length+(name===item.term?1:0)});
    }
  }
  found.sort((a,b)=>b.score-a.score||a.item.term.localeCompare(b.item.term,"el"));
  return found[0]?.item||null;
}
export function answerStudyQuestion(question,{items=[],overview=null}={}){
  const q=String(question||"").trim().slice(0,300);
  if(!q)return {text:"Γράψε μία ερώτηση για να ξεκινήσουμε.",source:null,type:"empty"};
  const intent=interpretQuestion(q),n=normalize(q);
  const progress=/προοδο|πωσ τα παω|αποτελεσμα|τι να διαβασ|τι να μελετησ/.test(n);
  const matched=matchMedicalTerm(q,items);
  if(matched&&!progress){
    return {text:matched.term+": "+matched.definition+" Πρόκειται για σύντομο εκπαιδευτικό ορισμό από την υπάρχουσα βιβλιοθήκη, όχι ιατρική οδηγία.",
      source:valid(matched.source)&&/^https:\/\//.test(matched.source)?matched.source:null,type:"term",term:matched.term};
  }
  if(["focus","progress","exercise"].includes(intent.intent)||(intent.intent==="explain"&&intent.topic)){
    return {text:coachResponse({intent:intent.intent,topic:intent.topic,overview}),source:null,type:"study"};
  }
  return {text:"Δεν έχω ακόμη τεκμηριωμένη απάντηση για αυτή την ερώτηση στην τοπική βιβλιοθήκη μου. Δοκίμασε «Τι είναι η ΚΑΡΠΑ;», «Τι σημαίνει ABCDE;», «Τι είναι ο απινιδωτής;» ή «Τι να μελετήσω;». Οι πλήρεις ελεύθερες ιατρικές απαντήσεις απαιτούν ελεγμένη σύνδεση AI, η οποία δεν είναι ενεργή.",
    source:null,type:"unavailable"};
}
let cached=null;
export async function loadMentorTermLibrary({fetcher=globalThis.fetch}={}){
  if(cached)return cached;
  if(typeof fetcher!=="function")return [];
  try{
    const response=await fetcher("./medical-terms.json",{cache:"default"});
    if(!response?.ok)return [];
    const data=await response.json();
    const items=Array.isArray(data?.items)?data.items.filter(x=>x&&valid(x.term)&&valid(x.definition)):[];
    if(items.length)cached=items;
    return items;
  }catch{return [];}
}
