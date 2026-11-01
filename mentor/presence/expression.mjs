/**
 * Which facial expression and gesture MENTOR shows for each activity.
 * Ids are the ones the rigged avatar already understands (mentor/real-avatar/entry.mjs).
 */
export const CUES=Object.freeze({
 open:{id:"welcoming",gesture:"greet"},
 explain:{id:"explanatory",gesture:"explain"},
 guide:{id:"supportive",gesture:"encourage"},
 listen:{id:"patient",gesture:"question"},
 exam:{id:"examiner",gesture:"caution"},
 safety:{id:"caring",gesture:"reassure"},
 problem:{id:"caring",gesture:"reassure"}
});

/** Cue for a conversation turn, or null when MENTOR should keep its current expression. */
export function cueForTurn(turn){
 if(!turn||turn.role!=="mentor")return null;
 if(turn.mode==="refusal")return turn.reason==="exam"?CUES.exam:CUES.safety;
 if(turn.mode==="local"||turn.mode==="ai")return CUES.explain;
 return CUES.guide;
}
