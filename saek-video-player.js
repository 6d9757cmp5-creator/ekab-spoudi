/* ΕΚΑΒ Σπουδή: ενσωματωμένα βίντεο ανά κεφάλαιο, χωρίς αυτόματη αναπαραγωγή. */
(function(){
  'use strict';
  const videos=window.EKAB_LESSON_VIDEOS||{};
  const valid=url=>typeof url==='string'&&/^https:\/\//i.test(url);
  document.querySelectorAll('[data-lesson-video]').forEach(node=>{
    const url=videos[node.dataset.lessonVideo],slot=node.querySelector('.video-content');
    if(!slot)return;
    if(!valid(url)){slot.textContent='Το εκπαιδευτικό βίντεο δεν είναι διαθέσιμο ακόμη.';return;}
    const frame=document.createElement('iframe');
    frame.className='saek-video-player';
    frame.title='Εκπαιδευτικό βίντεο: '+(node.closest('.reader-fold')?.querySelector('.chapter-heading')?.textContent?.trim()||'ΣΑΕΚ ΕΚΑΒ');
    frame.loading='lazy';
    frame.allow='autoplay; fullscreen';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    const fullscreen=document.createElement('a');
    fullscreen.className='saek-video-fallback';
    fullscreen.href=url+(url.includes('scrimba.com/explain/')?'&fullscreen=1':'');
    fullscreen.target='_blank';
    fullscreen.rel='noopener noreferrer';
    fullscreen.textContent='Άνοιγμα σε πλήρη οθόνη ↗';
    slot.replaceChildren(frame,fullscreen);
    node.addEventListener('toggle',()=>{
      if(node.open){if(!frame.hasAttribute('src'))frame.src=url;}
      else frame.removeAttribute('src');
    });
    const chapter=node.closest('.reader-fold');
    chapter?.addEventListener('toggle',()=>{if(!chapter.open&&node.open)node.open=false;});
  });
})();
