/**
 * MENTOR cinematic shell: presentation only. Connects visible buttons to
 * the existing local guided-coach, voice synthesis and published study links.
 * No new AI, medical decision engine, microphone permission or storage writes.
 */
const root=document.getElementById('mentor-presence');
const $=id=>document.getElementById(id);
if(root){
  const stage=$('mentor-cinematic-stage');
  const photo=root.querySelector('.cinematic-character');
  const avatar=$('mentor-avatar');
  const question=$('mentor-hero-question');
  const form=$('mentor-hero-form');
  const caption=$('cinematic-mode-description');
  const buttons=[...root.querySelectorAll('[data-cinematic-mode]')];
  const messages={
    hologram:'Πραγματικό αρθρωμένο 3D μοντέλο με φωτισμό, εκφράσεις και περιστροφή.',
    voice:'Ανδρική ελληνική φωνή εφόσον υπάρχει στη συσκευή. Η κίνηση στόματος παραμένει προσεγγιστική.',
    text:'Γράψε την ερώτησή σου και πάτησε «Ρώτησε». Οι απαντήσεις προέρχονται από τον υπάρχοντα εκπαιδευτικό οδηγό, χωρίς AI.'
  };
  function mode(next){
    if(!Object.hasOwn(messages,next))return;
    for(const btn of buttons){
      const current=btn.dataset.cinematicMode===next;
      btn.classList.toggle('is-current',current);
      btn.setAttribute('aria-pressed',String(current));
    }
    stage?.classList.toggle('is-glowing',next==='hologram');
    if(caption)caption.textContent=messages[next];
    if(next==='text'){
      question?.scrollIntoView({behavior:'smooth',block:'center'});
      question?.focus({preventScroll:true});
    }else if(next==='voice'){
      const speech=$('mentor-intro-speak');
      if(speech&&!speech.disabled)speech.click();
      else if(caption)caption.textContent+=' Η συσκευή δεν υποστηρίζει εδώ ομιλία.';
    }
  }
  for(const btn of buttons)btn.addEventListener('click',()=>mode(btn.dataset.cinematicMode));
  for(const quick of root.querySelectorAll('[data-cinematic-question]')){
    quick.addEventListener('click',()=>{
      if(!form||!question)return;
      question.value=quick.dataset.cinematicQuestion||'';
      if(typeof form.requestSubmit==='function')form.requestSubmit();
      else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      question?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
  const syncSpeech=()=>stage?.classList.toggle('is-speaking',!!avatar?.classList.contains('is-speaking'));
  if(avatar&&stage&&typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(syncSpeech);
    observer.observe(avatar,{attributes:true,attributeFilter:['class']});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  photo?.addEventListener('error',()=>{
    root.classList.add('cinematic-photo-fallback');
    if(caption)caption.textContent='Το πραγματικό 3D δεν φορτώθηκε. Κανένα παλιό μοντέλο δεν εμφανίζεται.';
  },{once:true});
  mode('hologram');
}
