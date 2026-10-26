/* Πρακτικό ΕΟΠΠΕΠ: φόρτωση βίντεο κατ' απαίτηση και μεγέθυνση σελίδων. */
(()=>{'use strict';
const cards=[...document.querySelectorAll('[data-practical-video]')];
cards.forEach(card=>card.addEventListener('toggle',()=>{
 const frame=card.querySelector('iframe[data-practical-src]');if(!frame)return;
 if(card.open){
  cards.forEach(other=>{if(other!==card&&other.open)other.open=false});
  if(!frame.getAttribute('src'))frame.setAttribute('src',frame.dataset.practicalSrc);
 }else frame.removeAttribute('src'); // Σταματά την αναπαραγωγή όταν κλείνει.
}));
const dialog=document.getElementById('practical-image-dialog');
const image=document.getElementById('practical-dialog-image');
const stage=document.getElementById('practical-dialog-stage');
const title=document.getElementById('practical-dialog-title');
const original=document.getElementById('practical-dialog-original');
const zoom=document.querySelector('[data-practical-zoom]');
let opener=null;
function setZoom(on){stage.classList.toggle('is-zoomed',on);zoom.setAttribute('aria-pressed',String(on));zoom.textContent=on?'− Επαναφορά μεγέθους':'+ Περισσότερη μεγέθυνση';stage.scrollTop=0;stage.scrollLeft=0}
document.querySelectorAll('[data-practical-page]').forEach(btn=>btn.addEventListener('click',()=>{
 const src=btn.dataset.practicalPage;
 if(!/^(eoppep-page-17|eoppep-page-18)\.webp$/.test(src))return;
 opener=btn;image.src=src;image.alt=btn.dataset.practicalLabel;title.textContent=btn.dataset.practicalLabel;original.href=src;setZoom(false);
 if(typeof dialog.showModal==='function')dialog.showModal();else window.open(src,'_blank','noopener');
}));
document.querySelector('[data-practical-close]')?.addEventListener('click',()=>dialog.close());
zoom?.addEventListener('click',()=>setZoom(!stage.classList.contains('is-zoomed')));
dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
dialog?.addEventListener('close',()=>{image.removeAttribute('src');setZoom(false);opener?.focus()});
})();
