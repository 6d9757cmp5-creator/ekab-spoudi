// Server only. Every provider requires a verified free account and an explicit model allowlist.
// No paid model, arbitrary URL, automatic purchase or OpenAI fallback.
export function freeProviders(env=process.env){
 const providers=[];
 const cloudModel=env.CLOUDFLARE_FREE_MODEL||'@cf/meta/llama-3.3-70b-instruct-fp8-fast';
 if(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_FREE_PLAN_CONFIRMED==='true' &&
  /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID||'') &&
  ['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/meta/llama-3.1-8b-instruct-fp8-fast',
   '@cf/zai-org/glm-4.7-flash','@cf/google/gemma-4-26b-a4b-it',
   '@cf/nvidia/nemotron-3-120b-a12b'].includes(cloudModel))providers.push({
   id:'cloudflare',model:cloudModel,key:env.CLOUDFLARE_API_TOKEN,
   url:'https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/ai/v1/chat/completions'
  });
 // Additional providers stay disabled until a Free account and its server-side key are verified.
 if(env.GROQ_API_KEY && env.GROQ_FREE_PLAN_CONFIRMED==='true')providers.push({
  id:'groq',model:'qwen/qwen3.8-27b',key:env.GROQ_API_KEY,
  url:'https://api.groq.com/openai/v1/chat/completions'
 });
 if(env.MISTRAL_API_KEY && env.MISTRAL_FREE_PLAN_CONFIRMED==='true')providers.push({
  id:'mistral',model:'mistral-small-latest',key:env.MISTRAL_API_KEY,
  url:'https://api.mistral.ai/v1/chat/completions'
 });
 if(env.CEREBRAS_API_KEY && env.CEREBRAS_FREE_PLAN_CONFIRMED==='true')providers.push({
  id:'cerebras',model:'zai-glm-4.7',key:env.CEREBRAS_API_KEY,
  url:'https://api.cerebras.ai/v1/chat/completions'
 });
 const model=env.OPENROUTER_FREE_MODEL||'';
 // Never allow :nitro, paid names, implicit defaults or automatic paid routing.
 if(env.OPENROUTER_API_KEY && ['google/gemma-4-31b-it:free','nvidia/nemotron-3.5-super-vl:free'].includes(model))providers.push({
  id:'openrouter',model,key:env.OPENROUTER_API_KEY,
  url:'https://openrouter.ai/api/v1/chat/completions'
 });
 const geminiModel=env.GEMINI_FREE_MODEL||'gemini-2.5-flash-lite';
 // Explicit opt-in after verifying the Gemini API project is on the free tier.
 if(env.GEMINI_API_KEY && env.GEMINI_FREE_PLAN_CONFIRMED==='true' &&
  ['gemini-2.5-flash-lite','gemini-2.5-flash'].includes(geminiModel))providers.push({
   id:'gemini',model:geminiModel,key:env.GEMINI_API_KEY,
   url:'https://generativelanguage.googleapis.com/v1beta/models/'+geminiModel+':generateContent'
  });
 return providers;
}
export async function requestFreeGrade(provider,messages){
 if(provider.id==='gemini'){
  const response=await fetch(provider.url,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':provider.key},
   body:JSON.stringify({systemInstruction:{parts:[{text:messages[0].content}]},
    contents:[{role:'user',parts:[{text:messages[1].content}]}],
    generationConfig:{temperature:0,maxOutputTokens:1800,responseMimeType:'application/json'}}),
   signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error('provider_http_'+response.status);
  const data=await response.json();
  const candidate=data.candidates?.[0];
  if(candidate?.finishReason!=='STOP')throw new Error('Incomplete result');
  const content=candidate.content?.parts?.filter(p=>typeof p.text==='string').map(p=>p.text).join('');
  if(!content)throw new Error('Invalid AI response');
  return JSON.parse(content);
 }
 const body={model:provider.model,messages,temperature:0,max_tokens:1800,
  response_format:{type:'json_object'}};
 if(provider.id==='cerebras')body.reasoning_effort='none';
 if(provider.id==='openrouter')body.reasoning={enabled:false};
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

