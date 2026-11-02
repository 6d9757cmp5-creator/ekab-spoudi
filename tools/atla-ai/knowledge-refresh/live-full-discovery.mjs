#!/usr/bin/env node
/**
 * End-to-end read-only live scan with every registered source and all PubMed topics.
 * Absolutely no AI invocation, no GitHub writes and no student-facing changes.
 */
import assert from 'node:assert/strict';
import {run,validateOutput} from './pipeline.mjs';
import {main as scan} from './scan.mjs';
// Reuse the single read-only scan so failed source probes can be audited.
const discovery=await scan({write:false});
const report=await run({scanner:async({write})=>{
 assert.equal(write,false,'PR validation must never persist source scans');
 return discovery;
},env:{},write:false});
validateOutput(report);
const stats=report.source_discovery;
assert.ok(stats?.monitored_urls>0,'no curated sources registered');
assert.ok(stats?.pubmed_topics_checked>0,'no PubMed topic queries');
assert.ok(stats.pubmed_topics_failed<stats.pubmed_topics_checked,'all PubMed topic requests failed');
assert.equal(report.ai_configured,false);
assert.equal(report.clinical_knowledge_imported,0);
assert.equal(report.existing_curriculum_changed,false);
assert.ok(report.items.every(x=>x.status==='pending-independent-scientific-review'&&
 x.atla_ai_retrieval_enabled===false&&x.clinical_approval===false&&x.learner_visible===false));
console.log(JSON.stringify({
 status:'live-full-discovery-review-only',
 ...stats,
 pending_research_items:report.items.length,
 failed_source_probes:discovery.health.sources.filter(s=>!s.ok).map(s=>({
  host:new URL(s.url).hostname,category:s.source_category,
  http_status:s.http_status??null,reason:String(s.reason||'unknown').slice(0,100)
 })),
 ai_enabled:false,paid_ai_calls:0,clinical_knowledge_imported:0,
 learner_content_changed:false,files_written:false
}));
