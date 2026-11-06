// MENTOR chat Worker (Cloudflare Workers AI). Educational, grounded answers only.
// OFF unless the owner sets MENTOR_FREE_PLAN_CONFIRMED=true after verifying the Workers Free plan.
// No keys are involved: the AI binding authenticates inside Cloudflare.
import {buildClaudeRequest,callClaude,estimateInputTokens,clampMaxTokens} from '../../../mentor/ai/claude-adapter.mjs';
import {limitsFromEnv,tokenMatches,ipDigest,MentorBudget} from '../../../mentor/ai/guard.mjs';
import {ATLA_RUNTIME_RULES,teachingApproach} from '../../../atla/ai/teaching-policy.mjs';
import {collectAndAuditAiStream,verifiedSseResponse} from '../../../atla/ai/safe-stream.mjs';
import {riskGuard,retrieve} from '../../../atla/knowledge/retrieve.mjs';
import medicalTerms from '../../../medical-terms.json' with {type:'json'};
export {MentorBudget};
const MODELS=['@cf/meta/llama-3.3-70b-instruct-fp8-fast','@cf/meta/llama-3.1-8b-instruct-fp8-fast','@cf/google/gemma-4-26b-a4b-it'];
const LEVELS=['beginner','student','advanced','scientific'];
const LEVEL_STYLE={
 beginner:'Εξήγησε πολύ απλά, με καθημερινές λέξεις και σύντομες προτάσεις.',
 student:'Εξήγησε σαφώς για σπουδαστή διασώστη, με σωστή ορολογία.',
 advanced:'Εξήγησε με περισσότερη τεχνική λεπτομέρεια και ορολογία.',
 scientific:'Εξήγησε επιστημονικά αναλυτικά, αλλά μόνο με όσα υπάρχουν στις πηγές.'
};
const IP_LIMIT=20, IP_WINDOW_MS=60*60*1000;
const hits=new Map();
let day={key:'',count:0};

export const SYSTEM_PROMPT=
'Είσαι ο ATLA, ψηφιακός εκπαιδευτικός βοηθός για σπουδαστές διασώστες στην Ελλάδα. Δεν είσαι γιατρός, ούτε εκπρόσωπος του ΕΚΑΒ. '+
'Απάντησε ΜΟΝΟ με βάση τις αριθμημένες πηγές που σου δίνονται και αναφέρσου σε αυτές ως [Τ1], [Τ2]. '+
'Αν οι πηγές δεν επαρκούν, πες καθαρά ότι δεν έχεις τεκμηριωμένη πληροφορία και μην μαντέψεις. '+
'Μην δίνεις δοσολογίες, διαγνώσεις ή οδηγίες για πραγματικό περιστατικό· για επείγον παρέπεμψε στο 166/112 και στο εγκεκριμένο πρωτόκολλο. '+
'Απάντησε στα ελληνικά, σε έως 120 λέξεις. '+ATLA_RUNTIME_RULES;

