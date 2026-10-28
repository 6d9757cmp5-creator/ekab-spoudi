/**
 * Independent MENTOR OS multi-patient and equipment lab UI.
 * The activities are schematic, not medically approved simulations.
 */
import {MCI_ACTIVITIES,EQUIPMENT_ACTIVITIES,getActivity} from './core/activities.mjs';
import {newActivitySession,currentActivityStage,performActivity,activityFeedback,summarizeActivities} from './core/activity-engine.mjs';
import {openActivityDb,createActivityStore,createVolatileActivityStore} from './core/activity-store.mjs';
const $=id=>document.getElementById(id);
const make=(name,cls,text)=>{
 const el=document.createElement(name);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const KINDS=['mci','equipment'];
export async function mountActivities({scope,notify,onChange=()=>{}}){
 if(!scope)throw new Error('missing-mentor-scope');
 let store;
 try{store=createActivityStore(await openActivityDb());}
 catch{store=createVolatileActivityStore();}
 const sessions={mci:await store.active(scope,'mci'),equipment:await store.active(scope,'equipment')};
 const busy={mci:false,equipment:false};
 const targets={
  mci:{list:'mci-picker',title:'mci-title',description:'mci-description',count:'mci-count',
   stage:'mci-stage',stageTitle:'mci-stage-title',question:'mci-question',actions:'mci-actions',
   feedback:'mci-feedback',done:'mci-done'},
  equipment:{list:'equipment-picker',title:'equipment-title',description:'equipment-description',
   count:'equipment-count',stage:'equipment-stage',stageTitle:'equipment-stage-title',
   question:'equipment-question',actions:'equipment-actions',feedback:'equipment-feedback',
   done:'equipment-done'}
 };
 function renderList(kind){
  const t=targets[kind],list=$(t.list),items=kind==='mci'?MCI_ACTIVITIES:EQUIPMENT_ACTIVITIES;
  list.replaceChildren();
  for(const item of items){
   const button=make('button','case-option');
   button.type='button';
   button.dataset.active=String(sessions[kind]?.activity_id===item.id);
   button.setAttribute('aria-pressed',button.dataset.active);
   button.append(make('span','case-icon',item.icon));
   const label=make('span');
   label.append(make('strong',null,item.title),make('small',null,item.description));
   button.append(label);
   button.addEventListener('click',()=>void start(kind,item.id));
   list.append(button);
  }
 }
 function renderSubjects(kind,session,def){
  if(kind==='mci'){
   const grid=$('mci-people');grid.replaceChildren();
   if(!session)return;
   const observed=new Set(session.events.map(e=>e.mark).filter(Boolean));
   for(const patient of def.people){
    const card=make('div','patient-card');
    const head=make('div','patient-heading');
    head.append(make('strong',null,patient.name),
     make('span',observed.has(patient.id)?'patient-tag noted':'patient-tag',
      observed.has(patient.id)?'Καταγράφηκε':'Αναμονή καταγραφής'));
    card.append(head,make('p',null,patient.observation));
    grid.append(card);
   }
  }else{
   const visual=$('equipment-visual');
   visual.replaceChildren();
   visual.hidden=!session;
   if(!session)return;
   visual.append(make('span','device-symbol',def.icon),
    make('strong','device-title',def.title),
    make('small','device-subtitle','Εκπαιδευτική σχηματική κάρτα · όχι προσομοιωτής πραγματικής συσκευής'));
  }
 }
 function render(kind){
  const t=targets[kind],session=sessions[kind],def=session?getActivity(session.activity_id):null;
  renderList(kind);
  $(t.title).textContent=def?def.title:kind==='mci'?'Επίλεξε συμβάν':'Επίλεξε συσκευή';
  $(t.description).textContent=def?def.description:kind==='mci'?
   'Επίλεξε ένα συνθετικό συμβάν για καταμέτρηση και αναφορά εμπλεκομένων.':
   'Επίλεξε κάρτα εξοπλισμού για εκπαιδευτική αναγνώριση.';
  $(t.count).textContent=session?session.stage_index+' / '+def.stages.length:'0 / '+(kind==='mci'?4:3);
  $(t.stage).hidden=!session||session.finished;
  $(t.done).hidden=!session||!session.finished;
  renderSubjects(kind,session,def);
  const feedback=session?activityFeedback(session):null;
  $(t.feedback).hidden=!feedback||session.finished;
  if(feedback){
   $(t.feedback).dataset.result=feedback.result;
   $(t.feedback).textContent=(feedback.result==='review'?'Για επανάληψη: ':'Εκπαιδευτική παρατήρηση: ')+feedback.text;
  }
  if(!session||session.finished)return;
  const stage=currentActivityStage(session);
  $(t.stageTitle).textContent=stage.title;
  $(t.question).textContent=stage.prompt;
  const actions=$(t.actions);actions.replaceChildren();
  for(const [i,action] of stage.actions.entries()){
   const button=make('button','choice');
   button.type='button';
   if(action.mark&&session.marks.includes(action.mark)){
    button.disabled=true;
    button.setAttribute('aria-label',action.label+' — ήδη καταγράφηκε');
   }
   button.append(make('span','num',String(i+1)),make('span',null,action.label));
   if(button.disabled)button.append(make('span','marked-tag','✓'));
   button.addEventListener('click',()=>void choose(kind,action.id));
   actions.append(button);
  }
 }
 async function start(kind,id){
  if(busy[kind])return;
  if(getActivity(id)?.kind!==kind){notify('Μη έγκυρη εκπαιδευτική δραστηριότητα.',true);return;}
  busy[kind]=true;
  try{
   const session=newActivitySession(id,{sessionId:crypto.randomUUID(),at:new Date().toISOString()});
   sessions[kind]=await store.save(scope,session);
   render(kind);
   notify(store.persistent?'Η νέα εκπαιδευτική δραστηριότητα αποθηκεύτηκε τοπικά.':'Η δραστηριότητα είναι προσωρινή (χωρίς αποθήκευση).');
   await onChange();
  }catch(e){notify('Δεν άνοιξε το εργαστήριο: '+e.message,true);}
  finally{busy[kind]=false;}
 }
 async function choose(kind,actionId){
  if(busy[kind]||!sessions[kind]||sessions[kind].finished)return;
  busy[kind]=true;
  for(const button of $(targets[kind].actions).querySelectorAll('button'))button.disabled=true;
  try{
   const next=performActivity(sessions[kind],actionId,{at:new Date().toISOString()});
   sessions[kind]=await store.save(scope,next);
   render(kind);
   if(next.finished)notify('Ολοκληρώθηκε εκπαιδευτική άσκηση Mentor. Οι παλιοί βαθμοί δεν άλλαξαν.');
   await onChange();
  }catch(e){notify('Δεν καταγράφηκε η επιλογή: '+e.message,true);render(kind);}
  finally{busy[kind]=false;}
 }
 for(const kind of KINDS){
  const el=$(kind+'-restart');
  el?.addEventListener('click',()=>{const active=sessions[kind];if(active)void start(kind,active.activity_id);});
  render(kind);
 }
 return Object.freeze({
  persistent:store.persistent,
  async all(){return store.list(scope);},
  async summary(){return summarizeActivities(await store.list(scope));},
  async erase(){
   await store.erase(scope);
   for(const kind of KINDS){sessions[kind]=null;render(kind);}
  }
 });
}
