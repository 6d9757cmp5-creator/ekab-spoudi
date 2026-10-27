/* EKAB Spoudi: εκπαιδευτικό βίντεο ανά μάθημα με οριζόντια διαδοχικά μέρη. */
(function(){
  'use strict';
  const matched=window.location.pathname.match(/saek-course-(\d+)\.html$/);
  const courseId=matched?.[1]||'01';
  const course=window.EKAB_COURSE_VIDEO_SERIES?.[courseId];
  const intro=document.querySelector('main.reader-main > section.panel');
  if(!intro||!course||!Array.isArray(course.parts)||!course.parts.length)return;
  const parts=course.parts.filter(p=>typeof p.url==='string'&&/^https:\/\/scrimba\.com\/explain\//.test(p.url));
  if(!parts.length)return;

  const section=document.createElement('section');
  section.className='panel saek-series';
  section.id='saek-course-video-'+courseId;
  section.setAttribute('aria-labelledby','saek-series-title');
  section.tabIndex=0;
  section.innerHTML=
    '<p class="eyebrow">Ενιαία βιντεοδιδασκαλία ανά μάθημα</p>'+
    '<h2 id="saek-series-title"></h2>'+
    '<p class="saek-series-intro">Παρακολούθησε τα μέρη με «Προηγούμενο», «Επόμενο» ή σύρσιμο. Πάτησε τον τίτλο ενός κεφαλαίου κάτω από τα βίντεο για να ανοίξεις αμέσως τη γραπτή θεωρία του.</p>'+
    '<div class="saek-series-viewport" data-series-viewport><div class="saek-series-track" data-series-track></div></div>'+
    '<div class="saek-series-swipe-strip" data-series-swipe>← Σύρε εδώ αριστερά για τη συνέχεια, δεξιά για επιστροφή →</div>'+
    '<div class="saek-series-controls">'+
    '<button type="button" class="btn secondary compact" data-series-prev>‹ Προηγούμενο</button>'+
    '<strong class="saek-series-status" data-series-status aria-live="polite"></strong>'+
    '<button type="button" class="btn secondary compact" data-series-next>Επόμενο ›</button>'+
    '</div><div class="saek-series-parts" data-series-parts role="group" aria-label="Επιλογή διαθέσιμου μέρους"></div>'+
    '<p class="small muted" data-series-note></p>';
  section.querySelector('#saek-series-title').textContent=course.title+' — Εκπαιδευτικά βίντεο';
  intro.insertAdjacentElement('afterend',section);
  const track=section.querySelector('[data-series-track]');
  const prev=section.querySelector('[data-series-prev]');
  const next=section.querySelector('[data-series-next]');
  const status=section.querySelector('[data-series-status]');
  const tabs=section.querySelector('[data-series-parts]');
  const note=section.querySelector('[data-series-note]');
  const frameNodes=[],tabNodes=[];
  let index=0;

  // The chapter pills are navigation to the written course, not video-selection buttons.
  // Open the native <details> before following its fragment, so every chapter is visible.
  function openWrittenChapter(chapter){
    const target=document.getElementById('lesson-'+chapter);
    if(!target)return;
    target.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  parts.forEach((part,i)=>{
    const slide=document.createElement('article');
    slide.className='saek-series-slide';
    slide.setAttribute('aria-label','Μέρος '+(i+1)+': '+part.title);
    const kicker=document.createElement('p');kicker.className='saek-series-kicker';
    kicker.textContent='Μέρος '+(i+1)+' · Κεφάλαιο '+part.chapter;
    const title=document.createElement('h3');title.textContent=part.title;
    const frame=document.createElement('iframe');frame.className='saek-series-frame';
    frame.title=course.title+' — Μέρος '+(i+1)+': '+part.title;
    frame.loading='lazy';frame.allow='fullscreen';frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.dataset.src=part.url;
    const actions=document.createElement('div');actions.className='saek-series-actions';
    const external=document.createElement('a');
    external.href=part.url+(part.url.includes('?')?'&':'?')+'fullscreen=1';
    external.target='_blank';external.rel='noopener noreferrer';
    external.textContent='Άνοιγμα βίντεο σε πλήρη οθόνη ↗';
    const toChapter=document.createElement('a');toChapter.href='#lesson-'+part.chapter;
    toChapter.textContent='Γραπτή θεωρία κεφαλαίου '+part.chapter;
    toChapter.addEventListener('click',()=>openWrittenChapter(part.chapter));
    actions.append(external,toChapter);
    const play=document.createElement('button');
    play.type='button';play.className='btn saek-video-play';
    play.textContent='▶ Αναπαραγωγή βίντεο';
    play.addEventListener('click',()=>{frame.src=frame.dataset.src;play.hidden=true;});
    slide.append(kicker,title,play,frame,actions);
    track.append(slide);frameNodes.push(frame);
    const tab=document.createElement('a');
    tab.href='#lesson-'+part.chapter;
    tab.textContent=(i+1)+'. '+part.shortTitle;
    tab.setAttribute('aria-label','Άνοιγμα γραπτής θεωρίας, κεφάλαιο '+part.chapter+': '+part.title);
    tab.title='Μετάβαση στη γραπτή θεωρία κεφαλαίου '+part.chapter;
    tab.addEventListener('click',()=>openWrittenChapter(part.chapter));
    tabs.append(tab);tabNodes.push(tab);
  });
  function show(i){
    if(!Number.isInteger(i)||i<0||i>=parts.length)return;
    index=i;
    frameNodes.forEach((frame,j)=>{
      if(j!==index)frame.removeAttribute('src');
      const play=frame.parentElement.querySelector('.saek-video-play');
      if(play)play.hidden=frame.hasAttribute('src');
    });
    track.style.transform='translateX(-'+(index*100)+'%)';
    prev.disabled=index===0;next.disabled=index===parts.length-1;
    status.textContent='Μέρος '+(index+1)+' από '+parts.length;
    tabNodes.forEach((tab,j)=>{if(j===index)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current');});
  }
  prev.addEventListener('click',()=>show(index-1));
  next.addEventListener('click',()=>show(index+1));
  note.textContent='Πάτησε έναν τίτλο κεφαλαίου για τη γραπτή θεωρία του. Διαθέσιμα '+parts.length+' από '+course.totalChapters+' βίντεο· η μετάβαση μεταξύ βίντεο γίνεται με «Προηγούμενο», «Επόμενο» ή σύρσιμο.';
  let x0=null,y0=null;
  section.addEventListener('touchstart',event=>{
    if(event.touches.length!==1)return;
    x0=event.touches[0].clientX;y0=event.touches[0].clientY;
  },{passive:true});
  section.addEventListener('touchend',event=>{
    if(x0===null||!event.changedTouches.length)return;
    const dx=event.changedTouches[0].clientX-x0,dy=event.changedTouches[0].clientY-y0;
    x0=null;y0=null;
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.25)show(index+(dx<0?1:-1));
  },{passive:true});
  section.addEventListener('keydown',event=>{
    if(event.target!==section)return;
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}
    if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}
  });
  show(0);
  // Collapsible teaching panel; unloading frames stops embedded playback.
  const heading=section.querySelector('#saek-series-title');
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='btn compact secondary';
  toggle.textContent='Απόκρυψη βιντεοδιδασκαλίας −';
  toggle.setAttribute('aria-expanded','true');
  const content=document.createElement('div');
  content.id='saek-video-content-'+courseId;
  toggle.setAttribute('aria-controls',content.id);
  while(heading.nextSibling)content.appendChild(heading.nextSibling);
  heading.after(toggle,content);
  toggle.addEventListener('click',function(){
    const closed=!content.hidden;
    content.hidden=closed;
    toggle.setAttribute('aria-expanded',String(!closed));
    toggle.textContent=closed?'Εμφάνιση βιντεοδιδασκαλίας +':'Απόκρυψη βιντεοδιδασκαλίας −';
    if(closed){frameNodes.forEach(function(frame){frame.removeAttribute('src');const play=frame.parentElement.querySelector('.saek-video-play');if(play)play.hidden=false;});}
    else{show(index);}
  });
})();
