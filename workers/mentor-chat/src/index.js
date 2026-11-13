// ATLA chat Worker. Educational answers grounded in the app's own published Greek material.
// Free models first (any free provider whose key is set, then Cloudflare Workers AI), then low-cost
// DeepSeek if its key is set, paid Claude last
// and only when the owner has enabled it with a spend limit. Every answer passes the same safety audit;
// a failed answer moves on to the next model. Identical questions are answered from a cache.
import {buildClaudeRequest,callClaude,estimateInputTokens,clampMaxTokens} from '../../../mentor/ai/claude-adapter.mjs';
import {limitsFromEnv,tokenMatches,ipDigest,MentorBudget} from '../../../mentor/ai/guard.mjs';
import {ATLA_RUNTIME_RULES,teachingApproach,auditAssistantReply} from '../../../atla/ai/teaching-policy.mjs';
import {verifiedSseResponse} from '../../../atla/ai/safe-stream.mjs';
import {tokens,shardOf,normGreek} from '../../../tools/atla-ai/books/text.mjs';
import corpus from '../corpus.json' with {type:'json'};
export {MentorBudget};

// Gemma (gemma-4-26b-a4b-it) never answered in the checks of 12/11/2026, so Mistral Small 3.1 takes its place.
export const WORKERS_AI_MODELS=['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/mistralai/mistral-small-3.1-24b-instruct','@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
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
'Τα αποσπάσματα από αγγλικά βιβλία τα αποδίδεις στα ελληνικά, μόνο όσο σχετίζονται με την ερώτηση. Η ελληνική ύλη (ΣΑΕΚ, ΕΟΠΠΕΠ) έχει προτεραιότητα· αν διαφωνεί με βιβλίο, ακολούθησε την ελληνική ύλη. '+
'Αν τα αποσπάσματα δεν απαντούν στην ερώτηση, πες ειλικρινά τι δεν καλύπτουν και τι μπορεί να ρωτήσει αντί γι’ αυτό· μην μαντέψεις. '+
'Μη γράφεις αριθμούς που δεν υπάρχουν στα αποσπάσματα. Μη δίνεις δοσολογίες, διαγνώσεις ή οδηγίες για πραγματικό περιστατικό· για επείγον παρέπεμψε στο 166/112. '+
'Απάντησε στα ελληνικά, σε 80–180 λέξεις. '+ATLA_RUNTIME_RULES;

function cors(env,origin){
 const allowed=['https://6d9757cmp5-creator.github.io'];
 if(env.ALLOW_LOCAL==='true')allowed.push('http://localhost:8080','http://127.0.0.1:8080','http://127.0.0.1:8812');
 if(!allowed.includes(origin))return null;
 return {'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, x-mentor-test-token, x-atla-admin','access-control-expose-headers':'x-atla-provider, x-atla-trace','vary':'origin'};
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

const KEYWORD_PROMPT=question=>[
 {role:'system',content:'Translate the student question into 2 to 5 English medical search keywords. Reply only with the keywords, separated by commas.'},
 {role:'user',content:question}];
/** English keywords for the open textbooks: glossary names found in the question, plus a short translation by the small free model. */
async function bookKeywords(env,question,glossary){
 const q=normGreek(question);
 const words=Object.entries(glossary||{}).filter(([greek])=>q.includes(greek)).map(([,en])=>en);
 if(env.AI){
  try{
   const r=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast',{messages:KEYWORD_PROMPT(question),max_tokens:40,temperature:0});
   words.push(String(r?.response||'').slice(0,200));
  }catch{}
 }
 // Workers AI unavailable (daily limit): the first free provider translates instead, in a few tokens.
 if(words.length<2)for(const p of freeProviders(env).slice(0,2)){
  try{words.push(String(await askOpenAiCompatible(p,KEYWORD_PROMPT(question),{maxTokens:40})).slice(0,200));break;}catch{}
 }
 return [...new Set(tokens(words.join(' ')))].slice(0,8);
}

/**
 * Up to two passages from the open textbooks (Cloudflare static assets built on every deployment by
 * tools/atla-ai/books/build-book-assets.mjs). The Worker reads them itself, so their text is exact.
 * A chunk is used only if its search words weigh enough (MIN_BOOK_SCORE).
 */
const MIN_BOOK_SCORE=10;
export async function bookPassages(env,question,firstNumber,{keywords=bookKeywords}={}){
 if(!env.BOOKS||firstNumber>8)return [];
 const asset=async path=>{try{const r=await env.BOOKS.fetch(new Request('https://books/'+path));return r.ok?await r.json():null;}catch{return null;}};
 const meta=await asset('books.json');
 if(!meta)return [];
 const terms=await keywords(env,question,meta.glossary);
 if(!terms.length)return [];
 const shardIds=[...new Set(terms.map(shardOf))];
 const shards=Object.fromEntries(await Promise.all(shardIds.map(async s=>[s,await asset('index/'+s+'.json')||{}])));
 const score=new Map(),matched=new Map();
 // Words too common in the books ("signs", "treatment") are not indexed and so do not count.
 const indexed=terms.filter(t=>shards[shardOf(t)][t]);
 for(const t of indexed)for(const [chunk,weight] of shards[shardOf(t)][t]){
  score.set(chunk,(score.get(chunk)||0)+weight);matched.set(chunk,(matched.get(chunk)||0)+1);
 }
 // One strongly weighted word is enough ("hypoxia" in its definition); more words add a little.
 const rank=c=>score.get(c)*(1+0.3*(matched.get(c)-1));
 const best=[...score.keys()].filter(c=>rank(c)>=MIN_BOOK_SCORE).sort((a,b)=>rank(b)-rank(a)).slice(0,2);
 const out=[];
 for(const index of best){
  const group=await asset('chunks/'+Math.floor(index/meta.group)+'.json');
  const chunk=group?.[index%meta.group],book=chunk&&meta.books[chunk.book];
  if(!book)continue;
  out.push({id:'T'+(firstNumber+out.length),ref:`book:${chunk.book}#${index}`,term:book.title+(chunk.page?' · σ. '+chunk.page:''),
   definition:chunk.text.slice(0,1200),book:{title:book.title,origin:book.origin,licence:book.licence,publisher:book.publisher||''}});
 }
 return out;
}

export function buildMessages({question,passages,history,level}){
 const sources=passages.map(p=>p.book?`[${p.id}] (αγγλικό βιβλίο: ${p.term}) ${p.definition}`:`[${p.id}] ${p.term}: ${p.definition}`).join('\n');
 const approach=teachingApproach({question,level});
 return [
  {role:'system',content:SYSTEM_PROMPT+' '+LEVEL_STYLE[level]+' '+approach.style+' '+approach.depth},
  ...history.map(h=>({role:h.role,content:h.text})),
  {role:'user',content:`Αποσπάσματα:\n${sources}\n\nΕρώτηση σπουδαστή: ${question}`}
 ];
}

/** Per-IP hourly limit and a daily cap. The owner's weekly check (admin token) skips only the per-IP limit. */
export function limited(ip,env,now=Date.now(),{trusted=false}={}){
 const dayKey=new Date(now).toISOString().slice(0,10);
 if(day.key!==dayKey)day={key:dayKey,count:0};
 const cap=Number(env.DAILY_CAP||300);
 if(day.count>=cap)return true;
 if(trusted){day.count++;return false;}
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
 // Groq first (largest free quota, answered reliably in the live checks); Gemini second with a short timeout.
 if(env.GROQ_API_KEY)list.push({name:'groq',url:'https://api.groq.com/openai/v1/chat/completions',modelsUrl:'https://api.groq.com/openai/v1/models',key:env.GROQ_API_KEY,model:env.GROQ_MODEL||'llama-3.3-70b-versatile'});
 if(env.GEMINI_API_KEY)list.push({name:'gemini',url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',modelsUrl:'https://generativelanguage.googleapis.com/v1beta/openai/models',key:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.8-flash'});
 if(env.OPENROUTER_API_KEY)list.push({name:'openrouter',url:'https://openrouter.ai/api/v1/chat/completions',modelsUrl:'https://openrouter.ai/api/v1/models',key:env.OPENROUTER_API_KEY,model:env.OPENROUTER_MODEL||'meta-llama/llama-3.3-70b-instruct:free'});
 return list;
}

// Providers retire models; on a 404 the Worker reads the provider's model list and takes the best
// general chat model in this order of preference (OpenRouter: free models only).
const MODEL_PREFERENCES={
 groq:[/llama-3\.3-70b/,/gpt-oss-120b/,/llama.*70b/,/qwen/,/gpt-oss/,/llama/],
 gemini:[/^gemini-[0-9.]+-flash$/,/^gemini-[0-9.]+-pro$/,/^gemini-[0-9.]+-flash/,/^gemini-/],
 openrouter:[/llama-3\.3-70b.*:free$/,/deepseek.*:free$/,/qwen.*:free$/,/gemma.*:free$/,/mistral.*:free$/,/llama.*:free$/,/:free$/],
 deepseek:[/^deepseek-chat$/,/^deepseek-/]
};
const NOT_CHAT=/embed|tts|image|audio|whisper|guard|orpheus|live|native|transcri|vision-only|safeguard|realtime/i;
const versionOf=id=>(id.match(/\d+(?:\.\d+)?/g)||['0']).map(Number);
/** The preferred chat model among the ids a provider lists now (highest version first), or ''. */
export function pickModel(name,ids){
 const clean=[...new Set((ids||[]).map(id=>String(id).replace(/^models\//,'')))].filter(id=>!NOT_CHAT.test(id));
 for(const pattern of MODEL_PREFERENCES[name]||[]){
  const found=clean.filter(id=>pattern.test(id)).sort((a,b)=>{const x=versionOf(a),y=versionOf(b);for(let i=0;i<Math.max(x.length,y.length);i++){if((y[i]||0)!==(x[i]||0))return (y[i]||0)-(x[i]||0);}return a.localeCompare(b);});
  if(found.length)return found[0];
 }
 return '';
}
const discovered=new Map();
async function currentModel(p){
 const known=discovered.get(p.name);
 if(known&&Date.now()-known.at<6*3600e3)return known.model;
 try{
  const r=await fetch(p.modelsUrl,{headers:{authorization:'Bearer '+p.key},signal:AbortSignal.timeout(8000)});
  if(!r.ok)return '';
  const j=await r.json();
  const model=pickModel(p.name,(j?.data||j?.models||[]).map(m=>m?.id||m?.name));
  if(model)discovered.set(p.name,{model,at:Date.now()});
  return model;
 }catch{return '';}
}
/** Low-cost paid providers (prepaid balance, no auto top-up): only after every free model failed, before Claude. */
export const REASONING_MODEL=/gemini|gpt-oss|qwen3|deepseek-r|reason|thinking/i;
export function cheapPaidProviders(env){
 return env.DEEPSEEK_API_KEY?[{name:'deepseek',url:'https://api.deepseek.com/chat/completions',key:env.DEEPSEEK_API_KEY,model:env.DEEPSEEK_MODEL||'deepseek-chat'}]:[];
}
async function askOpenAiCompatible(p,messages,{maxTokens=MAX_OUTPUT}={}){
 // Reasoning models (Gemini, gpt-oss, Qwen3…) spend max_tokens on thinking first: ask for little
 // thinking and leave room for the answer, else the reply comes back empty or too late.
 let lowEffort=true;
 const call=async model=>{
  p.used=model;
  const reasoning=REASONING_MODEL.test(model);
  const extra=reasoning&&lowEffort?{reasoning_effort:'low'}:{};
  let r=await fetch(p.url,{method:'POST',headers:{authorization:'Bearer '+p.key,'content-type':'application/json'},
   body:JSON.stringify({model,messages,max_tokens:reasoning?Math.min(maxTokens*3,1500):maxTokens,temperature:0.3,...extra}),
   signal:AbortSignal.timeout(p.name==='gemini'?12000:15000)});
  if(r.status===400&&extra.reasoning_effort){lowEffort=false;r=await call(model);}
  return r;
 };
 const remembered=discovered.get(p.name)?.model;
 let r=await call(remembered||p.model);
 // A retired model (404, or 400 on some providers): find the current one once and retry.
 if((r.status===404||r.status===400)&&p.modelsUrl){
  const model=await currentModel(p);
  if(model&&model!==(remembered||p.model))r=await call(model);
 }
 // The status code (never the key or the reply) explains a failure in x-atla-trace: 401 key, 404 model, 429 quota.
 if(!r.ok)throw Error('http-'+r.status);
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
/** A short, safe reason for a failed model call: an HTTP status, the Workers AI daily limit, or a timeout. */
export function failureReason(error){
 const m=String(error?.message||'');
 if(/^http-[0-9]{3}$/.test(m))return m;
 if(/4006|neuron|allocation/i.test(m))return 'daily-limit';
 if(/timeout|abort/i.test(m))return 'timeout';
 return 'error';
}
/** The conversation plus the model's own answer and a request to add the source markers. */
export function citeRepair(messages,draft){
 return [...messages,{role:'assistant',content:draft},
  {role:'user',content:'Ξαναγράψε ακριβώς την ίδια απάντηση, βάζοντας μετά από κάθε πρόταση με πληροφορία την ένδειξη του αποσπάσματος από το οποίο προέρχεται, π.χ. [Τ1]. Αφαίρεσε ό,τι δεν στηρίζεται σε απόσπασμα. Γράψε μόνο την απάντηση.'}];
}
/** Tries each model in order; the first answer that passes the safety audit wins. */
export async function answer(request,env,body,{askers,deadlineMs=27000}={}){
 const messages=buildMessages(body);
 const chain=askers||[
  // Free providers with a key go first: their daily free quotas are far larger than the ~10,000
  // Workers AI neurons (about 70 answers), which then remain as the fallback.
  ...freeProviders(env).map(p=>({name:p.name,label:()=>p.name+'/'+(p.used||p.model),ask:()=>askOpenAiCompatible(p,messages),repair:t=>askOpenAiCompatible(p,citeRepair(messages,t))})),
  ...(env.MENTOR_FREE_PLAN_CONFIRMED==='true'&&env.AI?WORKERS_AI_MODELS.map(m=>({name:m.split('/').pop(),ask:()=>askWorkersAi(env,m,messages),repair:t=>askWorkersAi(env,m,citeRepair(messages,t))})):[]),
  ...cheapPaidProviders(env).map(p=>({name:p.name,ask:()=>askOpenAiCompatible(p,messages)})),
  {name:'claude',ask:()=>askClaude(request,env,messages)}
 ];
 const trace=[];
 let repaired=false;
 // The browser waits 35 s; past ~27 s another model could not answer in time, so stop trying.
 const started=Date.now();
 for(const step of chain){
  if(Date.now()-started>deadlineMs){trace.push('deadline');break;}
  let text='';
  let failure='no-answer';
  try{text=String(await step.ask()||'').trim();}catch(e){text='';failure=failureReason(e);}
  let verdict=text?auditAssistantReply(text,body.passages):{ok:false,reason:failure};
  // Free models often write a good answer but forget the [Τ1] markers. Once per question, the same
  // free model is asked to add them; the rewrite passes the full audit again. Never for the paid model.
  if(!verdict.ok&&verdict.reason==='missing-or-unknown-citation'&&!repaired&&step.repair){
   repaired=true;
   trace.push((step.label?.()||step.name)+':'+verdict.reason);
   try{text=String(await step.repair(text)||'').trim();}catch{text='';}
   verdict=text?auditAssistantReply(text,body.passages):{ok:false,reason:'no-answer'};
   if(verdict.ok)return {text,provider:(step.label?.()||step.name)+'+cite',trace};
   trace.push((step.label?.()||step.name)+'+cite:'+verdict.reason);
   continue;
  }
  if(verdict.ok)return {text,provider:step.label?.()||step.name,trace};
  trace.push((step.label?.()||step.name)+':'+verdict.reason);
 }
 return {text:'',provider:'',trace};
}

async function cacheKey(body){
 const material=JSON.stringify({q:squash(body.question).toLocaleLowerCase('el'),p:body.passages.map(p=>p.ref+'|'+p.definition),l:body.level});
 const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(material));
 // v2: answers may also draw on the open textbooks, so answers cached before them are not reused.
 return new Request('https://atla-cache.invalid/v2/'+[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join(''));
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
  if(key){const hit=await caches.default.match(key);if(hit){const c=await hit.json();return verifiedSseResponse(c.text,{...headers,'x-atla-provider':c.provider+'+cache'},c.sources);}}
  const trusted=tokenMatches(request.headers.get('x-atla-admin')||'',env.ATLA_ADMIN_TOKEN);
  if(limited(request.headers.get('cf-connecting-ip')||'unknown',env,Date.now(),{trusted}))return json({error:'limit'},429,{...headers,'retry-after':'3600'});
  // Textbook passages come after the Greek material (T1–T4) and are sent back to the browser,
  // which checks the answer against the same passages and names the book under the answer.
  const fromBooks=await bookPassages(env,body.question,body.passages.length+1);
  body.passages=[...body.passages,...fromBooks];
  const result=await answer(request,env,body);
  // Which models were tried and why they were rejected (reasons only, never text).
  if(!result.text)return json({error:'unavailable'},503,{...headers,'x-atla-trace':result.trace.join(' ').slice(0,300)});
  result.sources=fromBooks.map(({id,ref,term,definition,book})=>({id,ref,term,definition,book}));
  if(key)ctx?.waitUntil?.(caches.default.put(key,new Response(JSON.stringify(result),{headers:{'content-type':'application/json','cache-control':'max-age='+CACHE_DAYS*86400}})));
  return verifiedSseResponse(result.text,{...headers,'x-atla-provider':result.provider,'x-atla-trace':result.trace.join(' ').slice(0,300)},result.sources);
 }
};
