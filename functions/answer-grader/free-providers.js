// Server only. Free account status must be verified before enabling Groq.
// No paid model, arbitrary URL, automatic purchase or OpenAI fallback.
export function freeProviders(env=process.env){
 const providers=[];
 const cloudModel=env.CLOUDFLARE_FREE_MODEL||'@cf/meta/llama-3.3-70b-instruct-fp8-fast';
 if(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_FREE_PLAN_CONFIRMED==='true' &&
  /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID||'') &&
  ['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/meta/llama-3.1-8b-instruct-fp8-fast'].includes(cloudModel))providers.push({
   id:'cloudflare',model:cloudModel,key:env.CLOUDFLARE_API_TOKEN,
   url:'https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/ai/v1/chat/completions'
  });
 // Groq disabled until a free, non-OpenAI production model is verified.
 const model=env.OPENROUTER_FREE_MODEL||'';
 // Never allow :nitro, paid names, implicit defaults or automatic paid routing.
 if(env.OPENROUTER_API_KEY && ['google/gemma-4-31b-it:free','nvidia/nemotron-3.5-super-vl:free'].includes(model))providers.push({
  id:'openrouter',model,key:env.OPENROUTER_API_KEY,
  url:'https://openrouter.ai/api/v1/chat/completions'
 });
 return providers;
}
export async function requestFreeGrade(provider,messages){
 const body={model:provider.model,messages,temperature:0,max_tokens:1800,
  response_format:{type:'json_object'},reasoning:{enabled:false}};
 if(provider.id==='openrouter')body.provider={max_price:{prompt:0,completion:0,request:0},ignore:['OpenAI'],allow_fallbacks:false};
 const response=await fetch(provider.url,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+provider.key},
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error('provider_http_'+response.status);
 const data=await response.json(),choice=data.choices?.[0];
 if(choice?.finish_reason!=='stop'||typeof choice.message?.content!=='string')throw new Error('Incomplete result');
 return JSON.parse(choice.message.content);
}
