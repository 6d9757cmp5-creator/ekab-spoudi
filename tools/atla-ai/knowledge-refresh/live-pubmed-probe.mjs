#!/usr/bin/env node
/**
 * Read-only external smoke check of real NCBI E-utilities, designed for PR CI.
 * Reads a few bibliographic candidates and verifies linked abstracts by PMID.
 * NEVER writes learner content, queues, secrets or persistent medical knowledge.
 */
import {getAbstract} from './pipeline.mjs';
const search=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
for(const [k,v] of Object.entries({
 db:'pubmed',retmode:'json',retmax:'4',
 term:'("Systematic Review"[Publication Type]) AND ("Cardiopulmonary Resuscitation"[MeSH Terms] OR prehospital[Title/Abstract])'
}))search.searchParams.set(k,v);
const fail=reason=>{throw new Error('NCBI live evidence probe: '+reason);};
const r=await fetch(search,{headers:{accept:'application/json','user-agent':'ATLA-ReadOnly-PubMed-Probe/1.0'},
 signal:AbortSignal.timeout(20000)});
if(!r.ok)fail('search HTTP '+r.status);
const body=await r.json();
const ids=(body?.esearchresult?.idlist||[]).filter(x=>/^\d{1,10}$/.test(String(x))).slice(0,4);
if(!ids.length)fail('no valid search results');
let success=null;
for(const id of ids){
 await new Promise(resolve=>setTimeout(resolve,420));
 const abstract=await getAbstract(id);
 if(abstract.length>=100){success={pmid:id,abstract_chars:abstract.length};break;}
}
if(!success)fail('none of '+ids.length+' returned a verified nonempty matching abstract');
console.log(JSON.stringify({status:'live-eutils-pmid-crosscheck-ok',...success,
 medical_claims_approved:0,student_content_changed:false}));
