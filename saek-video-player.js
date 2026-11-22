/* ΕΚΑΒ Σπουδή: ενσωματωμένα βίντεο ανά κεφάλαιο, χωρίς αυτόματη αναπαραγωγή. */
(function(){
  'use strict';
  const videos=window.EKAB_LESSON_VIDEOS||{};
  const valid=url=>typeof url==='string'&&/^https:\/\//i.test(url);
  document.querySelectorAll('[data-lesson-video]').forEach(node=>{
    const url=videos[node.dataset.lessonVideo],slot=node.querySelector('.video-content');
    if(!slot)return;
    if(!valid(url)){slot.textContent='Το εκπαιδευτικό βίντεο δεν είναι διαθέσιμο ακόμη.';return;}
    const isMp4=/\.mp4(?:$|[?#])/i.test(url);
    const media=isMp4?document.createElement('video'):document.createElement('iframe');
    media.className='saek-video-player';
    const chapterTitle=node.closest('.reader-fold')?.querySelector('.chapter-heading')?.textContent?.trim()||'ΣΑΕΚ ΕΚΑΒ';
    if(isMp4){media.controls=true;media.preload='metadata';media.playsInline=true;media.setAttribute('aria-label','Εκπαιδευτικό βίντεο: '+chapterTitle);}
    else{media.title='Εκπαιδευτικό βίντεο: '+chapterTitle;media.loading='lazy';media.allow='fullscreen';media.allowFullscreen=true;media.referrerPolicy='strict-origin-when-cross-origin';}
    const fullscreen=document.createElement('a');
    fullscreen.className='saek-video-fallback';
    fullscreen.href=url+(url.includes('scrimba.com/explain/')?'&fullscreen=1':'');
    fullscreen.target='_blank';
    fullscreen.rel='noopener noreferrer';
    fullscreen.textContent=isMp4?'Άνοιγμα βίντεο σε νέα καρτέλα ↗':'Άνοιγμα σε πλήρη οθόνη ↗';
    slot.replaceChildren(media,fullscreen);
    node.addEventListener('toggle',()=>{
      if(node.open){if(!media.hasAttribute('src'))media.src=url;}
      else{if(isMp4)media.pause();media.removeAttribute('src');if(isMp4)media.load();}
    });
    const chapter=node.closest('.reader-fold');
    chapter?.addEventListener('toggle',()=>{if(!chapter.open&&node.open)node.open=false;});
  });
})();
