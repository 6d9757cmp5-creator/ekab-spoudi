/* ΕΚΑΒ Σπουδή — source-attributed Greek medical reference images.
   Loads only audited source selections. Does NOT mark these as independently medically certified.
   The 247-chapter review registry is saek-image-audit-2026.json.
*/
(function(){
'use strict';
const licenseLinks={
 'CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/',
 'CC0 1.0':'https://creativecommons.org/publicdomain/zero/1.0/',
 'CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/',
 'Public domain':'https://creativecommons.org/publicdomain/mark/1.0/'
};
function el(tag,cls,txt){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!=null)node.textContent=txt;
 return node;
}
function sourceUrl(asset){
 if(asset.localPath)return asset.localPath;
 return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(asset.filename);
}
function zoom(items,initial){
 let index=initial,scale=1,pinch=0,pinchBase=1,x=null,y=null;
 const dialog=el('dialog','saek-clean-lightbox');
 const close=el('button','saek-clean-close','✕');
 const prev=el('button','saek-clean-prev','‹');
 const next=el('button','saek-clean-next','›');
 const image=el('img','saek-clean-image');
 const stage=el('div','saek-clean-stage');
 close.type=prev.type=next.type='button';
 close.setAttribute('aria-label','Κλείσιμο εικόνας');
 prev.setAttribute('aria-label','Προηγούμενη εικόνα');
 next.setAttribute('aria-label','Επόμενη εικόνα');
 function show(n){index=(n+items.length)%items.length;scale=1;image.style.transform='scale(1)';image.src=items[index].url;image.alt=items[index].alt;prev.hidden=next.hidden=items.length<2;}
 function resize(n){scale=Math.max(1,Math.min(5,n));image.style.transform='scale('+scale+')';}
 close.onclick=()=>dialog.close();
 prev.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
 image.addEventListener('dblclick',()=>resize(scale>1?1:2));
 stage.addEventListener('touchstart',e=>{
  if(e.touches.length===2){pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pinchBase=scale;x=null;}
  else if(e.touches.length===1){x=e.touches[0].clientX;y=e.touches[0].clientY;}
 },{passive:true});
 stage.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){e.preventDefault();resize(pinchBase*Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)/pinch);}},{passive:false});
 stage.addEventListener('touchend',e=>{
  if(pinch){if(e.touches.length<2)pinch=0;x=null;return;}
  if(x===null||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;x=null;
  if(scale===1&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4&&items.length>1)show(index+(dx<0?1:-1));
 },{passive:true});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(index-1);if(e.key==='ArrowRight')show(index+1);});
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 stage.append(image);dialog.append(stage,close,prev,next);
 document.body.append(dialog);show(index);dialog.showModal();
}
// A registry fetch failure must not silently remove every lesson image.
// Offer a local retry without reloading the page or resetting study progress.
function showRegistryFailure(error){
 let notice=document.getElementById('saek-image-registry-error');
 if(!notice){
  notice=el('div','saek-source-fallback');
  notice.id='saek-image-registry-error';
  notice.setAttribute('role','alert');
  const message=el('p','','Οι εκπαιδευτικές εικόνες δεν φορτώθηκαν. Τα μαθήματα και η πρόοδός σας παραμένουν διαθέσιμα.');
  const retry=el('button','saek-source-action','Επανάληψη φόρτωσης εικόνων');
  retry.type='button';
  retry.addEventListener('click',async()=>{
   retry.disabled=true;
   try{await start();}finally{retry.disabled=false;}
  });
  notice.append(message,retry);
  const target=document.querySelector('.saek-lesson-heading')||document.querySelector('.reader-title');
  if(target)target.insertAdjacentElement('afterend',notice);
  else document.body.prepend(notice);
 }
 console.warn('Εικόνες εκπαιδευτικών πηγών: δεν ήταν διαθέσιμο το μητρώο.',error);
}
function render(asset,lessonId,items,position){
 const fig=el('figure','saek-source-figure');
 const label=el('h4','saek-source-title',asset.title);
 const image=el('img','saek-source-image');
 image.alt=asset.title+'. '+asset.caption;
 image.loading='lazy';image.decoding='async';
 image.referrerPolicy='no-referrer';
 const figureActions=el('div','saek-source-actions');
 const bigger=el('button','saek-source-action','Μεγέθυνση εικόνας');
 bigger.type='button';bigger.addEventListener('click',e=>{e.stopPropagation();zoom(items,position);});
 image.addEventListener('click',e=>{e.stopPropagation();zoom(items,position);});
 image.style.cursor='zoom-in';
 const chapter=el('a','saek-source-action','Άνοιγμα κεφαλαίου');
 chapter.href='#lesson-'+lessonId;
 chapter.addEventListener('click',()=>{
  const parent=document.getElementById('lesson-'+lessonId);
  if(parent)parent.open=true;
 });
 figureActions.append(bigger,chapter);
 const caption=el('figcaption','saek-source-caption',asset.caption);
 const attribution=el('p','saek-source-credit');
 attribution.append(document.createTextNode('Πηγή: '+asset.author+' · '));
 // A source link is not independent medical validation of an original diagram.
 const genericEms=/^https:\/\/www\.ems\.gov\/what-is-ems\.html(?:[?#].*)?$/i.test(asset.page||'');
 const sourceLabel=asset.originalArtwork
  ?(genericEms?'Γενική πηγή πλαισίου — όχι τεκμηρίωση σχήματος':'Πηγή θεματικής αναφοράς')
  :'Wikimedia Commons';
 const src=el('a','',sourceLabel);
 src.href=asset.page;src.target='_blank';src.rel='noopener noreferrer';
 const space=document.createTextNode(' · Άδεια: ');
 const lic=el('a','',asset.license);
 lic.href=asset.licenseUrl||licenseLinks[asset.license]||asset.page;
 lic.target='_blank';lic.rel='noopener noreferrer';
 attribution.append(src,space,lic);
 // A failed lazy/offline image must be recoverable without losing lesson state.
 const problem=el('div','saek-source-fallback');
 problem.hidden=true;
 const explanation=el('p','','Η εικόνα δεν φορτώθηκε. Δοκιμάστε ξανά ή ανοίξτε την παραπομπή της πηγής.');
 const retry=el('button','saek-source-action','Επανάληψη φόρτωσης εικόνας');
 retry.type='button';
 retry.addEventListener('click',()=>{
  retry.disabled=true;
  image.removeAttribute('src');
  image.src=sourceUrl(asset);
 });
 problem.append(explanation,retry);
 image.addEventListener('load',()=>{
  image.hidden=false;bigger.hidden=false;problem.hidden=true;retry.disabled=false;
 });
 image.addEventListener('error',()=>{
  image.hidden=true;bigger.hidden=true;problem.hidden=false;retry.disabled=false;
 });
 // Attach handlers before setting src, including for locally cached images.
 image.src=sourceUrl(asset);
 fig.append(label,image,figureActions,caption,attribution,problem);
 return fig;
}
async function start(){
 const match=location.pathname.match(/saek-course-(\d{2})\.html$/);
 if(!match)return;
 try{
  const response=await fetch('saek-image-audit-2026.json');
  if(!response.ok)throw new Error('image audit unavailable');
  const registry=await response.json();
  const course=registry.courses.find(c=>String(c.course).padStart(2,'0')===match[1]);
  if(!course)throw new Error('image audit course not found');
  for(const chapter of course.chapters){
   if(!chapter.images||!chapter.images.length)continue;
   const id=chapter.anchor.replace('#','');
   const details=document.getElementById(id);
   if(!details||details.querySelector('.saek-source-section'))continue;
   const body=details.querySelector('.reader-main')||details.querySelector('.body');
   if(!body)continue;
   const wrap=el('details','saek-source-section');
   const summary=el('summary','saek-source-summary','Εικόνες κεφαλαίου ('+chapter.images.length+')');
   wrap.append(summary);
   const note=el('p','saek-source-note','Η επιλογή εικόνας δεν σημαίνει πλήρη κάλυψη του κεφαλαίου ή ανεξάρτητη επιστημονική έγκριση. Οι εικόνες δεν υποκαθιστούν επίσημες οδηγίες.');
   wrap.append(note);
   const assets=chapter.images.map(key=>registry.assets[key]).filter(Boolean);
   const gallery=assets.map(asset=>({url:sourceUrl(asset),alt:asset.title+'. '+asset.caption}));
   assets.forEach((asset,i)=>wrap.append(render(asset,id.replace('lesson-',''),gallery,i)));
   const paragraph=body.querySelector('p.reader-paragraph');
   if(paragraph)paragraph.insertAdjacentElement('afterend',wrap);
   else body.insertBefore(wrap,body.firstChild);
   const layout=el('div','saek-study-split'),reading=el('div','saek-study-text'),visuals=el('aside','saek-study-images');
   visuals.setAttribute('aria-label','Εικόνες αναφοράς κεφαλαίου');
   while(body.firstChild){const node=body.firstChild;if(node===wrap)visuals.append(node);else reading.append(node);}
   layout.append(reading,visuals);body.append(layout);wrap.open=true;
   // On phones, place the collapsible illustration immediately after the opening text.
   // On wider screens, restore the sticky right-hand reference panel.
   const mobile=window.matchMedia('(max-width:760px)');
   const mobileAnchor=reading.querySelector('p.reader-paragraph');
   function positionVisuals(){
    if(mobile.matches&&mobileAnchor){mobileAnchor.insertAdjacentElement('afterend',visuals);}
    else if(visuals.parentElement!==layout){layout.append(visuals);}
   }
   positionVisuals();
   if(mobile.addEventListener)mobile.addEventListener('change',positionVisuals);
   else if(mobile.addListener)mobile.addListener(positionVisuals);
  }
  document.getElementById('saek-image-registry-error')?.remove();
 }catch(err){showRegistryFailure(err);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
