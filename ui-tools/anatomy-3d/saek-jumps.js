/* ΕΚΑΒ Σπουδή — read-only, curated links from SAEK chapters to the 3D anatomy.
   No storage or progress modifications. Avoid false mappings of cell biology
   and clinical procedures to merely decorative organs. */
(()=>{
'use strict';
const match=location.pathname.match(/(?:^|\/)saek-course-(\d{2})\.html$/);
if(!match)return;
const course=match[1];
void import(new URL('tools/atla-ai/nih3d-learning-surface.mjs',location.href).href).catch(()=>{});
// [label, mode, system, focus, optional sex]. Focus is a curated anatomical keyword.
// No clinical protocol/condition is encoded by the link.
const R={
'10':{
 1:[['Καρδιακές δομές','organs','cardiac','heart']],
 2:[['Εγκεφαλικές δομές','organs','nervous','brain']],
 3:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 7:[['Καρδιακές δομές','organs','cardiac','heart']],
 8:[['Καρδιακές δομές','organs','cardiac','heart']],
 9:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 10:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 16:[['Κοιλιακές δομές','organs','all','abdomen']],
 17:[['Νεφροί','organs','urinary','kidneys']]
},
'14':{
 3:[['Θωρακικός κλωβός','skeleton','skeletal','thorax'],['Οστά κρανίου','skeleton','skeletal','skull']],
 4:[['Μηριαία οστά','skeleton','skeletal','femora']],
 7:[['Πλευρές','skeleton','skeletal','ribs'],['Πνευμονικές δομές','organs','respiratory','lungs']],
 8:[['Οστά πυέλου','skeleton','skeletal','pelvis'],['Κοιλιακές δομές','organs','all','abdomen']],
 9:[['Οστά κρανίου','skeleton','skeletal','skull'],['Εγκεφαλικές δομές','organs','nervous','brain']],
 10:[['Σπονδυλική στήλη','skeleton','skeletal','spine']],
 11:[['Μηριαία οστά','skeleton','skeletal','femora'],['Βραχιόνια οστά','skeleton','skeletal','humeri']]
},
'17':{
 2:[['Αεραγωγοί','organs','respiratory','airways']],
 8:[['Τραχεία','organs','respiratory','trachea']],
 9:[['Καρδιακές δομές','organs','cardiac','heart']],
 10:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 11:[['Καρδιακές δομές','organs','cardiac','heart']],
 12:[['Εγκεφαλικές δομές','organs','nervous','brain']]
},
'18':{
 2:[['Οστά άκρων','skeleton','skeletal','limbs'],['Αρτηρίες','organs','all','arteries']],
 5:[['Αρτηρίες','organs','all','arteries']],
 6:[['Μηριαία οστά','skeleton','skeletal','femora']],
 8:[['Σπονδυλική στήλη','skeleton','skeletal','spine']],
 9:[['Πλευρές','skeleton','skeletal','ribs'],['Πνευμονικές δομές','organs','respiratory','lungs']],
 10:[['Οστά πυέλου','skeleton','skeletal','pelvis'],['Κοιλιακές δομές','organs','all','abdomen']]
},
'01':{
 1:[['Σκελετός — ανατομικός προσανατολισμός','skeleton','skeletal']],
 2:[['Οστά σώματος','skeleton','skeletal']],
 3:[['Πνευμονικές δομές','organs','respiratory','lungs'],['Θωρακικός κλωβός','skeleton','skeletal','thorax']],
 4:[['Ηπατικές δομές','organs','digestive','liver'],['Στομάχι','organs','digestive','stomach']],
 5:[['Εγκεφαλικές δομές','organs','nervous','brain'],['Καρδιακές δομές','organs','cardiac','heart']],
 7:[['Σπονδυλική στήλη','skeleton','skeletal','spine'],['Νωτιαίος μυελός','organs','nervous','cord']],
 8:[['Οστά κρανίου','skeleton','skeletal','skull'],['Εγκεφαλικές δομές','organs','nervous','brain']],
 9:[['Μυϊκό σύστημα','both','muscular'],['Σκελετός — ανατομική αναφορά','skeleton','skeletal']],
 10:[['Καρδιακές δομές','organs','cardiac','heart'],['Αορτή','organs','all','aorta']],
 11:[['Αεραγωγοί','organs','respiratory','airways']],
 12:[['Στομάχι','organs','digestive','stomach'],['Ηπατικές δομές','organs','digestive','liver']],
 13:[['Νεφροί','organs','urinary','kidneys'],['Μήτρα — γυναικείο','organs','reproductive','uterus','female']],
 14:[['Κοιλιακές δομές','organs','all','abdomen']]
},
'02':{
 2:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 3:[['Καρδιακές δομές','organs','cardiac','heart'],['Αορτή','organs','all','aorta']],
 4:[['Νευρικό σύστημα','organs','nervous','nervous']],
 6:[['Νωτιαίος μυελός','organs','nervous','cord']],
 7:[['Καρδιακές δομές','organs','cardiac','heart']],
 8:[['Αρτηρίες','organs','all','arteries']],
 9:[['Πνευμονικές δομές','organs','respiratory','lungs']],
 11:[['Νεφροί','organs','urinary','kidneys']],
 12:[['Πεπτικό σύστημα','organs','digestive','digestive']],
 13:[['Πάγκρεας — ανατομική αναφορά','organs','digestive','pancreas']]
},
'05':{
 8:[['Αεραγωγοί','organs','respiratory','airways']],
 9:[['Κυκλοφορικό σύστημα','organs','all','circulation']],
 10:[['Εγκεφαλικές δομές','organs','nervous','brain']]
}
};
const rows=R[course];if(!rows)return;
function link(item,chapter){const [label,mode,system,focus,sex]=item;
 const url=new URL('ui-tools/anatomy-3d/index.html',location.href);
 url.searchParams.set('mode',mode);if(system)url.searchParams.set('system',system);
 if(focus)url.searchParams.set('focus',focus);if(sex)url.searchParams.set('sex',sex);
 url.searchParams.set('from',course);url.searchParams.set('chapter',String(chapter));
 const a=document.createElement('a');a.href=url.pathname+url.search;
 a.className='saek-anatomy-link';a.textContent=label+' ↗';
 a.setAttribute('aria-label','Άνοιγμα 3D Ανατομίας: '+label);
 // Ανοίγει σε παράθυρο πάνω από το κεφάλαιο — ο χρήστης δεν φεύγει από το μάθημα.
 a.addEventListener('click',ev=>{if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.button)return;ev.preventDefault();openAtlas(a.href,label);});
 return a
}
function openAtlas(href,label){
 let d=document.getElementById('saek-anatomy-dialog');
 if(!d){
  d=document.createElement('dialog');d.id='saek-anatomy-dialog';d.className='saek-anatomy-dialog';d.setAttribute('aria-label','3D ανατομία');
  const bar=document.createElement('div');bar.className='saek-anatomy-dialog-bar';
  const t=document.createElement('strong');const close=document.createElement('button');close.type='button';close.textContent='Επιστροφή στο κεφάλαιο ✕';
  const ext=document.createElement('a');ext.target='_blank';ext.rel='noopener';ext.textContent='Νέα καρτέλα ↗';
  bar.append(t,ext,close);const f=document.createElement('iframe');f.title='3D ανατομία';f.allow='fullscreen';
  d.append(bar,f);document.body.append(d);
  close.addEventListener('click',()=>d.close());d.addEventListener('close',()=>{f.src='about:blank';});
  // Μέσα στο παράθυρο κρύβεται το κέλυφος της εφαρμογής· «Επιστροφή στο μάθημα» κλείνει το παράθυρο.
  f.addEventListener('load',()=>{try{const doc=f.contentDocument;if(!doc||!doc.head)return;
   const st=doc.createElement('style');st.textContent='.v6-global-sidebar,.v6-global-topbar,.sidebar,.topbar,.style-preview-nav,[data-ekab-quick-access],.v6-shell-mobile-nav,.mobile-nav{display:none!important}.v6-global-main,.maincol,.v6-page-shell{margin-left:0!important;padding-left:0!important;grid-template-columns:1fr!important}body{padding-top:0!important}';
   doc.head.append(st);
   doc.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a');if(a&&/saek-course-\d\d\.html/.test(a.getAttribute('href')||'')){e.preventDefault();d.close();}},true);
  }catch(e){}});
 }
 d.querySelector('strong').textContent='🧬 '+label;d.querySelector('a').href=href;d.querySelector('iframe').src=href;d.showModal();
}
for(const [chapterNumber,items] of Object.entries(rows)){
 const chapter=document.getElementById('lesson-'+chapterNumber);
 if(!chapter||chapter.querySelector('.saek-anatomy-jump'))continue;
 const host=chapter.querySelector('.body .reader-main')||chapter.querySelector('.body');
 if(!host)continue;
 // Συμπαγές: μία γραμμή που ανοίγει μόνο όταν την πατήσεις.
 const aside=document.createElement('details');aside.className='saek-anatomy-jump';
 aside.setAttribute('aria-label','Σχετική διαδραστική 3D ανατομία');
 const summary=document.createElement('summary');summary.className='saek-anatomy-jump-summary';
 summary.textContent='🧬 3D ανατομία ('+items.length+')';aside.append(summary);
 const buttons=document.createElement('div');buttons.className='saek-anatomy-jump-actions';
 for(const item of items)buttons.append(link(item,Number(chapterNumber)));
 aside.append(buttons);
 // Put next to the chapter explanation, never inside the read-completion controls.
 const firstParagraph=host.querySelector(':scope > .reader-paragraph, :scope > p');
 if(firstParagraph)firstParagraph.after(aside);else host.prepend(aside)
}
// A saved deep-link back from the atlas opens the corresponding closed chapter.
const fromHash=location.hash.match(/^#lesson-(\d{1,2})$/);
if(fromHash&&rows[Number(fromHash[1])]){
 const chapter=document.getElementById('lesson-'+fromHash[1]);
 if(chapter&&chapter.tagName==='DETAILS'){
   chapter.open=true;
   requestAnimationFrame(()=>chapter.scrollIntoView({block:'start',behavior:'instant'}))
 }
}
})();
