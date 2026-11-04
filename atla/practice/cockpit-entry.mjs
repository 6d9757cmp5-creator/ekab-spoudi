/**
 * One clinical-cockpit entry from SAEK. Does not select a fake clinically matched
 * patient case; preserves source chapter and provides an optional ATLAS tutor.
 */
const SOURCE=/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/;
const CHAPTER=/^lesson-(?:[1-9]|[1-9][0-9]|100)$/;
export function readCockpitEntry(search){
 const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
 const from=params.get('from')||'',chapter=params.get('chapter')||'';
 if(!SOURCE.test(from)||!CHAPTER.test(chapter))return null;
 const focus=(params.get('focus')||'').replace(/[\x00-\x1f\x7f<>]/g,' ').trim().slice(0,90);
 return {from,chapter,focus,returnHref:from+'#'+chapter};
}
export function mountCockpitEntry(root=document,search=location.search){
 const section=root.getElementById('next-case-library');
 if(!section||root.getElementById('atlas-cockpit-entry'))return false;
 const entry=readCockpitEntry(search);
 const panel=root.createElement('section');
 panel.id='atlas-cockpit-entry';
 panel.className='atlas-cockpit-entry';
 panel.setAttribute('aria-label','Συνέχεια εξάσκησης και προαιρετική βοήθεια ATLAS');
 const h=root.createElement('h2');h.textContent='Εξάσκηση · Clinical Cockpit';
 const p=root.createElement('p');
 p.textContent=entry?'Προήλθες από κεφάλαιο ΣΑΕΚ'+(entry.focus?' «'+entry.focus+'»':'')+'. Ο σημερινός Προσομοιωτής έχει γενικά συνθετικά περιστατικά και δεν ισχυρίζεται ότι αυτά αντιστοιχούν ιατρικά στο κεφάλαιο.':'Ο Προσομοιωτής εκτελεί συνθετικές ασκήσεις. Μπορείς προαιρετικά να ζητήσεις εκπαιδευτική καθοδήγηση από το ATLAS.';
 const actions=root.createElement('div');actions.className='atlas-cockpit-entry-actions';
 if(entry){
  const back=root.createElement('a');back.href=entry.returnHref;back.textContent='← Πίσω στο ίδιο κεφάλαιο ΣΑΕΚ';
  actions.append(back);
 }
 const ask=root.createElement('button');ask.type='button';ask.dataset.atlaOpen='true';ask.textContent='ATLAS · Προαιρετική βοήθεια';
 if(entry)ask.addEventListener('click',()=>{
  window.dispatchEvent(new CustomEvent('ekab:atlas-context',{detail:{source:entry.from,chapter:entry.chapter,focus:entry.focus}}));
 });
 actions.append(ask);
 const note=root.createElement('p');note.className='atlas-cockpit-entry-note';
 note.textContent='Το ATLAS δεν αλλάζει ασθενείς, ζωτικά ή αποτελέσματα. Σε DEMO παρέχει μόνο εικονικές απαντήσεις· το πραγματικό AI δεν έχει ενεργοποιηθεί.';
 panel.append(h,p,actions,note);
 section.insertAdjacentElement('beforebegin',panel);
 return true;
}
if(typeof document!=='undefined'){
 const ready=()=>mountCockpitEntry();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
