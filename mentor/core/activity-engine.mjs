/**
 * MENTOR OS shared state-machine activity engine for mass-incident coordination
 * and schematic device education. No diagnoses, treatment decisions or official grades.
 */
import {getActivity} from './activities.mjs';
import {resolveChoice} from './workflow.mjs';
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const MAX_EVENTS=80;
const timestamp=at=>{
 if(typeof at!=='string'||at.length>40||!Number.isFinite(Date.parse(at)))throw new Error('invalid-time');
 return new Date(at).toISOString();
};
function validate(session){
 if(!session||typeof session!=='object'||Array.isArray(session))throw new Error('invalid-activity-session');
 const def=getActivity(session.activity_id);
 if(!def||session.schema_version!==1||session.activity_version!==def.version)throw new Error('unknown-activity-version');
 if(!ID.test(session.id||''))throw new Error('invalid-session-id');
 if(!Array.isArray(session.events)||session.events.length>MAX_EVENTS)throw new Error('invalid-events');
 if(!Array.isArray(session.marks)||session.marks.length>10||new Set(session.marks).size!==session.marks.length)throw new Error('invalid-marks');
 if(!Number.isInteger(session.stage_index)||session.stage_index<0||session.stage_index>def.stages.length)throw new Error('invalid-stage');
 if(typeof session.finished!=='boolean'||session.finished!==(session.stage_index===def.stages.length))throw new Error('invalid-finished');
 timestamp(session.created_at);timestamp(session.updated_at);
 return def;
}
export function newActivitySession(id,{sessionId,at=new Date().toISOString()}={}){
 const def=getActivity(id);
 if(!def)throw new Error('unknown-activity');
 if(!ID.test(sessionId||''))throw new Error('invalid-session-id');
 const date=timestamp(at);
 return {schema_version:1,id:sessionId,activity_id:def.id,activity_version:def.version,
  stage_index:0,marks:[],finished:false,created_at:date,updated_at:date,events:[]};
}
export function currentActivityStage(session){
 const def=validate(session);
 return session.finished?null:def.stages[session.stage_index]||null;
}
export function performActivity(session,actionId,{at=new Date().toISOString()}={}){
 const def=validate(session);
 if(session.finished)throw new Error('activity-completed');
 if(session.events.length>=MAX_EVENTS)throw new Error('maximum-attempts');
 const decision=resolveChoice(def.stages,session.stage_index,actionId,session.marks);
 const nextAt=timestamp(at);
 if(Date.parse(nextAt)<Date.parse(session.updated_at))throw new Error('backdated-action');
 const stage=decision.stage;
 const event={
  seq:session.events.length+1,stage_id:stage.id,action_id:decision.action.id,
  result:decision.result,competency_id:stage.competency,
  mark:decision.mark,at:nextAt
 };
 return {schema_version:1,id:session.id,activity_id:session.activity_id,activity_version:session.activity_version,
  stage_index:decision.nextIndex,marks:decision.marks,finished:decision.nextIndex===def.stages.length,
  created_at:session.created_at,updated_at:nextAt,events:[...session.events,event]};
}
export function replayActivity(saved){
 const def=validate(saved);
 let state=newActivitySession(def.id,{sessionId:saved.id,at:timestamp(saved.created_at)});
 for(const original of saved.events){
  if(!original||typeof original!=='object')throw new Error('invalid-event');
  state=performActivity(state,original.action_id,{at:original.at});
  const expected=state.events.at(-1);
  for(const key of ['seq','stage_id','action_id','result','competency_id','mark','at']){
   if(expected[key]!==original[key])throw new Error('tampered-event');
  }
 }
 if(state.stage_index!==saved.stage_index||state.finished!==saved.finished||
  state.updated_at!==saved.updated_at||JSON.stringify(state.marks)!==JSON.stringify(saved.marks)){
  throw new Error('tampered-activity');
 }
 return state;
}
export function activityFeedback(session){
 const def=validate(session),event=session.events.at(-1);
 if(!event)return null;
 const stage=def.stages.find(s=>s.id===event.stage_id);
 const action=stage?.actions.find(a=>a.id===event.action_id);
 return action?{result:event.result,text:action.feedback,stage:stage.title}:null;
}
export function summarizeActivities(sessions){
 const summary={total:0,completed:0,mci:{total:0,completed:0},equipment:{total:0,completed:0},reviews:0,observations:0};
 for(const saved of sessions){
  const item=replayActivity(saved),def=getActivity(item.activity_id),part=summary[def.kind];
  summary.total++;part.total++;
  if(item.finished){summary.completed++;part.completed++;}
  for(const evt of item.events){
   if(evt.result==='review')summary.reviews++;
   if(evt.mark)summary.observations++;
  }
 }
 return summary;
}
