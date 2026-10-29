/**
 * MENTOR OS physician-oriented reference desk.
 * Link-backed, deterministic, unreviewed learning content—not a doctor or AI.
 * Never records search text, writes patient data or touches legacy grades.
 */
import {validateClinicalDesk,searchClinical,lookupClinical,fallbackSources} from './clinical-engine.mjs';
const $=id=>document.getElementById(id);
function elem(tag,cls,text){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);
 return e;
}
async function load(url){
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status+' ('+url+')');
 return response.json();
}
export async function mountClinicalDesk(){
 const status=$('clinical-status'),count=$('clinical-count'),query=$('clinical-query'),
  specialty=$('clinical-specialty'),results=$('clinical-results'),sourcesBox=$('clinical-sources');
 let library,sources,ready=false;
 const tell=(s,error=false)=>{status.textContent=s;status.dataset.error=error?'true':'false';};
 const src=id=>sources.sources.find(s=>s.id===id);
 function renderItem(rec){
  const article=elem('article','clinical-entry');
  article.dataset.clinicalId=rec.id;
  const sp=library.specialties.find(s=>s.id===rec.specialty);
  article.append(elem('p','eyebrow',sp?.label||'Ειδικότητα'));
  article.append(elem('h3',null,rec.question));
  const lead=elem('section','clinical-entry-body');
  lead.append(elem('strong',null,'Εκπαιδευτικό πλαίσιο συλλογιστικής'));
  lead.append(elem('p',null,rec.framework));
  lead.append(elem('strong',null,'Δεδομένα που χρειάζονται αξιολόγηση'));
  lead.append(elem('p',null,rec.verify));
  const caution=elem('div','clinical-caution');
  caution.append(elem('strong',null,'Τι δεν μπορεί να συμπεράνει ο Mentor'));
  caution.append(elem('p',null,rec.caution));
  lead.append(caution);article.append(lead);
  const cite=elem('div','clinical-citations');
  cite.append(elem('small',null,'Επίσημοι κόμβοι κατευθυντήριων οδηγιών — θεματικές παραπομπές, ΟΧΙ έλεγχος του κάθε ισχυρισμού:'));
  for(const id of rec.source_ids){
   const s=src(id);
   if(!s)continue;
   const a=elem('a',null,s.title+' ('+s.year+')');
   a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';
   cite.append(a);
  }
  article.append(cite);
  article.append(elem('p','muted small','Εκκρεμεί ανεξάρτητη κλινική επιμέλεια · χρήση για αναζήτηση και μελέτη, όχι εξατομικευμένη ιατρική καθοδήγηση.'));
  return article;
 }
 function show(text=query.value){
  if(!ready)return;
  const q=String(text??'').trim().slice(0,260),where=specialty.value;
  const cards=searchClinical(library,{query:q,specialty:where,limit:8});
  results.replaceChildren();
  cards.forEach(rec=>results.append(renderItem(rec)));
  if(!cards.length){
   const empty=elem('div','clinical-empty');
   empty.append(elem('strong',null,'Δεν βρέθηκε κατάλληλη καταχώριση.'));
   empty.append(elem('p',null,'Δεν έχω ελεγμένη απάντηση σε αυτή την εξειδικευμένη απορία. Μην υποθέτεις ότι η βιβλιοθήκη καλύπτει όλη την ιατρική. Αναζήτησε στις παρακάτω πρωτογενείς πηγές ή συμβουλεύσου τον ειδικό.'));
   for(const s of fallbackSources(sources)){
    const a=elem('a',null,s.title);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';empty.append(a);
   }
   results.append(empty);
  }
  tell('Εμφανίζονται '+cards.length+' από '+library.records.length+
   ' εκπαιδευτικά πλαίσια · αναφορά για επαγγελματική μελέτη, όχι εξατομικευμένη διάγνωση.');
 }
 try{
  [sources,library]=await Promise.all([
   load('./mentor/clinical-desk/sources.json'),
   load('./mentor/clinical-desk/reference-questions.json')
  ]);
  validateClinicalDesk({sources,library});
  ready=true;
  specialty.replaceChildren();
  const all=elem('option',null,'Όλες οι ειδικότητες');all.value='all';specialty.append(all);
  for(const sp of library.specialties){
   const opt=elem('option',null,sp.label);opt.value=sp.id;specialty.append(opt);
  }
  count.textContent=library.specialties.length+' ειδικότητες · '+
   library.records.length+' ερωτήσεις αναφοράς · '+sources.sources.length+
   ' επίσημοι επιστημονικοί κόμβοι · 0 κλινικά εγκεκριμένες απαντήσεις';
  sourcesBox.replaceChildren();
  for(const s of sources.sources){
   const row=elem('div','clinical-source-row');
   const link=elem('a',null,s.title+' ('+s.year+')');
   link.href=s.url;link.rel='noopener noreferrer';link.target='_blank';
   row.append(link,elem('small','muted',s.publisher+' · σύνδεσμος χωρίς αντιγραφή πνευματικά προστατευμένων οδηγιών'));
   sourcesBox.append(row);
  }
  query.addEventListener('input',()=>show());
  specialty.addEventListener('change',()=>show());
  show();
  return Object.freeze({
   ready:true,records:library.records.length,specialties:library.specialties.length,sources:sources.sources.length,
   search(text){
    query.value=String(text??'').slice(0,260);specialty.value='all';show();
   },
   lookup(question){return lookupClinical({sources,library,question});}
  });
 }catch(error){
  query.disabled=true;specialty.disabled=true;
  results.replaceChildren();
  tell('Η κλινική βιβλιογραφική βιβλιοθήκη δεν φορτώθηκε: '+String(error?.message||error),true);
  return Object.freeze({ready:false,records:0,specialties:0,sources:0,search:()=>{},lookup:()=>null});
 }
}
