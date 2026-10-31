"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {mergeFindings}=require("./merge-claude-eoppep.cjs");
function fixture(){
 const rows=[];
 for(let i=1;i<=105;i++)rows.push({id:"EOP-A-"+String(i).padStart(3,"0"),group:"A",number:i,question:"A "+i,status:"pending"});
 for(let i=1;i<=209;i++)rows.push({id:"EOP-B-"+String(i).padStart(3,"0"),group:"B",number:i,question:"Official "+i,status:"pending",...(i===1?{targetedReview:{reviewerType:"prior",fullScientificApproval:false}}:{})});
 const entry=(id,verdict="consistent")=>({id,question:"Summary only",verdict,risk:"high",certainty:"medium",checkedAt:"2026-10-31",findings:"Examined with source",sources:[{title:"RCUK",url:"https://www.resus.org.uk/path"}],clinicalReview:false});
 return {registry:{entries:rows},entry};
}
test("imports evidence without changing original assessment or canonical text",()=>{
 const {registry,entry}=fixture();const before=JSON.parse(JSON.stringify(registry));
 const r=mergeFindings(registry,{entries:[entry("EOP-B-001"),entry("EOP-B-002")]});
 assert.equal(r.stats.added,2);assert.equal(r.stats.alreadyTargeted,1);
 assert.deepEqual(registry,before);
 assert.deepEqual(r.merged.entries[105].targetedReview,before.entries[105].targetedReview);
 assert.equal(r.merged.entries[106].targetedReview,undefined);
 assert.equal(r.merged.entries[106].question,"Official 2");
 assert.equal(r.merged.entries[106].externalReviews[0].fullScientificApproval,false);
});
test("second identical import is a strict no-op",()=>{
 const {registry,entry}=fixture(),data={entries:[entry("EOP-B-002")]};
 const x=mergeFindings(registry,data),y=mergeFindings(x.merged,data);
 assert.equal(y.stats.added,0);assert.equal(y.stats.unchanged,1);
 assert.deepEqual(x.merged,y.merged);
});
test("changed evidence fails rather than overwriting its earlier record",()=>{
 const {registry,entry}=fixture(),x=mergeFindings(registry,{entries:[entry("EOP-B-002")]});
 const altered=entry("EOP-B-002");altered.findings="Changed finding";
 assert.throws(()=>mergeFindings(x.merged,{entries:[altered]}),/manual reconciliation/);
});
test("unreachable sources are stored as unresolved and never promoted",()=>{
 const {registry,entry}=fixture(),x=mergeFindings(registry,{entries:[entry("EOP-B-002","source_unreachable")]});
 assert.equal(x.stats.blockedSource,1);assert.equal(x.stats.eligibleForFurtherReview,0);
 assert.equal(x.merged.entries[106].targetedReview,undefined);
 assert.equal(x.merged.entries[106].externalReviews[0].status,"SOURCE_UNVERIFIED");
});
test("duplicate and unknown IDs fail the entire import",()=>{
 const {registry,entry}=fixture(),a=entry("EOP-B-002");
 assert.throws(()=>mergeFindings(registry,{entries:[a,a]}),/repeated Claude ID/);
 assert.throws(()=>mergeFindings(registry,{entries:[entry("EOP-B-999")]}),/absent from canonical/);
});
test("invalid source URL fails closed",()=>{
 const {registry,entry}=fixture(),a=entry("EOP-B-002");a.sources[0].url="http://example.test";
 assert.throws(()=>mergeFindings(registry,{entries:[a]}),/Invalid source reference/);
});
test("preexisting external contributions remain intact",()=>{
 const {registry,entry}=fixture();registry.entries[106].externalReviews=[{origin:"other-expert",evidence:{note:"keep"}}];
 const x=mergeFindings(registry,{entries:[entry("EOP-B-002")]});
 assert.equal(x.merged.entries[106].externalReviews.length,2);
 assert.deepEqual(x.merged.entries[106].externalReviews[0],{origin:"other-expert",evidence:{note:"keep"}});
});
