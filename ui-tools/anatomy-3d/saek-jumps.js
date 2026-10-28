/* ΕΚΑΒ Σπουδή — read-only, curated links from SAEK chapters to the 3D anatomy.
   No storage or progress modifications. Avoid false mappings of cell biology
   and clinical procedures to merely decorative organs. */
(()=>{
'use strict';
const match=location.pathname.match(/(?:^|\/)saek-course-(\d{2})\.html$/);
if(!match)return;
const course=match[1];
// [label, mode, system, focus, optional sex]. Focus is a curated anatomical keyword.
// No clinical protocol/condition is encoded by the link.
const R={
'01':{
  1:[['Ανατομική θέση','skeleton','skeletal']],
  2:[['Οστά σώματος','skeleton','skeletal']],
  3:[['Πνεύμονες','organs','respiratory','lung'],['Θωρακικός κλωβός','skeleton','skeletal','rib']],
  4:[['Ήπαρ','organs','digestive','liver'],['Στομάχι','organs','digestive','stomach']],
  5:[['Εγκέφαλος','organs','nervous','brain'],['Καρδιά','organs','cardiac','heart']],
  7:[['Σπόνδυλοι','skeleton','skeletal','vertebra'],['Νωτιαίος μυελός','organs','nervous','spinalcord']],
  8:[['Κρανίο','skeleton','skeletal','skull'],['Εγκέφαλος','organs','nervous','brain']],
  9:[['Μυϊκό σύστημα','both','muscular'],['Οστέινες αρθρώσεις','skeleton','skeletal']],
  10:[['Καρδιά','organs','cardiac','heart'],['Αορτή','organs','arterial','aorta']],
  11:[['Τραχεία και αεραγωγοί','organs','respiratory','trachea']],
  12:[['Στομάχι','organs','digestive','stomach'],['Ήπαρ','organs','digestive','liver']],
  13:[['Νεφρός','organs','urinary','kidney'],['Μήτρα — γυναικείο','organs','reproductive','uterus','female']],
  14:[['Όργανα κοιλίας','organs','digestive']]
},
'02':{
  2:[['Πνεύμονες','organs','respiratory','lung']],
  3:[['Καρδιά','organs','cardiac','heart'],['Αορτή','organs','arterial','aorta']],
  4:[['Νευρικό σύστημα','organs','nervous','brain']],
  6:[['Νωτιαίος μυελός','organs','nervous','spinalcord']],
  7:[['Καρδιά','organs','cardiac','heart']],
  8:[['Αρτηρίες','organs','arterial','aorta']],
  9:[['Πνεύμονες','organs','respiratory','lung']],
  11:[['Νεφρός','organs','urinary','kidney']],
  12:[['Πεπτικό σύστημα','organs','digestive','stomach']],
  13:[['Θυρεοειδής','organs','endocrine','thyroid']]
},
'05':{
  8:[['Τραχεία / αεραγωγοί','organs','respiratory','trachea']],
  9:[['Καρδιά / κυκλοφορία','organs','cardiac','heart']],
  10:[['Εγκέφαλος','organs','nervous','brain']]
},
'10':{
  1:[['Καρδιά','organs','cardiac','heart']],
  2:[['Εγκέφαλος','organs','nervous','brain']],
  3:[['Πνεύμονες','organs','respiratory','lung']],
  7:[['Καρδιά','organs','cardiac','heart']],
  8:[['Καρδιά','organs','cardiac','heart']],
  9:[['Πνεύμονες','organs','respiratory','lung']],
  10:[['Πνεύμονες','organs','respiratory','lung']],
  16:[['Όργανα κοιλίας','organs','digestive']],
  17:[['Νεφροί','organs','urinary','kidney']]
},
'14':{
  3:[['Θωρακικός κλωβός','skeleton','skeletal','rib'],['Κρανίο','skeleton','skeletal','skull']],
  4:[['Μηριαίο οστό','skeleton','skeletal','femur']],
  7:[['Πλευρές','skeleton','skeletal','rib'],['Πνεύμονες','organs','respiratory','lung']],
  8:[['Πύελος','skeleton','skeletal','pelvis'],['Όργανα κοιλίας','organs','digestive']],
  9:[['Κρανίο','skeleton','skeletal','skull'],['Εγκέφαλος','organs','nervous','brain']],
  10:[['Σπόνδυλοι','skeleton','skeletal','vertebra']],
  11:[['Μηριαίο οστό','skeleton','skeletal','femur'],['Βραχιόνιο οστό','skeleton','skeletal','humerus']]
},
'17':{
  2:[['Αεραγωγός','organs','respiratory','trachea']],
  8:[['Τραχεία','organs','respiratory','trachea']],
  9:[['Καρδιά','organs','cardiac','heart']],
  10:[['Πνεύμονες','organs','respiratory','lung']],
  11:[['Καρδιά','organs','cardiac','heart']],
  12:[['Εγκέφαλος','organs','nervous','brain']]
},
'18':{
  2:[['Οστά άκρων','skeleton','skeletal'],['Αρτηρίες','organs','arterial']],
  5:[['Αρτηρίες','organs','arterial']],
  6:[['Μηριαίο οστό','skeleton','skeletal','femur']],
  8:[['Σπονδυλική στήλη','skeleton','skeletal','vertebra']],
  9:[['Πλευρές','skeleton','skeletal','rib'],['Πνεύμονες','organs','respiratory','lung']],
  10:[['Πύελος','skeleton','skeletal','pelvis'],['Όργανα κοιλίας','organs','digestive']]
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
 return a
}
for(const [chapterNumber,items] of Object.entries(rows)){
 const chapter=document.getElementById('lesson-'+chapterNumber);
 if(!chapter||chapter.querySelector('.saek-anatomy-jump'))continue;
 const host=chapter.querySelector('.body .reader-main')||chapter.querySelector('.body');
 if(!host)continue;
 const aside=document.createElement('aside');aside.className='saek-anatomy-jump';
 aside.setAttribute('aria-label','Σχετική διαδραστική 3D ανατομία');
 const copy=document.createElement('div');copy.className='saek-anatomy-jump-text';
 const title=document.createElement('strong');title.textContent='🧬 Δες τη σχετική ανατομία σε 3D';
 const subtitle=document.createElement('small');subtitle.textContent='Επιλεγμένα οστά και όργανα για αυτό το κεφάλαιο';
 copy.append(title,subtitle);aside.append(copy);
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