/** ATLA canonical AI configuration. Disabled until backend deployment is verified. */
export const ATLA_AI=Object.freeze({endpoint:"",timeoutMs:20000});
/** Legacy API name for old MENTOR importers until all consumers migrate. */
export const MENTOR_AI=ATLA_AI;
/** Keeps the existing browser test token key; never sends API secrets to the client. */
export function atlaAiHeaders(storage=globalThis.sessionStorage){
 try{const token=storage?.getItem("ekab.mentor.ai.token");return token?{"x-mentor-test-token":token}:{};}
 catch{return {};}
}
export const mentorAiHeaders=atlaAiHeaders;
