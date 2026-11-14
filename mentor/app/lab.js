/* Standalone MENTOR OS Foundation demo.
 * No calls to AI graders; no legacy writes; no medical intervention logic.
 */
import {openMentorDb,createMentorStore,createVolatileMentorStore} from '../core/store.mjs';
import {resolveMentorScope} from '../core/identity.mjs';
import {readLegacySnapshot} from '../core/legacy-readonly.mjs';
import {readStudyPreferences,saveStudyPreferences,planForGoals} from '../core/study-goals.mjs';
import {coachResponse,interpretQuestion,chooseFocus} from '../core/guided-coach.mjs';
import {supportsSpeech,listGreekVoices,isKnownFemaleGreekVoice,resolveMentorGreekVoice,voiceDiagnostics,speakGreek,stopGreek} from '../voice/speech.mjs';
import {chooseMentorDelivery,deliverySpeechSettings,publicDeliveryCue} from '../core/presence-director.mjs';
import {createMentorAvatar} from '../avatar/live.mjs';
import {answerStudyQuestion,loadMentorTermLibrary} from '../core/quick-answer.mjs';

const $=id=>document.getElementById(id);
let mentorDelivery=chooseMentorDelivery();
function setMentorDelivery(delivery){
  mentorDelivery=delivery;
  const node=$('mentor-delivery-status');
  if(node)node.textContent='Τρόπος διδασκαλίας: '+delivery.label+' · ανάλογα με την άσκηση και την πρόοδο.';
  const section=$('mentor-presence');
  if(section){
    section.dataset.mentorDelivery=delivery.id;
    section.dispatchEvent(new CustomEvent('mentor:presence',{bubbles:true,detail:publicDeliveryCue(delivery)}));
  }
}
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
  if(target==='route')void renderPlan();
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
  output.append(make('p','muted small','Συνολικά '+allocated+' λεπτά, μοιρασμένα σε '+plans.length+(plans.length===1?' στόχο.':' στόχους.')+' Δεν προστίθεται χρόνος για κάθε στόχο.'));
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
  row.append(make('strong',null,role==='assistant'?'ATLA · Εκπαιδευτική απάντηση':'Ερώτησή μου'));
  row.append(make('p',null,message));
  $('coach-dialogue').append(row);
  // Keep the current-page dialogue bounded; no persistence or network transmission.
  while($('coach-dialogue').childElementCount>12)$('coach-dialogue').firstElementChild.remove();
}
async function coachAsk(intent,topic,userText){
  addCoachMessage('user',userText);
  let overview=null;
  try{
    overview=state.store&&state.scope?await state.store.overview(state.scope):null;
    const terms=await loadMentorTermLibrary();
    const response=answerStudyQuestion(userText,{items:terms,overview});
    lastCoachReply=response.text;
    const box=$('mentor-hero-answer'),link=$('mentor-hero-answer-source');
    if(box){box.hidden=false;box.textContent=lastCoachReply;}
    if(link){link.hidden=!response.source;if(response.source)link.href=response.source;}
  }catch{
    lastCoachReply=answerStudyQuestion(userText).text;
    const box=$('mentor-hero-answer');if(box){box.hidden=false;box.textContent=lastCoachReply;}
  }
  // Adapts DELIVERY only; the medically reviewed answer and grading do not change.
  setMentorDelivery(chooseMentorDelivery({intent,topic:topic||'scene',overview}));
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
  const performer=createMentorAvatar(avatar);
  const section=$('mentor-presence');
  const speaker=$('mentor-intro-speak');
  const stopper=$('mentor-intro-stop');
  const mic=$('mentor-intro-mic');
  const voiceSelect=$('mentor-voice-select');
  const maleVoiceStatus=$('mentor-male-voice-status');
  const voiceInventory=$('mentor-voice-inventory');
  const voiceRefresh=$('mentor-voice-refresh');
  const voiceProbe=$('mentor-voice-probe');
  const speed=$('mentor-voice-speed');
  const speedLabel=$('mentor-voice-speed-label');
  const supported=supportsSpeech(window);
  const SpeechRecognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null;
  let speakingGeneration=0;
  speaker.disabled=!supported;
  voiceRefresh.disabled=!supported;
  voiceProbe.disabled=!supported;
  mic.disabled=typeof SpeechRecognizer!=='function';
  stopper.disabled=!supported&&mic.disabled;
  if(mic.disabled)mic.title='Η αναγνώριση ελληνικής ομιλίας δεν είναι διαθέσιμη σε αυτόν τον browser.';
  function paintSpeaking(value){
    if(!value)performer.stop();
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
    const device=voiceDiagnostics(window);
    voiceSelect.replaceChildren();
    const option=make('option',null,'Αυτόματη γυναικεία ελληνική φωνή');
    option.value='';voiceSelect.append(option);
    for(const voice of listGreekVoices(window).filter(isKnownFemaleGreekVoice)){
      const choice=make('option',null,voice.name+(voice.localService?' · Συσκευή':' · Browser'));
      choice.value=voice.name;voiceSelect.append(choice);
    }
    const other=make('option',null,'Εναλλακτική ελληνική φωνή συσκευής (όχι εγγυημένα γυναικεία)');
    other.value='__device__';voiceSelect.append(other);
    if([...voiceSelect.options].some(x=>x.value===previous))voiceSelect.value=previous;
    if(maleVoiceStatus)maleVoiceStatus.textContent=voiceSelect.value==='__device__'?'Χρησιμοποιείται ρητά η ελληνική φωνή της συσκευής· δεν εγγυάται γυναικεία φωνή.':resolveMentorGreekVoice(window.speechSynthesis.getVoices(),voiceSelect.value).label;
    if(voiceInventory){
      voiceInventory.textContent='Διαθέσιμες ελληνικές φωνές: '+device.greekCount+
        ' · αναγνωρισμένες γυναικείες: '+device.femaleCount+
        (device.femaleNames.length?' ('+device.femaleNames.join(', ')+')':'')+'. '+
        (!device.canSpeakFemale?
          'Δεν βρέθηκε αναγνωρισμένη γυναικεία φωνή· ο ATLA θα χρησιμοποιήσει μια ελληνική φωνή της συσκευής, αν υπάρχει.':
          'Πάτησε «Άκουσε» για να δοκιμάσεις.');
    }
    voiceProbe.disabled=!device.canTestGreek;
    if(!device.canSpeakFemale&&voiceStatus){
      voiceStatus.textContent=device.greekCount===0?
        'Το Safari δεν αναφέρει ακόμη ελληνική φωνή. Έλεγξε τη λήψη φωνών στις ρυθμίσεις iPhone και πάτησε «Έλεγξε ξανά».':
        'Υπάρχει ελληνική φωνή αλλά όχι αναγνωρισμένη γυναικεία. Δοκίμασε τον ήχο της συσκευής ή εγκατέστησε τη γυναικεία φωνή «Μελίνα» (Apple) ή «Αθηνά» (Microsoft) αν προσφέρεται.';
    }
  }
  if(supported){
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged',updateVoices);
    window.addEventListener('pageshow',updateVoices);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateVoices();});
    voiceRefresh.addEventListener('click',updateVoices);
    voiceSelect.addEventListener('change',updateVoices);
  }else{
    voiceSelect.disabled=true;
    voiceProbe.disabled=true;
    voiceRefresh.disabled=true;
    speed.disabled=true;
  }
  voiceProbe.addEventListener('click',()=>{
    if(!supported)return;
    const info=voiceDiagnostics(window);
    if(!info.canTestGreek){
      voiceStatus.textContent='Δεν βρέθηκε φωνή για ελληνικά. Δεν ξεκίνησε η δοκιμή ήχου.';
      return;
    }
    const current=++speakingGeneration;
    paintSpeaking(false);
    const sample='Δοκιμή ήχου. Αυτή είναι μια διαθέσιμη ελληνική φωνή της συσκευής.';
    const started=speakGreek(sample,{
      env:window,requireMale:false,requireFemale:false,requireGreek:true,
      rate:0.95,pitch:1,volume:1,
      onVoiceResolved:result=>{
        if(current===speakingGeneration){
          voiceStatus.textContent='Δοκιμή ηχείου με '+(result.voice?.name||'ελληνική φωνή')+
            '. Αυτή η φωνή δεν επιλέγεται αυτόματα για τον ATLA.';
        }
      },
      onStart:()=>{
        if(current!==speakingGeneration)return;
        voiceStatus.textContent='Παίζει δοκιμαστικά ελληνική φωνή της συσκευής (όχι απαραίτητα γυναικεία).';
      },
      onFinish:()=>{
        if(current===speakingGeneration)voiceStatus.textContent=
          'Η δοκιμή ήχου ολοκληρώθηκε. Αν δεν άκουσες τίποτα, έλεγξε ένταση και έξοδο ήχου του iPhone.';
      },
      onError:event=>{
        if(current===speakingGeneration)voiceStatus.textContent=
          'Η δοκιμή ήχου απέτυχε ('+(event?.error||'άγνωστο σφάλμα')+'). Έλεγξε τις άδειες του Safari και την έξοδο ήχου.';
      }
    });
    if(!started)voiceStatus.textContent='Η δοκιμή δεν ξεκίνησε. Πάτησε ξανά μετά την ανανέωση της σελίδας.';
  });
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
    const speechStyle=deliverySpeechSettings(mentorDelivery,Number(speed.value));
    paintSpeaking(false);
    let deviceVoice=voiceSelect.value==='__device__';
    const attempt=female=>speakGreek(text,{env:window,voiceName:female&&!deviceVoice?voiceSelect.value:'',
      rate:speechStyle.rate,pitch:speechStyle.pitch,volume:speechStyle.volume,
      requireFemale:female,requireGreek:!female,
      onVoiceResolved:result=>{
        if(maleVoiceStatus)maleVoiceStatus.textContent=result.label;
      },
      onStart:()=>{
        if(current!==speakingGeneration)return;
        performer.start(text,{speed:speechStyle.rate});
        paintSpeaking(true);
        // Pose, vocal dynamics and brow/smile are driven by the same delivery cue.
        const section=$('mentor-presence');
        section?.dispatchEvent(new CustomEvent('mentor:presence',{
          bubbles:true,detail:publicDeliveryCue(mentorDelivery)
        }));
        voiceStatus.textContent='Ο ATLA μιλά στα ελληνικά με '+mentorDelivery.label.toLocaleLowerCase('el')+' ύφος. '+resolveMentorGreekVoice(window.speechSynthesis.getVoices(),voiceSelect.value).label;
      },
      onFinish:()=>{
        if(current!==speakingGeneration)return;
        paintSpeaking(false);
        voiceStatus.textContent='Η ανάγνωση ολοκληρώθηκε.';
      },
      onError:event=>{
        if(current!==speakingGeneration)return;
        paintSpeaking(false);
        const code=String(event?.error||'άγνωστο σφάλμα');
        voiceStatus.textContent=code==='not-allowed'?
          'Το Safari δεν επέτρεψε την αναπαραγωγή. Πάτησε απευθείας «Άκουσε» και έλεγξε την έξοδο ήχου.':
          'Η εκφώνηση απέτυχε ('+code+'). Πάτησε «Έλεγξε ξανά τις φωνές» και δοκίμασε τον ήχο συσκευής.';
      },
      onBoundary:event=>{if(current===speakingGeneration)performer.boundary(event);}
    });
    let started=deviceVoice?attempt(false):attempt(true);
    if(!started&&!deviceVoice){deviceVoice=true;started=attempt(false);}
    if(!started){
      paintSpeaking(false);
      updateVoices();
      voiceStatus.textContent='Δεν ξεκίνησε η εκφώνηση. Πάτησε «Έλεγξε ξανά», ή διάλεξε ρητά την εναλλακτική ελληνική φωνή συσκευής. Η επιλογή αυτή δεν εγγυάται γυναικεία χροιά.';
    }
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
  setMentorDelivery(mentorDelivery);
  if(!supported){
    voiceStatus.textContent='Η φωνή δεν υποστηρίζεται εδώ. Η συνομιλία γραπτώς παραμένει διαθέσιμη.';
    if(maleVoiceStatus)maleVoiceStatus.textContent='Γυναικεία ελληνική φωνή: μη διαθέσιμη σε αυτή τη συσκευή.';
  }
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
  addCoachMessage('assistant','Καλώς ήρθες! Ρώτησέ με τι να μελετήσεις, πώς πηγαίνουν οι δοκιμές ATLA ή ζήτησε μια μικρή άσκηση. Δεν χρησιμοποιώ βαθμούς ή προσωπικά δεδομένα.');
}
async function renderPlan(){
  renderPersonalPlan();
  const minutes=Number($('study-duration').value)||25;
  const target=$('plan-output');target.replaceChildren();
  target.append(
    make('strong',null,'Πρόταση: Πρακτική ΕΟΠΠΕΠ και ΗΚΓ'),
    make('p',null,'Μελέτη ύλης '+Math.round(minutes*.5)+' λεπτά · Εξάσκηση ΗΚΓ '+Math.round(minutes*.3)+' λεπτά · Επανάληψη '+(minutes-Math.round(minutes*.5)-Math.round(minutes*.3))+' λεπτά.'),
    make('p','muted small','Γενική πρόταση χρόνου, όχι πιστοποιημένη εκτίμηση ικανότητας.')
  );
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
    notify('Έγινε λήψη αντιγράφου δοκιμών ATLA.');
  }catch(e){notify('Η εξαγωγή απέτυχε: '+e.message,true);}
}
async function eraseMentor(){
  if(!confirm('Να διαγραφεί η τοπική μνήμη ATLA από αυτή τη συσκευή; Η πρόοδος ΣΑΕΚ/ΕΟΠΠΕΠ δεν επηρεάζεται.'))return;
  try{
    await state.store.erase(state.scope);
    if(state.activities)await state.activities.erase();
    state.session=null;
    await renderPlan();
    notify('Διαγράφηκαν μόνο οι δοκιμαστικές καταγραφές ATLA.');
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
  wireStudyPreferences();
  if($('coach-form'))wireCoach();
  // The page has one ATLA: its button opens the same assistant as every other page.
  if($('mentor-hero-form'))wireMentorPresence();
  $('atla-open-chat')?.addEventListener('click',()=>document.querySelector('.atla-launcher')?.click());
  $('read-legacy').addEventListener('click',viewLegacy);
  $('export-mentor').addEventListener('click',()=>void exportMentor());
  $('clear-mentor').addEventListener('click',()=>void eraseMentor());
  try{
    const identity=await resolveMentorScope({account:null});
    state.scope=identity.scope;
    try{state.store=createMentorStore(await openMentorDb());}
    catch{state.store=createVolatileMentorStore();}
    state.session=await state.store.active(state.scope);
    state.initialized=true;
    $('privacy-text').textContent=state.store.persistent?
      'Οι δοκιμές ATLA αποθηκεύονται τοπικά σε δύο ξεχωριστές βάσεις IndexedDB. Η δοκιμαστική ταυτότητα επισκέπτη ισχύει μόνο για αυτή την καρτέλα. Δεν γίνεται συγχρονισμός στο cloud.':
      'Η τοπική αποθήκευση IndexedDB δεν είναι διαθέσιμη· οι δοκιμές θα χαθούν αν κλείσεις την καρτέλα. Δεν γίνεται συγχρονισμός.';
    notify(state.store.persistent?'Το εργαστήριο είναι έτοιμο. Η υπάρχουσα πρόοδος παραμένει ανέπαφη.':'Δοκιμαστική λειτουργία χωρίς μόνιμη αποθήκευση.');
    await renderPlan();
  }catch(e){notify('Το εργαστήριο δεν μπορεί να ξεκινήσει: '+e.message,true);}
}
void boot();
