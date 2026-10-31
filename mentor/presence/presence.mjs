/**
 * MENTOR Live Companion: one shared floating presence for every study page.
 * - A single instance per document; the 3D scene loads only while it is open.
 * - Drag, resize, pin to a corner, dock, minimize, hide; preferences persist
 *   separately for desktop and mobile.
 * - Presentation only: never reads or writes grades, notes, progress or sync.
 * Pages with their own embedded MENTOR (home, lab) are skipped.
 */
import {
 STORAGE_KEY,CORNERS,layoutOf,clampSize,clampPosition,snapToEdges,cornerPosition,
 nearestCorner,dockedBox,normalizePrefs,parsePrefs,serializePrefs
} from "./presence-state.mjs";
import {
 CONTEXT_KEY,examMode,sanitizeAnnouncement,readPageContext,describeContext,composeQuestion,EXAM_REFUSAL
} from "../context/bridge.mjs";
import {
 appendTurn,loadTurns,clearTurns,historyForAi,loadLearning,saveLearning,LEVEL_LABELS
} from "./memory.mjs";
import {matchNavigation} from "./navigate.mjs";
import {createVoice} from "./voice.mjs";
import {CUES,cueForTurn} from "./expression.mjs";
import {retrieve,riskGuard,RISK_MESSAGE} from "../knowledge/retrieve.mjs";
import {buildPayload,askAi} from "../ai/client.mjs";
import {MENTOR_AI,mentorAiHeaders} from "../ai/config.mjs";

// Addresses are resolved from this module, so the widget also works on pages in sub-folders (e.g. ui-tools/anatomy-3d/).
const SITE_ROOT=new URL("../../",import.meta.url);
const FRAME_SRC=new URL("mentor-presence.html?view=bust",SITE_ROOT).href;
const STYLE_HREF=new URL("./presence.css",import.meta.url).href;
const CORNER_LABELS={tl:"Πάνω αριστερά",tr:"Πάνω δεξιά",bl:"Κάτω αριστερά",br:"Κάτω δεξιά"};
const DRAG_THRESHOLD=4;

function alreadyPresent(){
 return window.top!==window||window.__ekabMentorPresence||
  document.querySelector("#mentor-home-presence-frame,#mentor-cinematic-stage");
}

function el(tag,attrs={},children=[]){
 const node=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs)){
  if(k==="text")node.textContent=v;
  else if(v===true)node.setAttribute(k,"");
  else if(v!==false&&v!=null)node.setAttribute(k,v);
 }
 node.append(...children);
 return node;
}

