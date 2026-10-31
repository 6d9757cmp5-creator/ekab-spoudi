/** MENTOR Live: read-only debrief for the same synthetic mission; no score, diagnosis, or official grades. */
import {CASE,STAGES,liveSnapshot,replayLive} from './live-sim.mjs';
import {findLiveTool,findLiveAction,liveResponse} from './live-interactions.mjs';
export const LIVE_REVIEW_STATUS='clinical-review-pending';
export function buildLiveDebrief(session){
 const saved=replayLive(session);
 const snap=liveSnapshot(saved);
 const timeline=snap.timeline.map((event,index)=>{
  const record=saved.events[index],stage=STAGES.find(s=>s.id===record.stage_id);
  const choice=stage.choices.find(c=>c.id===record.choice_id);
  return {kind:'decision',index:index+1,minute:event.minute,
   title:stage.title,action:choice.label,outcome:event.outcome,feedback:event.feedback,
   consequence:event.consequence||''};
 });
 const observations=saved.inspections.map(e=>{
  const action=findLiveAction(e.tool_id,e.action_id),tool=findLiveTool(e.tool_id);
  return {kind:'observation',index:e.seq,person:e.patient_id==='a'?'Άτομο Α':'Άτομο Β',
   stage:e.at_stage,tool:tool.label,action:action.label,
   response:liveResponse(e.tool_id,e.action_id,e.patient_id)};
 });
 const unreviewed=snap.review;
 const advice=unreviewed?
  'Επανέλαβε τα βήματα με ένδειξη «Για επανάληψη» και περιέγραψε μόνο όσα επιβεβαιώθηκαν.':
  snap.completed?'Ολοκλήρωσες τα οργανωτικά εκπαιδευτικά βήματα. Δεν αποτελεί πιστοποίηση κλινικής ικανότητας.':
  'Η αποστολή βρίσκεται σε εξέλιξη. Ολοκλήρωσε τις επιλογές και έλεγξε το ιστορικό.';
 return {caseId:CASE.id,title:CASE.title,completed:snap.completed,minute:snap.minute,
  practice:snap.practice,review:unreviewed,observations,timeline,advice,
  unreliableHandover:snap.unreliableHandover,clinicalStatus:LIVE_REVIEW_STATUS,
  disclaimer:'Συνθετικό εκπαιδευτικό σενάριο· χωρίς ανεξάρτητη κλινική έγκριση, φυσιολογικό μοντέλο, πραγματικά στοιχεία ασθενών ή επίσημη βαθμολόγηση.'};
}
export function exportLiveDebrief(session){
 const report=buildLiveDebrief(session);
 const lines=[
  'ΕΚΑΒ ΣΠΟΥΔΗ — MENTOR LIVE DEBRIEF',
  report.title,report.disclaimer,'',
  'Κατάσταση: '+(report.completed?'Ολοκληρωμένη εκπαιδευτική αποστολή':'Αποστολή σε εξέλιξη'),
  'Συνθετικός χρόνος: '+report.minute+' λεπτά',
  'Οργανωτικά βήματα: '+report.practice+' · Για επανάληψη: '+report.review,
  'Εκπαιδευτικές παρατηρήσεις: '+report.observations.length,'',
  'ΑΠΟΦΑΣΕΙΣ'
 ];
 for(const entry of report.timeline){
  lines.push(entry.index+'. '+entry.title+' · '+entry.minute+'΄',
   'Επιλογή: '+entry.action,'Αξιολόγηση άσκησης: '+(entry.outcome==='review'?'Για επανάληψη':'Ολοκληρώθηκε βήμα'),
   'Σχόλιο: '+entry.feedback);
  if(entry.consequence)lines.push('Συνθετική συνέπεια: '+entry.consequence);
 }
 lines.push('','ΠΑΡΑΤΗΡΗΣΕΙΣ');
 for(const entry of report.observations){
  lines.push(entry.index+'. '+entry.person+' · '+entry.tool+' · Στάδιο '+entry.stage,
   'Ενέργεια: '+entry.action,'Συνθετική απάντηση: '+entry.response);
 }
 if(!report.observations.length)lines.push('Δεν υπάρχουν καταγεγραμμένες εκπαιδευτικές παρατηρήσεις.');
 lines.push('','ΑΝΑΣΤΟΧΑΣΜΟΣ',report.advice);
 if(report.unreliableHandover)lines.push('Προσοχή: καταγράφηκε παράδοση με ανεπιβεβαίωτες πληροφορίες.');
 lines.push('','Κατάσταση επιστημονικού ελέγχου: '+report.clinicalStatus,
 'Η αναφορά αφορά μόνο την άσκηση. Δεν αποτελεί ιατρικό έγγραφο ή αποδεικτικό επαγγελματικής επάρκειας.');
 return lines.join('\n')+'\n';
}
