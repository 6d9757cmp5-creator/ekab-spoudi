/**
 * Shared visual learning surface for EKAB Spoudi (home + SAEK/EOPPEP hubs).
 * Local read-only progress -> deterministic educational recommendation.
 * Reuses legacy engines and the SAME Mentor Protocol Lab. No AI/cloud calls.
 * This module NEVER writes existing learning/grade/notes keys.
 */
import {analyseLearning,choosePrimary} from './atla/learning/next-step.mjs';
const page=location.pathname.split('/').pop()||'index.html';
const isHome=page==='index.html',isSaek=page==='saek.html',isEop=page==='eoppep.html';
if(isHome||isSaek||isEop){
 const main=document.querySelector('main');
 const anchor=main?.querySelector(isHome?'.home-tiles':'.hub-actions');
 if(main&&anchor){
  const e=(tag,className='',label='')=>{
   const node=document.createElement(tag);if(className)node.className=className;
   if(label)node.textContent=label;return node;
  };
  const number=v=>String(Math.max(0,Math.trunc(v||0))).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const validJSON=(key)=>{
   try{const raw=localStorage.getItem(key);if(!raw||raw.length>2_000_000)return {};const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}catch{return {}}
  };
  function snapshot(){
   const keys=[];
   try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&localStorage.getItem(key)==='1'&&key.startsWith('ekab.saek.read.v1.'))keys.push(key);}}catch{}
   const sae=validJSON('ekab.saek.exams.v1');
   return analyseLearning({
    eopRecords:validJSON('ekab-eoppep-official-v15'),
    saekReadKeys:keys,
    saekHistory:sae.history||{},
    resume:validJSON('ekab.study.resume.v1'),
    scheduler:window.EkabStudyScheduler||null
   });
  }
  const section=e('section','ekab-next'+(isHome?'':' en-compact'));
  section.setAttribute('aria-label','Προσωπική εκπαιδευτική διαδρομή ATLA');
  section.setAttribute('data-learning-surface','1');
  main.insertBefore(section,anchor);
  let chosen=isHome?'auto':isSaek?'saek':'eoppep';
  function makeLink(href,label,cls){
   const node=e('a',cls,label);
   node.href=new URL(href,new URL('./',import.meta.url)).href;
   return node;
  }
  function metric(value,label){
   const card=e('div','en-indicator');
   card.append(e('b','',String(value)),e('span','',label));
   return card;
  }
  function draw(){
   const data=snapshot();
   const pick=choosePrimary(data,chosen);
   const goal=chosen==='auto'?pick.goal:chosen;
   const eop=goal==='eoppep',topic=eop?'eoppep':'saek';
   const stats=eop?data.eoppep:data.saek;
   const reason=eop?
    (stats.due?number(stats.due)+' ερωτήσεις έχουν προγραμματισμένη επανάληψη από το υπάρχον ιστορικό. Ξεκίνα από την πρώτη.':
    (stats.attempted?'Υπάρχουν '+number(stats.attempted)+' ερωτήσεις με καταγεγραμμένη εξάσκηση. Δεν εντοπίστηκε ληξιπρόθεσμη επανάληψη από τον διαθέσιμο μηχανισμό.':'Δεν υπάρχει ακόμη καταγεγραμμένη εξάσκηση ΕΟΠΠΕΠ στη συγκεκριμένη συσκευή. Ξεκίνα από τη θεωρία.')):
    (stats.examMistakes?number(stats.examMistakes)+' ερωτήσεις ΣΑΕΚ έχουν ιστορικό λανθασμένης προσπάθειας. Η πρόταση δεν υποθέτει ότι παραμένουν ανεπίλυτες.':
     (stats.read?number(stats.read)+' από τα 247 εκπαιδευτικά κεφάλαια έχουν σημειωθεί ως αναγνωσμένα. Συνέχισε το επόμενο κεφάλαιο.':'Δεν υπάρχουν καταγεγραμμένα αναγνωσμένα κεφάλαια σε αυτή τη συσκευή. Επίλεξε μάθημα ΣΑΕΚ.'));
   const primary=chosen==='auto'?pick:choosePrimary(data,chosen);
   const heading=e('div','en-copy');
   heading.append(e('span','en-overline',isHome?'ATLA · ΠΡΟΣΩΠΙΚΗ ΔΙΑΔΡΟΜΗ':'ATLA · ΣΥΝΔΕΔΕΜΕΝΗ ΕΚΠΑΙΔΕΥΣΗ'));
   heading.append(e('h2','en-title',eop?'Διάβασε ό,τι χρειάζεται επανάληψη.':'Συνέχισε χωρίς να χάνεις τη σειρά.'));
   heading.append(e('p','en-subtitle',eop?'Ο μηχανισμός εντοπίζει τις πραγματικά προγραμματισμένες επαναλήψεις ΕΟΠΠΕΠ.':'Η επόμενη κίνηση συνδέεται με την πρόοδο ΣΑΕΚ και την τελευταία ενότητα μελέτης.'));
   if(isHome){
    const row=e('div','en-selector'),label=e('label','','Εκπαιδευτικός στόχος');
    label.htmlFor='ekab-next-goal';
    const select=e('select');select.id='ekab-next-goal';
    for(const [value,caption] of [['auto','Αυτόματη πρόταση'],['saek','ΣΑΕΚ'],['eoppep','ΕΟΠΠΕΠ']]){
     const o=e('option','',caption);o.value=value;select.append(o);
    }
    select.value=chosen;
    select.addEventListener('change',event=>{chosen=event.target.value;draw();});
    row.append(label,select);heading.append(row);
   }
   const links=e('div','en-actions');
   const primaryLink=makeLink(primary.href,primary.label+' ↗','en-primary');
   links.append(primaryLink);
   const ask=e('button','en-secondary','Ρώτησε την ATLA →');
   ask.type='button';ask.dataset.atlaOpen='true';
   links.append(ask);
   heading.append(links);
   const indicators=e('div','en-indicators');
   if(eop){indicators.append(metric(number(stats.studied)+' / 314','Μελετημένες με τη μέθοδο επανάληψης'),metric(number(stats.due),'Προγραμματισμένες για επανάληψη'));}
   else{indicators.append(metric(number(stats.read)+' / 247','Κεφάλαια με ολοκληρωμένη ανάγνωση'),metric(number(stats.examMistakes),'Ερωτήσεις με ιστορικό λάθους'));}
   const upper=e('div','en-upper');upper.append(heading,indicators);
   const bottom=e('div','en-bottom');
   const why=e('p','en-reason');why.append(e('strong','','Γιατί αυτή η πρόταση; '),document.createTextNode(reason));
   const steps=e('div','en-steps');
   for(const [i,label] of ['01 · Μάθηση','02 · Εξάσκηση','03 · Ανασκόπηση'].entries()){
    if(i)steps.append(e('span','en-step-arrow','›'));
    steps.append(e('span','en-step'+((i===0&&!stats.due||i===1&&stats.due)?' current':''),label));
   }
   bottom.append(why,steps);
   const panel=e('div','en-surface');panel.append(upper,bottom);
   section.replaceChildren(panel,e('p','en-disclaimer','Τοπική, αυτοματοποιημένη εκπαιδευτική σύσταση. Δεν αλλάζει βαθμολογίες, δεν εξετάζει σημειώσεις και δεν αποστέλλει στοιχεία στον MENTOR AI.'));
  }
  let refreshQueued=false;
  function refresh(){
   if(refreshQueued)return;refreshQueued=true;
   queueMicrotask(()=>{refreshQueued=false;draw()});
  }
  ['pageshow','focus','ekab:progress-changed','ekab:cloud-applied','ekab:activity-updated'].forEach(type=>window.addEventListener(type,refresh));
  window.addEventListener('storage',refresh);
  draw();
 }
}
