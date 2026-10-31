/**
 * MENTOR OS — static read-only atlas browsing.
 * Never loads patient data, stores progress, calls AI, invokes diagnosis or grades.
 */
import {CATEGORIES,SCENARIOS,REFERENCE_INDEX,ROLE_TRACKS,SKILLS,queryScenarios,verifyAtlas} from '../scenario-atlas/catalog.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{
 const item=document.createElement(tag);
 if(text!==undefined)item.textContent=text;
 if(cls)item.className=cls;
 return item;
};
const levelLabels={foundation:'Βασικό',intermediate:'Μεσαίο',advanced:'Προχωρημένο'};
const populationLabels={adult:'Ενήλικας',child:'Παιδί',infant:'Βρέφος',neonate:'Νεογνό',pregnant:'Κύηση',older:'Ηλικιωμένος',multi:'Πολλαπλοί εμπλεκόμενοι',all:'Διάφοροι πληθυσμοί'};
const environmentLabels={home:'Οικία',urban:'Αστικό',road:'Οδικό',public:'Δημόσιος χώρος',industrial:'Βιομηχανικό',disaster:'Καταστροφή',transport:'Διακομιδή',marine:'Θάλασσα',mountain:'Ορεινό',agricultural:'Αγροτικό',ambulance:'Ασθενοφόρο',remote:'Απομακρυσμένο',care:'Δομή φροντίδας'};
let visible=40;
function createScenario(item){
 const article=el('article',undefined,'case');
 const details=el('details'),summary=el('summary');
 const row=el('div',undefined,'case-head');
 row.append(el('span',item.id,'case-id'),el('strong',item.title,'case-title'));
 const tags=el('div',undefined,'case-tags');
 for(const name of [item.category_title,levelLabels[item.difficulty],populationLabels[item.population],environmentLabels[item.environment]]){
  if(name)tags.append(el('span',name));
 }
 summary.append(row,tags);
 const content=el('div',undefined,'case-body');
 content.append(el('p','Εκπαιδευτικό περίγραμμα · όχι ολοκληρωμένη κλινική προσομοίωση.','case-warning'));
 content.append(el('h3','Στόχοι μελέτης'));
 const skills=el('ul');
 for(const id of item.skills)skills.append(el('li',SKILLS[id]));
 content.append(skills,el('h3','Ερωτήσεις αναστοχασμού'));
 const questions=el('ol');
 for(const q of item.reflection_prompts)questions.append(el('li',q));
 content.append(questions);
 content.append(el('h3','Επιστημονική και επιχειρησιακή κατάσταση'));
 content.append(el('p','Κλινικές ενέργειες και δοσολογίες: ανενεργές. Διαλογή και φυσιολογικές μεταβολές: ανενεργές. Επιστημονικός έλεγχος: εκκρεμεί. Νομική επαλήθευση αρμοδιοτήτων: εκκρεμεί.'));
 content.append(el('p','Οι τρεις εκπαιδευτικές οπτικές (ΕΚΑΒ, paramedic άλλων χωρών, ιατρός) δεν συνεπάγονται ίδιες επαγγελματικές αρμοδιότητες.','case-roles'));
 if(item.reference_ids.length){
  content.append(el('h3','Πηγές για περαιτέρω τεκμηρίωση'));
  const list=el('ul');
  for(const id of item.reference_ids){
   const source=REFERENCE_INDEX[id]; if(!source)continue;
   const li=el('li'),link=el('a',source.title);
   link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
   li.append(link,el('span',' — '+source.scope));list.append(li);
  }
  content.append(list);
 }
 details.append(summary,content);
 article.append(details);
 return article;
}
function render(){
 const args={
  search:$('atlas-search').value,
  category:$('atlas-category').value,
  difficulty:$('atlas-level').value,
  population:$('atlas-population').value,
  limit:visible
 };
 const {items,total}=queryScenarios(args);
 $('atlas-results').replaceChildren(...items.map(createScenario));
 if(!items.length)$('atlas-results').append(el('p','Δεν βρέθηκαν σενάρια. Άλλαξε φίλτρα ή όρο αναζήτησης.'));
 $('atlas-report').textContent='Εμφανίζονται '+items.length+' από '+total+' περιγράμματα σεναρίων — όλα υπό κλινικό έλεγχο.';
 $('atlas-more').hidden=items.length>=total;
}
function reset(){visible=40;render();}
const info=verifyAtlas();
$('atlas-categories').textContent=String(info.categories);
$('atlas-scenarios').textContent=String(info.scenarios);
$('atlas-reviewed').textContent=String(info.independently_clinically_approved);
for(const c of CATEGORIES){
 const option=el('option',c.title+' · '+c.topic_count);option.value=c.id;
 $('atlas-category').append(option);
}
for(const input of ['atlas-search','atlas-category','atlas-level','atlas-population']){
 $(input).addEventListener(input==='atlas-search'?'input':'change',reset);
}
$('atlas-form').addEventListener('submit',e=>e.preventDefault());
$('atlas-more').addEventListener('click',()=>{visible=Math.min(SCENARIOS.length,visible+40);render();});
for(const [id,ref] of Object.entries(REFERENCE_INDEX)){
 const article=el('article');const link=el('a',ref.title);link.href=ref.url;link.target='_blank';link.rel='noopener noreferrer';
 article.append(link,el('p',ref.scope+' · Ευρεία βιβλιογραφία: δεν ισοδυναμεί με έγκριση ανά σενάριο.'));
 $('atlas-refs').append(article);
}
const parameters=new URLSearchParams(location.search);
if(parameters.has('q'))$('atlas-search').value=(parameters.get('q')||'').slice(0,120);
render();
