/**
 * Access control and cost guard for paid AI calls. Fails closed: with no persistent store,
 * no configured token, or an exhausted budget, no paid call is made.
 */
export const DEFAULT_LIMITS=Object.freeze({ipPerHour:10,requestsPerDay:50,tokensPerDay:60000});
/** Ceilings that configuration cannot exceed. */
export const MAX_LIMITS=Object.freeze({ipPerHour:60,requestsPerDay:500,tokensPerDay:400000});

export function limitsFromEnv(env){
 const pick=(name,key)=>{
  const n=Math.floor(Number(env?.[name]));
  return Number.isFinite(n)&&n>0?Math.min(n,MAX_LIMITS[key]):DEFAULT_LIMITS[key];
 };
 return {ipPerHour:pick("CLAUDE_IP_HOURLY","ipPerHour"),requestsPerDay:pick("CLAUDE_DAILY_CAP","requestsPerDay"),
  tokensPerDay:pick("CLAUDE_DAILY_TOKENS","tokensPerDay")};
}

/** Constant-time comparison; false unless the configured token is at least 16 characters. */
export function tokenMatches(given,expected){
 if(typeof expected!=="string"||expected.length<16||typeof given!=="string")return false;
 const a=new TextEncoder().encode(given),b=new TextEncoder().encode(expected);
 let diff=a.length^b.length;
 for(let i=0;i<b.length;i++)diff|=(a[i]??0)^b[i];
 return diff===0;
}

/**
 * Returns {ok:true} and records usage, or {ok:false,reason}. `store` has async get/put/delete
 * (a Durable Object's storage); calls are serialised there, so counters are atomic.
 */
export async function charge(store,{ipKey,tokens,now=Date.now(),limits}){
 const day=new Date(now).toISOString().slice(0,10),hour=new Date(now).toISOString().slice(0,13);
 const dayKey="day:"+day,ipHour="ip:"+ipKey+":"+hour;
 const d=(await store.get(dayKey))||{requests:0,tokens:0};
 const ipCount=(await store.get(ipHour))||0;
 if(ipCount>=limits.ipPerHour)return {ok:false,reason:"ip"};
 if(d.requests>=limits.requestsPerDay)return {ok:false,reason:"daily-requests"};
 if(d.tokens+tokens>limits.tokensPerDay)return {ok:false,reason:"daily-tokens"};
 await store.put(dayKey,{requests:d.requests+1,tokens:d.tokens+tokens});
 await store.put(ipHour,ipCount+1);
 return {ok:true};
}

/** Durable Object holding the counters. One instance ("global") serialises all charges. */
export class MentorBudget{
 constructor(state){this.state=state;}
 async fetch(request){
  let b;try{b=await request.json();}catch{return Response.json({ok:false,reason:"bad"},{status:400});}
  if(typeof b?.ipKey!=="string"||!Number.isFinite(b.tokens)||!b.limits)return Response.json({ok:false,reason:"bad"},{status:400});
  const out=await charge(this.state.storage,{ipKey:b.ipKey.slice(0,64),tokens:b.tokens,limits:b.limits});
  const iso=new Date().toISOString();
  if(out.ok){
   for(const [k] of await this.state.storage.list({prefix:"day:"}))if(k!=="day:"+iso.slice(0,10))await this.state.storage.delete(k);
   for(const [k] of await this.state.storage.list({prefix:"ip:"}))if(!k.endsWith(":"+iso.slice(0,13)))await this.state.storage.delete(k);
  }
  return Response.json(out);
 }
}

export async function ipDigest(ip){
 const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("mentor|"+ip));
 return [...new Uint8Array(d)].slice(0,12).map(x=>x.toString(16).padStart(2,"0")).join("");
}
