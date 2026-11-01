/**
 * Shared deterministic step transition engine for MENTOR OS practice modules.
 * Medical consequences are never inferred; only authored, review-labeled steps run.
 */
export function resolveChoice(stages,stageIndex,actionId,completed=[]){
  if(!Array.isArray(stages)||!Number.isInteger(stageIndex)||stageIndex<0||stageIndex>=stages.length)throw new Error('invalid-stage');
  if(!Array.isArray(completed)||!completed.every(x=>typeof x==='string'))throw new Error('invalid-marks');
  const stage=stages[stageIndex];
  const action=stage.actions?.find(a=>a.id===actionId);
  if(!action)throw new Error('invalid-action');
  if(!['practice','review'].includes(action.outcome))throw new Error('invalid-outcome');
  const mark=action.mark||null;
  if(mark&&completed.includes(mark))throw new Error('already-observed');
  const marks=mark&&action.outcome==='practice'?[...completed,mark]:[...completed];
  const required=stage.required_marks||[];
  if(!Array.isArray(required)||!required.every(x=>typeof x==='string'))throw new Error('invalid-required-marks');
  const advance=action.outcome==='practice'&&required.every(x=>marks.includes(x));
  return {
    stage,action,result:action.outcome,advanced:advance,
    nextIndex:stageIndex+(advance?1:0),
    marks:advance?[]:marks,
    mark
  };
}
