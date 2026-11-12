// ATLA chat Worker. Educational answers grounded in the app's own published Greek material.
// Free models first (Cloudflare Workers AI, then any free provider whose key is set), paid Claude last
// and only when the owner has enabled it with a spend limit. Every answer passes the same safety audit;
// a failed answer moves on to the next model. Identical questions are answered from a cache.
import {buildClaudeRequest,callClaude,estimateInputTokens,clampMaxTokens} from '../../../mentor/ai/claude-adapter.mjs';
import {limitsFromEnv,tokenMatches,ipDigest,MentorBudget} from '../../../mentor/ai/guard.mjs';
import {ATLA_RUNTIME_RULES,teachingApproach,auditAssistantReply} from '../../../atla/ai/teaching-policy.mjs';
import {verifiedSseResponse} from '../../../atla/ai/safe-stream.mjs';
import corpus from '../corpus.json' with {type:'json'};
export {MentorBudget};

export const WORKERS_AI_MODELS=['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/google/gemma-4-26b-a4b-it','@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
const LEVELS=['beginner','student','advanced','scientific'];
const LEVEL_STYLE={
 beginner:'Εξήγησε πολύ απλά, με καθημερινές λέξεις και σύντομες προτάσεις.',
 student:'Εξήγησε σαφώς για σπουδαστή διασώστη, με σωστή ορολογία.',
 advanced:'Εξήγησε με περισσότερη τεχνική λεπτομέρεια και ορολογία.',
 scientific:'Εξήγησε επιστημονικά αναλυτικά, αλλά μόνο με όσα υπάρχουν στα αποσπάσματα.'
};
const IP_LIMIT=30, IP_WINDOW_MS=60*60*1000, CACHE_DAYS=7, MAX_OUTPUT=450;
const hits=new Map();
let day={key:'',count:0};

export const SYSTEM_PROMPT=
'Είσαι ο ATLA, ψηφιακός εκπαιδευτής για σπουδαστές διασώστες στην Ελλάδα. Δεν είσαι γιατρός ούτε εκπρόσωπος του ΕΚΑΒ. '+
'Χρησιμοποίησε ΜΟΝΟ όσα λένε τα αριθμημένα αποσπάσματα και βάλε μετά από κάθε πρόταση με πληροφορία την ένδειξη της πηγής, π.χ. [Τ1] ή [Τ2]. '+
'Οι ενδείξεις αφαιρούνται πριν δει ο σπουδαστής την απάντηση, οπότε μη γράφεις «σύμφωνα με το απόσπασμα» ή «η πηγή λέει». '+
'Μίλα σαν έμπειρος εκπαιδευτής που κάθεται δίπλα στον σπουδαστή: ζεστά, φυσικά, με δικά σου λόγια, όχι αντιγραφή του κειμένου. '+
'Δομή: πρώτα η ουσία σε μία-δύο προτάσεις, μετά το «γιατί» ή ένα απλό παράδειγμα από τη δουλειά του διασώστη, '+
'και στο τέλος μία σύντομη ερώτηση ελέγχου για να σκεφτεί ο σπουδαστής (χωρίς να δώσεις την απάντησή της). '+
'Αν τα αποσπάσματα δεν απαντούν στην ερώτηση, πες ειλικρινά τι δεν καλύπτουν και τι μπορεί να ρωτήσει αντί γι’ αυτό· μην μαντέψεις. '+
'Μη γράφεις αριθμούς που δεν υπάρχουν στα αποσπάσματα. Μη δίνεις δοσολογίες, διαγνώσεις ή οδηγίες για πραγματικό περιστατικό· για επείγον παρέπεμψε στο 166/112. '+
'Απάντησε στα ελληνικά, σε 80–180 λέξεις. '+ATLA_RUNTIME_RULES;

function cors(env,origin){
 const allowed=['https://6d9757cmp5-creator.github.io'];
 if(env.ALLOW_LOCAL==='true')allowed.push('http://localhost:8080','http://127.0.0.1:8080','http://127.0.0.1:8812');
 if(!allowed.includes(origin))return null;
 return {'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, x-mentor-test-token','access-control-expose-headers':'x-atla-provider','vary':'origin'};
}
const json=(body,status,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const str=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export const squash=text=>String(text??'').replace(/\s+/g,' ').trim();

export function validate(body){
 if(!body||typeof body!=='object')return null;
 const question=str(body.question,300);
 if(!question)return null;
 const passages=(Array.isArray(body.passages)?body.passages:[]).slice(0,4).map(p=>({id:str(p?.id,8),ref:str(p?.ref,200),term:str(p?.term,160),definition:str(p?.definition,700)})).filter(p=>p.id&&p.ref&&p.term&&p.definition);
 const history=(Array.isArray(body.history)?body.history:[]).slice(-4).map(h=>({role:h?.role==='user'?'user':'assistant',text:str(h?.text,400)})).filter(h=>h.text);
 return {question,passages,history,level:LEVELS.includes(body.level)?body.level:'student'};
}

/**
 * The browser is not an authority: a passage is accepted only if it is the title of a record in the
 * Worker's copy of the published material and its text appears there word for word. The copy is
 * rebuilt from the repository on every deployment (tools/atla-ai/build-worker-corpus.mjs).
 * This proves where a passage came from; it does not prove the passage is clinically correct.
 */
export function verifiedPassages(clientPassages,records=corpus.records){
 if(!Array.isArray(clientPassages)||!clientPassages.length)return [];
 const out=[];
 for(const p of clientPassages){
  const record=records[p.ref];
  if(!record||!/^T[1-4]$/.test(p.id)||out.some(x=>x.id===p.id||x.ref===p.ref))continue;
  // The browser marks a cut excerpt with "…" at either end; the rest must match exactly.
  let text=squash(p.definition);
  if(text.startsWith('…'))text=text.slice(1).trim();
  if(text.endsWith('…'))text=text.slice(0,-1).trim();
  // Long titles (EOPPEP questions) may arrive shortened by the browser; the start must still match.
  const term=squash(p.term),titleOk=term===record.title||term.length>=60&&record.title.startsWith(term);
  if(!titleOk||text.length<20&&text!==record.body||!record.body.includes(text))continue;
  out.push({id:p.id,ref:p.ref,term:record.title,definition:text});
 }
 return out;
}

export function buildMessages({question,passages,history,level}){
 const sources=passages.map(p=>`[${p.id}] ${p.term}: ${p.definition}`).join('\n');
 const approach=teachingApproach({question,level});
 return [
  {role:'system',content:SYSTEM_PROMPT+' '+LEVEL_STYLE[level]+' '+approach.style+' '+approach.depth},
  ...history.map(h=>({role:h.role,content:h.text})),
  {role:'user',content:`Αποσπάσματα:\n${sources}\n\nΕρώτηση σπουδαστή: ${question}`}
 ];
}

function limited(ip,env,now=Date.now()){
 const dayKey=new Date(now).toISOString().slice(0,10);
 if(day.key!==dayKey)day={key:dayKey,count:0};
 const cap=Number(env.DAILY_CAP||300);
 if(day.count>=cap)return true;
 const list=(hits.get(ip)||[]).filter(t=>now-t<IP_WINDOW_MS);
 if(list.length>=IP_LIMIT){hits.set(ip,list);return true;}
 list.push(now);hits.set(ip,list);day.count++;
 if(hits.size>5000)for(const [k,v] of hits)if(!v.some(t=>now-t<IP_WINDOW_MS))hits.delete(k);
 return false;
}
export function _resetLimits(){hits.clear();day={key:'',count:0};}

/** OpenAI-compatible free providers, used only when their key is set as a Worker secret. */
export function freeProviders(env){
 const list=[];
 if(env.GROQ_API_KEY)list.push({name:'groq',url:'https://api.groq.com/openai/v1/chat/completions',key:env.GROQ_API_KEY,model:env.GROQ_MODEL||'llama-3.3-70b-versatile'});
 if(env.GEMINI_API_KEY)list.push({name:'gemini',url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',key:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-2.5-flash'});
 if(env.OPENROUTER_API_KEY)list.push({name:'openrouter',url:'https://openrouter.ai/api/v1/chat/completions',key:env.OPENROUTER_API_KEY,model:env.OPENROUTER_MODEL||'meta-llama/llama-3.3-70b-instruct:free'});
 return list;
}
async function askOpenAiCompatible(p,messages){
 const r=await fetch(p.url,{method:'POST',headers:{authorization:'Bearer '+p.key,'content-type':'application/json'},
  body:JSON.stringify({model:p.model,messages,max_tokens:MAX_OUTPUT,temperature:0.3}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)return '';
 const j=await r.json();return typeof j?.choices?.[0]?.message?.content==='string'?j.choices[0].message.content:'';
}
async function askWorkersAi(env,model,messages){
 const r=await env.AI.run(model,{messages,max_tokens:MAX_OUTPUT,temperature:0.3});
 return typeof r?.response==='string'?r.response:typeof r?.choices?.[0]?.message?.content==='string'?r.choices[0].message.content:'';
}
async function askClaude(request,env,messages){
 if(env.MENTOR_CLAUDE_ENABLED!=='true'||env.MENTOR_SPEND_LIMIT_CONFIRMED!=='true'||!env.ANTHROPIC_API_KEY||!env.BUDGET)return '';
 let req;try{req=buildClaudeRequest({messages,model:env.MENTOR_MODEL,maxTokens:clampMaxTokens(env.CLAUDE_MAX_TOKENS)});}catch{return '';}
 const ipKey=await ipDigest(request.headers.get('cf-connecting-ip')||'unknown');
 const stub=env.BUDGET.get(env.BUDGET.idFromName('global'));
 const verdict=await (await stub.fetch('https://budget/charge',{method:'POST',body:JSON.stringify({ipKey,tokens:estimateInputTokens(messages)+req.max_tokens,limits:limitsFromEnv(env)})})).json();
 if(!verdict?.ok)return '';
 const out=await callClaude({apiKey:env.ANTHROPIC_API_KEY,request:req,signal:AbortSignal.timeout(25000)});
 if(!out.ok)return '';
 return collectTokens(out.stream);
}

/** Joins the {token} events of a converted Claude stream; the caller audits the result. */
async function collectTokens(stream){
 const reader=stream.getReader(),dec=new TextDecoder();let buf='',text='';
 for(;;){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let nl;
  while((nl=buf.indexOf('\n'))>=0){const line=buf.slice(0,nl).trim();buf=buf.slice(nl+1);if(!line.startsWith('data:'))continue;const d=line.slice(5).trim();if(d==='[DONE]')continue;try{const j=JSON.parse(d);if(typeof j.token==='string')text+=j.token}catch{}}
  if(text.length>6000)break;}
 return text;
}
/** Tries each model in order; the first answer that passes the safety audit wins. */
export async function answer(request,env,body,{askers}={}){
 const messages=buildMessages(body);
 const chain=askers||[
  ...(env.MENTOR_FREE_PLAN_CONFIRMED==='true'&&env.AI?WORKERS_AI_MODELS.map(m=>({name:m.split('/').pop(),ask:()=>askWorkersAi(env,m,messages)})):[]),
  ...freeProviders(env).map(p=>({name:p.name,ask:()=>askOpenAiCompatible(p,messages)})),
  {name:'claude',ask:()=>askClaude(request,env,messages)}
 ];
 for(const step of chain){
  let text='';
  try{text=String(await step.ask()||'').trim();}catch{text='';}
  if(text&&auditAssistantReply(text,body.passages).ok)return {text,provider:step.name};
 }
 return null;
}

async function cacheKey(body){
 const material=JSON.stringify({q:squash(body.question).toLocaleLowerCase('el'),p:body.passages.map(p=>p.ref+'|'+p.definition),l:body.level});
 const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(material));
 return new Request('https://atla-cache.invalid/v1/'+[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join(''));
}

async function feedback(request,env,headers){
 if(!env.BUDGET)return json({error:'disabled'},503,headers);
 const stub=env.BUDGET.get(env.BUDGET.idFromName('global'));
 if(request.method==='GET'){
  if(!tokenMatches(request.headers.get('x-atla-admin')||'',env.ATLA_ADMIN_TOKEN))return json({error:'unauthorized'},401);
  return new Response((await stub.fetch('https://budget/feedback/list')).body,{headers:{'content-type':'application/json'}});
 }
 let b;try{b=await request.json();}catch{return json({error:'bad_request'},400,headers);}
 const item={vote:b?.vote==='up'?'up':'down',question:str(b?.question,300),answer:str(b?.answer,1500),provider:str(b?.provider,40),note:str(b?.note,300),at:new Date().toISOString()};
 if(!item.question)return json({error:'bad_request'},400,headers);
 await stub.fetch('https://budget/feedback/add',{method:'POST',body:JSON.stringify(item)});
 return json({ok:true},200,headers);
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/feedback'&&request.method==='GET')return feedback(request,env,{});
  const origin=request.headers.get('origin')||'';
  const headers=cors(env,origin);
  if(!headers)return json({error:'forbidden'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'method'},405,headers);
  if(url.pathname==='/feedback')return feedback(request,env,headers);
  let body;
  try{if(Number(request.headers.get('content-length')||0)>12000)return json({error:'too_large'},413,headers);body=validate(await request.json());}catch{body=null;}
  if(!body)return json({error:'bad_request'},400,headers);
  body.passages=verifiedPassages(body.passages);
  if(!body.passages.length)return json({error:'no_sources'},422,headers);
  // Follow-up questions depend on the conversation, so only first questions are cached.
  const key=body.history.length?null:await cacheKey(body);
  if(key){const hit=await caches.default.match(key);if(hit){const c=await hit.json();return verifiedSseResponse(c.text,{...headers,'x-atla-provider':c.provider+'+cache'});}}
  if(limited(request.headers.get('cf-connecting-ip')||'unknown',env))return json({error:'limit'},429,{...headers,'retry-after':'3600'});
  const result=await answer(request,env,body);
  if(!result)return json({error:'unavailable'},503,headers);
  if(key)ctx?.waitUntil?.(caches.default.put(key,new Response(JSON.stringify(result),{headers:{'content-type':'application/json','cache-control':'max-age='+CACHE_DAYS*86400}})));
  return verifiedSseResponse(result.text,{...headers,'x-atla-provider':result.provider});
 }
};
