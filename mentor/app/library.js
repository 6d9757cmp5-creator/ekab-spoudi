/* Bibliography search: metadata only. No grading, storage, or clinical retrieval. */
import {assertPublicCatalog,filterCatalog} from '../library/catalog-search.mjs';
const status=document.getElementById('library-status');
const counts=document.getElementById('source-counts');
const list=document.getElementById('sources-list');
const queryInput=document.getElementById('source-search');
const stageSelect=document.getElementById('source-stage');
const visible=document.getElementById('sources-visible');
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
function sourceCard(item){
  const li=el('li');li.className='source-card';
  li.append(el('h2',item.title));
  li.append(el('p','Φορέας: '+item.publisher));
  if(item.edition)li.append(el('p','Έκδοση: '+item.edition));
  if(item.curriculum_topics?.length)li.append(el('p','Θεματικές: '+item.curriculum_topics.join(' · ')));
  li.append(el('p','Κατάσταση: '+(item.extracted_for_review?'Εξαγωγή μόνο σε δοκιμαστικό branch, όχι διαθέσιμο πλήρες κείμενο εδώ':item.reference_only?'Βιβλιογραφική αναφορά — χωρίς εισαγμένο πλήρες κείμενο':'Πηγή εντοπισμένη — χωρίς εισαγμένο πλήρες κείμενο')));
  const caution=el('p','Ανεξάρτητος επιστημονικός έλεγχος: εκκρεμεί');caution.className='pending';li.append(caution);
  const details=el('details'),summary=el('summary','Άδεια και περιορισμοί πηγής'),description=el('p',item.license_summary||'Απαιτείται έλεγχος δικαιωμάτων.');
  details.append(summary,description);li.append(details);
  const link=el('a','Άνοιγμα πηγής στον εκδότη');
  link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
  return li;
}
try{
  const response=await fetch('./mentor/library/source-index.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Ο κατάλογος δεν είναι διαθέσιμος.');
  const data=await response.json();
  const sources=assertPublicCatalog(data);
  const visibleSources=sources.filter(s=>s.learning_tracks.includes('paramedic'));
  const extracted=sources.filter(s=>s.extracted_for_review).length;
  counts.append(el('span',visibleSources.length+' πηγές Paramedic'),el('span',sources.length+' βιβλιογραφικές καταχωρίσεις συνολικά'),el('span',extracted+' εξαγωγές σε δοκιμαστικό branch'),el('span','0 κλινικά εγκεκριμένες'));
  const render=()=>{
    const matches=filterCatalog(sources,{query:queryInput.value,stage:stageSelect.value,track:'paramedic'});
    list.replaceChildren(...matches.map(sourceCard));
    visible.textContent='Εμφανίζονται '+matches.length+' από '+visibleSources.length+' πηγές Paramedic.';
    if(!matches.length)list.append(el('li','Δεν βρέθηκαν πηγές με αυτά τα κριτήρια.'));
  };
  queryInput.addEventListener('input',render);
  stageSelect.addEventListener('change',render);
  render();
  status.textContent='Η βιβλιογραφία εμφανίζει μόνο στοιχεία πηγών. Δεν υπάρχουν εγκεκριμένα κλινικά αποσπάσματα.';
}catch(error){
  visible.textContent='Η βιβλιογραφία δεν είναι διαθέσιμη.';
  status.textContent='Αποτυχία φόρτωσης βιβλιογραφίας: '+String(error.message||error);
}
