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
/* Topic-specific illustrations for all SAEK lessons. */
(function(){'use strict';if(!/saek-course-\d{2}\.html$/.test(location.pathname)||/saek-course-02\.html$/.test(location.pathname))return;const script=document.createElement('script');script.src='saek-learning-maps.js';script.defer=true;document.body.append(script)})();
