/**
 * MENTOR OS — optional scripted interview practice inside the existing Protocol Lab.
 * Original EKAB Spoudi implementation. Inspired by the MIT licensed
 * Virtual Standardized Patient project, NOT imported clinical cases or patient data.
 * Simulated observer uses only an authored case brief and never offers treatment.
 */
import {CASE_BRIEFS,roleFor} from './mentor-scenario-paths.mjs';

export function interviewStages(topic, roleId='responder'){
  const caseData=CASE_BRIEFS[topic?.id];
  if(!caseData)throw Error('unknown-educational-topic');
  const r=roleFor(roleId);
  return [
    {
      id:'opening',title:'Εκπαιδευτική έναρξη επικοινωνίας',
      prompt:'Ποια προσέγγιση βοηθά να κατανοήσεις τη συνθετική αναφορά;',
      choices:[
        {id:'ask',label:'Ζητώ μια σύντομη, σαφή περιγραφή του τι αναφέρθηκε.',ok:true,reply:'Συνθετικός συνομιλητής: «'+caseData.scene+'»',feedback:'Η περιγραφή του συμβάντος καταγράφηκε χωρίς να μετατραπεί σε διάγνωση.'},
        {id:'assume',label:'Αποδίδω αμέσως μια συγκεκριμένη διάγνωση.',ok:false,reply:'MENTOR: Δεν υπάρχει επαρκής πληροφορία για βέβαιη διάγνωση.',feedback:'Ζήτησε πρώτα αξιόπιστη περιγραφή και μην παρουσιάζεις υποθέσεις ως βεβαιότητες.'}
      ]
    },
    {
      id:'timeline',title:'Χρονική σειρά και παρατηρήσεις',
      prompt:'Ποια πληροφορία χρειάζεται να συγκεντρώσεις στη συνέχεια;',
      choices:[
        {id:'verify',label:'Ρωτώ τι παρατηρήθηκε και πότε, σημειώνοντας όσα δεν γνωρίζουμε.',ok:true,reply:'Συνθετικός συνομιλητής: «Χρειάζεται να διευκρινιστούν: '+caseData.observe+'. Δεν υπάρχουν επιβεβαιωμένες μετρήσεις ζωτικών σημείων.»',feedback:'Η χρονική ακολουθία και η πηγή παρατηρήσεων είναι χρήσιμες για την εκπαιδευτική αναφορά.'},
        {id:'invent',label:'Συμπληρώνω μόνος μου άγνωστες τιμές ή χρονικά στοιχεία.',ok:false,reply:'MENTOR: Τα στοιχεία αυτά δεν είναι διαθέσιμα στο συνθετικό σενάριο.',feedback:'Δεν επινοούμε ζωτικά σημεία ούτε ώρες που δεν έχουν τεκμηριωθεί.'}
      ]
    },
    {
      id:'roles',title:'Συνεργασία και αρμοδιότητες',
      prompt:'Με εκπαιδευτικό ρόλο «'+r.label+'», ποια ενέργεια δείχνει σωστό συντονισμό;',
      choices:[
        {id:'coordinate',label:'Ενημερώνω την κατάλληλη ομάδα και ζητώ καθοδήγηση εντός των αρμοδιοτήτων μου.',ok:true,reply:'MENTOR: Το επίπεδο «'+r.label+'» καθορίζει την εκπαιδευτική οπτική, όχι αυτόματη επαγγελματική εξουσιοδότηση.',feedback:'Η επικοινωνία και η επιβεβαίωση των ορίων ρόλου προηγούνται της κλινικής εφαρμογής.'},
        {id:'exceed',label:'Θεωρώ ότι η επιλογή επιπέδου στην εφαρμογή επιτρέπει οποιαδήποτε ιατρική πράξη.',ok:false,reply:'MENTOR: Το λογισμικό δεν χορηγεί επαγγελματικά δικαιώματα.',feedback:'Οι πραγματικές πράξεις απαιτούν νόμιμη αρμοδιότητα, εκπαίδευση και κατάλληλη επίβλεψη.'}
      ]
    },
    {
      id:'handover',title:'Ολοκλήρωση εκπαιδευτικής παράδοσης',
      prompt:'Πώς ολοκληρώνεις την ενημέρωση της επόμενης ομάδας;',
      choices:[
        {id:'handover',label:'Ξεχωρίζω επιβεβαιωμένες παρατηρήσεις, μαρτυρίες και εκκρεμότητες.',ok:true,reply:'MENTOR: Στοιχεία για δομημένη παράδοση: '+caseData.handover+'.',feedback:'Η αναφορά περιλαμβάνει γνωστά, άγνωστα και προέλευση πληροφοριών χωρίς επινοήσεις.'},
        {id:'omit',label:'Παραλείπω τις αβεβαιότητες και δίνω μόνο συμπεράσματα.',ok:false,reply:'MENTOR: Η πλήρης εκπαιδευτική παράδοση χρειάζεται ρητές αβεβαιότητες.',feedback:'Η παράλειψη των αβεβαιοτήτων μειώνει την ακρίβεια της αναφοράς.'}
      ]
    }
  ];
}
export function newInterview(topic,role){
  return {schema:1,topic:topic.id,role:roleFor(role).id,index:0,turns:[],completed:false};
}
export function applyInterviewChoice(session,choiceId,topic){
  const stages=interviewStages(topic,session.role);
  if(!session||session.schema!==1||session.topic!==topic.id||!Number.isInteger(session.index)||session.index<0||session.index>=stages.length||session.completed||!Array.isArray(session.turns)||session.turns.length>40)throw Error('invalid-interview-state');
  const stage=stages[session.index],choice=stage.choices.find(item=>item.id===choiceId);
  if(!choice)throw Error('invalid-interview-choice');
  const turn={stage:session.index,choice:choice.id,reply:choice.reply,feedback:choice.feedback,ok:choice.ok};
  const nextIndex=session.index+(choice.ok?1:0);
  return {schema:1,topic:topic.id,role:session.role,index:nextIndex,turns:[...session.turns,turn],completed:nextIndex===stages.length};
}
export function restoreInterview(raw,topic,role){
  const r=roleFor(role).id;
  if(!raw||raw.topic!==topic.id||raw.role!==r||!Array.isArray(raw.turns)||raw.turns.length>40)return newInterview(topic,r);
  try{
    let rebuilt=newInterview(topic,r);
    for(const saved of raw.turns){
      rebuilt=applyInterviewChoice(rebuilt,saved.choice,topic);
      const recent=rebuilt.turns.at(-1);
      if(recent.stage!==saved.stage||recent.ok!==saved.ok)throw Error('tampered-interview');
    }
    if(rebuilt.index!==raw.index||rebuilt.completed!==raw.completed)return newInterview(topic,r);
    return rebuilt;
  }catch{return newInterview(topic,r);}
}
export function mountInterview(root,{topic,role}){
  if(!root)return;
  const $=selector=>root.querySelector(selector);
  const r=roleFor(role).id, key='ekab:mentor:interview:v1:'+topic.id+':'+r;
  let session;
  try{session=restoreInterview(JSON.parse(localStorage.getItem(key)||'null'),topic,r);}
  catch{session=newInterview(topic,r);}
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(session));}catch{/* private browsing or disabled storage */}};
  function render(){
    const stages=interviewStages(topic,r), stage=stages[session.index];
    $('#interview-stage').textContent=session.completed?'Ολοκληρώθηκε η εκπαιδευτική συνέντευξη':'Στάδιο '+(session.index+1)+'/'+stages.length+' · '+stage.title;
    $('#interview-prompt').textContent=session.completed?'Δες το ιστορικό επικοινωνίας και επανάλαβε ό,τι χρειάζεται.':stage.prompt;
    $('#interview-choices').replaceChildren();
    if(!session.completed)for(const choice of stage.choices){
      const button=document.createElement('button');button.type='button';button.className='choice';
      button.textContent=choice.label;
      button.addEventListener('click',()=>{
        try{session=applyInterviewChoice(session,choice.id,topic);persist();render();}
        catch{$('#interview-prompt').textContent='Η άσκηση χρειάζεται επανεκκίνηση.';}
      });
      $('#interview-choices').append(button);
    }
    const history=$('#interview-history');history.replaceChildren();
    session.turns.forEach((turn,i)=>{
      const entry=document.createElement('li'),name=document.createElement('strong'),desc=document.createElement('p');
      name.textContent=(i+1)+'. '+(turn.ok?'Καταγράφηκε εκπαιδευτικός στόχος':'Χρειάζεται επανάληψη');
      desc.textContent=turn.reply+' '+turn.feedback;
      entry.append(name,desc);history.append(entry);
    });
    $('#interview-result').textContent=session.turns.length+' καταγεγραμμένες επιλογές · '+session.turns.filter(t=>!t.ok).length+' για επανάληψη. Αποθηκεύονται τοπικά και δεν επηρεάζουν τους βαθμούς ΣΑΕΚ/ΕΟΠΠΕΠ.';
  }
  $('#interview-reset').addEventListener('click',()=>{
    if(session.turns.length&&!confirm('Να επαναφέρεις μόνο τη συνθετική εκπαιδευτική συνέντευξη για αυτό το θέμα;'))return;
    session=newInterview(topic,r);persist();render();
  });
  render();
}
