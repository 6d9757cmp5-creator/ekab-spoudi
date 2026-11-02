#!/usr/bin/env node
/**
 * End-to-end read-only live scan with every registered source and all PubMed topics.
 * Absolutely no AI invocation, no GitHub writes and no student-facing changes.
 */
import assert from 'node:assert/strict';
import {run,validateOutput,validateQueueFiles} from './pipeline.mjs';
import {main as scan} from './scan.mjs';
import {audit,enforce} from './scientific-qa.mjs';
// Reuse the single read-only scan so failed source probes can be audited.
const discovery=await scan({write:false});
const report=await run({scanner:async({write})=>{
 assert.equal(write,false,'PR validation must never persist source scans');
 return discovery;
},env:{},now:discovery.metadata.checked_at,write:false});
validateOutput(report);
// Exercise the exact four-document production gate against real read-only
// discovery results, not only the final AI triage report.
validateQueueFiles({report,metadata:discovery.metadata,health:discovery.health,pending:discovery.pending});
// The ONE consolidated audit runs on the FRESH read-only full PubMed scan,
// not merely an old committed research queue snapshot.
const scientific=audit({pending:discovery.pending,metadata:discovery.metadata,health:discovery.health,review:report});
enforce(scientific);
assert.equal(scientific.confirmed_clinical_claims,0);
assert.equal(scientific.clinical_publication_allowed,false);
const stats=report.source_discovery;
assert.ok(stats?.monitored_urls>0,'no curated sources registered');
assert.ok(stats?.pubmed_topics_checked>0,'no PubMed topic queries');
assert.ok(stats.pubmed_topics_failed<stats.pubmed_topics_checked,'all PubMed topic requests failed');
assert.equal(report.ai_configured,false);
assert.equal(report.clinical_knowledge_imported,0);
assert.equal(report.existing_curriculum_changed,false);
// Real 403/network failures must stay unverified, never auto-approved or
// mistaken for proof that a publisher changed its clinical guidance.
assert.ok(discovery.health.sources.every(s=>
 s.clinical_approval===false&&s.knowledge_ingestion_enabled===false));
assert.ok(discovery.health.sources.filter(s=>!s.ok).every(s=>s.signal==='unverified'));
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
 scientific_qa:scientific.technical_research_gate,scientific_appraisal:scientific.evidence_appraisal,
 flagged_scope_articles:scientific.title_only_scope_hints.length,
 ai_enabled:false,paid_ai_calls:0,clinical_knowledge_imported:0,
 learner_content_changed:false,files_written:false
}));
