#!/usr/bin/env node
/**
 * End-to-end read-only live scan with every registered source and all PubMed topics.
 * Absolutely no AI invocation, no GitHub writes and no student-facing changes.
 */
import assert from 'node:assert/strict';
import {run,validateOutput} from './pipeline.mjs';
const report=await run({env:{},write:false});
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
 ai_enabled:false,paid_ai_calls:0,clinical_knowledge_imported:0,
 learner_content_changed:false,files_written:false
}));