function cors(env,origin){
 const allowed=['https://6d9757cmp5-creator.github.io'];
 if(env.ALLOW_LOCAL==='true')allowed.push('http://localhost:8080','http://127.0.0.1:8080');
 if(!allowed.includes(origin))return null;
 return {'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, x-mentor-test-token','vary':'origin'};
}
const json=(body,status,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const str=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';

export function validate(body){
 if(!body||typeof body!=='object')return null;
 const question=str(body.question,300);
 if(!question)return null;
 const passages=(Array.isArray(body.passages)?body.passages:[]).slice(0,4).map(p=>({id:str(p?.id,8),term:str(p?.term,120),definition:str(p?.definition,400)})).filter(p=>p.id&&p.term&&p.definition);
 const history=(Array.isArray(body.history)?body.history:[]).slice(-4).map(h=>({role:h?.role==='user'?'user':'assistant',text:str(h?.text,300)})).filter(h=>h.text);
 return {question,passages,history,level:LEVELS.includes(body.level)?body.level:'student'};
}

/**
 * The browser is NOT an authority for medical evidence.
 * Accept only passages whose exact text and ranking are present in the
 * repository-pinned, read-only glossary and relevant to the question.
 * Other sources (SAEK/EOPPEP/chapter passages) stay local until an independently
 * reviewed, server-side evidence registry is available.
 *
 * This is provenance validation, NOT clinical/semantic claim verification.
 */
export function verifiedPassages(question,clientPassages){
 if(!Array.isArray(clientPassages)||!clientPassages.length)return [];
 const canonical=retrieve(question,medicalTerms.items,{k:4,minScore:3});
 const matches=clientPassages.map(p=>canonical.find(x=>x.id===p.id &&
  x.term===p.term && x.definition===p.definition));
 if(matches.length!==clientPassages.length||matches.some(x=>!x))return [];
 if(new Set(matches.map(x=>x.id)).size!==matches.length)return [];
 // A category-level bibliography is NOT evidence that an individual medical
 // statement is source-checked. Keep those definitions available for offline
 // study, but do not place them in the generative model's citation context.
 const directlyMapped=new Set(medicalTerms.items.filter(item=>
  item.sourceType==='direct-section'&&item.sourceCrosscheck==='2026-11-04-primary-section'&&
  typeof item.sourceSection==='string'&&item.sourceSection.length>0&&
  typeof item.sourceVersion==='string'&&item.sourceVersion.length>0
 ).map(item=>item.term));
 if(matches.some(x=>!directlyMapped.has(x.term)))return [];
 return matches;
}

export function buildMessages({question,passages,history,level}){
 const sources=passages.map(p=>`[${p.id}] ${p.term}: ${p.definition}`).join('\n');
 const approach=teachingApproach({question,level});
 return [
  {role:'system',content:SYSTEM_PROMPT+' '+LEVEL_STYLE[level]+' '+approach.style+' '+approach.depth},
  ...history.map(h=>({role:h.role,content:h.text})),
  {role:'user',content:`Πηγές:\n${sources}\n\nΕρώτηση: ${question}`}
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

// Buffer the complete model output; never stream unvalidated medical text to callers.
async function checkedModelResponse(stream,passages,headers){
 const checked=await collectAndAuditAiStream(stream,passages);
 return checked.ok?verifiedSseResponse(checked.text,headers):json({error:'unavailable',debug:checked.reason},503,headers);
}

async function answerWithClaude(request,env,body,headers){
 const messages=buildMessages(body),maxTokens=clampMaxTokens(env.CLAUDE_MAX_TOKENS);
 let req;try{req=buildClaudeRequest({messages,model:env.MENTOR_MODEL,maxTokens});}catch{return json({error:'bad_request'},400,headers);}
 const ipKey=await ipDigest(request.headers.get('cf-connecting-ip')||'unknown');
 let verdict;
 try{
  const stub=env.BUDGET.get(env.BUDGET.idFromName('global'));
  const r=await stub.fetch('https://budget/charge',{method:'POST',body:JSON.stringify({ipKey,tokens:estimateInputTokens(messages)+req.max_tokens,limits:limitsFromEnv(env)})});
  verdict=await r.json();
 }catch{return json({error:'unavailable'},503,headers);}
 if(!verdict?.ok)return json({error:'limit'},429,{...headers,'retry-after':'3600'});
 const out=await callClaude({apiKey:env.ANTHROPIC_API_KEY,request:req,signal:AbortSignal.timeout(25000)});
 if(!out.ok)return json({error:out.status===429?'limit':'unavailable'},out.status===429?429:503,headers);
 return checkedModelResponse(out.stream,body.passages,headers);
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('origin')||'';
  const headers=cors(env,origin);
  if(!headers)return json({error:'forbidden'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'method'},405,headers);
  const claude=env.MENTOR_PROVIDER==='claude';
  if(claude){
   if(env.MENTOR_CLAUDE_ENABLED!=='true'||env.MENTOR_SPEND_LIMIT_CONFIRMED!=='true'||!env.ANTHROPIC_API_KEY||!env.BUDGET)return json({error:'disabled'},503,headers);
   if(env.MENTOR_PUBLIC!=='true'&&!tokenMatches(request.headers.get('x-mentor-test-token')||'',env.MENTOR_TEST_TOKEN))return json({error:'unauthorized'},401,headers);
  }else if(env.MENTOR_FREE_PLAN_CONFIRMED!=='true'||!env.AI)return json({error:'disabled'},503,headers);
  let body;
  try{if(Number(request.headers.get('content-length')||0)>8000)return json({error:'too_large'},413,headers);body=validate(await request.json());}catch{body=null;}
  if(!body)return json({error:'bad_request'},400,headers);
  // The client also guards risky questions, but API callers must not bypass it.
  if(riskGuard(body.question).blocked)return json({error:'unsafe_request'},400,headers);
  // Never let a caller supply its own citations or definitions to the model.
  // Unsupported or altered sources fail closed without any AI or paid-budget call.
  body.passages=verifiedPassages(body.question,body.passages);
  if(!body.passages.length)return json({answer:'Δεν έχω επαληθευμένη πηγή για αυτή την ερώτηση στη βιβλιοθήκη μου.'},200,headers);
  if(claude)return answerWithClaude(request,env,body,headers);  if(limited(request.headers.get('cf-connecting-ip')||'unknown',env))return json({error:'limit'},429,{...headers,'retry-after':'3600'});
  const model=MODELS.includes(env.MENTOR_MODEL)?env.MENTOR_MODEL:MODELS[0];
  try{
   const stream=await env.AI.run(model,{messages:buildMessages(body),stream:true,max_tokens:350,temperature:0.2});
   return checkedModelResponse(stream,body.passages,headers);
  }catch(e){
   return json({error:'unavailable',debug:String(e?.message||e).slice(0,200)},503,headers);
  }
 }
};
