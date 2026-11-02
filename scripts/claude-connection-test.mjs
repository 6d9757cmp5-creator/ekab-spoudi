// Manual connection test for the Claude API. Makes at most ONE tiny billable call (max_tokens 16)
// and only when CONFIRM_BILLABLE is exactly "YES". `--dry-run` makes no network call.
// Prints only status, model and token counts: never the key, the prompt or the reply text.
import {ANTHROPIC_URL,ANTHROPIC_VERSION,CLAUDE_MODELS,redact} from "../mentor/ai/claude-adapter.mjs";

export async function run({env=process.env,argv=process.argv.slice(2),fetchImpl=globalThis.fetch,log=console.log}={}){
 const key=env.ANTHROPIC_API_KEY||"";
 const dry=argv.includes("--dry-run");
 if(!key){log("FAIL: ANTHROPIC_API_KEY is not set in this environment.");return 2;}
 if(dry){log("DRY RUN: key present ("+key.length+" chars), model "+CLAUDE_MODELS[0]+", no request sent.");return 0;}
 if(env.CONFIRM_BILLABLE!=="YES"){log("REFUSED: set CONFIRM_BILLABLE=YES to allow one tiny billable call.");return 3;}
 let res;
 try{
  res=await fetchImpl(ANTHROPIC_URL,{method:"POST",
   headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":ANTHROPIC_VERSION},
   body:JSON.stringify({model:CLAUDE_MODELS[0],max_tokens:16,messages:[{role:"user",content:"Reply with: ok"}]})});
 }catch(e){log("FAIL: network error: "+redact(e?.message,key).slice(0,120));return 1;}
 let j=null;try{j=await res.json();}catch{}
 if(!res.ok){log("FAIL: HTTP "+res.status+(j?.error?.type?" ("+redact(j.error.type,key)+")":""));return 1;}
 log("OK: HTTP "+res.status+", model "+redact(j?.model,key)+", input_tokens "+(j?.usage?.input_tokens??"?")+", output_tokens "+(j?.usage?.output_tokens??"?"));
 return 0;
}
if(process.argv[1]?.endsWith("claude-connection-test.mjs"))process.exitCode=await run();