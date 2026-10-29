/* MENTOR: one rule-based adaptive tutor. No AI, no clinical grading.
   Original project code. Dedicated local memory; official V2 grades stay read-only. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.MentorAdaptive=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const TOPICS=Object.freeze({
    anatomy:{label:'Ανατομία και φυσιολογία',route:'mentor-anatomy',keywords:['ανατομ','οστ','μυες','σκελετ','αρτηρι','φλεβ','οργαν','φυσιολογ','νευρ']},
    ecg:{label:'Ηλεκτροκαρδιογράφημα',route:'mentor-ecg',keywords:['ecg','ekg','ηκγ','ηλεκτροκαρδιογρ','καρδιογραφ','ρυθμ','vf','pvt','pea']},
    resuscitation:{label:'Αναζωογόνηση',route:'mentor-ecg',keywords:['καρπα','bls','als','aed','αναζωογον','απινιδ','ανακοπ']},
    trauma:{label:'Τραύμα',route:'mentor-missions',keywords:['τραυμα','πολυτραυματ','καταγμα','αιμορραγ','phtls','ακινητοποι','εγκαυμα']},
    pharmacology:{label:'Φαρμακολογία',route:'goto-pharma',keywords:['φαρμακ','δοσολογ','χορηγησ','αντενδειξ','αδρεναλιν','drug','iv','io','im','in']},
    certification:{label:'Προετοιμασία ΕΟΠΠΕΠ',route:'goto-eoppep',keywords:['εοππεπ','εοπεπ','πιστοποιησ','εξετασ','ερωτησ','τεστ','quiz']},
    triage:{label:'Πολλαπλοί τραυματίες',route:'mentor-triage',keywords:['mci','triage','διαλογ','μαζικ','πολλαπλ']},
    equipment:{label:'Εξοπλισμός',route:'mentor-equipment',keywords:['εξοπλισμ','φορει','ambu','bvm','monitor','συσκευ']},
    missions:{label:'Προνοσοκομειακή εξάσκηση',route:'mentor-missions',keywords:['εκab live','εκαβ live','αποστολ','ασθενοφορ','περιστατικ','διασωστ','scene']},
    learning:{label:'Μελέτη ΣΑΕΚ',route:'goto-saek',keywords:['σαεκ','μαθημα','κεφαλαι','σπουδ','μελετη','υλη']}
  });
  const STYLES=Object.freeze(['auto','simple','detailed','exam']);
  const DEFAULT_GOAL='learning';
  const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function isKnownTopic(key){return Object.prototype.hasOwnProperty.call(TOPICS,key);}
  function newMemory(){return {version:1,goal:DEFAULT_GOAL,style:'auto',topics:{},recentTopics:[]};}
  function safeMemory(data){
    const memory=newMemory();
    if(!data || typeof data!=='object' || data.version!==1)return memory;
    if(isKnownTopic(data.goal))memory.goal=data.goal;
    if(STYLES.includes(data.style))memory.style=data.style;
    if(data.topics && typeof data.topics==='object'){
      for(const id of Object.keys(TOPICS)){
        const item=data.topics[id];
        if(!item || typeof item!=='object')continue;
        memory.topics[id]={
          visits:Number.isSafeInteger(item.visits)?Math.max(0,Math.min(99999,item.visits)):0,
          streak:Number.isSafeInteger(item.streak)?Math.max(0,Math.min(99,item.streak)):0,
          selfReport:['repeat','ok','easy'].includes(item.selfReport)?item.selfReport:null,
          due:/^\d{4}-\d\d-\d\d$/.test(item.due||'')?item.due:null
        };
      }
    }
    if(Array.isArray(data.recentTopics))memory.recentTopics=data.recentTopics.filter(isKnownTopic).slice(-12);
    return memory;
  }
  function inferTopic(input,fallback='learning'){
    const words=normalize(input);
    if(!words)return isKnownTopic(fallback)?fallback:'learning';
    let best=null,score=0;
    for(const [id,topic] of Object.entries(TOPICS)){
      let points=0;
      for(const term of topic.keywords)if(words.includes(normalize(term)))points+=normalize(term).length;
      if(points>score){score=points;best=id;}
    }
    return best||(isKnownTopic(fallback)?fallback:'learning');
  }
  function todayString(now=new Date()){return new Date(now).toISOString().slice(0,10);}
  function plusDays(now,days){
    const date=new Date(now);
    date.setUTCHours(12,0,0,0);
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }
  function recordVisit(source,id){
    const memory=safeMemory(source);
    if(!isKnownTopic(id))return memory;
    const old=memory.topics[id]||{visits:0,streak:0,selfReport:null,due:null};
    memory.topics[id]={...old,visits:old.visits+1};
    memory.recentTopics=[...memory.recentTopics,id].slice(-12);
    return memory;
  }
  function recordReview(source,id,quality,now=new Date()){
    const memory=safeMemory(source);
    if(!isKnownTopic(id)||!['repeat','ok','easy'].includes(quality))return memory;
    const old=memory.topics[id]||{visits:0,streak:0};
    const streak=quality==='repeat'?0:Math.min(20,(old.streak||0)+1);
    const days=quality==='repeat'?1:quality==='ok'?Math.min(30,Math.round(2*Math.pow(1.7,streak))):Math.min(60,Math.round(4*Math.pow(2,streak)));
    memory.topics[id]={visits:old.visits||0,streak,selfReport:quality,due:plusDays(now,days)};
    if(!memory.recentTopics.includes(id))memory.recentTopics=[...memory.recentTopics,id].slice(-12);
    return memory;
  }
  function legacyWrongCount(legacy){
    const answers=legacy && legacy.questions && typeof legacy.questions==='object'?legacy.questions:{};
    return Object.values(answers).filter(x=>x==='wrong').length;
  }
  function recommend(source,legacy={},now=new Date()){
    const memory=safeMemory(source),today=todayString(now);
    const due=Object.entries(memory.topics)
      .filter(([id,record])=>isKnownTopic(id)&&record.due&&record.due<=today)
      .sort((a,b)=>a[1].due.localeCompare(b[1].due));
    if(due.length)return {id:due[0][0],reason:'Προγραμματισμένη επανάληψη',due:true};
    if(legacyWrongCount(legacy)>0)return {id:'certification',reason:'Υπάρχουν ερωτήσεις που σημειώθηκαν για επανάληψη',due:false};
    const latest=memory.recentTopics[memory.recentTopics.length-1];
    if(latest)return {id:latest,reason:'Συνέχεια της τελευταίας σου εξάσκησης',due:false};
    return {id:memory.goal,reason:'Πρόταση εκκίνησης — άλλαξέ την όποτε θέλεις',due:false};
  }
  function effectiveStyle(memory,id){
    if(memory.style!=='auto')return memory.style;
    const item=memory.topics[id];
    if(item?.selfReport==='repeat')return 'simple';
    if((item?.visits||0)>2 && item?.selfReport==='easy')return 'exam';
    return 'detailed';
  }
  function guide(source,input,legacy={},now=new Date()){
    const memory=safeMemory(source),suggestion=recommend(memory,legacy,now),id=inferTopic(input,suggestion.id),topic=TOPICS[id],style=effectiveStyle(memory,id);
    const starters={
      simple:'Θα προχωρήσουμε με μικρά βήματα, με απλούς ελληνικούς όρους.',
      detailed:'Θα το οργανώσουμε σε έννοιες, παραδείγματα και σύντομο αυτοέλεγχο.',
      exam:'Θα εστιάσουμε στην ανάκληση γνώσεων και στον έλεγχο των σημείων που δυσκολεύουν.'
    };
    const next=id==='certification' && legacyWrongCount(legacy)>0?
      'Ξεκίνα από τις σημειωμένες λανθασμένες απαντήσεις, χωρίς να θεωρήσουμε την αυτοαξιολόγηση επίσημο βαθμό.':
      'Άνοιξε το σχετικό εργαστήριο και, όταν τελειώσεις, δήλωσε αν χρειάζεσαι επανάληψη.';
    return {id,label:topic.label,route:topic.route,style,
      message:starters[style]+' Θέμα: '+topic.label+'. '+next,
      reason:input.trim()?'Επέλεξα τομέα από το θέμα που έγραψες.':suggestion.reason};
  }
  return Object.freeze({TOPICS,STYLES,newMemory,safeMemory,inferTopic,recordVisit,recordReview,
    legacyWrongCount,recommend,effectiveStyle,guide,todayString});
});
