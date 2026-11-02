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