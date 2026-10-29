/**
 * MENTOR OS knowledge companion — local source-grounded Greek learning cards.
 * No AI calls, no official grades, no storage, no patient info, no medical approval.
 */
import {validateKnowledge,searchKnowledge,choosePracticeCard} from './knowledge-engine.mjs';
const $=id=>document.getElementById(id);
function el(tag,cls,text){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
}
async function json(url){
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('Δεν φορτώθηκε το αρχείο '+url+' (HTTP '+response.status+')');
 return response.json();
}
export async function mountKnowledgeLibrary(){
 const status=$('knowledge-status'),count=$('knowledge-count'),terms=$('knowledge-query');
 const topic=$('knowledge-topic'),results=$('knowledge-results'),refs=$('knowledge-sources');
 const quiz=$('knowledge-practice'),next=$('knowledge-next');
 let pack=null,catalog=null,offset=0,active='all';
 const statusText=(text,error=false)=>{
  status.textContent=text;status.dataset.error=error?'true':'false';
 };
 function reference(sourceId){
  const source=catalog.sources.find(s=>s.id===sourceId);
  const a=el('a','knowledge-reference',source.title+' ('+source.year+')');
  a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
  a.title=source.publisher+' · '+source.rights;
  return a;
 }
 function addCard(card){
  const item=el('article','knowledge-card');
  item.dataset.cardId=card.id;
  item.append(el('p','eyebrow',pack.topics.find(x=>x.id===card.topic)?.label||'Εκπαιδευτικό θέμα'));
  item.append(el('h3',null,card.title));
  item.append(el('p','knowledge-lesson',card.lesson));
  const question=el('p','knowledge-question','Ερώτηση αυτοελέγχου: '+card.question);
  item.append(question);
  const answer=el('div','knowledge-answer',card.answer);answer.hidden=true;
  const btn=el('button','action secondary knowledge-reveal','Δείξε την απάντηση');
  btn.type='button';btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',()=>{
   answer.hidden=!answer.hidden;
   btn.setAttribute('aria-expanded',String(!answer.hidden));
   btn.textContent=answer.hidden?'Δείξε την απάντηση':'Κρύψε την απάντηση';
  });
  item.append(btn,answer);
  const sources=el('div','knowledge-references');
  sources.append(el('small',null,'Ενδεικτικές βιβλιογραφικές πηγές:'));
  for(const id of card.source_ids)sources.append(reference(id));
  item.append(sources);
  item.append(el('p','muted small','Πρωτότυπη ελληνική εκπαιδευτική κάρτα · σε αναμονή ανεξάρτητης επιστημονικής επιμέλειας · όχι επίσημος βαθμός.'));
  return item;
 }
 function show(){
  const q=terms.value.trim().slice(0,150);
  const cards=searchKnowledge(pack,{query:q,topic:topic.value,limit:12});
  results.replaceChildren();
  cards.forEach(c=>results.append(addCard(c)));
  if(!cards.length)results.append(el('p','muted','Δεν βρέθηκε κάρτα. Δοκίμασε απλούστερο ελληνικό όρο ή άλλη θεματική.'));
  statusText('Εμφανίζονται '+cards.length+' από '+pack.cards.length+' κάρτες · χωρίς αλλαγή στην πρόοδο ΣΑΕΚ/ΕΟΠΠΕΠ.');
 }
 function practice(){
  active=topic.value;const card=choosePracticeCard(pack,{topic:active,offset});
  quiz.replaceChildren();
  if(!card){quiz.append(el('p','muted','Καμία κάρτα για αυτή τη θεματική.'));return;}
  quiz.append(el('p','eyebrow','Αυτοέλεγχος · '+(pack.topics.find(t=>t.id===card.topic)?.label||'')));
  quiz.append(el('h3',null,card.question));
  const button=el('button','action secondary','Αποκάλυψε τη λύση');
  const answer=el('p','knowledge-answer',card.answer);answer.hidden=true;
  button.type='button';
  button.addEventListener('click',()=>{
   answer.hidden=!answer.hidden;
   button.textContent=answer.hidden?'Αποκάλυψε τη λύση':'Κρύψε τη λύση';
  });
  quiz.append(button,answer);
  quiz.append(el('p','small muted','Η κάρτα προέρχεται από προσχέδιο γνώσεων και δεν αξιολογεί κλινική ικανότητα.'));
 }
 try{
  [catalog,pack]=await Promise.all([
   json('./mentor/knowledge/sources.json'),
   json('./mentor/knowledge/greek-cards.json')
  ]);
  validateKnowledge({catalog,pack});
  topic.replaceChildren();
  const all=el('option',null,'Όλες οι θεματικές');all.value='all';topic.append(all);
  for(const entry of pack.topics){
   const opt=el('option',null,entry.emoji+' '+entry.label);
   opt.value=entry.id;topic.append(opt);
  }
  count.textContent=pack.cards.length+' ελληνικές κάρτες • '+catalog.sources.length+' τεκμηριωμένες βιβλιογραφικές πηγές • 0 ιατρικά εγκεκριμένες κάρτες';
  refs.replaceChildren();
  for(const source of catalog.sources){
   const row=el('div','knowledge-source-row');
   const a=el('a',null,source.title+' ('+source.year+')');
   a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
   row.append(a,el('small','muted',source.publisher+' · '+source.rights));
   refs.append(row);
  }
  topic.addEventListener('change',()=>{offset=0;show();practice();});
  terms.addEventListener('input',show);
  next.addEventListener('click',()=>{offset++;practice();});
  show();practice();
  return Object.freeze({
   ready:true,cardCount:pack.cards.length,sourceCount:catalog.sources.length,
   search(query){
    terms.value=String(query??'').slice(0,150);
    topic.value='all';offset=0;show();practice();
   }
  });
 }catch(e){
  terms.disabled=true;topic.disabled=true;next.disabled=true;
  results.replaceChildren();
  statusText('Η εκπαιδευτική βιβλιοθήκη δεν φορτώθηκε: '+(e?.message||String(e)),true);
  return Object.freeze({ready:false,cardCount:0,sourceCount:0,search:()=>{}});
 }
}
