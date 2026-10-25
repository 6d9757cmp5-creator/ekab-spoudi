(function(){
  'use strict';
  const vids=window.EKAB_LESSON_VIDEOS||{};
  const valid=(v)=>typeof v==='string'&&/^https:\/\//i.test(v);
  const make=(url)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='btn secondary compact';a.textContent='▶ Προβολή εκπαιδευτικού βίντεο ↗';return a;};
  for(const node of document.querySelectorAll('[data-lesson-video]')){
    const key=node.dataset.lessonVideo,url=vids[key],slot=node.querySelector('.video-content');if(!slot)continue;
    if(!valid(url)){slot.textContent='Βίντεο για αυτό το κεφάλαιο: δεν έχει προστεθεί ακόμη.';continue;}
    slot.replaceChildren(make(url));
  }
})();
