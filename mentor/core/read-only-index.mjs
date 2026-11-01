/**
 * MENTOR OS — read-only adapter over already published EKAB Spoudi educational files.
 * This module is intentionally pure: no storage, cloud, grading, evaluation,
 * authentication, fetch, mutations, or user profiles.
 * Content is reproduced from the source without pretending it is clinically approved.
 */
export const SOURCES=Object.freeze([
  {file:"saek-search-A.json",kind:"saek",label:"ΣΑΕΚ · Α΄ εξάμηνο"},
  {file:"saek-search-B.json",kind:"saek",label:"ΣΑΕΚ · Β΄ εξάμηνο"},
  {file:"saek-search-C.json",kind:"saek",label:"ΣΑΕΚ · Γ΄ εξάμηνο"},
  {file:"saek-search-D.json",kind:"saek",label:"ΣΑΕΚ · Δ΄ εξάμηνο"},
  {file:"official_questions.json",kind:"eoppep",label:"ΕΟΠΠΕΠ · Ερωτήσεις/απαντήσεις"},
  {file:"eoppep-sos.json",kind:"sos",label:"ΕΟΠΠΕΠ · Έτοιμα SOS"},
  {file:"saek-exams-bank.json",kind:"saekExam",label:"ΣΑΕΚ · Ερωτήσεις αυτοελέγχου"},
  {file:"extra-exercises-search.json",kind:"practice",label:"Συμπληρωματικές ασκήσεις"},
  {file:"farmaka-catalog.js",kind:"pharma",label:"Φαρμακολογία · κάρτες"},
  {file:"seminar-tracks.js",kind:"seminar",label:"Σεμινάρια · ενότητες"},
  {file:"app-pages-search-1.json",kind:"pages",label:"Εκπαιδευτικές σελίδες"},
  {file:"app-pages-search-2.json",kind:"pages",label:"Εκπαιδευτικές σελίδες"},
  {file:"app-pages-search-3.json",kind:"pages",label:"Εκπαιδευτικές σελίδες"}
]);
export const KINDS=Object.freeze([
  {value:"all",label:"Όλο το ΕΚΑΒ Σπουδή"},
  {value:"saek",label:"Κεφάλαια ΣΑΕΚ"},
  {value:"eoppep",label:"Ερωτήσεις ΕΟΠΠΕΠ"},
  {value:"sos",label:"SOS ΕΟΠΠΕΠ"},
  {value:"saekExam",label:"Αυτοέλεγχος ΣΑΕΚ"},
  {value:"practice",label:"Ασκήσεις"},
  {value:"pharma",label:"Φαρμακολογία"},
  {value:"seminar",label:"Σεμινάρια"},
  {value:"pages",label:"Άλλες ενότητες"}
]);
const clean=value=>String(value??"").replace(/\s+/g," ").trim();
export function fold(value){
 return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ς/g,"σ").toLocaleLowerCase("el");
}
export function safeAppHref(value){
 if(typeof value!=="string"||value.length>240||!value)return null;
 // Only local, public app HTML pages. Never accept schemes, paths, slashes or traversal.
 return /^(?:[a-z][a-z0-9_-]*)(?:\.html)(?:#[a-z0-9_-]{1,80})?$/i.test(value)?value:null;
}
const entry=(id,kind,title,body,source,href,subtitle,meta="")=>Object.freeze({
 id:clean(id),kind,title:clean(title),body:clean(body),source,href:safeAppHref(href),
 subtitle:clean(subtitle),meta:clean(meta)
});
export function parsePublishedSource(source,text){
 if(!SOURCES.some(x=>x.file===source.file&&x.kind===source.kind))throw Error("source-not-allowlisted");
 if(source.kind==="pharma"){
  const match=String(text).match(/^\s*\/\*[\s\S]*?\*\/\s*window\.EKAB_PHARMA\s*=\s*(\{[\s\S]*\});\s*$/);
  if(!match)throw Error("pharma-format");
  const parsed=JSON.parse(match[1]);
  return {items:Array.isArray(parsed.medicines)?parsed.medicines:[]};
 }
 if(source.kind==="seminar"){
  const match=String(text).match(/window\.EkabSeminarTracks\s*=\s*(\[[\s\S]*?\n\]);/);
  if(!match)throw Error("seminar-format");
  return {items:JSON.parse(match[1])};
 }
 return JSON.parse(text);
}
export function transformSource(source,payload){
 if(!SOURCES.some(x=>x.file===source.file&&x.kind===source.kind))throw Error("source-not-allowlisted");
 const raw=Array.isArray(payload)?payload:(payload&&Array.isArray(payload.items)?payload.items:null);
 if(!raw||raw.length>5000)throw Error("invalid-source-shape");
 const rows=[];
 for(let i=0;i<raw.length;i++){
  const p=raw[i];if(!p||typeof p!=="object")continue;
  switch(source.kind){
   case "saek":
    rows.push(entry("saek-"+clean(p.courseId)+"-"+clean(p.chapter), "saek",
      (p.course||"Μάθημα")+" · "+(p.chapterTitle||"Κεφάλαιο"),p.searchText||p.preview||"",source.label,
      p.href,(p.semester||"")+"΄ εξάμηνο · κεφάλαιο "+p.chapter,source.file));break;
   case "eoppep":
    rows.push(entry(p.id||"eoppep-"+i,"eoppep",
      p.question||("Ερώτηση "+(i+1)),p.answer||"",source.label,
      "theory.html","Ομάδα "+(p.group||"")+" · "+(p.id||""), (p.answerStatus||"μη προσδιορισμένη κατάσταση")+" · "+source.file));break;
   case "sos":
    rows.push(entry("sos-"+p.id,"sos", "SOS · "+p.id,
      Array.isArray(p.points)?p.points.join("\n\n"):"",source.label,"theory.html",
      "Σημεία από υπάρχουσα εκπαιδευτική απάντηση", (p.auditStatus||"") +" · "+source.file));break;
   case "saekExam":
    rows.push(entry(p.id||"self-"+i,"saekExam",p.question||"Ερώτηση αυτοελέγχου",
      p.answer||"",source.label,p.href,(p.course||"")+" · "+(p.chapterTitle||""),source.file));break;
   case "pharma":
    rows.push(entry("med-"+clean(p.id),"pharma",p.name||"Φαρμακευτική κάρτα",
      ["Μηχανισμός: "+(p.mechanism||""),"Καταχωρισμένη ένδειξη: "+(p.indication||""),"Προφυλάξεις: "+(p.caution||""),"Σημειώσεις: "+(p.notes||"")].join("\n\n"),
      source.label,"farmaka.html",p.category||"",source.file+" · εκπαιδευτικό, όχι οδηγία χορήγησης"));break;
   case "seminar":
    for(let n=0;n<(Array.isArray(p.units)?p.units.length:0);n++){
      const unit=p.units[n];
      if(!Array.isArray(unit))continue;
      rows.push(entry("seminar-"+clean(p.id)+"-"+n,"seminar",
        (p.name||"Σεμινάριο")+" · "+(unit[0]||"Ενότητα"),unit.slice(1).join("\n\n"),source.label,
        "seminar-prep.html",p.subtitle||"",source.file));
    }break;
   case "practice":
   case "pages":
    rows.push(entry(p.id||source.file+"-"+i,source.kind,p.title||"Εκπαιδευτικό υλικό",
      p.searchText||p.preview||"",source.label,p.href,p.subtitle||"",source.file));break;
   default:throw Error("unsupported-source");
  }
 }
 return Object.freeze(rows);
}
export function searchRecords(records,query="",kind="all",limit=60,offset=0){
 if(!Array.isArray(records))throw Error("records-required");
 const tokens=fold(query).split(" ").filter(Boolean).slice(0,12);
 const selected=KINDS.some(k=>k.value===kind)?kind:"all";
 const matches=records.filter(x=>{
  if(selected!=="all"&&x.kind!==selected)return false;
  if(!tokens.length)return true;
  const searchable=fold([x.title,x.subtitle,x.body,x.id].join(" "));
  return tokens.every(t=>searchable.includes(t));
 });
 const scored=tokens.length?matches.map((x,index)=>{
  const title=fold(x.title),sub=fold(x.subtitle),id=fold(x.id);
  const score=tokens.reduce((n,t)=>n+(title.includes(t)?8:0)+(sub.includes(t)?3:0)+(id.includes(t)?5:0),0);
  return {x,index,score};
 }).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.x):matches;
 return {total:scored.length,rows:scored.slice(Math.max(0,offset),Math.max(0,offset)+Math.max(1,Math.min(200,limit)))};
}
