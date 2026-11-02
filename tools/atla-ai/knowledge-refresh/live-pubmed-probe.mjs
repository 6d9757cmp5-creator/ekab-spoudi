#!/usr/bin/env node
/**
 * Read-only external smoke check of real NCBI E-utilities, designed for PR CI.
 * Reads a few bibliographic candidates and verifies linked abstracts by PMID.
 * NEVER writes learner content, queues, secrets or persistent medical knowledge.
 */
import {getAbstract,run,validateOutput} from './pipeline.mjs';
import {screenPubMedArticle} from './source-policy.mjs';
import {createHash} from 'node:crypto';
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
let success=null,verifiedAbstract='';
for(const id of ids){
 await new Promise(resolve=>setTimeout(resolve,420));
 const abstract=await getAbstract(id);
 if(abstract.length>=100){success={pmid:id,abstract_chars:abstract.length};verifiedAbstract=abstract;break;}
}
if(!success)fail('none of '+ids.length+' returned a verified nonempty matching abstract');
// Retrieve the actual PubMed summary, not hand-crafted bibliographic evidence.
await new Promise(resolve=>setTimeout(resolve,420));
const summaryUrl=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
for(const [k,v] of Object.entries({db:'pubmed',id:success.pmid,retmode:'json'}))
 summaryUrl.searchParams.set(k,v);
const summaryResponse=await fetch(summaryUrl,{headers:{accept:'application/json',
 'user-agent':'ATLA-ReadOnly-PubMed-Probe/1.0'},signal:AbortSignal.timeout(20000)});
if(!summaryResponse.ok)fail('summary HTTP '+summaryResponse.status);
const summary=(await summaryResponse.json())?.result?.[success.pmid];
const paper={
 pmid:success.pmid,title:summary?.title||'',journal:summary?.fulljournalname||summary?.source||'',
 published_at:summary?.pubdate||summary?.epubdate||'',
 publication_types:Array.isArray(summary?.pubtype)?summary.pubtype:[],
 topic_ids:['resuscitation']
};
if(!screenPubMedArticle(paper).accepted)fail('live bibliographic evidence is ineligible');
await new Promise(resolve=>setTimeout(resolve,420));
// Execute the whole review pipeline with REAL external metadata and abstracts,
// but without writing any files or enabling a paid AI model.
const report=await run({scanner:async()=>({pending:{items:[paper]}}),fetcher:fetch,
 env:{},write:false,now:new Date().toISOString()});
validateOutput(report);
const entry=report.items[0];
if(report.items.length!==1||entry.pmid!==success.pmid||entry.ai_status!=='ai-disabled-awaiting-explicit-cost-approval'||
 entry.abstract_available!==true||entry.abstract_sha256!==createHash('sha256').update(
 verifiedAbstract).digest('hex')||
 entry.clinical_approval!==false||entry.learner_visible!==false||entry.atla_ai_retrieval_enabled!==false)
 fail('end-to-end isolated research queue verification failed');
console.log(JSON.stringify({status:'live-eutils-review-queue-verified',...success,
 verified_summary:true,verified_abstract_digest:true,ai_enabled:false,
 research_queue_items:report.items.length,medical_claims_approved:0,student_content_changed:false}));
