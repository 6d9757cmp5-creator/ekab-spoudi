/* ATLA: own in-page BodyParts3D presenter over licensed, local packed assets.
 * Uses vendored MIT Open Anatomy Atlas WebGL2 primitives, never its separate HTML viewer.
 * Files are fetched only on an explicit button press. No pupil state or external service.
 */
/* global AtlasRenderer, Atlas */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const siteRoot=new URL('../../',document.currentScript.src);
 const sourceRoot='tools/anatomy-3d/resources/';
 const dataPath={
  bp3d40:sourceRoot+'bp3d40/atlases/bp3d40/build/',
  bp3d43:sourceRoot+'bp3d43/compiled-shards/'
 };
 let renderer=null,atlas=null,loadedIndex=null,names=[],translation=null,drag=null,loading=false;
 const canvas=$('atlas-canvas'),state=$('atlas-status'),search=$('atlas-search'),results=$('atlas-results');
 const status=(message,bad=false)=>{state.textContent=message;state.dataset.error=String(bad)};
 const normalize=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/ς/g,'σ');
 const labelOf=ci=>{
  const english=atlas.displayName(ci);
  const greek=translation?.anatomyName?.(english)?.label;
  return greek&&normalize(greek)!==normalize(english)?greek+' · '+english:english;
 };
 function showSelection(ci,focus=true){
  if(!atlas||!renderer||!Number.isInteger(ci)||ci<0||ci>=atlas.concepts.length)return;
  const elements=atlas.concepts[ci].el;
  renderer.selected.fill(0);
  for(const el of elements){if(el>=0&&el<renderer.n){renderer.selected[el]=1;renderer.visible[el]=1}}
  if(focus)renderer.frame(atlas.bbox(elements));
  renderer.requestRender();
  $('atlas-selected').textContent='Επιλογή: '+labelOf(ci)+' · '+elements.length+' πλέγματα';
 }
 function layers(mode){
  if(!renderer||!atlas)return;
  const skeleton=new Set(['bone','cartilage','ligament']);
  const organs=new Set(['organ','artery','vein','nervous','lymph']);
  const visible=mode==='skeleton'?skeleton:mode==='organs'?organs:null;
  atlas.elements.forEach((e,i)=>{
   renderer.visible[i]=visible?Number(visible.has(e.t)):Number(e.t!=='skin'&&e.t!=='fascia'&&e.t!=='muscle');
  });
  renderer.selected.fill(0);
  $('atlas-selected').textContent='Πάτησε μία δομή για πληροφορίες.';
  renderer.requestRender();
 }
 function searchOptions(){
  results.replaceChildren();
  if(!atlas)return;
  const q=normalize(search.value).trim();
  if(q.length<2){results.textContent='Πληκτρολόγησε τουλάχιστον δύο γράμματα.';return}
  const matches=names.filter(e=>e.normal.includes(q)).slice(0,45);
  for(const e of matches){
   const b=document.createElement('button');
   b.type='button';b.textContent=e.label;b.className='atlas-result';
   b.addEventListener('click',()=>{showSelection(e.ci);results.replaceChildren()});
   results.append(b);
  }
  if(!matches.length)results.textContent='Δεν βρέθηκε αντιστοίχιση με αυτή την ονομασία.';
 }
 async function sha256(array){
  const digest=await crypto.subtle.digest('SHA-256',array);
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
 }
 async function fetchJson(url){
  const r=await fetch(new URL(url,siteRoot),{cache:'no-cache'});
  if(!r.ok)throw Error('Αποτυχία ανάκτησης αρχείου ('+r.status+')');
  return r.json();
 }
 async function fetchPacked(version){
  const base=dataPath[version];
  if(!base)throw Error('Άγνωστη έκδοση άτλαντα');
  status('Ανάγνωση τοπικού καταλόγου '+version+'…');
  const index=await fetchJson(base+'index.json');
  if(index?.format!=='open-anatomy-atlas/1'||!Array.isArray(index.elements)||!Array.isArray(index.concepts)||
   !Array.isArray(index.buffers?.indices))throw Error('Μη έγκυρος δείκτης άτλαντα');
  const expected=index.buffers.indices[0]+index.buffers.indices[1];
  if(!Number.isSafeInteger(expected)||expected<=0||expected>250*1048576)throw Error('Μη έγκυρο μέγεθος γεωμετρίας');
  let chunks=[{file:'meshes.bin',bytes:expected}];
  if(version==='bp3d43'){
   const manifest=await fetchJson(base+'manifest.json');
   if(manifest.partCount!==4||manifest.anatomyElements!==3210||!Array.isArray(manifest.parts)||
    manifest.parts.length!==4||manifest.parts.some(p=>!/^mesh-part-\d{2}\.bin$/.test(p.file)||
     !Number.isSafeInteger(p.bytes)||p.bytes<=0||!/^[a-f0-9]{64}$/i.test(p.sha256||'')))throw Error('Ακατάλληλο μητρώο τμημάτων 4.3');
   chunks=manifest.parts;
  }
  if(chunks.reduce((sum,p)=>sum+p.bytes,0)!==expected)throw Error('Τα μεγέθη των τμημάτων διαφέρουν από τον άτλαντα');
  const packed=new Uint8Array(expected);let offset=0;
  for(let i=0;i<chunks.length;i++){
   const part=chunks[i];
   status('Φόρτωση άτλαντα '+version+' · τμήμα '+(i+1)+'/'+chunks.length+'…');
   const response=await fetch(new URL(base+part.file,siteRoot));
   if(!response.ok)throw Error('Λείπει αρχείο '+part.file+' ('+response.status+')');
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength!==part.bytes)throw Error('Ασυμφωνία μεγέθους '+part.file);
   if(part.sha256&&await sha256(buffer)!==part.sha256.toLowerCase())throw Error('Ασυμφωνία SHA-256 '+part.file);
   packed.set(new Uint8Array(buffer),offset);offset+=buffer.byteLength;
  }
  return {index,packed:packed.buffer};
 }
 function dispose(){
  if(!renderer)return;
  const gl=renderer.gl;
  if(renderer.vao)gl.deleteVertexArray(renderer.vao);
  for(const b of renderer.buffers||[])gl.deleteBuffer(b);
  renderer.vao=null;renderer.buffers=[];renderer.elements=[];renderer.n=0;
  renderer.requestRender();
  atlas=null;loadedIndex=null;names=[];
  results.replaceChildren();
  $('atlas-selected').textContent='';
  $('atlas-stage').hidden=true;
  $('source-stage').hidden=false;
  $('atlas-unload').disabled=true;
 }
 async function load(version){
  if(loading)return;
  if(version==='bp3d43'&&!confirm('Η πλήρης έκδοση BodyParts3D 4.3 απαιτεί λήψη περίπου 193 MiB και σημαντική μνήμη (WebGL2). Να συνεχίσουμε;'))return;
  loading=true;$('atlas-load').disabled=true;
  try{
   const {index,packed}=await fetchPacked(version);
   $('source-stage').hidden=true;
   $('atlas-stage').hidden=false;
   if(!renderer)renderer=new AtlasRenderer(canvas);
   renderer.setAtlas(index,packed);
   atlas=new Atlas(index);loadedIndex=index;
   atlas.elements.forEach((e,i)=>{renderer.setColor(i,(atlas.categories[e.t]||atlas.categories.organ).color)});
   layers($('atlas-layer').value);
   translation=await import('./greek-names.js').catch(()=>null);
   names=atlas.concepts.map((c,ci)=>({ci,label:labelOf(ci)}))
    .filter(x=>!atlas.concepts[x.ci].synthetic)
    .map(x=>({...x,normal:normalize(x.label)}));
   status('Έτοιμος ο άτλας BodyParts3D '+index.version+' · '+atlas.elements.length.toLocaleString('el')+' ανατομικά πλέγματα. Πάτησε ή αναζήτησε μια δομή.');
   $('atlas-unload').disabled=false;
   if(search.value)searchOptions();
  }catch(error){
   dispose();
   status('Αποτυχία προβολής άτλαντα: '+String(error.message||error).slice(0,180),true);
  }finally{loading=false;$('atlas-load').disabled=false}
 }
 $('atlas-load').addEventListener('click',()=>load($('atlas-version').value));
 $('atlas-unload').addEventListener('click',()=>{dispose();status('Ο άτλας αποφορτώθηκε από τη μνήμη γραφικών.')});
 $('atlas-layer').addEventListener('change',e=>layers(e.target.value));
 $('atlas-front').addEventListener('click',()=>renderer?.view('front'));
 $('atlas-side').addEventListener('click',()=>renderer?.view('left'));
 $('atlas-center').addEventListener('click',()=>renderer?.frame(loadedIndex?.bbox));
 search.addEventListener('input',searchOptions);
 $('source-load').addEventListener('click',()=>{$('atlas-stage').hidden=true;$('source-stage').hidden=false});
 canvas.addEventListener('pointerdown',event=>{
  if(!renderer)return;
  drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,button:event.button};
  canvas.setPointerCapture?.(event.pointerId);
 });
 canvas.addEventListener('pointermove',event=>{
  if(!renderer||!drag)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(drag.button===2)renderer.pan(dx,dy);else renderer.orbit(dx,dy);
  drag.x=event.clientX;drag.y=event.clientY;
 });
 canvas.addEventListener('pointerup',event=>{
  if(!renderer||!atlas||!drag)return;
  const move=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY);
  if(move<5){
   const el=renderer.pick(event.clientX,event.clientY);
   if(el>=0&&atlas.elements[el])showSelection(atlas.conceptOf(el),false);
  }
  drag=null;
 });
 canvas.addEventListener('pointercancel',()=>{drag=null});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{if(renderer){e.preventDefault();renderer.zoom(e.deltaY>0?1.15:.87)}},{passive:false});
 window.ATLAInlineAtlas={load,dispose};
})();
