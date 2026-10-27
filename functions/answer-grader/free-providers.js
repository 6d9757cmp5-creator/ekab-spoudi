// Server only. Free account status must be verified before enabling Groq.
// No paid model, arbitrary URL, automatic purchase or OpenAI fallback.
export function freeProviders(env=process.env){
 const providers=[];
 if(env.GROQ_API_KEY && env.GROQ_FREE_PLAN_CONFIRMED==='true')providers.push({
  id:'groq',model:'openai/gpt-oss-20b',key:env.GROQ_API_KEY,
  url:'https://api.groq.com/openai/v1/chat/completions'
 });
 const model=env.OPENROUTER_FREE_MODEL||'';
 // Never allow :nitro, paid names, implicit defaults or automatic paid routing.
 if(env.OPENROUTER_API_KEY && /^[a-zA-Z0-9._/-]+:free$/.test(model))providers.push({
  id:'openrouter',model,key:env.OPENROUTER_API_KEY,
  url:'https://openrouter.ai/api/v1/chat/completions'
 });
 return providers;
}
export async function requestFreeGrade(provider,messages){
 const body={model:provider.model,messages,temperature:0,max_tokens:1200,
  response_format:{type:'json_object'}};
 if(provider.id==='openrouter')body.provider={max_price:{prompt:0,completion:0},allow_fallbacks:false};
 const response=await fetch(provider.url,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+provider.key},
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error('Free provider unavailable');
 const data=await response.json(),choice=data.choices?.[0];
 if(choice?.finish_reason!=='stop'||typeof choice.message?.content!=='string')throw new Error('Incomplete result');
 return JSON.parse(choice.message.content);
}
