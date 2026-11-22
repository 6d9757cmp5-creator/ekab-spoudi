(()=>{
 'use strict';
 const launch=document.querySelector('.beta-radio');if(!launch)return;
 document.body.append(launch);
 const base=new URL('./',document.currentScript?.src||location.href);
 const bankUrl=new URL('official_questions.json',base);
 const cases=[
  {id:'EOP-B-130',prompt:'Νεαρός με κομμένο δεξί αντιβράχιο, αιμορραγία και αδυναμία να σηκώσει το χέρι.',options:[
   {id:'EOP-B-140',text:'Ασφάλεια σκηνής, ABCDE, ζωτικά σημεία, SpO₂, ΗΚΓ 12 απαγωγών και έγκαιρη διακομιδή.'},
   {id:'EOP-B-130',text:'Ασφάλεια και ΜΑΠ, άμεση πίεση στην αιμορραγία, έλεγχος κίνησης/αισθητικότητας/σφύξεων και ταχεία διακομιδή.'},
   {id:'EOP-B-138',text:'Υποστήριξη αεραγωγού και αερισμού, βοήθεια και ναλοξόνη μόνο από κατάλληλα εκπαιδευμένους βάσει πρωτοκόλλου.'}
  ]},
  {id:'EOP-B-138',prompt:'Άνδρας περίπου 20 ετών σε κώμα, με 6 αναπνοές/λεπτό, μικρές κόρες και ίχνη ενέσεων.',options:[
   {id:'EOP-B-140',text:'Ασφάλεια σκηνής, ABCDE, ζωτικά σημεία, SpO₂, ΗΚΓ 12 απαγωγών και έγκαιρη διακομιδή.'},
   {id:'EOP-B-130',text:'Ασφάλεια και ΜΑΠ, άμεση πίεση στην αιμορραγία, έλεγχος κίνησης/αισθητικότητας/σφύξεων και ταχεία διακομιδή.'},
   {id:'EOP-B-138',text:'Ασφάλεια σκηνής, βοήθεια, υποστήριξη αεραγωγού/αερισμού και ναλοξόνη μόνο σύμφωνα με εκπαίδευση και πρωτόκολλο.'}
  ]},
  {id:'EOP-B-140',prompt:'Άνδρας 45 ετών αναφέρει πόνο στο στήθος.',options:[
   {id:'EOP-B-140',text:'Ασφάλεια σκηνής, ABCDE, ζωτικά σημεία, SpO₂, ΗΚΓ 12 απαγωγών και έγκαιρη διακομιδή.'},
   {id:'EOP-B-130',text:'Ασφάλεια και ΜΑΠ, άμεση πίεση στην αιμορραγία, έλεγχος κίνησης/αισθητικότητας/σφύξεων και ταχεία διακομιδή.'},
   {id:'EOP-B-138',text:'Υποστήριξη αεραγωγού και αερισμού, βοήθεια και ναλοξόνη μόνο από κατάλληλα εκπαιδευμένους βάσει πρωτοκόλλου.'}
  ]}
 ];
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('incident-radio.css?v=20261122-6',base).href;document.head.append(sheet);
 const dialog=document.createElement('dialog');dialog.className='incident-radio-dialog';dialog.setAttribute('aria-labelledby','incidentRadioTitle');
 dialog.innerHTML='<button class="incident-radio-close" type="button" aria-label="Κλείσιμο κλήσης">×</button><p class="incident-radio-kicker">ΑΣΥΡΜΑΤΟΣ · ΕΚΠΑΙΔΕΥΤΙΚΟ ΔΕΙΓΜΑ</p><h2 id="incidentRadioTitle">Κλήση περιστατικού</h2><p class="incident-radio-count" data-radio-count></p><p class="incident-radio-question" data-radio-question></p><fieldset class="incident-radio-options"><legend>Ποια ενέργεια αντιστοιχεί στο περιστατικό;</legend><div data-radio-choices></div></fieldset><p class="incident-radio-feedback" data-radio-feedback aria-live="polite"></p><section class="incident-radio-answer" data-radio-answer hidden><h3>Καταχωρισμένη εκπαιδευτική απάντηση</h3><p data-radio-answer-text></p><details class="incident-radio-original"><summary>Πρωτότυπη εκφώνηση ΕΟΠΠΕΠ</summary><p data-radio-original></p></details><a data-radio-source target="_blank" rel="noopener noreferrer"></a><p class="incident-radio-note">Η εκπαιδευτική απάντηση της εφαρμογής δεν είναι επίσημο λυσάρι ή επιχειρησιακή οδηγία. Εφαρμόζονται η εκπαίδευση, οι αρμοδιότητες και τα ισχύοντα πρωτόκολλα.</p></section><div class="incident-radio-actions"><a href="contacts.html">Επικοινωνία &amp; AED</a><button type="button" data-radio-next>Επόμενο περιστατικό</button></div>';
 document.body.append(dialog);
 const questionNode=dialog.querySelector('[data-radio-question]'),countNode=dialog.querySelector('[data-radio-count]'),choicesNode=dialog.querySelector('[data-radio-choices]'),feedback=dialog.querySelector('[data-radio-feedback]'),answer=dialog.querySelector('[data-radio-answer]'),answerText=dialog.querySelector('[data-radio-answer-text]'),original=dialog.querySelector('[data-radio-original]'),source=dialog.querySelector('[data-radio-source]');
 let records=null,sequence=[],index=0;
 const loadRecords=async()=>{
  if(records)return records;
  const response=await fetch(bankUrl,{cache:'no-cache'});if(!response.ok)throw new Error('question-bank');
  const bank=await response.json();records=new Map(bank.filter(item=>cases.some(c=>c.id===item.id)&&item.answerStatus==='reviewed_educational'&&item.question&&item.answer).map(item=>[item.id,item]));
  if(records.size!==cases.length)throw new Error('missing-record');return records;
 };
 const current=()=>cases[sequence[index]];
 const render=async()=>{
  const recordMap=await loadRecords(),scenario=current(),record=recordMap.get(scenario.id);
  dialog.dataset.questionId=record.id;countNode.textContent=`Περιστατικό ${index+1} από ${sequence.length} · ${record.id}`;
  questionNode.textContent=scenario.prompt;
  feedback.textContent='';answer.hidden=true;answerText.textContent='';original.textContent=record.question;source.removeAttribute('href');source.textContent='';
  choicesNode.replaceChildren();
  for(const option of scenario.options){
   const button=document.createElement('button');button.type='button';button.className='incident-radio-choice';button.dataset.questionId=option.id;button.textContent=option.text;button.addEventListener('click',()=>choose(option,record));choicesNode.append(button);
  }
  dialog.querySelector('[data-radio-next]').textContent=index===sequence.length-1?'Νέος κύκλος περιστατικών':'Επόμενο περιστατικό';
 };
 const choose=(option,record)=>{
  const correct=option.id===record.id;
  for(const button of choicesNode.querySelectorAll('button'))button.disabled=true;
  const selected=[...choicesNode.children].find(button=>button.textContent===option.text);selected?.setAttribute('data-result',correct?'correct':'other-case');
  feedback.textContent=correct?'Σωστή αντιστοίχιση. Δες την καταχωρισμένη απάντηση και την πηγή παρακάτω.':'Αυτή η ενέργεια αντιστοιχεί σε διαφορετικό περιστατικό. Δες την καταχωρισμένη απάντηση και την πηγή.';
  answerText.textContent=record.answer;
  source.href=record.sourceUrl||'#';source.textContent=`${record.sourceLocation||'Πηγή'} · ερώτηση ${record.id}`;
  answer.hidden=false;
 };
 const open=async()=>{
  sequence=[...cases.keys()];const first=Math.floor(Math.random()*sequence.length);sequence=[...sequence.slice(first),...sequence.slice(0,first)];index=0;
  try{if(!dialog.open)dialog.showModal();await render();dialog.querySelector('.incident-radio-choice')?.focus()}catch{questionNode.textContent='Δεν φόρτωσε η ερώτηση. Έλεγξε τη σύνδεση και δοκίμασε ξανά.';countNode.textContent='';choicesNode.replaceChildren();feedback.textContent='';answer.hidden=true;if(!dialog.open)dialog.showModal();dialog.querySelector('.incident-radio-close').focus()}
 };
 launch.addEventListener('click',event=>{event.preventDefault();open()});
 dialog.querySelector('.incident-radio-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-radio-next]').addEventListener('click',async()=>{index=(index+1)%sequence.length;try{await render();dialog.querySelector('.incident-radio-choice')?.focus()}catch{questionNode.textContent='Δεν φόρτωσε η ερώτηση. Κλείσε και δοκίμασε ξανά.'}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>launch.focus());
})();
