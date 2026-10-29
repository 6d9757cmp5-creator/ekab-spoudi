/**
 * Optional read-only source-linked study library panel for MENTOR OS.
 * No LLM, storage, tracking, patient diagnosis or generated medical content.
 */
import {KNOWLEDGE_PACK,KNOWLEDGE_DOMAINS,KNOWLEDGE_SOURCES} from './foundation-pack.mjs';
import {assertKnowledgePack,searchKnowledge} from './search.mjs';
const $=id=>document.getElementById(id);
function el(tag,cls,text){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);
 return n;
}
function reference(id){
 const source=KNOWLEDGE_SOURCES[id];
 const link=el('a',null,source.title+' · '+source.publisher);
 link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
 return link;
}
export function mountKnowledgePanel(){
 assertKnowledgePack();
 const input=$('knowledge-search'),group=$('knowledge-domain');
 const rows=$('knowledge-results'),count=$('knowledge-count');
 const groups=Object.entries(KNOWLEDGE_DOMAINS);
 for(const [id,name]of groups){
  const o=el('option',null,name);o.value=id;group.append(o);
 }
 function allCards(){
  const term=input.value.trim();
  if(term)return searchKnowledge(term,{domain:group.value,limit:12});
  return KNOWLEDGE_PACK.knowledge_cards.filter(c=>group.value==='all'||c.domain===group.value);
 }
 function render(){
  const cards=allCards();
  rows.replaceChildren();
  count.textContent=cards.length+' εκπαιδευτικές κάρτες · '+Object.keys(KNOWLEDGE_SOURCES).length+
   ' επαληθευμένες συνδεδεμένες βιβλιογραφικές πηγές · 0 κλινικά εγκεκριμένες κάρτες';
  for(const card of cards){
   const details=el('details','knowledge-card');
   const summary=el('summary',null,card.title);
   const category=el('small','knowledge-category',KNOWLEDGE_DOMAINS[card.domain]);
   const content=el('div','knowledge-card-body');
   content.append(
    el('p',null,card.explanation),
    el('strong',null,'Ερώτηση ανάκλησης'),
    el('p',null,card.recall_question)
   );
   const answer=el('details','knowledge-recall');
   answer.append(el('summary',null,'Δες σημεία ελέγχου'),el('p',null,card.recall_guide));
   content.append(answer);
   const refs=el('div','knowledge-references');
   refs.append(el('strong',null,'Πηγές για διασταύρωση'));
   for(const id of card.source_ids)refs.append(reference(id));
   content.append(refs,el('p','muted small','Κατάσταση: εκπαιδευτικό προσχέδιο · ανεξάρτητος κλινικός έλεγχος εκκρεμεί.'));
   details.append(category,summary,content);
   rows.append(details);
  }
  if(!cards.length)rows.append(el('p','muted','Δεν βρέθηκε κατάλληλη κάρτα. Δοκίμασε διαφορετικό ελληνικό όρο, π.χ. ABCDE, ανατομία, διαλογή.'));
 }
 const form=$('knowledge-form');
 form.addEventListener('submit',e=>{e.preventDefault();render();});
 input.addEventListener('input',render);
 group.addEventListener('change',render);
 $('knowledge-clear').addEventListener('click',()=>{input.value='';group.value='all';render();input.focus();});
 render();
 return Object.freeze({render,count:KNOWLEDGE_PACK.knowledge_cards.length});
}
