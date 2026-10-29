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

const FRAME_SRC="mentor-presence.html";
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
 let frame=null,dragging=null,menuOpen=false;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");

 if(!document.querySelector('link[data-ekab-mentor-presence]')){
  document.head.append(el("link",{rel:"stylesheet",href:STYLE_HREF,"data-ekab-mentor-presence":true}));
 }

 const probe=el("div",{"aria-hidden":"true",style:"position:fixed;visibility:hidden;pointer-events:none;inset:0;"+
  "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"});
 const live=el("div",{class:"emp-live",role:"status","aria-live":"polite"});

 const grip=el("button",{type:"button",class:"emp-grip",
  "aria-label":"MENTOR. Μετακίνηση: σύρε ή χρησιμοποίησε τα βέλη"},[el("span",{text:"MENTOR"})]);
 const menuBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Επιλογές θέσης MENTOR","aria-haspopup":"true","aria-expanded":"false",text:"⋯"});
 const minBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Ελαχιστοποίηση MENTOR",text:"–"});
 const hideBtn=el("button",{type:"button",class:"emp-btn","aria-label":"Απόκρυψη MENTOR",text:"✕"});
 const bar=el("div",{class:"emp-bar"},[grip,menuBtn,minBtn,hideBtn]);
 const status=el("p",{class:"emp-status",role:"status",text:"Φόρτωση 3D εκπαιδευτή…"});
 const stage=el("div",{class:"emp-stage"},[status]);
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

 function currentBox(){
  const vp=viewport(),lay=layout(),sf=safe();
  if(prefs.mode==="docked"){
   const d=dockedBox(vp,lay);
   return {x:d.x,y:d.y,w:d.w,h:d.h,edge:d.edge};
  }
  const stored=prefs[lay];
  const size=clampSize(stored,vp,lay);
  const pos=prefs.mode==="pinned"
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
   if(event.data.state==="ready"){status.hidden=true;}
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
  minimize(){set({visibility:"minimized"},"Ο MENTOR ελαχιστοποιήθηκε");launcher.focus({preventScroll:true});},
  hide(){set({visibility:"hidden"},"Ο MENTOR κρύφτηκε. Alt+Shift+M για επαναφορά");},
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
  const lay=layout(),vp=viewport(),size=clampSize(prefs[lay],vp,lay);
  const pos=clampPosition({x:dragging.ox+dx,y:dragging.oy+dy},size,vp,safe());
  root.style.transform="translate("+pos.x+"px,"+pos.y+"px)";
  dragging.pos=pos;
 });
 function endDrag(event){
  if(!dragging||event.pointerId!==dragging.id)return;
  const d=dragging;dragging=null;
  delete root.dataset.dragging;
  if(!d.moved||!d.pos)return;
  const lay=layout(),vp=viewport(),size=clampSize(prefs[lay],vp,lay);
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
  const size=clampSize(prefs[lay],vp,lay);
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
