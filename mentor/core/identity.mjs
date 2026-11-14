/**
 * MENTOR demo account scope; no user identity is written to the corpus.
 * Guest sessions are isolated per browser tab (sessionStorage), not cloud synced.
 */
export async function resolveMentorScope({account,storage=globalThis.sessionStorage,cryptoApi=globalThis.crypto}={}){
  if(!cryptoApi?.randomUUID||!cryptoApi?.subtle)throw new Error('secure-browser-required');
  if(account){
    try{
      const profile=await account.get();
      if(profile&&typeof profile.$id==='string'&&profile.$id.length>0&&profile.$id.length<=256){
        const bytes=new TextEncoder().encode(profile.$id);
        const digest=await cryptoApi.subtle.digest('SHA-256',bytes);
        const hash=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
        return {scope:'user:'+hash,authenticated:true};
      }
    }catch{ /* No authenticated Appwrite session: explicitly isolated guest scope. */ }
  }
  const KEY='ekab.mentor.guest-tab.v1';
  let id=null;
  try{id=storage?.getItem(KEY)||null;}catch{}
  if(!/^[a-f0-9-]{36}$/i.test(id||'')){
    id=cryptoApi.randomUUID().toLowerCase();
    try{storage?.setItem(KEY,id);}catch{}
  }
  return {scope:'guest:'+id,authenticated:false};
}
