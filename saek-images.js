/* EΚΑΒ Σπουδή — local chapter-image gallery. Read-only; no publication/clinical approvals. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const semester=$('imageSemester'),course=$('imageCourse'),search=$('imageSearch');
 const grid=$('imageGalleryGrid'),status=$('imageStatus'),more=$('imageMore'),retry=$('imageRetry');
 const dialog=$('imageLightbox'),large=$('imageLarge');
 const BATCH=24;
 let entries=[],matched=[],loaded=0,courses=[];
 const safePath=path=>typeof path==='string'&&/^assets\/education\/[a-z0-9-]+\.(?:svg|png|jpg)$/.test(path);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');
 function el(tag,text,className){
  const node=document.createElement(tag);
  if(text!=null)node.textContent=text;
  if(className)node.className=className;
  return node;
 }
 function sourceLink(container,entry){
  if(entry.asset.originalArtwork===true)return;
  container.append(document.createTextNode('Δημιουργός: '+(entry.asset.author||'Άγνωστος')+' · '+(entry.asset.license||'Άδεια μη καταγεγραμμένη')));
  const url=entry.asset.page;
  if(typeof url==='string'&&/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(url)){
   const link=el('a',' · Wikimedia Commons');
   link.href=url;link.rel='noopener noreferrer';link.target='_blank';
   container.append(link);
  }
  const license=entry.asset.licenseUrl;
  if(typeof license==='string'&&/^https:\/\/creativecommons\.org\//.test(license)){
   const link=el('a',' · Όροι άδειας');link.href=license;link.target='_blank';link.rel='noopener noreferrer';
   container.append(link);
  }
 }
 function openLarge(entry){
  large.src=entry.asset.localPath;
  large.alt=entry.asset.title||'Εκπαιδευτική εικόνα';
  $('imageLargeTitle').textContent=entry.asset.title||entry.assetId;
  $('imageLargeCaption').textContent=entry.asset.caption||'';
  $('imageChapterLink').href='saek-course-'+entry.courseNo+'.html#lesson-'+entry.chapter;
  if(typeof dialog.showModal==='function')dialog.showModal();
  else window.location.href=large.src;
 }
 function card(entry){
  const item=el('article',null,'saek-gallery-card');
  const imageButton=el('button',null,'saek-gallery-image-button');
  imageButton.type='button';imageButton.setAttribute('aria-label','Μεγέθυνση: '+(entry.asset.title||entry.assetId));
  const image=el('img');image.src=entry.asset.localPath;image.loading='lazy';image.decoding='async';
  image.alt=(entry.asset.title||'Εικόνα')+'. '+(entry.asset.caption||'');
  imageButton.append(image);imageButton.addEventListener('click',()=>openLarge(entry));
  const body=el('div',null,'saek-gallery-card-body');
  body.append(el('h2',entry.asset.title||entry.assetId));
  body.append(el('p',entry.courseName+' · Κεφάλαιο '+entry.chapter));
  const chapter=el('a','Άνοιγμα κεφαλαίου');
  chapter.href='saek-course-'+entry.courseNo+'.html#lesson-'+entry.chapter;
  body.append(chapter);
  item.append(imageButton,body);
  return item;
 }
 function appendMore(){
  const slice=matched.slice(loaded,loaded+BATCH);
  const fragment=document.createDocumentFragment();
  for(const entry of slice)fragment.append(card(entry));
  grid.append(fragment);loaded+=slice.length;
  more.hidden=loaded>=matched.length;
  status.textContent=matched.length?loaded+' από '+matched.length+' εικόνες · '+entries.length+' συνολικά':'Δεν βρέθηκαν εικόνες με αυτά τα φίλτρα.';
 }
 function updateCourses(){
  const before=course.value;course.replaceChildren(new Option('Όλα τα μαθήματα','all'));
  for(const item of courses){
   if(semester.value!=='all'&&semester.value!==item.semester)continue;
   course.append(new Option(String(item.course).padStart(2,'0')+' · '+item.title,String(item.course)));
  }
  course.value=[...course.options].some(option=>option.value===before)?before:'all';
 }
 function filter(){
  const q=norm(search.value.trim());
  matched=entries.filter(entry=>
   (semester.value==='all'||entry.semester===semester.value)&&
   (course.value==='all'||String(entry.course)===course.value)&&
   (!q||entry.searchText.includes(q))
  );
  loaded=0;grid.replaceChildren();appendMore();
 }
 async function load(){
  retry.hidden=true;status.textContent='Φόρτωση εικόνων…';
  try{
   const response=await fetch('saek-image-audit-2026.json');
   if(!response.ok)throw new Error('Δεν είναι διαθέσιμο το τοπικό μητρώο.');
   const data=await response.json();
   if(!Array.isArray(data.courses)||!data.assets||typeof data.assets!=='object')throw new Error('Μη έγκυρο μητρώο.');
   const result=[];let chapterCount=0;
   for(const c of data.courses){
    const courseNo=String(c.course).padStart(2,'0');
    for(let i=0;i<c.chapters.length;i++){
     chapterCount++;
     const chapterKeys=new Set();
     for(const id of c.chapters[i].images||[]){
      const a=data.assets[id];
      if(!a||!safePath(a.localPath)||chapterKeys.has(id))throw new Error('Μη έγκυρη ή διπλή εικόνα στο κεφάλαιο: '+id);
      chapterKeys.add(id);
      result.push({assetId:id,asset:a,course:c.course,courseNo,courseName:c.title,semester:c.semester,chapter:i+1,
       searchText:norm(id+' '+a.title+' '+a.caption+' '+c.title)});
     }
    }
   }
   if(!result.length||chapterCount!==247||data.courses.length!==20)
    throw new Error('Η αντιστοίχιση εικόνων/κεφαλαίων δεν είναι πλήρης.');
   courses=data.courses;entries=result;
   updateCourses();filter();
  }catch(error){
   grid.replaceChildren();more.hidden=true;
   status.textContent='Δεν κατέστη δυνατή η προβολή των εικόνων.';
   retry.hidden=false;console.error('SAEK image gallery:',error);
  }
 }
 semester.addEventListener('change',()=>{updateCourses();filter()});
 course.addEventListener('change',filter);
 search.addEventListener('input',filter);
 more.addEventListener('click',appendMore);
 $('imageClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 $('imageRetryButton').addEventListener('click',load);
 load();
})();
