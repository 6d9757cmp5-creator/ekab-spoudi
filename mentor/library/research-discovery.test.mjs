import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateResearch,searchResearch,loadResearch,QUEUE_PATHS} from "./research-discovery.mjs";
const root=new URL("../../tools/atla-ai/knowledge-refresh/queue/",import.meta.url);
const files={metadata:"last-scan.json",health:"source-health.json",pending:"pending-pubmed.json",review:"ai-research-review.json"};
const data=()=>Object.fromEntries(Object.entries(files).map(([k,v])=>
 [k,JSON.parse(readFileSync(new URL(v,root),"utf8"))]));
test("real queued research is metadata only and never clinical knowledge",()=>{
 const d=data(),c=validateResearch(d);
 assert.equal(c.count,d.pending.items.length);
 assert.equal(c.clinicalRetrievalAllowed,false);
 assert.equal(c.scientificApproval,false);
 assert.equal(c.records.every(x=>x.clinicalKnowledge===false&&!Object.hasOwn(x,"abstract")),true);
});
test("PubMed citation links are canonical and search is local-only",()=>{
 const c=validateResearch(data()),r=searchResearch(c,"cooling");
 assert.ok(r.total>0);
 assert.ok(r.rows.every(x=>x.url==="https://pubmed.ncbi.nlm.nih.gov/"+x.pmid+"/"));
 assert.equal(searchResearch(c,"nothingmatches-xyz").total,0);
});
test("clinical approval, added content, misleading URLs and duplicates refuse catalogue",()=>{
 const mutate=[
 x=>x.pending.items[0].clinical_approval=true,
 x=>x.pending.items[0].atla_ai_retrieval_enabled=true,
 x=>x.pending.items[0].abstract="unreviewed medical guidance",
 x=>x.pending.items[0].source_url="https://pubmed.ncbi.nlm.nih.gov.evil.com/",
 x=>x.pending.items[0].source_quality="high",
 x=>x.pending.items.push({...x.pending.items[0]}),
 x=>x.pending.items[0].topic_ids=["fake"],
 x=>x.review.items[0].assessment={claim:"unverified"},
 x=>x.review.items[0].learner_visible=true
 ];
 for(const m of mutate){const d=data();m(d);assert.throws(()=>validateResearch(d),/research-source-unverified/);}
});
test("mixed timestamps, broken source audit and AI activation refuse entire catalogue",()=>{
 const mutate=[
 x=>x.review.generated_at="2020-01-01T00:00:00.000Z",
 x=>x.health.checked_at="2020-01-01T00:00:00.000Z",
 x=>x.health.sources[0].clinical_approval=true,
 x=>x.metadata.pending_papers=999,
 x=>x.metadata.clinical_retrieval_updated=true,
 x=>x.review.ai_configured=true,
 x=>x.metadata.pubmed_failures=Array.from({length:x.metadata.pubmed_topics_checked},()=>({reason:"down"}))
 ];
 for(const m of mutate){const d=data();m(d);assert.throws(()=>validateResearch(d),/research-source-unverified/);}
});
test("exactly four read-only GETs, no AI or student-state writes",async()=>{
 const d=data(),calls=[];
 const c=await loadResearch({fetcher:async (url,opts)=>{
  calls.push({url,opts});const k=Object.keys(QUEUE_PATHS).find(x=>url.endsWith(QUEUE_PATHS[x]));
  return {ok:true,json:async()=>d[k]};
 }});
 assert.equal(c.count,d.pending.items.length);
 assert.equal(calls.length,4);
 assert.ok(calls.every(x=>x.opts.method==="GET"&&x.opts.cache==="no-store"&&x.opts.credentials==="omit"));
});
test("network refusal yields no partial data",async()=>{
 await assert.rejects(loadResearch({fetcher:async()=>({ok:false})}),/research-source-unverified/);
});
test("active ATLA bibliography integrates citations, not AI prompts or saved progress",()=>{
 const js=readFileSync(new URL("../app/library.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../../mentor-library.html",import.meta.url),"utf8");
 assert.match(js,/loadResearch/);assert.match(js,/searchResearch/);
 assert.match(html,/id="research-list"/);assert.match(html,/id="research-search"/);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB|askAi|buildPayload|saveProgress)\b/);
 assert.doesNotMatch(js,/\.(?:innerHTML|outerHTML)\s*=/);
});

test("current AI research review schema version 2 required, legacy version 1 rejected",()=>{
 const good=data();
 assert.equal(good.review.schema_version,2);
 assert.equal(validateResearch(good).count,good.pending.items.length);
 good.review.schema_version=1;
 assert.throws(()=>validateResearch(good),/research-source-unverified:review/);
});
