/* ΕΚΑΒ Σπουδή — source-attributed Greek medical reference images.
   Loads only audited source selections. Does NOT mark these as independently medically certified.
   The 247-chapter review registry is saek-image-audit-2026.json.
*/
(function(){
'use strict';
const licenseLinks={
 'CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/',
 'Public domain':'https://creativecommons.org/publicdomain/mark/1.0/'
};
function el(tag,cls,txt){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!=null)node.textContent=txt;
 return node;
}
function sourceUrl(asset){
 return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(asset.filename);
}
function zoom(items,initial){
 let index=initial,scale=1,startX=null,startY=null;
 const dialog=el('dialog','saek-source-dialog saek-gallery-dialog');
 const bar=el('div','saek-source-dialog-bar');
 const count=el('span','saek-gallery-count');
 const close=el('button','saek-source-close','Κλείσιμο ✕');
 const frame=el('div','saek-source-zoom-frame saek-gallery-frame');
 const img=el('img','saek-source-full saek-gallery-image');
 const controls=el('div','saek-gallery-controls');
 const prev=el('button','saek-source-action','← Προηγούμενη');
 const next=el('button','saek-source-action','Επόμενη →');
 const magnify=el('button','saek-source-action','Μεγέθυνση +');
 const reset=el('button','saek-source-action','Προσαρμογή');
 function show(n){
  index=(n+items.length)%items.length;scale=1;
  img.src=items[index].url;img.alt=items[index].alt;
  img.style.transform='scale(1)';
  count.textContent=(index+1)+' / '+items.length;
  prev.disabled=next.disabled=items.length<2;
 }
 function change(n){if(items.length>1)show(index+n);}
 function setScale(n){scale=Math.max(1,Math.min(4,n));img.style.transform='scale('+scale+')';magnify.textContent=scale>1?'Μεγέθυνση +':'Μεγέθυνση +';}
 close.type=prev.type=next.type=magnify.type=reset.type='button';
 close.addEventListener('click',()=>dialog.close());
 prev.addEventListener('click',()=>change(-1));
 next.addEventListener('click',()=>change(1));
 magnify.addEventListener('click',()=>setScale(scale===4?1:scale+1));
 reset.addEventListener('click',()=>setScale(1));
 img.addEventListener('click',()=>setScale(scale===1?2:1));
 frame.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
 frame.addEventListener('touchend',e=>{if(startX===null||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;startX=startY=null;if(scale===1&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)change(dx<0?1:-1);},{passive:true});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();change(-1);}if(e.key==='ArrowRight'){e.preventDefault();change(1);}if(e.key==='Escape')dialog.close();});
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 bar.append(count,close);frame.append(img);controls.append(prev,magnify,reset,next);dialog.append(bar,frame,controls);
 document.body.append(dialog);show(index);
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
function render(asset,lessonId,items,position){
 const fig=el('figure','saek-source-figure');
 const label=el('h4','saek-source-title',asset.title);
 const image=el('img','saek-source-image');
 image.src=sourceUrl(asset);image.alt=asset.title+'. '+asset.caption;
 image.loading='lazy';image.decoding='async';
 image.referrerPolicy='no-referrer';
 const figureActions=el('div','saek-source-actions');
 const bigger=el('button','saek-source-action','Μεγέθυνση εικόνας');
 bigger.type='button';bigger.addEventListener('click',()=>zoom(items,position));
 image.addEventListener('click',()=>zoom(items,position));
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
 const src=el('a','','Wikimedia Commons');
 src.href=asset.page;src.target='_blank';src.rel='noopener noreferrer';
 const space=document.createTextNode(' · Άδεια: ');
 const lic=el('a','',asset.license);
 lic.href=licenseLinks[asset.license]||asset.page;
 lic.target='_blank';lic.rel='noopener noreferrer';
 attribution.append(src,space,lic);
 const problem=el('p','saek-source-fallback','Η εικόνα δεν φορτώθηκε. Δείτε την αρχική σελίδα της πηγής.');
 problem.hidden=true;
 image.addEventListener('error',()=>{image.hidden=true;bigger.hidden=true;problem.hidden=false;});
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
  if(!course)return;
  for(const chapter of course.chapters){
   if(!chapter.images||!chapter.images.length)continue;
   const id=chapter.anchor.replace('#','');
   const details=document.getElementById(id);
   if(!details||details.querySelector('.saek-source-section'))continue;
   const body=details.querySelector('.reader-main')||details.querySelector('.body');
   if(!body)continue;
   const wrap=el('details','saek-source-section');
   const summary=el('summary','saek-source-summary','Εικόνες ανατομίας από τεκμηριωμένες πηγές ('+chapter.images.length+')');
   wrap.append(summary);
   const note=el('p','saek-source-note','Οι εικόνες είναι ανατομικές αναφορές με καταγεγραμμένη πηγή και άδεια. Εκκρεμεί ανεξάρτητος επιστημονικός έλεγχος της τελικής επιλογής· δεν υποκαθιστούν τις τρέχουσες κλινικές οδηγίες.');
   wrap.append(note);
   const assets=chapter.images.map(key=>registry.assets[key]).filter(Boolean);
   const gallery=assets.map(asset=>({url:sourceUrl(asset),alt:asset.title+'. '+asset.caption}));
   assets.forEach((asset,i)=>wrap.append(render(asset,id.replace('lesson-',''),gallery,i)));
   const paragraph=body.querySelector('p.reader-paragraph');
   if(paragraph)paragraph.insertAdjacentElement('afterend',wrap);
   else body.insertBefore(wrap,body.firstChild);
   const layout=el('div','saek-study-split'),reading=el('div','saek-study-text'),visuals=el('aside','saek-study-images');
   visuals.setAttribute('aria-label','Εικόνες αναφοράς κεφαλαίου');
   const toggle=el('button','saek-study-toggle','Ελαχιστοποίηση εικόνων −');
   toggle.type='button';toggle.setAttribute('aria-expanded','true');
   toggle.addEventListener('click',()=>{
    const collapsed=layout.classList.toggle('saek-images-collapsed');
    toggle.textContent=collapsed?'Εμφάνιση εικόνων +':'Ελαχιστοποίηση εικόνων −';
    toggle.setAttribute('aria-expanded',String(!collapsed));
   });
   while(body.firstChild){const node=body.firstChild;if(node===wrap)visuals.append(node);else reading.append(node);}
   visuals.prepend(toggle);layout.append(reading,visuals);body.append(layout);wrap.open=true;
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
 }catch(err){console.warn('Εικόνες εκπαιδευτικών πηγών: δεν ήταν διαθέσιμο το μητρώο.',err);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
