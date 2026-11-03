/**
 * ATLA knowledge retrieval over the reviewed local term library (medical-terms.json).
 * Returns cited passages only; never invents sources. A risk guard blocks questions that
 * would turn an educational tool into real-patient or dosing advice.
 */
const norm=value=>String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ς/g,"σ").toLocaleLowerCase("el");
const STOP=new Set(["τι","ειναι","η","ο","το","οι","τα","των","του","της","και","να","για","με","σε","απο","ως","πως","ποιο","ποια","ποιος","μου","πες","εξηγησε","σημαινει","ενας","μια","ενα","στον","στην","στο","που","οταν","θα","δεν","αν"]);
const tokens=text=>norm(text).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=2&&!STOP.has(t));
const stem=t=>t.length>5?t.slice(0,t.length-2):t;

export function retrieve(question,items,{k=4,minScore=3}={}){
 if(!Array.isArray(items))return [];
 const q=tokens(String(question||"").slice(0,300));
 if(!q.length)return [];
 const qStems=new Set(q.map(stem));
 const full=norm(question);
 const scored=[];
 for(const item of items){
  if(!item||typeof item.term!=="string"||typeof item.definition!=="string")continue;
  let score=0;
  const names=[item.term,item.en,...(item.symbols||[]),...(item.aliases||[])].filter(Boolean);
  for(const name of names){
   const n=norm(name);
   if(n.length>=2&&full.includes(n))score+=8+Math.min(6,n.length/4);
  }
  const nameTokens=new Set(tokens(names.join(" ")).map(stem));
  const defTokens=new Set(tokens(item.definition).map(stem));
  for(const s of qStems){
   if(nameTokens.has(s))score+=3;
   else if(defTokens.has(s))score+=1;
  }
  if(score>=minScore)scored.push({item,score});
 }
 scored.sort((a,b)=>b.score-a.score||a.item.term.localeCompare(b.item.term,"el"));
 return scored.slice(0,k).map(({item,score},i)=>({
  id:"T"+(i+1),
  term:item.term,
  definition:item.definition,
  category:item.category||"",
  source:/^https:\/\//.test(item.source||"")?item.source:null,
  sourceType:item.sourceType||"",
  score:Math.round(score*10)/10
 }));
}

const DOSE=/(δοσολογ|δοση|δοσεις|\bmg\b|\bμg\b|\bmcg\b|\bml\b|πόσα\s*(mg|ml|χιλιοστ)|να\s+(του|της|τον|την)\s+δωσω|πρεπει\s+να\s+δωσω)/i;
const REAL_PATIENT=/(ο\s+ασθενης\s+μου|η\s+ασθενης\s+μου|εχω\s+(εναν|μια|ενα)\s+ασθεν|στο\s+περιστατικο\s+που\s+εχω|αυτη\s+τη\s+στιγμη\s+(εχω|βρισκομαι)|εκτακτη\s+αναγκη\s+τωρα|πραγματικο\s+περιστατικο|συγγενης\s+μου\s+(εχει|παθαινει))/i;
const DIAGNOSE=/(τι\s+εχει\s+(ο|η|το)\s+\p{L}+|κανε\s+μου\s+διαγνωση|διαγνωσε|ποια\s+ειναι\s+η\s+διαγνωση\s+μου)/iu;

export const RISK_MESSAGE="Ο ATLA είναι εκπαιδευτικός βοηθός και δεν δίνει δοσολογίες, διαγνώσεις ή οδηγίες για πραγματικό περιστατικό. Σε επείγουσα ανάγκη κάλεσε το 166 ή το 112 και ακολούθησε το εγκεκριμένο πρωτόκολλο και τις οδηγίες του εκπαιδευτή σου.";

export function riskGuard(text){
 const n=norm(text);
 if(REAL_PATIENT.test(n))return {blocked:true,reason:"real-patient"};
 if(DOSE.test(n))return {blocked:true,reason:"dosing"};
 if(DIAGNOSE.test(n))return {blocked:true,reason:"diagnosis"};
 return {blocked:false,reason:null};
}
