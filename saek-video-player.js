/* ΕΚΑΒ Σπουδή: ενσωματωμένα βίντεο ανά κεφάλαιο, χωρίς αυτόματη αναπαραγωγή. */
(async function(){
  'use strict';
  const videos=window.EKAB_LESSON_VIDEOS||{};
  const valid=url=>typeof url==='string'&&/^https:\/\//i.test(url);
  let approvals={};
  try{
    const res=await fetch('./saek-video-approvals.json',{cache:'no-store'});
    if(!res.ok)throw Error('No registry');
    const data=await res.json();
    if(data.schemaVersion===1&&data.approved&&typeof data.approved==='object')approvals=data.approved;
  }catch{}
  const authorized=(rawId,url)=>{
    const parts=/^(\d{2})-(\d{1,2})$/.exec(rawId||'');
    if(!parts)return false;
    const item=approvals[parts[1]+'-'+String(Number(parts[2])).padStart(2,'0')];
    return Boolean(item&&item.status==='approved'&&item.url===url&&
      /^[a-f0-9]{64}$/.test(item.videoSha256||'')&&item.approvedBy&&item.reportPath);
  };
  document.querySelectorAll('[data-lesson-video]').forEach(node=>{
    const url=videos[node.dataset.lessonVideo],slot=node.querySelector('.video-content');
    if(!slot)return;
    if(!valid(url)||!authorized(node.dataset.lessonVideo,url)){slot.textContent='Το βίντεο βρίσκεται σε ανεξάρτητο AI και ανθρώπινο έλεγχο πριν από τη δημοσίευση.';return;}
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
