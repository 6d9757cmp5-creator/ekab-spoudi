/* Standalone MENTOR OS Foundation demo.
 * No calls to AI graders; no legacy writes; no medical intervention logic.
 */
import {CASES,COMPETENCIES,getCase} from './mentor/core/scenarios.mjs';
import {newSession,currentPhase,perform,feedbackFor} from './mentor/core/engine.mjs';
import {openMentorDb,createMentorStore,createVolatileMentorStore} from './mentor/core/store.mjs';
import {resolveMentorScope} from './mentor/core/identity.mjs';
import {readLegacySnapshot} from './mentor/core/legacy-readonly.mjs';
import {readStudyPreferences,saveStudyPreferences,planForGoals} from './mentor/core/study-goals.mjs';
import {coachResponse,interpretQuestion,chooseFocus} from './mentor/core/guided-coach.mjs';
import {mountActivities} from './mentor/activities-ui.mjs';
import {supportsSpeech,listGreekVoices,speakGreek,stopGreek} from './mentor-voice.mjs';

const $=id=>document.getElementById(id);
const make=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
};
const state={scope:null,store:null,activities:null,session:null,busy:false,initialized:false};
function notify(text,error=false){
  const status=$('status');status.textContent=text;status.classList.toggle('is-error',error);
}
function switchTab(target,focus=false){
  for(const tab of document.querySelectorAll('[data-tab]')){
    const isCurrent=tab.dataset.tab===target;
    tab.setAttribute('aria-selected',String(isCurrent));
    tab.tabIndex=isCurrent?0:-1;
    if(focus&&isCurrent)tab.focus();
    $('panel-'+tab.dataset.tab).hidden=!isCurrent;
  }
  if(target==='memory')void renderMemory();
  if(target==='route')void renderPlan();
}
function wireModes(){
  for(const button of document.querySelectorAll('[data-mode]')){
    button.addEventListener('click',()=>{
      const mode=button.dataset.mode;
      if(!['ekab','mci','equipment'].includes(mode))return;
      for(const peer of document.querySelectorAll('[data-mode]'))
        peer.setAttribute('aria-pressed',String(peer.dataset.mode===mode));
      for(const kind of ['ekab','mci','equipment'])
        $('module-'+kind).hidden=kind!==mode;
    });
  }
}
function wireTabs(){
  const tabs=[...document.querySelectorAll('[data-tab]')];
  for(let i=0;i<tabs.length;i++){
    const tab=tabs[i];
    tab.addEventListener('click',()=>switchTab(tab.dataset.tab));
    tab.addEventListener('keydown',ev=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
      ev.preventDefault();
      const index=ev.key==='Home'?0:ev.key==='End'?tabs.length-1:(i+(ev.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      switchTab(tabs[index].dataset.tab,true);
    });
  }
}
function renderCards(){
  const target=$('case-list');target.replaceChildren();
  for(const item of CASES){
    const button=make('button','case-option');
    button.type='button';
    button.dataset.active=String(state.session?.case_id===item.id);
    button.setAttribute('aria-pressed',button.dataset.active);
    const icon=make('span','case-icon',item.icon);
    icon.setAttribute('aria-hidden','true');
    const text=make('span');
    text.append(make('strong',null,item.title),make('small',null,item.subtitle));
    button.append(icon,text);
    button.addEventListener('click',()=>{void startCase(item.id)});
    target.append(button);
  }
}
async function startCase(caseId){
  if(state.busy||!state.store)return;
  state.busy=true;
  try{
    const session=newSession(caseId,{id:crypto.randomUUID(),at:new Date().toISOString()});
    state.session=await state.store.save(state.scope,session);
    notify(state.store.persistent?'Νέα δοκιμαστική αποστολή αποθηκεύτηκε τοπικά.':'Η λειτουργία αποθήκευσης δεν είναι διαθέσιμη. Η αποστολή υπάρχει μόνο προσωρινά.');
    renderMission();
    void renderMemory();
  }catch(e){notify('Δεν ξεκίνησε η αποστολή: '+e.message,true);}
  finally{state.busy=false;}
}
function renderMission(){
  renderCards();
  const session=state.session;
  if(!session){
    $('case-kicker').textContent='Επέλεξε ένα περιστατικό';
    $('case-title').textContent='Έτοιμος για αποστολή;';
    $('case-context').textContent='Επίλεξε ένα από τα συνθετικά περιστατικά. Η προσομοίωση αφορά οργανωτική σκέψη, όχι θεραπείες.';
    $('step-count').textContent='0 / 4';
    $('phase').hidden=true;$('feedback').hidden=true;$('case-finish').hidden=true;
    return;
  }
  const def=getCase(session.case_id);
  $('case-kicker').textContent='Δοκιμαστικό περιστατικό · '+def.subtitle;
  $('case-title').textContent=def.title;
  $('case-context').textContent=def.description;
  $('step-count').textContent=session.stage_index+' / '+def.phases.length;
  $('case-finish').hidden=!session.finished;
  $('phase').hidden=session.finished;
  const feedback=feedbackFor(session);
  $('feedback').hidden=!feedback || session.finished;
  if(feedback){
    $('feedback').dataset.result=feedback.result;
    $('feedback').textContent=(feedback.result==='review'?'Για επανάληψη: ':'Εκπαιδευτική ανατροφοδότηση: ')+feedback.text;
  }
  if(session.finished)return;
  const phase=currentPhase(session);
  $('phase-name').textContent=phase.title;
  $('phase-question').textContent=phase.prompt;
  const actions=$('phase-actions');actions.replaceChildren();
  for(let i=0;i<phase.actions.length;i++){
    const a=phase.actions[i];
    const btn=make('button','choice');
    btn.type='button';
    btn.append(make('span','num',String(i+1)),make('span',null,a.label));
    btn.addEventListener('click',()=>void choose(a.id));
    actions.append(btn);
  }
}
async function choose(id){
  if(!state.session||state.session.finished||state.busy)return;
  state.busy=true;
  const buttons=[...document.querySelectorAll('#phase-actions button')];
  buttons.forEach(b=>b.disabled=true);
  try{
    const next=perform(state.session,id,{at:new Date().toISOString()});
    state.session=await state.store.save(state.scope,next);
    renderMission();
    if(next.finished)notify('Ολοκληρώθηκε μία εκπαιδευτική αποστολή. Οι επίσημοι βαθμοί δεν άλλαξαν.');
    void renderMemory();
  }catch(e){
    notify('Αδυναμία καταγραφής επιλογής: '+e.message,true);
    buttons.forEach(b=>b.disabled=false);
  }finally{state.busy=false;}
}
async function renderMemory(){
  if(!state.store)return;
  try{
    const overview=await state.store.overview(state.scope);
    $('sessions-count').textContent=String(overview.total_sessions);
    $('completed-count').textContent=String(overview.completed_sessions);
    $('review-count').textContent=String(Object.values(overview.competencies).reduce((n,c)=>n+c.needs_review,0));
    const extra=state.activities?await state.activities.summary():null;
    $('mci-sessions').textContent=String(extra?.mci.total||0);
    $('equipment-sessions').textContent=String(extra?.equipment.total||0);
    $('extra-completed').textContent=String(extra?.completed||0);
    const list=$('competency-list');list.replaceChildren();
    for(const competence of Object.values(overview.competencies)){
      const row=make('div','skill');
      const left=make('div');
      left.append(make('strong',null,competence.label),
        make('small',null,competence.attempts?'Εκπαιδευτική προσπάθεια καταγεγραμμένη':'Δεν υπάρχουν ακόμη δοκιμές'));
      const info=make('div','skill-count',
        competence.practiced+' ολοκληρωμένα βήματα · '+competence.needs_review+' για επανάληψη');
      row.append(left,info);list.append(row);
    }
  }catch(e){notify('Δεν φορτώθηκε η μνήμη Mentor: '+e.message,true);}
}
function currentStudyPreferences(){
  return {
    goals:[...document.querySelectorAll('[data-study-goal]')].filter(c=>c.checked).map(c=>c.dataset.studyGoal),
    minutes:Number($('study-duration').value),
    mode:$('study-path-mode').value
  };
}
function renderPersonalPlan(){
  const output=$('selected-goals-plan');
  output.replaceChildren();
  const plans=planForGoals(currentStudyPreferences());
  if(!plans.length){
    output.append(make('p','muted','Επίλεξε τουλάχιστον έναν στόχο για να δημιουργήσεις το προσωπικό σου πλάνο.'));
    return;
  }
  const allocated=plans.reduce((n,g)=>n+g.total_minutes,0);
  output.append(make('p','muted small','Συνολικά '+allocated+' λεπτά, μοιρασμένα σε '+plans.length+' στόχους. Δεν προστίθεται χρόνος για κάθε στόχο.'));
  for(const goal of plans){
    const card=make('section','study-goal-card');
    card.append(make('h4',null,goal.label+' · '+goal.total_minutes+' λεπτά'));
    for(const task of goal.tasks){
      card.append(make('p','study-task',task.name+' · '+task.minutes+' λεπτά'));
    }
    const link=make('a','study-goal-link','Άνοιγμα ενότητας: '+goal.label);
    link.href=goal.href;
    card.append(link);
    output.append(card);
  }
}
function wireStudyPreferences(){
  const previous=readStudyPreferences(localStorage);
  for(const checkbox of document.querySelectorAll('[data-study-goal]'))
    checkbox.checked=previous.goals.includes(checkbox.dataset.studyGoal);
  $('study-duration').value=String(previous.minutes);
  $('study-path-mode').value=previous.mode;
  const changed=()=>{
    saveStudyPreferences(localStorage,currentStudyPreferences());
    void renderPlan();
  };
  for(const checkbox of document.querySelectorAll('[data-study-goal]'))
    checkbox.addEventListener('change',changed);
  $('study-duration').addEventListener('change',changed);
  $('study-path-mode').addEventListener('change',changed);
}
// Mentor-only scripted tutor: generated from test-session aggregates, never grades user text.
let lastCoachReply='';
function addCoachMessage(role,message){
  const row=make('div','coach-message coach-message-'+role);
  row.append(make('strong',null,role==='assistant'?'MENTOR · Εκπαιδευτική απάντηση':'Ερώτησή μου'));
  row.append(make('p',null,message));
  $('coach-dialogue').append(row);
  // Keep the current-page dialogue bounded; no persistence or network transmission.
  while($('coach-dialogue').childElementCount>12)$('coach-dialogue').firstElementChild.remove();
}
async function coachAsk(intent,topic,userText){
  addCoachMessage('user',userText);
  try{
    const overview=state.store&&state.scope?await state.store.overview(state.scope):null;
    lastCoachReply=coachResponse({intent,topic,overview});
  }catch{
    lastCoachReply='Δεν μπόρεσα να διαβάσω τις δοκιμαστικές καταγραφές Mentor. Η υπάρχουσα πρόοδος δεν άλλαξε.';
  }
  addCoachMessage('assistant',lastCoachReply);
  const greeting=$('mentor-presence-line');
  if(greeting)greeting.textContent=lastCoachReply;
  const visual=$('mentor-avatar');
  if(visual)visual.classList.remove('is-speaking');
}
function wireMentorPresence(){
  const heroForm=$('mentor-hero-form');
  const heroQuestion=$('mentor-hero-question');
  const voiceStatus=$('mentor-voice-status');
  const avatar=$('mentor-avatar');
  const section=$('mentor-presence');
  const speaker=$('mentor-intro-speak');
  const stopper=$('mentor-intro-stop');
  const mic=$('mentor-intro-mic');
  const voiceSelect=$('mentor-voice-select');
  const speed=$('mentor-voice-speed');
  const speedLabel=$('mentor-voice-speed-label');
  const supported=supportsSpeech(window);
  const SpeechRecognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null;
  let speakingGeneration=0;
  speaker.disabled=!supported;
  mic.disabled=typeof SpeechRecognizer!=='function';
  stopper.disabled=!supported&&mic.disabled;
  if(mic.disabled)mic.title='Η αναγνώριση ελληνικής ομιλίας δεν είναι διαθέσιμη σε αυτόν τον browser.';
  function paintSpeaking(value){
    avatar.classList.toggle('is-speaking',value);
    section.classList.toggle('is-speaking',value);
  }
  function paintListening(value){
    section.classList.toggle('is-listening',value);
    mic.setAttribute('aria-pressed',String(value));
  }
  function updateVoices(){
    if(!supported)return;
    const previous=voiceSelect.value;
    voiceSelect.replaceChildren();
    const option=make('option',null,'Αυτόματη ελληνική φωνή');
    option.value='';voiceSelect.append(option);
    for(const voice of listGreekVoices(window)){
      const choice=make('option',null,voice.name+(voice.localService?' · Συσκευή':' · Browser'));
      choice.value=voice.name;voiceSelect.append(choice);
    }
    if([...voiceSelect.options].some(x=>x.value===previous))voiceSelect.value=previous;
  }
  if(supported){
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged',updateVoices);
  }else{
    voiceSelect.disabled=true;
    speed.disabled=true;
  }
  speed.addEventListener('input',()=>{speedLabel.textContent=Number(speed.value).toFixed(2).replace('.',',')+'×';});
  heroForm.addEventListener('submit',event=>{
    event.preventDefault();
    const question=heroQuestion.value.trim().slice(0,300);
    if(!question)return;
    heroQuestion.value='';
    const parsed=interpretQuestion(question);
    voiceStatus.textContent='Απάντηση από τον περιορισμένο εκπαιδευτικό οδηγό · χωρίς εξωτερικό AI.';
    void coachAsk(parsed.intent,parsed.topic,question);
  });
  $('mentor-intro-chat').addEventListener('click',()=>{
    switchTab('route');
    const field=$('coach-question');
    field.scrollIntoView({block:'center',behavior:'auto'});
    field.focus();
  });
  function play(text){
    if(!supported||!text)return;
    const current=++speakingGeneration;
    paintSpeaking(false);
    const started=speakGreek(text,{env:window,voiceName:voiceSelect.value,rate:Number(speed.value),pitch:1,
      onStart:()=>{
        if(current!==speakingGeneration)return;
        paintSpeaking(true);
        voiceStatus.textContent='Ο MENTOR μιλά με την επιλεγμένη ελληνική φωνή της συσκευής.';
      },
      onFinish:()=>{
        if(current!==speakingGeneration)return;
        paintSpeaking(false);
        voiceStatus.textContent='Η ανάγνωση ολοκληρώθηκε.';
      },
      onError:()=>{
        if(current!==speakingGeneration)return;
        paintSpeaking(false);
        voiceStatus.textContent='Η φωνή δεν μπόρεσε να αναπαραχθεί στον browser.';
      }
    });
    if(!started)voiceStatus.textContent='Η φωνητική ανάγνωση δεν είναι διαθέσιμη.';
  }
  function stop(){
    speakingGeneration++;
    stopGreek(window);
    paintSpeaking(false);
    if(recognition){recognition.abort();recognition=null;}
    paintListening(false);
    voiceStatus.textContent='Η ακρόαση και η ομιλία σταμάτησαν.';
  }
  speaker.addEventListener('click',()=>play(lastCoachReply||$('mentor-presence-line').textContent));
  stopper.addEventListener('click',stop);
  mic.addEventListener('click',()=>{
    if(mic.disabled)return;
    if(recognition){recognition.abort();recognition=null;paintListening(false);voiceStatus.textContent='Το μικρόφωνο σταμάτησε.';return;}
    stopGreek(window);speakingGeneration++;paintSpeaking(false);
    const listener=new SpeechRecognizer();
    recognition=listener;
    listener.lang='el-GR';
    listener.continuous=false;
    listener.interimResults=false;
    listener.maxAlternatives=1;
    listener.onstart=()=>{
      if(recognition!==listener)return;
      paintListening(true);
      voiceStatus.textContent='Ακούω μία ερώτηση. Ο browser μπορεί να χρησιμοποιεί υπηρεσία αναγνώρισης ομιλίας.';
    };
    listener.onresult=event=>{
      if(recognition!==listener)return;
      const transcript=String(event.results?.[0]?.[0]?.transcript||'').trim().slice(0,300);
      if(transcript){
        heroQuestion.value=transcript;
        voiceStatus.textContent='Αναγνωρίστηκε η ερώτηση. Έλεγξέ την και πάτησε «Ρώτησε».';
        heroQuestion.focus();
      }
    };
    listener.onerror=event=>{
      if(recognition!==listener)return;
      voiceStatus.textContent=event.error==='not-allowed'?'Δεν δόθηκε άδεια μικροφώνου. Μπορείς να γράψεις την ερώτησή σου.':'Η αναγνώριση φωνής δεν ολοκληρώθηκε. Μπορείς να γράψεις την ερώτηση.';
    };
    listener.onend=()=>{
      if(recognition!==listener)return;
      recognition=null;
      paintListening(false);
    };
    try{listener.start();}catch{
      recognition=null;paintListening(false);
      voiceStatus.textContent='Δεν ήταν δυνατή η εκκίνηση μικροφώνου σε αυτή τη συσκευή.';
    }
  });
  $('coach-speak').addEventListener('click',()=>play(lastCoachReply));
  $('coach-stop').addEventListener('click',stop);
  window.addEventListener('pagehide',stop);
  if(!supported)voiceStatus.textContent='Η φωνή δεν υποστηρίζεται εδώ. Η συνομιλία γραπτώς παραμένει διαθέσιμη.';
}
function wireCoach(){
  const prompt=$('coach-question');
  for(const btn of document.querySelectorAll('[data-coach-intent]')){
    btn.addEventListener('click',()=>{
      const intent=btn.dataset.coachIntent;
      const labels={focus:'Τι να μελετήσω;',progress:'Πώς τα πηγαίνω;',explain:'Εξήγησέ μου μια δεξιότητα',exercise:'Δώσε μου μια μικρή άσκηση'};
      void coachAsk(intent,null,labels[intent]);
    });
  }
  $('coach-form').addEventListener('submit',event=>{
    event.preventDefault();
    const question=prompt.value.trim().slice(0,300);
    if(!question)return;
    prompt.value='';
    const parsed=interpretQuestion(question);
    void coachAsk(parsed.intent,parsed.topic,question);
  });
  const available=supportsSpeech(window);
  $('coach-speak').disabled=!available;
  $('coach-stop').disabled=!available;
  addCoachMessage('assistant','Καλώς ήρθες! Ρώτησέ με τι να μελετήσεις, πώς πηγαίνουν οι δοκιμές Mentor ή ζήτησε μια μικρή άσκηση. Αξιοποιώ μόνο καταγραφές των εκπαιδευτικών αποστολών εδώ.');
}
async function renderPlan(){
  renderPersonalPlan();
  if(!state.store)return;
  try{
    const summary=await state.store.overview(state.scope);
    const minutes=Number($('study-duration').value)||25;
    const focus=summary.suggested_focus;
    const label=focus?COMPETENCIES[focus]:'Επόμενη αποστολή';
    const target=$('plan-output');target.replaceChildren();
    target.append(
      make('strong',null,'Πρόταση: '+label),
      make('p',null,'Μελέτη '+Math.round(minutes*.35)+' λεπτά · Διαδραστική αποστολή '+Math.round(minutes*.5)+' λεπτά · Ανασκόπηση '+(minutes-Math.round(minutes*.35)-Math.round(minutes*.5))+' λεπτά.'),
      make('p','muted small','Πρόταση βάσει καταγραφών Mentor, όχι πιστοποιημένη εκτίμηση ικανότητας.')
    );
    if(state.activities){
      const extra=await state.activities.summary();
      target.append(make('p','muted small',
        'Επιπλέον εξάσκηση: '+extra.mci.total+' καταγραφές συμβάντων, '+extra.equipment.total+
        ' καρτέλες εξοπλισμού, '+extra.reviews+' επιλογές που χρειάζονται επανάληψη.'));
    }
  }catch(e){notify('Δεν υπολογίστηκε η εκπαιδευτική διαδρομή: '+e.message,true);}
}
async function exportMentor(){
  try{
    const sessions=await state.store.list(state.scope);
    const activities=state.activities?await state.activities.all():[];
    const payload={schema:'ekab-mentor-export-v2',created_at:new Date().toISOString(),
      includes:'synthetic educational sessions and standalone training activities only',sessions,activities};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=make('a');
    anchor.href=url;anchor.download='mentor-os-study-backup.json';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    notify('Έγινε λήψη αντιγράφου δοκιμών Mentor.');
  }catch(e){notify('Η εξαγωγή απέτυχε: '+e.message,true);}
}
async function eraseMentor(){
  if(!confirm('Να διαγραφούν οι δοκιμαστικές αποστολές και η μνήμη Mentor από αυτή την καρτέλα; Η πρόοδος ΣΑΕΚ/ΕΟΠΠΕΠ δεν επηρεάζεται.'))return;
  try{
    await state.store.erase(state.scope);
    if(state.activities)await state.activities.erase();
    state.session=null;
    renderMission();await renderMemory();await renderPlan();
    notify('Διαγράφηκαν μόνο οι δοκιμαστικές καταγραφές Mentor.');
  }catch(e){notify('Η διαγραφή απέτυχε: '+e.message,true);}
}
function viewLegacy(){
  const target=$('legacy-result');
  try{
    const result=readLegacySnapshot(localStorage);
    const p=make('p',null,
      'Καταχωρίσεις ανάγνωσης ΣΑΕΚ: '+result.saek_read_records+
      ' / 247 · Ερωτήσεις με προσπάθειες ΣΑΕΚ: '+result.saek_exam_question_records+
      ' / 247 · Ερωτήσεις με προσπάθειες ΕΟΠΠΕΠ: '+result.eoppep_attempt_records+' / 314.');
    const note=make('p','small',result.limitations);
    target.replaceChildren(p,note);
  }catch(e){target.textContent='Δεν είναι διαθέσιμη η προβολή: '+e.message;}
}
async function boot(){
  wireTabs();
  wireModes();
  wireStudyPreferences();
  wireCoach();
  wireMentorPresence();
  $('restart').addEventListener('click',()=>{if(state.session)void startCase(state.session.case_id)});
  $('read-legacy').addEventListener('click',viewLegacy);
  $('export-mentor').addEventListener('click',()=>void exportMentor());
  $('clear-mentor').addEventListener('click',()=>void eraseMentor());
  try{
    const identity=await resolveMentorScope({account:null});
    state.scope=identity.scope;
    try{state.store=createMentorStore(await openMentorDb());}
    catch{state.store=createVolatileMentorStore();}
    state.session=await state.store.active(state.scope);
    state.activities=await mountActivities({scope:state.scope,notify,
      onChange:async()=>{await renderMemory();await renderPlan();}});
    state.initialized=true;
    $('privacy-text').textContent=state.store.persistent?
      'Οι δοκιμές Mentor αποθηκεύονται τοπικά σε δύο ξεχωριστές βάσεις IndexedDB. Η δοκιμαστική ταυτότητα επισκέπτη ισχύει μόνο για αυτή την καρτέλα. Δεν γίνεται συγχρονισμός στο cloud.':
      'Η τοπική αποθήκευση IndexedDB δεν είναι διαθέσιμη· οι δοκιμές θα χαθούν αν κλείσεις την καρτέλα. Δεν γίνεται συγχρονισμός.';
    notify(state.store.persistent?'Το εργαστήριο είναι έτοιμο. Η υπάρχουσα πρόοδος παραμένει ανέπαφη.':'Δοκιμαστική λειτουργία χωρίς μόνιμη αποθήκευση.');
    renderMission();await renderMemory();await renderPlan();
  }catch(e){notify('Το εργαστήριο δεν μπορεί να ξεκινήσει: '+e.message,true);}
}
void boot();
