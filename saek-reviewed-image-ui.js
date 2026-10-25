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
function zoom(imgUrl,alt){
 const dialog=el('dialog','saek-source-dialog');
 const top=el('div','saek-source-dialog-bar');
 const close=el('button','saek-source-close','Κλείσιμο εικόνας ✕');
 close.type='button';close.addEventListener('click',()=>dialog.close());
 top.append(close);
 const frame=el('div','saek-source-zoom-frame');
 const img=el('img','saek-source-full');
 img.src=imgUrl;img.alt=alt;frame.append(img);dialog.append(top,frame);
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 document.body.append(dialog);
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
function render(asset,lessonId){
 const fig=el('figure','saek-source-figure');
 const label=el('h4','saek-source-title',asset.title);
 const image=el('img','saek-source-image');
 image.src=sourceUrl(asset);image.alt=asset.title+'. '+asset.caption;
 image.loading='lazy';image.decoding='async';
 image.referrerPolicy='no-referrer';
 const figureActions=el('div','saek-source-actions');
 const bigger=el('button','saek-source-action','Μεγέθυνση εικόνας');
 bigger.type='button';bigger.addEventListener('click',()=>zoom(image.src,image.alt));
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
   for(const key of chapter.images){
    const asset=registry.assets[key];
    if(asset)wrap.append(render(asset,id.replace('lesson-','')));
   }
   const paragraph=body.querySelector('p.reader-paragraph');
   if(paragraph)paragraph.insertAdjacentElement('afterend',wrap);
   else body.insertBefore(wrap,body.firstChild);
  }
 }catch(err){console.warn('Εικόνες εκπαιδευτικών πηγών: δεν ήταν διαθέσιμο το μητρώο.',err);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
