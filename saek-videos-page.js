/* ΕΚΑΒ Σπουδή — όλα τα βίντεο ΣΑΕΚ (εισαγωγές + κεφάλαια) με φίλτρα, όπως η σελίδα εικόνων. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const semester=$('videoSemester'),course=$('videoCourse'),search=$('videoSearch');
 const grid=$('videoGrid'),status=$('videoStatus'),more=$('videoMore');
 const dialog=$('videoLightbox'),large=$('videoLarge');
 const BATCH=24,SEM=n=>n<=6?'Α':n<=12?'Β':n<=16?'Γ':'Δ';
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('el');
 const series=window.EKAB_COURSE_VIDEO_SERIES||{};
 let entries=[],matched=[],loaded=0;
 for(const id of Object.keys(series).sort()){
  const c=series[id],n=Number(id);
  for(const p of c.parts||[]){
   if(typeof p.url!=='string'||!/^https:\/\//.test(p.url))continue;
   const intro=Number(p.chapter)===0;
   entries.push({id,n,semester:SEM(n),course:c.title,chapter:Number(p.chapter),intro,title:intro?'Εισαγωγή: '+c.title:String(p.title||''),url:p.url,
    link:intro?'study.html?type=saek':'saek-course-'+id+'.html#lesson-'+p.chapter,searchText:norm(c.title+' '+p.title)});
  }
 }
 function el(tag,text,cls){const x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x;}
 function open(e){
  large.src=e.url;$('videoLargeTitle').textContent=e.title;
  $('videoLargeCaption').textContent=e.course+(e.intro?' · Εισαγωγή μαθήματος':' · Κεφάλαιο '+e.chapter);
  const link=$('videoChapterLink');link.href=e.link;link.textContent=e.intro?'Μαθήματα ΣΑΕΚ':'Άνοιγμα κεφαλαίου';
  if(typeof dialog.showModal==='function')dialog.showModal();else location.href=e.url;
 }
 function stop(){large.pause();large.removeAttribute('src');large.load();}
 function close(){stop();if(dialog.open)dialog.close();}
 function card(e){
  const item=el('article',null,'saek-gallery-card saek-video-card'+(e.intro?' is-intro':''));
  const btn=el('button',null,'saek-gallery-image-button saek-video-thumb');btn.type='button';btn.setAttribute('aria-label','Αναπαραγωγή: '+e.title);
  btn.append(el('span',e.intro?'Εισαγωγή':'Κεφ. '+e.chapter,'saek-video-badge'),el('span','▶','saek-video-play'));
  btn.addEventListener('click',()=>open(e));
  const body=el('div',null,'saek-gallery-card-body');
  body.append(el('h2',e.title),el('p',e.course+' · '+e.semester+'΄ εξάμηνο'));
  const a=el('a',e.intro?'Μαθήματα ΣΑΕΚ':'Άνοιγμα κεφαλαίου');a.href=e.link;body.append(a);
  item.append(btn,body);return item;
 }
 function appendMore(){
  const slice=matched.slice(loaded,loaded+BATCH),f=document.createDocumentFragment();
  for(const e of slice)f.append(card(e));grid.append(f);loaded+=slice.length;more.hidden=loaded>=matched.length;
  status.textContent=matched.length?loaded+' από '+matched.length+' βίντεο':'Δεν βρέθηκαν βίντεο με αυτά τα φίλτρα.';
 }
 function updateCourses(){
  const before=course.value;course.replaceChildren(new Option('Όλα τα μαθήματα','all'));
  for(const id of Object.keys(series).sort()){if(semester.value!=='all'&&semester.value!==SEM(Number(id)))continue;course.append(new Option(id+' · '+series[id].title,id));}
  course.value=[...course.options].some(o=>o.value===before)?before:'all';
 }
 function filter(){
  const q=norm(search.value.trim());
  matched=entries.filter(e=>(semester.value==='all'||e.semester===semester.value)&&(course.value==='all'||e.id===course.value)&&(!q||e.searchText.includes(q)));
  grid.replaceChildren();loaded=0;appendMore();
 }
 semester.addEventListener('change',()=>{updateCourses();filter();});
 course.addEventListener('change',filter);search.addEventListener('input',filter);more.addEventListener('click',appendMore);
 $('videoClose').addEventListener('click',close);dialog.addEventListener('close',stop);
 dialog.addEventListener('click',ev=>{if(ev.target===dialog)close();});
 if(!entries.length){status.textContent='Δεν φορτώθηκαν τα βίντεο.';return;}
 updateCourses();filter();
})();
