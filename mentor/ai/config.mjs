/**
 * MENTOR AI settings. The endpoint is deliberately EMPTY: no AI request is ever sent until
 * the owner deploys workers/mentor-chat, confirms the provider's Free plan, and sets the URL.
 * No keys belong here; secrets live only in the Worker.
 */
export const MENTOR_AI={endpoint:"",timeoutMs:20000};

/**
 * Private test mode: while the Worker is not public it needs a test token. The owner stores it
 * in this browser once (sessionStorage key below); it is never shipped in code and never logged.
 */
export function mentorAiHeaders(storage=globalThis.sessionStorage){
 try{const t=storage?.getItem("ekab.mentor.ai.token");return t?{"x-mentor-test-token":t}:{};}catch{return {};}
}
