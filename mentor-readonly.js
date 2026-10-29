/**
 * MENTOR OS — live, read-only learning-material browser.
 * Fetches published static source files only. Never invokes grading, saves progress,
 * changes answers, connects to cloud accounts, or persists any query/response.
 */
import {SOURCES,KINDS,parsePublishedSource,transformSource,searchRecords} from "./mentor/core/read-only-index.mjs";
import {readLegacySnapshot} from "./mentor/core/legacy-readonly.mjs";
const $=id=>document.getElementById(id);
const create=(tag,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
};
const state={records:[],errors:[],kind:"all",query:"",visible:60,ready:false};
function status(text){$("reader-status").textContent=text}
function makeLink(text,href){
 const a=create("a","source-link",text);a.href=href;a.target="_blank";a.rel="noopener noreferrer";
 return a;
}
function renderRecord(record){
 const card=create("article","reader-result");
 const details=create("details");
 const summary=create("summary");
 const header=create("span","reader-result-head");
 header.append(create("strong",null,record.title),create("small",null,record.subtitle||record.source));
 summary.append(header,create("span","reader-tag",record.kind==="eoppep"?"ΕΟΠΠΕΠ":KINDS.find(x=>x.value===record.kind)?.label||record.kind));
 details.append(summary);
 const content=create("div","reader-fulltext");
 content.append(create("p","source-detail","Πηγή: "+record.source+" · "+record.meta));
 if(record.kind==="eoppep")content.append(create("strong",null,"Καταχωρισμένη εκπαιδευτική απάντηση — όχι επίσημο λυσάρι ή ιατρική πιστοποίηση"));
 if(record.kind==="pharma")content.append(create("strong",null,"Μόνο μελέτη. Δεν αποτελεί εντολή χορήγησης ή κλινικό πρωτόκολλο."));
 const body=create("p","reader-text",record.body||"Δεν υπάρχει αναγνώσιμο κείμενο στον κατάλογο. Μπορείς να ανοίξεις την αρχική ενότητα.");
 content.append(body);
 const controls=create("div","reader-result-actions");
 if(record.href){
  controls.append(makeLink("Άνοιγμα αρχικής σελίδας ↗",record.href));
  controls.append(create("small","reader-caution","Η αρχική σελίδα ανήκει στην κανονική εφαρμογή και μπορεί να επιτρέπει δικές σου καταχωρίσεις. Η ανάγνωση εδώ δεν γράφει τίποτα."));
 }
 const speak=create("button","reader-speak","🔊 Άκουσε από το κείμενο");
 speak.type="button";
 speak.addEventListener("click",()=>{
  if(!("speechSynthesis" in window)||typeof window.SpeechSynthesisUtterance==="undefined"){
   status("Δεν υποστηρίζεται φωνητική ανάγνωση σε αυτόν τον browser.");return;
  }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance((record.title+". "+record.body).slice(0,2600));
  utterance.lang="el-GR";utterance.rate=.95;
  window.speechSynthesis.speak(utterance);
  status("Αναπαράγεται τμήμα του εκπαιδευτικού κειμένου. Η φωνή εξαρτάται από τη συσκευή.");
 });
 const stop=create("button","reader-stop","Σταμάτα φωνή");stop.type="button";
 stop.addEventListener("click",()=>{if("speechSynthesis" in window)window.speechSynthesis.cancel();});
 controls.append(speak,stop);content.append(controls);details.append(content);card.append(details);return card;
}
function render(){
 const {rows,total}=searchRecords(state.records,state.query,state.kind,state.visible);
 $("reader-results").replaceChildren(...rows.map(renderRecord));
 $("reader-more").hidden=rows.length>=total;
 const category=KINDS.find(x=>x.value===state.kind)?.label||"Όλα";
 status((state.ready?"":"Φόρτωση… ")+total+" αποτελέσματα · "+category+(state.errors.length?" · "+state.errors.length+" πηγές μη διαθέσιμες":""));
 if(!rows.length)$("reader-results").append(create("p","reader-empty","Δεν βρέθηκε περιεχόμενο. Δοκίμασε διαφορετική αναζήτηση ή κατηγορία."));
}
async function load(){
 status("Ανάγνωση των δημοσιευμένων πηγών της ΕΚΑΒ Σπουδή…");
 const loaded=await Promise.all(SOURCES.map(async source=>{
  try{
   const response=await fetch(source.file,{method:"GET",credentials:"same-origin",cache:"no-cache"});
   if(!response.ok)throw Error("HTTP "+response.status);
   // Same-origin static educational files only; no private API calls.
   const text=await response.text();
   if(text.length>4_500_000)throw Error("υπερβολικό μέγεθος");
   const payload=parsePublishedSource(source,text);
   return {items:transformSource(source,payload),source};
  }catch(error){return {items:[],source,error:String(error.message||error)}}
 }));
 state.records=loaded.flatMap(x=>x.items);
 state.errors=loaded.filter(x=>x.error);
 state.ready=true;
 $("loaded-summary").textContent=state.records.length+" διαθέσιμες εκπαιδευτικές καταχωρίσεις από "+(SOURCES.length-state.errors.length)+"/"+SOURCES.length+" πηγές.";
 $("load-errors").replaceChildren();
 if(state.errors.length){
  const list=create("ul");
  for(const result of state.errors)list.append(create("li",null,result.source.file+" — "+result.error));
  $("load-errors").append(create("p",null,"Δεν ήταν δυνατή η ανάγνωση όλων των πηγών. Οι ελλείψεις δεν αποκρύπτονται."),list);
 }
 render();
}
$("reader-search").addEventListener("submit",event=>{
 event.preventDefault();state.query=$("reader-input").value.trim().slice(0,150);state.visible=60;render();
});
$("reader-clear").addEventListener("click",()=>{$("reader-input").value="";state.query="";state.visible=60;render()});
for(const k of KINDS){const option=create("option",null,k.label);option.value=k.value;$("reader-kind").append(option);}
$("reader-kind").addEventListener("change",event=>{state.kind=event.target.value;state.visible=60;render();});
$("reader-more").addEventListener("click",()=>{state.visible=Math.min(state.visible+60,state.records.length);render()});
$("reader-progress").addEventListener("click",()=>{
 try{
  const result=readLegacySnapshot(window.localStorage);
  $("progress-preview").replaceChildren(
   create("p",null,"Καταχωρίσεις ανάγνωσης ΣΑΕΚ: "+result.saek_read_records),
   create("p",null,"Καταχωρίσεις εξάσκησης ΣΑΕΚ: "+result.saek_exam_question_records),
   create("p",null,"Καταχωρίσεις προσπάθειας ΕΟΠΠΕΠ: "+result.eoppep_attempt_records),
   create("small",null,result.limitations)
  );
 }catch{$("progress-preview").textContent="Η τοπική πρόοδος δεν είναι προσβάσιμη σε αυτό το περιβάλλον."}
});
const params=new URLSearchParams(location.search);
if(params.has("q")){$("reader-input").value=(params.get("q")||"").slice(0,150);state.query=$("reader-input").value;}
void load();
