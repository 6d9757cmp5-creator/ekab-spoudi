/* Shared native video series for all 20 SAEK courses. */
(function(){
  'use strict';
  const match=location.pathname.match(/saek-course-(\d{2})\.html$/);
  if(!match)return;
  const courseId=match[1];
  const course=window.EKAB_COURSE_VIDEO_SERIES?.[courseId];
  const intro=document.querySelector('main.reader-main > section.panel');
  if(!course||!Array.isArray(course.parts)||!course.parts.length||!intro)return;

  const parts=course.parts.filter(part=>{
    if(!part||typeof part.url!=='string')return false;
    try{
      const url=new URL(part.url,location.href);
      return url.protocol==='https:'&&(/\.mp4(?:$|[?#])/i.test(url.href)||url.hostname==='scrimba.com');
    }catch{return false;}
  });
  if(!parts.length)return;

  const section=document.createElement('section');
  section.className='panel saek-series';
  section.id='saek-course-video-'+courseId;
  section.setAttribute('aria-labelledby','saek-series-title');
  section.tabIndex=0;
  const eyebrow=document.createElement('p');
  eyebrow.className='eyebrow';
  eyebrow.textContent='Βιντεοδιδασκαλία μαθήματος';
  const heading=document.createElement('h2');
  heading.id='saek-series-title';
  heading.textContent=(course.title||document.title.replace(/\s*[—|·]\s*ΕΚΑΒ Σπουδή\s*$/,'').trim())+' — Βίντεο';
  const introText=document.createElement('p');
  introText.className='saek-series-intro';
  introText.textContent='Επίλεξε εισαγωγή ή κεφάλαιο. Η αναπαραγωγή ξεκινά μόνο όταν πατήσεις το χειριστήριο του βίντεο.';
  const viewport=document.createElement('div');
  viewport.className='saek-series-viewport';
  viewport.setAttribute('data-series-viewport','');
  const track=document.createElement('div');
  track.className='saek-series-track';
  track.setAttribute('data-series-track','');
  viewport.append(track);
  const controls=document.createElement('div');
  controls.className='saek-series-controls';
  const prev=document.createElement('button');
  prev.type='button';prev.className='btn secondary compact';prev.textContent='‹ Προηγούμενο';prev.setAttribute('data-series-prev','');
  const status=document.createElement('strong');
  status.className='saek-series-status';status.setAttribute('data-series-status','');status.setAttribute('aria-live','polite');
  const next=document.createElement('button');
  next.type='button';next.className='btn secondary compact';next.textContent='Επόμενο ›';next.setAttribute('data-series-next','');
  controls.append(prev,status,next);
  const tabs=document.createElement('div');
  tabs.className='saek-series-parts';tabs.setAttribute('data-series-parts','');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Βίντεο εισαγωγής και κεφαλαίων');
  const note=document.createElement('p');note.className='small muted';
  note.textContent=parts.length+' βίντεο · Η εισαγωγή προηγείται των κεφαλαίων.';
  section.append(eyebrow,heading,introText,viewport,controls,tabs,note);
  intro.insertAdjacentElement('afterend',section);

  const slides=[];
  const tabNodes=[];
  let index=0;
  function stopMedia(slide){
    const media=slide.querySelector('video,iframe');
    if(!media)return;
    if(media instanceof HTMLVideoElement){media.pause();media.removeAttribute('src');media.load();}
    else media.removeAttribute('src');
  }
  function startMedia(slide){
    const media=slide.querySelector('video,iframe');
    if(media&&!media.hasAttribute('src')){media.src=media.dataset.src;}
  }
  function openWrittenChapter(chapter){
    if(chapter<1)return;
    const target=document.getElementById('lesson-'+chapter);
    if(!target)return;
    target.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  parts.forEach((part,i)=>{
    const isIntro=Number(part.chapter)===0;
    const fullTitle=String(part.title|| (isIntro?'Εισαγωγή':'Κεφάλαιο '+part.chapter));
    const slide=document.createElement('article');
    slide.className='saek-series-slide';
    slide.setAttribute('aria-label',(isIntro?'Εισαγωγή':'Κεφάλαιο '+part.chapter)+': '+fullTitle);
    const kicker=document.createElement('p');kicker.className='saek-series-kicker';
    kicker.textContent=isIntro?'Εισαγωγή':'Κεφάλαιο '+part.chapter;
    const title=document.createElement('h3');title.textContent=fullTitle;
    const mp4=/\.mp4(?:$|[?#])/i.test(part.url);
    const media=document.createElement(mp4?'video':'iframe');
    media.className='saek-series-frame';
    media.dataset.src=part.url;
    if(mp4){media.controls=true;media.preload='metadata';media.playsInline=true;media.setAttribute('aria-label','Βίντεο '+(isIntro?'εισαγωγής':'κεφαλαίου '+part.chapter)+': '+fullTitle);}
    else{media.title='Βίντεο '+(isIntro?'εισαγωγής':'κεφαλαίου '+part.chapter)+': '+fullTitle;media.loading='lazy';media.allow='fullscreen';media.allowFullscreen=true;media.referrerPolicy='strict-origin-when-cross-origin';}
    const actions=document.createElement('div');actions.className='saek-series-actions';
    const external=document.createElement('a');external.href=part.url;external.target='_blank';external.rel='noopener noreferrer';
    external.textContent='Άνοιγμα βίντεο σε νέα καρτέλα ↗';
    actions.append(external);
    if(!isIntro){
      const theory=document.createElement('a');theory.href='#lesson-'+part.chapter;theory.textContent='Γραπτή θεωρία κεφαλαίου '+part.chapter;
      theory.addEventListener('click',()=>openWrittenChapter(Number(part.chapter)));
      actions.append(theory);
    }
    slide.append(kicker,title,media,actions);
    track.append(slide);slides.push(slide);
    const tab=document.createElement('button');
    tab.type='button';
    tab.textContent=(i+1)+'. '+String(part.shortTitle||fullTitle);
    tab.setAttribute('aria-label',isIntro?'Εμφάνιση εισαγωγικού βίντεο: '+fullTitle:'Εμφάνιση βίντεο κεφαλαίου '+part.chapter+': '+fullTitle);
    tab.title=isIntro?'Εισαγωγικό βίντεο':'Βίντεο κεφαλαίου '+part.chapter;
    tab.addEventListener('click',()=>show(i));
    tabs.append(tab);tabNodes.push(tab);
  });

  function show(nextIndex){
    if(!Number.isInteger(nextIndex)||nextIndex<0||nextIndex>=parts.length)return;
    index=nextIndex;
    slides.forEach((slide,i)=>{if(i===index)startMedia(slide);else stopMedia(slide);});
    track.style.transform='translateX(-'+(index*100)+'%)';
    prev.disabled=index===0;next.disabled=index===parts.length-1;
    status.textContent='Βίντεο '+(index+1)+' από '+parts.length;
    tabNodes.forEach((tab,i)=>{if(i===index)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current');});
  }
  prev.addEventListener('click',()=>show(index-1));
  next.addEventListener('click',()=>show(index+1));
  let x0=null,y0=null;
  section.addEventListener('touchstart',event=>{if(event.touches.length!==1)return;x0=event.touches[0].clientX;y0=event.touches[0].clientY;},{passive:true});
  section.addEventListener('touchend',event=>{
    if(x0===null||!event.changedTouches.length)return;
    const dx=event.changedTouches[0].clientX-x0,dy=event.changedTouches[0].clientY-y0;x0=null;y0=null;
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.25)show(index+(dx<0?1:-1));
  },{passive:true});
  section.addEventListener('keydown',event=>{if(event.target!==section)return;if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}});
  show(0);
})();
