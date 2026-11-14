/* Conservative, idempotent importer for Claude PR #140 evidence.
   Never changes questions, answers, targetedReview, fullAnswerReview, resolution or approval.
   Run: node merge-claude-eoppep.cjs             (preview)
        node merge-claude-eoppep.cjs --apply     (on Claude audit branch only)
   Run tests: node --test merge-claude-eoppep.test.cjs */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const folder=__dirname;
const registryFile=path.join(folder,"eoppep-314.json");
const evidenceFile=path.join(folder,"claude-eoppep-b-findings.json");
const mergeFindings = function mergeFindings(registry, claude) {
  const allowed = new Set(["consistent","consistent_with_gaps","needs_correction","needs_clinical_review","source_unreachable"]);
  const fail = msg => {throw new Error(msg)};
  if (!registry || !Array.isArray(registry.entries) || registry.entries.length !== 314) fail("Registry must contain exactly 314 entries");
  if (!claude || !Array.isArray(claude.entries)) fail("Claude findings require an entries array");
  const out = JSON.parse(JSON.stringify(registry));
  const byId = new Map();
  const groups = {A:0,B:0};
  for (const row of out.entries) {
    if (!/^EOP-[AB]-\d{3}$/.test(row.id) || byId.has(row.id)) fail("Invalid or duplicate canonical ID: "+row.id);
    if (!["A","B"].includes(row.group) || row.id !== `EOP-${row.group}-${String(row.number).padStart(3,"0")}`) fail("Canonical group/number mismatch: "+row.id);
    byId.set(row.id,row);groups[row.group]++;
  }
  if (groups.A!==105 || groups.B!==209) fail("Unexpected canonical group totals");
  const seen=new Set();
  const stats={source:claude.entries.length,added:0,unchanged:0,alreadyTargeted:0,novel:0,blockedSource:0,clinicalFlag:0,questionParaphrased:0,eligibleForFurtherReview:0,canonicalTargetedBefore:registry.entries.filter(x=>!!x.targetedReview).length};
  for (const f of claude.entries) {
    if (typeof f.id!=="string" || !/^EOP-B-\d{3}$/.test(f.id) || seen.has(f.id)) fail("Invalid or repeated Claude ID: "+f.id);
    seen.add(f.id);
    const row=byId.get(f.id);
    if (!row) fail("Claude ID absent from canonical register: "+f.id);
    if (!allowed.has(f.verdict)) fail("Unsupported verdict: "+f.id);
    for (const k of ["question","findings","risk","certainty","checkedAt"]) if(typeof f[k]!=="string"||!f[k].trim())fail("Missing "+k+" on "+f.id);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.checkedAt))fail("Invalid date on "+f.id);
    if (typeof f.clinicalReview!=="boolean") fail("clinicalReview must be boolean: "+f.id);
    if (!Array.isArray(f.sources)||!f.sources.length) fail("Source list missing: "+f.id);
    for(const src of f.sources) if(!src||typeof src.title!=="string"||!src.title.trim()||typeof src.url!=="string"||!/^https:\/\/[^/\s]+(?:\/[^\s]*)?$/i.test(src.url)) fail("Invalid source reference on "+f.id);
    if(f.suggestedChange!==undefined&&typeof f.suggestedChange!=="string")fail("Invalid suggestedChange on "+f.id);
    const exact=f.question.replace(/\s+/g," ").trim()===row.question.replace(/\s+/g," ").trim();
    const blocked=f.verdict==="source_unreachable";
    if (!exact)stats.questionParaphrased++;
    if (row.targetedReview)stats.alreadyTargeted++; else stats.novel++;
    if (blocked)stats.blockedSource++;
    if (f.clinicalReview)stats.clinicalFlag++;
    if(!row.targetedReview&&!blocked)stats.eligibleForFurtherReview++;
    if (row.externalReviews !== undefined && !Array.isArray(row.externalReviews))fail("Unexpected externalReviews type: "+f.id);
    const existing=(row.externalReviews||[]).filter(x=>x.origin==="claude-pr140");
    if(existing.length>1)fail("Repeated Claude origin on "+f.id);
    if(existing.length) {
      if (JSON.stringify(existing[0].evidence)!==JSON.stringify(f)) fail("Changed Claude evidence requires manual reconciliation: "+f.id);
      stats.unchanged++;continue;
    }
    const review={origin:"claude-pr140",originUrl:"https://github.com/6d9757cmp5-creator/ekab-spoudi/pull/140",sourcePath:"docs/primary-source-crosscheck-2026-10-28/claude-eoppep-b-findings.json",status:blocked?"SOURCE_UNVERIFIED":"AI_DOCUMENTARY_REVIEW_PENDING_SIGNOFF",canonicalQuestionExactMatch:exact,canonicalQuestionUnmodified:true,fullScientificApproval:false,humanClinicalSignoff:false,requiresClinicalReview:!!f.clinicalReview,evidence:JSON.parse(JSON.stringify(f))};
    if(!row.externalReviews)row.externalReviews=[];
    row.externalReviews.push(review);
    stats.added++;
  }
  stats.canonicalTargetedAfter=out.entries.filter(x=>!!x.targetedReview).length;
  if(stats.canonicalTargetedBefore!==stats.canonicalTargetedAfter)fail("Targeted count unexpectedly changed");
  for(let i=0;i<registry.entries.length;i++){let a=JSON.parse(JSON.stringify(registry.entries[i])),b=JSON.parse(JSON.stringify(out.entries[i]));delete a.externalReviews;delete b.externalReviews;if(JSON.stringify(a)!==JSON.stringify(b))fail("Canonical row mutated: "+a.id)}
  return {merged:out,stats};
};
module.exports={mergeFindings};
if(require.main===module){
  try{
    const args=process.argv.slice(2);
    if(args.some(x=>!["--apply"].includes(x)))throw new Error("Only optional --apply flag is supported");
    const registry=JSON.parse(fs.readFileSync(registryFile,"utf8"));
    const findings=JSON.parse(fs.readFileSync(evidenceFile,"utf8"));
    const {merged,stats}=mergeFindings(registry,findings);
    process.stdout.write(JSON.stringify({...stats,mode:args.includes("--apply")?"apply":"preview"},null,2)+"\n");
    if(args.includes("--apply")){
      const branch=execFileSync("git",["branch","--show-current"],{cwd:folder,encoding:"utf8"}).trim();
      if(branch!=="audit/claude-eoppep-b-crosscheck-20261031")
        throw new Error("Refusing to alter shared registry outside Claude PR #140 branch. Current: "+branch);
      const tmp=registryFile+".claude-import-tmp";
      try{fs.writeFileSync(tmp,JSON.stringify(merged,null,2)+"\n","utf8");fs.renameSync(tmp,registryFile)}
      finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
      process.stdout.write("Wrote eoppep-314.json; inspect git diff and tests before committing. Do not merge PRs automatically.\n");
    }
  }catch(e){process.stderr.write("CLAUDE_IMPORT_ERROR: "+e.message+"\n");process.exitCode=1}
}
