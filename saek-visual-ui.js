/* Shared SAEK lesson header and visual layout. Does not alter lesson progress. */
(function(){
'use strict';
const title=document.querySelector('h2.reader-title');
const toc=document.querySelector('details.chapter-toc');
if(title&&toc){
 const header=document.createElement('div');header.className='saek-lesson-heading';
 title.parentNode.insertBefore(header,title);header.append(title);header.append(toc);
 toc.classList.add('saek-compact-toc');
 const summary=toc.querySelector('summary');
 const match=summary?.textContent.match(/\d+\s+κεφάλαια/);
 if(summary&&match){summary.textContent='☰ '+match[0];summary.setAttribute('aria-label','Περιεχόμενα μαθήματος: '+match[0]);}
 toc.querySelectorAll('a[href^="#lesson-"]').forEach(a=>a.addEventListener('click',()=>{toc.open=false}));
}
document.querySelectorAll('img.course-diagram').forEach(img=>{
 if(img.nextElementSibling?.classList.contains('saek-diagram-caption'))return;
 const caption=document.createElement('p');caption.className='small muted saek-diagram-caption';
 caption.textContent='Εκπαιδευτικό σχηματικό διάγραμμα με ελληνική ορολογία.';
 img.insertAdjacentElement('afterend',caption);
});
})();
/* Hide draft study drawings until clinically reviewed. */
(function(){
 const hide=function(){
  document.querySelectorAll('.saek-visual-panel,.saek-learning-gallery,.saek-learning-chapter-map,.saek-phys-gallery,.saek-phys-chapter-map').forEach(function(el){el.remove()});
  document.querySelectorAll('img.course-diagram').forEach(function(img){img.style.display='none'});
 };
 hide();
 document.addEventListener('DOMContentLoaded',hide,{once:true});
})();

/* Load license-attributed source figures selected in the four-semester visual audit. */
(function(){
 const s=document.createElement('script');
 s.src='saek-reviewed-image-ui.js';
 s.async=true;
 document.head.appendChild(s);
})();

/* Greek lesson-specific visual recap cards; separate from sourced anatomical figures. */
(function(){const s=document.createElement('script');s.src='saek-chapter-visuals.js';s.async=true;document.head.appendChild(s);})();