function boot(){
 if(alreadyPresent())return;

 let prefs=parsePrefs(readStorage());
 let frame=null,dragging=null,menuOpen=false,askOpen=false,voice=null;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");

 if(!document.querySelector('link[data-ekab-mentor-presence]')){
  document.head.append(el("link",{rel:"stylesheet",href:STYLE_HREF,"data-ekab-mentor-presence":true}));
 }

 const probe=el("div",{"aria-hidden":"true",style:"position:fixed;visibility:hidden;pointer-events:none;inset:0;"+
  "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"});
 const live=el("div",{class:"emp-live",role:"status","aria-live":"polite"});

 const grip=el("button",{type:"button",class:"emp-grip",
  "aria-label":"MENTOR. Μετακίνηση: σύρε ή χρησιμοποίησε τα βέλη"},[el("span",{"aria-hidden":"true",text:"⠿"}),el("span",{class:"emp-grip-text",text:"MENTOR"})]);
 const askBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Ρώτα τον MENTOR","aria-expanded":"false","aria-controls":"ekab-mentor-ask",text:"💬"});
 const menuBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Επιλογές θέσης MENTOR","aria-haspopup":"true","aria-expanded":"false",text:"⋯"});
 const minBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Ελαχιστοποίηση MENTOR",text:"–"});
 const hideBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Απόκρυψη MENTOR",text:"✕"});
 const bar=el("div",{class:"emp-bar"},[grip,askBtn,menuBtn,minBtn,hideBtn]);
 const status=el("p",{class:"emp-status",role:"status",text:"Φόρτωση 3D εκπαιδευτή…"});
 const ctxLine=el("p",{class:"emp-ctx"});
 const ctxToggle=el("button",{type:"button",class:"emp-link","aria-pressed":"true",text:"Απενεργοποίηση"});
 const askInput=el("input",{type:"text",class:"emp-input",maxlength:"300",autocomplete:"off","aria-label":"Ερώτηση προς τον MENTOR",placeholder:"Π.χ. Τι είναι η ΚΑΡΠΑ;"});
 const micBtn=el("button",{type:"button",class:"emp-mic","aria-pressed":"false","aria-label":"Μίλησε στον MENTOR (ενεργοποιεί το μικρόφωνο)",text:"🎙"});
 const askSend=el("button",{type:"submit",class:"emp-send",text:"Ρώτα"});
 const askForm=el("form",{class:"emp-form"},[askInput,micBtn,askSend]);
 const selBtn=el("button",{type:"button",class:"emp-link",text:"Εξήγησε την επιλογή μου"});
 const stopVoiceBtn=el("button",{type:"button",class:"emp-link",text:"■ Σίγαση",hidden:true});
 const clearBtn=el("button",{type:"button",class:"emp-link",text:"Διαγραφή συνομιλίας"});
 const micState=el("p",{class:"emp-mic-state",role:"status","aria-live":"polite",hidden:true});
 const logEl=el("div",{class:"emp-log",role:"log","aria-live":"polite","aria-label":"Συνομιλία με τον MENTOR"});
 const navBox=el("div",{class:"emp-nav",hidden:true});
 const levelSel=el("select",{class:"emp-select","aria-label":"Επίπεδο εξήγησης"},
  Object.entries(LEVEL_LABELS).map(([v,l])=>el("option",{value:v,text:l})));
 const autoSpeakBox=el("input",{type:"checkbox",id:"emp-autospeak"});
 const focusBox=el("input",{type:"checkbox",id:"emp-focus"});
 const settings=el("details",{class:"emp-settings"},[
  el("summary",{text:"Ρυθμίσεις MENTOR"}),
  el("label",{},[el("span",{text:"Επίπεδο: "}),levelSel]),
  el("label",{class:"emp-check"},[autoSpeakBox,el("span",{text:"Ανάγνωση απαντήσεων με φωνή"})]),
  el("label",{class:"emp-check"},[focusBox,el("span",{text:"Ελαχιστοποίηση σε σελίδες εξέτασης"})]),
  el("p",{class:"emp-note",text:"Οι απαντήσεις προέρχονται από την τοπική βιβλιοθήκη. Η συνομιλία μένει μόνο σε αυτή την καρτέλα."})
 ]);
 const askPanel=el("div",{class:"emp-ask",id:"ekab-mentor-ask",hidden:true},
  [el("div",{class:"emp-ctxrow"},[ctxLine,ctxToggle]),logEl,navBox,askForm,micState,
   el("div",{class:"emp-actions"},[selBtn,stopVoiceBtn,clearBtn]),settings]);
 const stage=el("div",{class:"emp-stage"},[status,askPanel]);
 const resize=el("button",{type:"button",class:"emp-resize","aria-label":"Αλλαγή μεγέθους MENTOR (βέλη ή + και −)"});
 const menu=el("div",{class:"emp-menu",role:"group","aria-label":"Θέση MENTOR",hidden:true});
 const root=el("aside",{class:"ekab-mentor-presence","aria-label":"MENTOR — ψηφιακός εκπαιδευτής",hidden:true},[bar,stage,resize,menu]);
 const launcher=el("button",{type:"button",class:"ekab-mentor-launcher","aria-label":"Άνοιγμα του MENTOR",hidden:true},
  [el("span",{class:"emp-dot","aria-hidden":"true"}),el("span",{text:"MENTOR"})]);

 function menuItem(label,action,pressed){
  const b=el("button",{type:"button","aria-pressed":String(!!pressed),text:label});
  b.addEventListener("click",()=>{closeMenu();action();});
  return b;
 }

 function readStorage(){try{return localStorage.getItem(STORAGE_KEY);}catch{return null;}}
 function save(){try{localStorage.setItem(STORAGE_KEY,serializePrefs(prefs));}catch{}}

 const viewport=()=>({w:window.innerWidth,h:window.innerHeight});
 const layout=()=>layoutOf(window.innerWidth);
 function safe(){
  const s=getComputedStyle(probe);
  const px=v=>parseFloat(v)||0;
  return {top:px(s.paddingTop),right:px(s.paddingRight),bottom:px(s.paddingBottom),left:px(s.paddingLeft)};
 }

 // While the Ask panel is open the widget grows so the avatar stays visible above it.
 function sizeNow(lay,vp){
  const base=clampSize(prefs[lay],vp,lay);
  if(!askOpen)return base;
  const want=lay==="mobile"?{w:330,h:460}:{w:310,h:540};
  return {w:Math.round(Math.min(vp.w-16,Math.max(base.w,want.w))),h:Math.round(Math.min(vp.h-16,Math.max(base.h,want.h)))};
 }

 function currentBox(){
  const vp=viewport(),lay=layout(),sf=safe();
  if(prefs.mode==="docked"){
   const d=dockedBox(vp,lay);
   return {x:d.x,y:d.y,w:d.w,h:d.h,edge:d.edge};
  }
  const stored=prefs[lay];
  const size=sizeNow(lay,vp);
  const placed=stored.x!=null&&stored.y!=null;
  const pos=prefs.mode==="pinned"||!placed
   ?cornerPosition(prefs.corner,size,vp,sf)
   :clampPosition(stored,size,vp,sf);
  return {x:pos.x,y:pos.y,w:size.w,h:size.h,edge:null};
 }

 function applyDockPadding(box){
  const de=document.documentElement;
  de.style.removeProperty("--ekab-mentor-dock-right");
  de.style.removeProperty("--ekab-mentor-dock-bottom");
  document.body.style.removeProperty("padding-right");
  document.body.style.removeProperty("padding-bottom");
  if(prefs.visibility==="shown"&&box.edge==="right")document.body.style.paddingRight=box.w+"px";
  if(prefs.visibility==="shown"&&box.edge==="bottom")document.body.style.paddingBottom=box.h+"px";
 }

 function placeLauncher(){
  const c=prefs.corner;
  launcher.style.top=launcher.style.bottom=launcher.style.left=launcher.style.right="";
  const v=c[0]==="t"?"top":"bottom",h=c[1]==="l"?"left":"right";
  launcher.style[v]="calc(14px + env(safe-area-inset-"+v+"))";
  launcher.style[h]="calc(14px + env(safe-area-inset-"+h+"))";
 }

 function render(){
  const open=prefs.visibility==="shown";
  root.hidden=!open;
  launcher.hidden=prefs.visibility!=="minimized";
  if(open){
   const box=currentBox();
   root.dataset.mode=prefs.mode;
   if(box.edge)root.dataset.edge=box.edge;else delete root.dataset.edge;
   root.style.width=box.w+"px";
   root.style.height=box.h+"px";
   root.style.transform="translate("+box.x+"px,"+box.y+"px)";
   applyDockPadding(box);
   mountFrame();
  }else{
   applyDockPadding({});
   unmountFrame();
  }
  placeLauncher();
  buildMenu();
 }

 function mountFrame(){
  if(frame)return;
  frame=el("iframe",{src:FRAME_SRC,title:"Ζωντανή τρισδιάστατη μορφή του εκπαιδευτή MENTOR",loading:"lazy",allow:""});
  stage.append(frame);
  status.hidden=false;
  status.textContent="Φόρτωση 3D εκπαιδευτή…";
 }
 function unmountFrame(){
  if(!frame)return;
  frame.src="about:blank";
  frame.remove();
  frame=null;
 }

 window.addEventListener("message",event=>{
  if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow)return;
  if(event.data?.type==="mentor:stage"){
   if(event.data.state==="ready"){status.hidden=true;sendCue(pendingCue||CUES.open);}
   else{status.hidden=false;status.textContent="Η μορφή 3D δεν φορτώθηκε σε αυτή τη συσκευή.";}
  }
 });

 function announce(text){live.textContent="";setTimeout(()=>{live.textContent=text;},30);}

 function set(patch,note){
  prefs=normalizePrefs({...prefs,...patch});
  save();
  render();
  if(note)announce(note);
 }

 const api={
  show(){set({visibility:"shown"},"Ο MENTOR εμφανίστηκε");grip.focus({preventScroll:true});},
  minimize(){voice?.stopAll();set({visibility:"minimized"},"Ο MENTOR ελαχιστοποιήθηκε");launcher.focus({preventScroll:true});},
  hide(){voice?.stopAll();set({visibility:"hidden"},"Ο MENTOR κρύφτηκε. Alt+Shift+M για επαναφορά");},
  restore(){api.show();},
  toggle(){prefs.visibility==="shown"?api.minimize():api.show();},
  pin(corner){
   if(!CORNERS.includes(corner))return;
   set({visibility:"shown",mode:"pinned",corner},"Καρφιτσώθηκε: "+CORNER_LABELS[corner]);
  },
  float(){set({visibility:"shown",mode:"floating"},"Ελεύθερη μετακίνηση");},
  dock(){set({visibility:"shown",mode:"docked"},"Προσαρτήθηκε στο πλάι");},
  getState(){return structuredClone(prefs);},
  destroy(){unmountFrame();applyDockPadding({});root.remove();launcher.remove();probe.remove();live.remove();delete window.__ekabMentorPresence;}
 };

 function buildMenu(){
  menu.replaceChildren(
   el("h2",{text:"ΘΕΣΗ"}),
   ...CORNERS.map(c=>menuItem("Καρφίτσωμα · "+CORNER_LABELS[c],()=>api.pin(c),prefs.mode==="pinned"&&prefs.corner===c)),
   menuItem("Ελεύθερη μετακίνηση",api.float,prefs.mode==="floating"),
   menuItem("Προσάρτηση σε πάνελ",api.dock,prefs.mode==="docked"),
   el("hr")
  );
  const snap=menuItem("Μαγνητική προσκόλληση στις άκρες",()=>set({snap:!prefs.snap}),prefs.snap);
  menu.append(snap);
 }

 function openMenu(){menuOpen=true;menu.hidden=false;menuBtn.setAttribute("aria-expanded","true");menu.querySelector("button")?.focus();}
 function closeMenu(){menuOpen=false;menu.hidden=true;menuBtn.setAttribute("aria-expanded","false");}

 menuBtn.addEventListener("click",()=>menuOpen?closeMenu():openMenu());
 minBtn.addEventListener("click",api.minimize);
 hideBtn.addEventListener("click",api.hide);
 launcher.addEventListener("click",api.show);
 document.addEventListener("pointerdown",event=>{
  if(menuOpen&&!menu.contains(event.target)&&event.target!==menuBtn)closeMenu();
 },true);

 // ---------- ask + page context ----------
 let contextOn=true,announced=null;
 try{contextOn=JSON.parse(localStorage.getItem(CONTEXT_KEY)||"{}").enabled!==false;}catch{}
 const isExam=()=>examMode(location.pathname,announced);
 const contextState=()=>({enabled:contextOn,exam:isExam(),announced,page:readPageContext(document,location)});

 function refreshContext(){
  ctxLine.textContent=describeContext(contextState());
  ctxToggle.textContent=contextOn?"Απενεργοποίηση":"Ενεργοποίηση";
  ctxToggle.setAttribute("aria-pressed",String(contextOn));
  ctxToggle.setAttribute("aria-label",contextOn?"Απενεργοποίηση χρήσης πλαισίου σελίδας":"Ενεργοποίηση χρήσης πλαισίου σελίδας");
 }
 function setAsk(open){
  askOpen=open;
  askPanel.hidden=!open;
  render();
  askBtn.setAttribute("aria-expanded",String(open));
  if(open){refreshContext();askInput.focus({preventScroll:true});}
 }
 // ----- conversation (kept for this tab only) -----
 let learning=loadLearning(localStorage);
 let turns=[];
 try{turns=loadTurns(sessionStorage);}catch{}
 const storeSession=()=>{try{return sessionStorage;}catch{return {getItem:()=>null,setItem(){},removeItem(){}};}};

 voice=createVoice({
  win:window,
  onMouth:m=>{try{frame?.contentWindow?.postMessage({type:"mentor:speech",...m},location.origin);}catch{}},
  onState:s=>{
   stopVoiceBtn.hidden=!s.speaking;
   micBtn.setAttribute("aria-pressed",String(s.listening));
   micBtn.classList.toggle("is-on",s.listening);
   micState.hidden=!s.listening;
   if(s.listening)micState.textContent="🎙 Το μικρόφωνο είναι ενεργό — μίλα τώρα.";
  }
 });

 function paintTurns(){
  logEl.replaceChildren(...turns.map(t=>{
   const row=el("div",{class:"emp-turn emp-"+t.role+(t.mode==="refusal"?" is-refusal":"")});
   row.append(el("span",{class:"emp-who",text:t.role==="user"?"Εσύ":"MENTOR"+(t.mode==="ai"?" · AI":"")}),el("p",{text:t.text}));
   if(t.role==="mentor"&&t.reason!=="exam"){
    const listen=el("button",{type:"button",class:"emp-link emp-listen","aria-label":"Άκουσε αυτή την απάντηση",text:"🔊 Άκουσε"});
    listen.addEventListener("click",()=>{const r=voice.speak(t.text);if(!r.ok)announce("Δεν βρέθηκε ελληνική φωνή σε αυτή τη συσκευή.");});
    row.append(listen);
   }
   for(const s of t.sources||[]){
    row.append(s.url?el("a",{class:"emp-link",href:s.url,target:"_blank",rel:"noopener noreferrer",text:"Πηγή: "+s.term}):el("span",{class:"emp-src",text:"Βιβλιοθήκη: "+s.term}));
   }
   if(t.role==="mentor"&&(t.sources||[]).length)row.append(el("small",{class:"emp-prov",text:"Εκπαιδευτικός ορισμός από γενική πηγή· χωρίς κλινική επιμέλεια. Δεν αποτελεί ιατρική οδηγία ή επίσημο πρωτόκολλο."}));
   return row;
  }));
  logEl.scrollTop=logEl.scrollHeight;
 }
 function pushTurn(turn){
  turns=appendTurn(storeSession(),turn);
  paintTurns();
  sendCue(cueForTurn(turn));
 }
 // Expression and gesture for the current activity. The avatar page listens for "mentor:presence" in its own document;
 // a cue sent before the 3D page is ready is replayed when it reports ready.
 let pendingCue=null;
 function sendCue(cue){
  if(!cue)return;
  pendingCue=cue;
  try{frame?.contentDocument?.dispatchEvent(new frame.contentWindow.CustomEvent("mentor:presence",{detail:{id:cue.id,gesture:cue.gesture,expression:"",posture:""}}));}catch{}
 }
 function showNav(route){
  navBox.replaceChildren();
  navBox.hidden=!route;
  if(!route)return;
  navBox.append(el("a",{class:"emp-navlink",href:new URL(route.href,SITE_ROOT).href,text:"Άνοιγμα: "+route.label+" →"}));
 }
 function sayMaybe(text){
  if(!learning.autoSpeak)return;
  const r=voice.speak(text);
  if(!r.ok)announce("Η φωνή δεν είναι διαθέσιμη σε αυτή τη συσκευή.");
 }
 function finish(turn){
  pushTurn(turn);
  if(turn.mode!=="refusal")sayMaybe(turn.text);
 }

 async function ask(selection){
  voice.stopSpeaking(); // barge-in
  const context=contextState();
  const typed=askInput.value;
  const {text}=composeQuestion({question:typed,selection,context});
  if(!text){pushTurn({role:"mentor",mode:"info",text:"Γράψε μια ερώτηση ή επίλεξε κείμενο στη σελίδα."});return;}
  pushTurn({role:"user",text:selection?"Εξήγησε: «"+selection+"»":typed.trim()});
  askInput.value="";
  showNav(null);
  if(context.exam){pushTurn({role:"mentor",mode:"refusal",reason:"exam",text:EXAM_REFUSAL});return;}
  const route=matchNavigation(typed);
  if(route&&!selection){showNav(route);pushTurn({role:"mentor",mode:"info",text:"Μπορώ να σε οδηγήσω στη σελίδα «"+route.label+"». Πάτησε τον σύνδεσμο για να ανοίξει."});return;}
  if(riskGuard(text).blocked){finish({role:"mentor",mode:"refusal",text:RISK_MESSAGE});return;}
  askSend.disabled=selBtn.disabled=true;
  try{
   const qa=await import("../core/quick-answer.mjs");
   const items=await qa.loadMentorTermLibrary();
   const local=qa.answerStudyQuestion(text,{items});
   if(local.type!=="unavailable"){
    finish({role:"mentor",mode:"local",text:local.text,sources:local.source?[{term:local.term||"Ορισμός",url:local.source}]:[]});
    return;
   }
   const passages=retrieve(text,items);
   const ai=await askAi({
    endpoint:MENTOR_AI.endpoint,timeoutMs:MENTOR_AI.timeoutMs,headers:mentorAiHeaders(),
    payload:buildPayload({question:text,passages,level:learning.level,history:historyForAi(turns.slice(0,-1))})
   });
   if(ai.ok){
    finish({role:"mentor",mode:"ai",text:ai.text,sources:passages.map(p=>({term:p.term,url:p.source}))});
   }else{
    const known=passages.length?" Σχετικοί όροι της βιβλιοθήκης: "+passages.map(p=>p.term).join(", ")+".":"";
    finish({role:"mentor",mode:"local",text:(ai.message||local.text)+(ai.reason==="disabled"?"":known),sources:passages.map(p=>({term:p.term,url:p.source}))});
   }
  }catch{pushTurn({role:"mentor",mode:"info",text:"Δεν μπόρεσα να φορτώσω τη βιβλιοθήκη όρων. Δοκίμασε ξανά."});}
  finally{askSend.disabled=selBtn.disabled=false;}
 }
 askBtn.addEventListener("click",()=>setAsk(!askOpen));
 askForm.addEventListener("submit",event=>{event.preventDefault();ask("");});
 askInput.addEventListener("input",()=>voice.stopSpeaking());
 // Keeps the learner's text selection alive when the button is pressed.
 selBtn.addEventListener("pointerdown",event=>event.preventDefault());
 selBtn.addEventListener("click",()=>{
  const picked=String(window.getSelection?.()?.toString()||"").trim();
  if(!picked){pushTurn({role:"mentor",mode:"info",text:"Επίλεξε πρώτα κείμενο στη σελίδα και μετά πάτησε το κουμπί."});return;}
  ask(picked);
 });
 micBtn.addEventListener("click",async()=>{
  const st=voice.state();
  if(!st.stt){pushTurn({role:"mentor",mode:"info",text:"Η αναγνώριση ελληνικής ομιλίας δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης. Γράψε την ερώτησή σου."});return;}
  sendCue(CUES.listen);
  const r=await voice.listen();
  if(r.ok){askInput.value=r.text;askInput.focus({preventScroll:true});announce("Αναγνωρίστηκε: "+r.text+". Πάτησε Ρώτα.");}
  else if(r.reason&&!["cancelled","empty","aborted","no-speech"].includes(r.reason))
   pushTurn({role:"mentor",mode:"info",text:"Το μικρόφωνο δεν λειτούργησε ("+r.reason+"). Γράψε την ερώτησή σου."});
 });
 stopVoiceBtn.addEventListener("click",()=>voice.stopSpeaking());
 clearBtn.addEventListener("click",()=>{turns=clearTurns(storeSession());paintTurns();showNav(null);announce("Η συνομιλία διαγράφηκε");});
 levelSel.value=learning.level;autoSpeakBox.checked=learning.autoSpeak;focusBox.checked=learning.minimizeOnExam;
 const saveSettings=()=>{learning=saveLearning(localStorage,{level:levelSel.value,autoSpeak:autoSpeakBox.checked,minimizeOnExam:focusBox.checked});};
 levelSel.addEventListener("change",saveSettings);autoSpeakBox.addEventListener("change",()=>{saveSettings();if(!learning.autoSpeak)voice.stopSpeaking();});focusBox.addEventListener("change",saveSettings);
 paintTurns();
 // Focus mode: only when the learner asked for it, quietly step aside on exam pages.
 if(learning.minimizeOnExam&&examMode(location.pathname,null)&&prefs.visibility==="shown")prefs=normalizePrefs({...prefs,visibility:"minimized"});
 ctxToggle.addEventListener("click",()=>{
  contextOn=!contextOn;
  try{localStorage.setItem(CONTEXT_KEY,JSON.stringify({enabled:contextOn}));}catch{}
  refreshContext();
  announce(contextOn?"Το πλαίσιο σελίδας ενεργοποιήθηκε":"Το πλαίσιο σελίδας απενεργοποιήθηκε");
 });
 window.addEventListener("mentor:context",event=>{announced=sanitizeAnnouncement(event.detail);refreshContext();});
 refreshContext();

 // ---------- drag ----------
 function floatingStart(){
  if(prefs.mode==="floating")return;
  // Dragging a pinned or docked MENTOR releases it at its current place.
  const box=currentBox();
  const lay=layout();
  prefs=normalizePrefs({...prefs,mode:"floating",[lay]:{...prefs[lay],x:box.x,y:box.y,w:box.w,h:box.h}});
 }

 grip.addEventListener("pointerdown",event=>{
  if(event.button!==0||prefs.mode==="docked")return;
  const box=currentBox();
  dragging={id:event.pointerId,sx:event.clientX,sy:event.clientY,ox:box.x,oy:box.y,moved:false,pinnedStart:prefs.mode==="pinned"};
  grip.setPointerCapture(event.pointerId);
 });
 grip.addEventListener("pointermove",event=>{
  if(!dragging||event.pointerId!==dragging.id)return;
  const dx=event.clientX-dragging.sx,dy=event.clientY-dragging.sy;
  if(!dragging.moved){
   if(Math.hypot(dx,dy)<DRAG_THRESHOLD)return;
   dragging.moved=true;
   if(dragging.pinnedStart)floatingStart();
   root.dataset.dragging="true";
  }
  const lay=layout(),vp=viewport(),size=sizeNow(lay,vp);
  const pos=clampPosition({x:dragging.ox+dx,y:dragging.oy+dy},size,vp,safe());
  root.style.transform="translate("+pos.x+"px,"+pos.y+"px)";
  dragging.pos=pos;
 });
 function endDrag(event){
  if(!dragging||event.pointerId!==dragging.id)return;
  const d=dragging;dragging=null;
  delete root.dataset.dragging;
  if(!d.moved||!d.pos)return;
  const lay=layout(),vp=viewport(),size=sizeNow(lay,vp);
  const final=prefs.snap?snapToEdges(d.pos,size,vp,safe()):d.pos;
  prefs=normalizePrefs({...prefs,corner:nearestCorner(final,size,vp),[lay]:{...prefs[lay],x:final.x,y:final.y}});
  save();render();
 }
 grip.addEventListener("pointerup",endDrag);
 grip.addEventListener("pointercancel",endDrag);

 grip.addEventListener("keydown",event=>{
  const step=event.shiftKey?40:10;
  const move={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
  if(!move||prefs.mode==="docked")return;
  event.preventDefault();
  floatingStart();
  const lay=layout(),vp=viewport(),box=currentBox();
  const size=sizeNow(lay,vp);
  const pos=clampPosition({x:box.x+move[0],y:box.y+move[1]},size,vp,safe());
  prefs=normalizePrefs({...prefs,corner:nearestCorner(pos,size,vp),[lay]:{...prefs[lay],x:pos.x,y:pos.y}});
  save();render();
 });

 // ---------- resize ----------
 let sizing=null;
 resize.addEventListener("pointerdown",event=>{
  if(event.button!==0)return;
  const box=currentBox();
  sizing={id:event.pointerId,sx:event.clientX,sy:event.clientY,w:box.w,h:box.h};
  resize.setPointerCapture(event.pointerId);
  root.dataset.dragging="true";
 });
 resize.addEventListener("pointermove",event=>{
  if(!sizing||event.pointerId!==sizing.id)return;
  const lay=layout(),vp=viewport();
  const size=clampSize({w:sizing.w+event.clientX-sizing.sx,h:sizing.h+event.clientY-sizing.sy},vp,lay);
  sizing.next=size;
  root.style.width=size.w+"px";root.style.height=size.h+"px";
 });
 function endResize(event){
  if(!sizing||event.pointerId!==sizing.id)return;
  const s=sizing;sizing=null;
  delete root.dataset.dragging;
  if(!s.next)return;
  const lay=layout(),box=currentBox();
  prefs=normalizePrefs({...prefs,[lay]:{...prefs[lay],x:prefs.mode==="floating"?box.x:prefs[lay].x,y:prefs.mode==="floating"?box.y:prefs[lay].y,w:s.next.w,h:s.next.h}});
  save();render();
 }
 resize.addEventListener("pointerup",endResize);
 resize.addEventListener("pointercancel",endResize);
 resize.addEventListener("keydown",event=>{
  const delta={ArrowRight:[16,0],ArrowLeft:[-16,0],ArrowDown:[0,24],ArrowUp:[0,-24],"+":[16,24],"=":[16,24],"-":[-16,-24]}[event.key];
  if(!delta)return;
  event.preventDefault();
  const lay=layout(),box=currentBox();
  const size=clampSize({w:box.w+delta[0],h:box.h+delta[1]},viewport(),lay);
  prefs=normalizePrefs({...prefs,[lay]:{...prefs[lay],x:box.x,y:box.y,w:size.w,h:size.h}});
  save();render();
 });

 // ---------- global ----------
 window.addEventListener("resize",()=>{if(!dragging&&!sizing)render();});
 window.addEventListener("orientationchange",()=>setTimeout(render,200));
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&menuOpen){closeMenu();menuBtn.focus();return;}
  if(event.key==="Escape"&&prefs.visibility==="shown"&&root.contains(document.activeElement)){api.minimize();return;}
  if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==="m"){event.preventDefault();api.toggle();}
 });
 window.addEventListener("storage",event=>{
  if(event.key!==STORAGE_KEY)return;
  prefs=parsePrefs(event.newValue);
  render();
 });
 window.addEventListener("pagehide",unmountFrame);
 window.addEventListener("pageshow",event=>{if(event.persisted)render();});
 reduced?.addEventListener?.("change",render);

 document.body.append(probe,live,root,launcher);
 window.__ekabMentorPresence=api;
 window.EkabMentorPresence=api;
 render();
}

if(document.body)boot();
else document.addEventListener("DOMContentLoaded",boot,{once:true});
