/**
 * Pure, deterministic Mentor simulation engine.
 * The state machine is educational, not a clinical physiology simulator.
 * Does not import or mutate any EKAB/SAEK/EOPPEP grade or progress modules.
 */
import {getCase,COMPETENCIES} from './scenarios.mjs';
import {resolveChoice} from './workflow.mjs';
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const MAX_EVENTS=64;
function iso(at){
  if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||at.length>40)throw new Error('invalid-time');
  return new Date(at).toISOString();
}
function assertId(id){if(!ID.test(id||''))throw new Error('invalid-session-id');}
function validateBase(session){
  if(!session||typeof session!=='object'||Array.isArray(session))throw new Error('invalid-session');
  const def=getCase(session.case_id);
  if(!def||session.schema_version!==1||session.case_version!==def.version)throw new Error('unknown-case-version');
  assertId(session.id);
  if(!Array.isArray(session.events)||session.events.length>MAX_EVENTS)throw new Error('invalid-events');
  return def;
}
export function newSession(caseId,{id,at=new Date().toISOString()}={}){
  const def=getCase(caseId);
  if(!def)throw new Error('unknown-case');
  assertId(id);
  const timestamp=iso(at);
  return {schema_version:1,id,case_id:def.id,case_version:def.version,stage_index:0,finished:false,
    created_at:timestamp,updated_at:timestamp,events:[]};
}
export function currentPhase(session){
  const def=validateBase(session);
  if(!Number.isInteger(session.stage_index)||session.stage_index<0||session.stage_index>def.phases.length)throw new Error('invalid-stage');
  return session.finished?null:def.phases[session.stage_index]||null;
}
export function perform(session,actionId,{at=new Date().toISOString()}={}){
  const def=validateBase(session);
  if(session.finished)throw new Error('case-completed');
  if(session.events.length>=MAX_EVENTS)throw new Error('maximum-attempts');
  const decision=resolveChoice(def.phases,session.stage_index,actionId);
  const {stage:phase,action,result}=decision;
  const timestamp=iso(at);
  if(Date.parse(timestamp)<Date.parse(session.updated_at))throw new Error('backdated-action');
  const nextStage=decision.nextIndex;
  const event={seq:session.events.length+1,stage_id:phase.id,action_id:action.id,
    result,competency_id:phase.id,at:timestamp};
  return {schema_version:1,id:session.id,case_id:session.case_id,case_version:session.case_version,
    stage_index:nextStage,finished:nextStage===def.phases.length,
    created_at:session.created_at,updated_at:timestamp,events:[...session.events,event]};
}
/** Defensively rebuild a saved session from its event log. Reject tampered state. */
export function replay(saved){
  const def=validateBase(saved);
  const created=iso(saved.created_at);
  let state=newSession(def.id,{id:saved.id,at:created});
  for(const given of saved.events){
    if(!given||typeof given!=='object')throw new Error('invalid-event');
    state=perform(state,given.action_id,{at:given.at});
    const event=state.events.at(-1);
    for(const key of ['seq','stage_id','action_id','result','competency_id','at']){
      if(event[key]!==given[key])throw new Error('tampered-event');
    }
  }
  if(state.stage_index!==saved.stage_index||state.finished!==saved.finished||state.updated_at!==saved.updated_at){
    throw new Error('tampered-session');
  }
  return state;
}
export function feedbackFor(session){
  const def=validateBase(session);
  const event=session.events.at(-1);
  if(!event)return null;
  const phase=def.phases.find(p=>p.id===event.stage_id);
  const option=phase?.actions.find(a=>a.id===event.action_id);
  return option?{result:event.result,text:option.feedback,competency:COMPETENCIES[event.competency_id]||event.competency_id}:null;
}
export function summarize(sessions){
  const competencies=Object.fromEntries(Object.entries(COMPETENCIES).map(([id,label])=>[id,{id,label,attempts:0,practiced:0,needs_review:0}]));
  let completed=0,total=0,events=0;
  for(const source of sessions){
    const session=replay(source);
    total++;
    if(session.finished)completed++;
    for(const evt of session.events){
      const c=competencies[evt.competency_id];
      if(!c)continue;
      c.attempts++;events++;
      if(evt.result==='practice')c.practiced++;
      else c.needs_review++;
    }
  }
  const due=Object.values(competencies).filter(c=>c.needs_review>0).sort((a,b)=>b.needs_review-a.needs_review);
  return {total_sessions:total,completed_sessions:completed,events,competencies,
    suggested_focus:due[0]?.id||Object.values(competencies).find(c=>!c.practiced)?.id||null};
}
