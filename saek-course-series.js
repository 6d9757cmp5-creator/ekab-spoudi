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
  // Η εισαγωγή του μαθήματος είναι ξεχωριστή· η σειρά περιέχει μόνο τα κεφάλαια (βίντεο Ν = κεφάλαιο Ν).
  const introPart=parts.find(part=>Number(part.chapter)===0);
  for(let i=parts.length-1;i>=0;i--)if(Number(parts[i].chapter)===0)parts.splice(i,1);
  if(introPart){
    const box=document.createElement('section');
    box.className='panel saek-series saek-course-intro';box.id='course-intro';box.setAttribute('aria-labelledby','saek-course-intro-title');
    const k=document.createElement('p');k.className='eyebrow';k.textContent='Εισαγωγή μαθήματος';
    const h=document.createElement('h2');h.id='saek-course-intro-title';h.textContent=(course.title||'')+' — Εισαγωγή';
    const v=document.createElement('video');v.className='saek-series-frame';v.controls=true;v.preload='metadata';v.playsInline=true;v.src=introPart.url;
    v.setAttribute('aria-label','Εισαγωγικό βίντεο μαθήματος: '+(course.title||''));
    box.append(k,h,v);intro.insertAdjacentElement('afterend',box);
  }
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
  introText.textContent='Κάθε βίντεο αντιστοιχεί σε ένα κεφάλαιο. Όταν αλλάζεις βίντεο, ανοίγει και το αντίστοιχο κεφάλαιο.';
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
  tabs.className='saek-series-parts';tabs.setAttribute('data-series-parts','');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Βίντεο κεφαλαίων');
  const note=document.createElement('p');note.className='small muted';
  note.textContent=parts.length+' βίντεο κεφαλαίων.';
  section.append(eyebrow,heading,introText,viewport,controls,tabs,note);
  (document.getElementById('course-intro')||intro).insertAdjacentElement('afterend',section);

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
  let syncing=false;
  function openWrittenChapter(chapter,scroll){
    if(chapter<1)return;
    const target=document.getElementById('lesson-'+chapter);
    if(!target)return;
    syncing=true;
    document.querySelectorAll('details.reader-fold[open]').forEach(d=>{if(d!==target)d.open=false;});
    target.open=true;
    setTimeout(()=>{syncing=false;},0);
    if(scroll!==false)requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
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
    tab.textContent=part.chapter+'. '+String(part.shortTitle||fullTitle);
    tab.setAttribute('aria-label',isIntro?'Εμφάνιση εισαγωγικού βίντεο: '+fullTitle:'Εμφάνιση βίντεο κεφαλαίου '+part.chapter+': '+fullTitle);
    tab.title=isIntro?'Εισαγωγικό βίντεο':'Βίντεο κεφαλαίου '+part.chapter;
    tab.addEventListener('click',()=>show(i));
    tabs.append(tab);tabNodes.push(tab);
  });

  function show(nextIndex,sync){
    if(!Number.isInteger(nextIndex)||nextIndex<0||nextIndex>=parts.length)return;
    index=nextIndex;
    slides.forEach((slide,i)=>{if(i===index)startMedia(slide);else stopMedia(slide);});
    track.style.transform='translateX(-'+(index*100)+'%)';
    prev.disabled=index===0;next.disabled=index===parts.length-1;
    status.textContent='Κεφάλαιο '+parts[index].chapter+' από '+parts.length;
    if(sync!==false)openWrittenChapter(Number(parts[index].chapter),false);
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
  // όταν ανοίγει γραπτό κεφάλαιο, το βίντεο πηγαίνει στο ίδιο κεφάλαιο
  document.querySelectorAll('details.reader-fold[id^="lesson-"]').forEach(d=>d.addEventListener('toggle',()=>{
    if(!d.open||syncing)return;const n=Number(d.id.slice(7)),i=parts.findIndex(p=>Number(p.chapter)===n);if(i>=0&&i!==index)show(i,false);
  }));
  const openNow=document.querySelector('details.reader-fold[id^="lesson-"][open]'),startAt=openNow?parts.findIndex(p=>Number(p.chapter)===Number(openNow.id.slice(7))):0;
  show(startAt>=0?startAt:0,false);
  // Κουμπί «Δες βίντεο μαθήματος (N)» δίπλα στο «Δες εικόνες μαθήματος»
  const total=parts.length+(introPart?1:0);
  function placeVideosButton(){
    if(document.getElementById('saek-course-videos-shortcut'))return true;
    const imgBar=document.getElementById('saek-course-images-shortcut');
    const heading=document.querySelector('.saek-lesson-heading')||document.querySelector('h2.reader-title');
    if(!imgBar&&!heading)return false;
    const a=document.createElement('a');a.id='saek-course-videos-shortcut';a.className='saek-source-action';
    a.href=introPart?'#course-intro':'#'+section.id;a.textContent='Δες βίντεο μαθήματος ('+total+')';
    a.setAttribute('aria-label','Μετάβαση στα βίντεο του μαθήματος: εισαγωγή και '+parts.length+' κεφάλαια');
    a.addEventListener('click',event=>{event.preventDefault();(document.getElementById('course-intro')||section).scrollIntoView({behavior:'smooth',block:'start'});});
    if(imgBar)imgBar.insertBefore(a,imgBar.children[1]||null);
    else{const bar=document.createElement('div');bar.className='saek-source-actions';bar.append(a);heading.insertAdjacentElement('afterend',bar);}
    return true;
  }
  // Το «Δες εικόνες» δημιουργείται ασύγχρονα· κρατάμε το κουμπί βίντεο δίπλα του όποτε εμφανιστεί/ξαναχτιστεί.
  const keep=new MutationObserver(()=>{
    const imgBar=document.getElementById('saek-course-images-shortcut'),btn=document.getElementById('saek-course-videos-shortcut');
    if(imgBar&&btn&&btn.parentElement!==imgBar){const old=btn.parentElement;imgBar.insertBefore(btn,imgBar.children[1]||null);if(old&&!old.children.length)old.remove();}
    else if(!btn)placeVideosButton();
  });
  keep.observe(document.body,{childList:true,subtree:true});setTimeout(()=>keep.disconnect(),15000);
  placeVideosButton();
})();
