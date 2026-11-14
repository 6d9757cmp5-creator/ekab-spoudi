/**
 * MENTOR OS: adaptive teaching delivery. One educator, no separate personas.
 * Only isolated Mentor study counters and explicit lesson intent. No AI,
 * emotion diagnosis, medical advice change, external calls or storage writes.
 */
export const MENTOR_DELIVERY=Object.freeze({
  welcoming:Object.freeze({label:"Φιλικός",rate:0.94,pitch:0.97,volume:0.94,gesture:"greet",expression:"warm",posture:"open"}),
  supportive:Object.freeze({label:"Υποστηρικτικός",rate:0.90,pitch:0.98,volume:0.92,gesture:"encourage",expression:"warm",posture:"open"}),
  caring:Object.freeze({label:"Στοργικός",rate:0.86,pitch:0.96,volume:0.88,gesture:"reassure",expression:"gentle",posture:"lean"}),
  patient:Object.freeze({label:"Υπομονετικός",rate:0.84,pitch:0.97,volume:0.92,gesture:"explain",expression:"attentive",posture:"lean"}),
  explanatory:Object.freeze({label:"Επεξηγηματικός",rate:0.90,pitch:1.00,volume:0.96,gesture:"explain",expression:"attentive",posture:"open"}),
  examiner:Object.freeze({label:"Εξεταστής",rate:0.95,pitch:0.94,volume:0.98,gesture:"question",expression:"focused",posture:"upright"}),
  demanding:Object.freeze({label:"Απαιτητικός",rate:0.96,pitch:0.93,volume:0.99,gesture:"challenge",expression:"focused",posture:"upright"}),
  strict:Object.freeze({label:"Αυστηρός",rate:0.89,pitch:0.91,volume:0.99,gesture:"caution",expression:"serious",posture:"upright"})
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const toCount=value=>clamp(Number.isFinite(Number(value))?Number(value):0,0,1000000);
function objectiveStats(overview,topic="scene"){
  const stats=overview?.competencies&&typeof overview.competencies==="object"?
    (overview.competencies[topic]||{}):{};
  return {reviews:toCount(stats.needs_review),practiced:toCount(stats.practiced),attempts:toCount(stats.attempts)};
}
/** safety=true is set only by an explicit safety-critical scenario, never a guess about emotion. */
export function chooseMentorDelivery({
  intent="welcome",topic="scene",overview=null,
  repeatedHelp=false,safety=false,corrected=false,assessment=false
}={}){
  const {reviews,practiced,attempts}=objectiveStats(overview,topic);
  let id="welcoming";
  if(safety===true)id="strict";
  else if(assessment===true||intent==="exam")id="examiner";
  else if(repeatedHelp===true)id="patient";
  else if(corrected===true&&reviews>=2)id="caring";
  else if(intent==="exercise")id=practiced>=3&&reviews===0?"demanding":"examiner";
  else if(intent==="explain")id="explanatory";
  else if(intent==="progress")id=reviews>=3?"supportive":attempts>=6&&reviews===0?"demanding":"supportive";
  else if(intent==="focus")id=reviews>=3?"patient":reviews>0?"supportive":"explanatory";
  return {id,...MENTOR_DELIVERY[id],source:"objective-study-context"};
}
/** User speech speed is a reading preference, not manual personality selection. */
export function deliverySpeechSettings(delivery,userSpeed=0.95){
  const target=delivery&&MENTOR_DELIVERY[delivery.id]?delivery:MENTOR_DELIVERY.welcoming;
  const slider=clamp(Number(userSpeed)||0.95,0.8,1.1);
  return Object.freeze({
    rate:clamp(target.rate*(slider/0.95),0.80,1.12),
    pitch:clamp(target.pitch,0.85,1.15),
    volume:clamp(target.volume,0.75,1)
  });
}
export function publicDeliveryCue(delivery){
  return Object.freeze({
    id:delivery?.id||"welcoming",
    expression:delivery?.expression||"warm",
    gesture:delivery?.gesture||"greet",
    posture:delivery?.posture||"open"
  });
}
