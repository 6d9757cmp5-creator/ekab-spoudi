/* Bibliography search: metadata only. No grading, storage, or clinical retrieval. */
import {assertPublicCatalog,filterCatalog} from './mentor/library/catalog-search.mjs';
const status=document.getElementById('library-status');
const counts=document.getElementById('source-counts');
const list=document.getElementById('sources-list');
const queryInput=document.getElementById('source-search');
const stageSelect=document.getElementById('source-stage');
const trackSelect=document.getElementById('source-track');
const visible=document.getElementById('sources-visible');
const studyPaths=document.getElementById('study-paths');
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
function sourceCard(item){
  const li=el('li');li.className='source-card';
  li.append(el('h2',item.title));
  li.append(el('p','Φορέας: '+item.publisher));
  if(item.edition)li.append(el('p','Έκδοση: '+item.edition));
  if(item.curriculum_topics?.length)li.append(el('p','Θεματικές: '+item.curriculum_topics.join(' · ')));
  if(item.learning_priority)li.append(el('p','Στάδιο εμπλουτισμού ATLA: '+item.learning_priority+' / 6'));
  li.append(el('p','Διαδρομή μελέτης: '+item.learning_tracks.map(t=>t==='paramedic'?'Paramedic':'Ιατρική').join(' · ')));
  li.append(el('p','Κατάσταση: '+(item.extracted_for_review?'Εξαγωγή για εσωτερικό έλεγχο':item.reference_only?'Νέα βιβλιογραφική πηγή — άνοιγμα στον εκδότη':'Πηγή εντοπισμένη — χωρίς εξαγωγή κειμένου')));
  const caution=el('p','Ανεξάρτητος επιστημονικός έλεγχος: εκκρεμεί');caution.className='pending';li.append(caution);
  const details=el('details'),summary=el('summary','Άδεια και περιορισμοί πηγής'),description=el('p',item.license_summary||'Απαιτείται έλεγχος δικαιωμάτων.');
  details.append(summary,description);li.append(details);
  const link=el('a','Άνοιγμα πηγής στον εκδότη');
  link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
  if(item.section_urls?.length){
    const chapters=el('details'),header=el('summary','Διαθέσιμες εξειδικευμένες ενότητες');
    chapters.append(header);
    for(const url of item.section_urls){
      const chapter=el('a','Άνοιγμα ενότητας στην πηγή');
      chapter.href=url;chapter.target='_blank';chapter.rel='noopener noreferrer';
      chapters.append(chapter,el('span','  '));
    }
    li.append(chapters);
  }
  return li;
}
try{
  const response=await fetch('./mentor/library/source-index.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Ο κατάλογος δεν είναι διαθέσιμος.');
  const data=await response.json();
  const sources=assertPublicCatalog(data);
  const extracted=sources.filter(s=>s.extracted_for_review).length;
  counts.append(el('span',sources.length+' μοναδικές πηγές'),el('span',sources.filter(s=>s.learning_tracks.includes('paramedic')).length+' για Paramedic'),el('span',sources.filter(s=>s.learning_tracks.includes('medicine')).length+' για Ιατρική'),el('span',extracted+' κείμενα εξαγμένα για έλεγχο'),el('span','0 κλινικά εγκεκριμένες'));
  // These original study routes are metadata links, never imported medical claims.
  let modules=[];
  const ids=new Map(sources.map(s=>[s.id,s]));
  try{
    const answer=await fetch('./mentor/library/study-paths.json',{cache:'no-store'});
    if(answer.ok){
      const map=await answer.json();
      if(map.schema_version!==1||!Array.isArray(map.sections)||map.sections.length>100)throw Error('Invalid study map');
      for(const part of map.sections){
        if(!['paramedic','medicine'].includes(part.track)||!Array.isArray(part.source_ids)||!part.source_ids.length||
           !part.source_ids.every(id=>ids.get(id)?.learning_tracks.includes(part.track)))throw Error('Unmapped study source');
      }
      modules=map.sections;
    }
  }catch(error){
    studyPaths.append(el('p','Ο θεματικός οδηγός δεν είναι διαθέσιμος προς το παρόν.'));
  }
  const renderPaths=()=>{
    if(!modules.length)return;
    const isAll=trackSelect.value==='all';
    const matching=modules.filter(m=>isAll||m.track===trackSelect.value);
    const shown=isAll?[
      ...matching.filter(x=>x.track==='paramedic').slice(0,2),
      ...matching.filter(x=>x.track==='medicine').slice(0,2)
    ]:matching;
    studyPaths.replaceChildren();
    for(const m of shown){
      const section=el('article');section.className='study-path';
      section.append(el('h3',m.title));
      section.append(el('p','Διαδρομή: '+(m.track==='paramedic'?'Paramedic':'Ιατρική')));
      section.append(el('p',m.learning_goal));
      const ul=el('ul');
      for(const id of m.source_ids){
        const source=ids.get(id),li=el('li'),link=el('a',source.title);
        link.href=source.source_url;link.target='_blank';link.rel='noopener noreferrer';
        li.append(link);ul.append(li);
      }
      section.append(ul);studyPaths.append(section);
    }
  };
  const render=()=>{
    const matches=filterCatalog(sources,{query:queryInput.value,stage:stageSelect.value,track:trackSelect.value});
    list.replaceChildren(...matches.map(sourceCard));
    visible.textContent='Εμφανίζονται '+matches.length+' από '+sources.length+' πηγές.';
    if(!matches.length)list.append(el('li','Δεν βρέθηκαν πηγές με αυτά τα κριτήρια.'));
    renderPaths();
  };
  queryInput.addEventListener('input',render);
  stageSelect.addEventListener('change',render);
  trackSelect.addEventListener('change',render);
  render();
  status.textContent='Η βιβλιογραφία εμφανίζει μόνο στοιχεία πηγών. Δεν υπάρχουν εγκεκριμένα κλινικά αποσπάσματα.';
}catch(error){
  visible.textContent='Η βιβλιογραφία δεν είναι διαθέσιμη.';
  status.textContent='Αποτυχία φόρτωσης βιβλιογραφίας: '+String(error.message||error);
}
