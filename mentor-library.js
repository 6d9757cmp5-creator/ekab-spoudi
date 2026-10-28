/* Read-only MENTOR OS source bibliography. No grading, user storage or clinical retrieval. */
const status=document.getElementById('library-status');
const counts=document.getElementById('source-counts');
const list=document.getElementById('sources-list');
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
try{
 const response=await fetch('./mentor/library/source-index.json',{cache:'no-store'});
 if(!response.ok)throw new Error('Ο κατάλογος δεν είναι διαθέσιμος.');
 const data=await response.json();
 if(data.schema_version!==1||!Array.isArray(data.sources))throw new Error('Μη έγκυρη μορφή καταλόγου.');
 const imported=data.sources.filter(s=>s.extracted_for_review).length;
 counts.append(el('span',data.sources.length+' πηγές καταγεγραμμένες'),el('span',imported+' κείμενα εξαγμένα για έλεγχο'),el('span','0 κλινικά εγκεκριμένες'));
 for(const item of data.sources){
   const li=el('li');li.className='source-card';
   li.append(el('h2',item.title));
   li.append(el('p','Φορέας: '+item.publisher));
   li.append(el('p','Κατάσταση: '+(item.extracted_for_review?'Εξαγωγή για εσωτερικό έλεγχο':'Πηγή εντοπισμένη — χωρίς εξαγωγή κειμένου')));
   const caution=el('p','Ανεξάρτητος επιστημονικός έλεγχος: εκκρεμεί');
   caution.className='pending';li.append(caution);
   if(typeof item.source_url==='string'&&item.source_url.startsWith('https://')){
     const link=el('a','Άνοιγμα πηγής στον εκδότη');link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
   }
   list.append(li);
 }
 status.textContent='Εμφανίστηκε η βιβλιογραφία. Δεν υπάρχουν εγκεκριμένα κλινικά αποσπάσματα.';
}catch(error){
 status.textContent='Αποτυχία φόρτωσης βιβλιογραφίας: '+String(error.message||error);
}
