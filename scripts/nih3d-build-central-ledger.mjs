#!/usr/bin/env node
/**
 * NIH3D + ATLA central, evidence-linked task register.
 * Facts are read from versioned source reports and optionally fresh GitHub API data.
 * No source copied, no clinical approvals, no production changes or AI endpoints.
 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const root='tools/atla-ai/resources/';
const src=await read(root+'nih3d-master-plan-2026/catalog-index.json');
const biomedical=await read(root+'nih3d-biomedical-scope-2026/summary.json');
const registry=await read(root+'nih3d-verified-originals-2026.json');
const science=await read(root+'nih3d-educational-evidence-2026/summary.json');
const old=await read('docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.json');
const structural=await read('docs/ATLA_NIH3D_GEOMETRY_STRUCTURAL_QA_2026.json');
const REPO='6d9757cmp5-creator/ekab-spoudi';
const BASE='https://github.com/'+REPO;
const runID=41363970707;
const status={DONE:'VERIFIED_COMPLETE_FOR_STATED_SCOPE',PARTIAL:'PARTIAL_VERIFIED',PENDING:'UNVERIFIED_OR_PENDING',BLOCKED:'BLOCKED'};
const checks={};
checks.sourceCatalog=src.publishedEntriesFound===15688&&biomedical.uniqueSourceModelRecords===src.publishedEntriesFound&&biomedical.sourceSegments===50&&biomedical.totalOriginalModelFileReferences===204346;
checks.scopeCoverage=Object.values(biomedical.byScope??{}).reduce((a,b)=>a+b,0)===src.publishedEntriesFound;
checks.archiveConsistency=registry.catalogSourceEntries===src.publishedEntriesFound&&registry.sourceSHA256AndAnonymousRecoveryVerified===true;
checks.structuralCorrespondence=structural.sourceModels===registry.archiveModelsWithAnyOriginal&&
 structural.counts.sha256Verified===registry.uniqueVerifiedOriginalFiles&&
 structural.verifiedBytes===registry.totalDistinctVerifiedOriginalBytes;
checks.scientificCoverage=science.counts.sourceRecords===src.publishedEntriesFound&&science.counts.sourceSegments===50;
checks.scientificIntegrity=science.counts.scholarlyClinicalApprovals===0&&
 structural.scientificAccuracyValidated===0&&structural.clinicallyApprovedModels===0;
checks.fullLibraryComplete=registry.fullNIHArchiveComplete===true&&
 biomedical.byScope.SCIENTIFIC_REVIEW_REQUIRED===0&&science.scientificApprovalStatus==='COMPLETED'&&
 science.counts.scholarlyClinicalApprovals>0;
assert(checks.sourceCatalog,'Catalog source and triage mismatch');
assert(checks.scopeCoverage,'Biomedical scope classification has dropped source IDs');
assert(checks.archiveConsistency,'Original SHA-256 archive registry not consistent with snapshot');
assert(checks.scientificCoverage,'Scientific evidence source identity count inconsistent');
assert(checks.scientificIntegrity,'A source claimed unsupported clinical approvals');
const api=async uri=>{
 const token=process.env.GITHUB_TOKEN??process.env.GH_TOKEN;
 if(!token)return {unavailable:'GITHUB_TOKEN missing; GitHub API was not verified in this run'};
 try{
  const response=await fetch('https://api.github.com/repos/'+REPO+uri,
   {headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ATLA-NIH3D-evidence-ledger'},
    signal:AbortSignal.timeout(15000)});
  if(!response.ok)return {unavailable:'GitHub API HTTP '+response.status+' for '+uri};
  return await response.json();
 }catch(e){return {unavailable:String(e.message??e).slice(0,180)}}
};
const online={};
online.pr197=await api('/pulls/197');
online.legacyArtifacts=await api('/actions/runs/'+runID+'/artifacts?per_page=100');
online.releases=await api('/releases?per_page=15');
online.main=await api('/commits/main');
const legacyArtifactRows=Array.isArray(online.legacyArtifacts.artifacts)?online.legacyArtifacts.artifacts:[];
const releases=Array.isArray(online.releases)?online.releases:[];
const recovered=releases.filter(x=>/^ekab-nih3d-recovered-\d{5}-\d{5}$/.test(x.tag_name??''));
const counts={
 sourceEntries:src.publishedEntriesFound,
 originalMetadataSourceReferences:biomedical.totalOriginalModelFileReferences,
 biomedicalCandidates:biomedical.byScope.IN_SCOPE_RESEARCH_CANDIDATE,
 scientificRelevanceReviewsPending:biomedical.byScope.SCIENTIFIC_REVIEW_REQUIRED,
 likelyNonmedicalPreserved:biomedical.byScope.LIKELY_OUT_OF_MEDICAL_SCOPE,
 fullOriginalModelsSHARecovered:registry.modelsWithAllCatalogOriginalFilesVerified,
 partialOriginalModelsSHARecovered:registry.modelsWithPartialCatalogOriginalsVerified,
 uniqueOriginalSourceFilesSHARecovered:registry.uniqueVerifiedOriginalFiles,
 uniqueOriginalBytesSHARecovered:registry.totalDistinctVerifiedOriginalBytes,
 currentTechnicalStructuralFilesSHAReverified:structural.counts.sha256Verified,
 sourceStructuralFormatPassed:structural.counts.formatPassed,
 sourceStructuralReviewNeeded:structural.counts.formatNeedsReview+structural.counts.formatInvalid,
 proposedCourseAnatomyMatches:science.counts.conceptMatched,
 independentClinicalModelApprovals:science.counts.scholarlyClinicalApprovals,
 historicalCanonicalArchiveShards:old.binary.canonicalShards,
 historicalTotalIntendedShards:old.binary.totalShards,
 historicalUnresolvedAuditProblems:old.problemCount,
 activeLegacyArtifactsFound:legacyArtifactRows.filter(x=>!x.expired).length,
 activeLegacyArtifactBytes:legacyArtifactRows.filter(x=>!x.expired).reduce((s,a)=>s+(a.size_in_bytes??0),0),
 historicalRecoveredReleaseCount:recovered.length,
 historicalRecoveredReleaseAssets:recovered.reduce((s,x)=>s+x.assets.length,0),
 historicalRecoveredReleaseBytes:recovered.reduce((s,x)=>s+x.assets.reduce((z,a)=>z+a.size,0),0)
};
const sourceRef=BASE+'/blob/main/';
const issues=[
 {
  id:'NIH-01',task:'Preserve complete original NIH 3D metadata index (not bulk-copying unrelated devices)',
  state:checks.sourceCatalog&&checks.scopeCoverage?status.DONE:status.BLOCKED,
  evidence:[sourceRef+'tools/atla-ai/resources/nih3d-master-plan-2026/catalog-index.json',
    sourceRef+'tools/atla-ai/resources/nih3d-biomedical-scope-2026/summary.json'],
  scope:'Saved 2026 snapshot: all source identities and referenced formats preserved as metadata',
  unmet:'Check current NIH publications and version drift beyond the saved 2026 snapshot'
 },
 {
  id:'NIH-02',task:'Complete biomedical relevance triage and expert scientific course mapping',
  state:status.PARTIAL,verified:'Full metadata triage plus '+science.counts.conceptMatched+' proposed anatomy-course matches',
  evidence:[sourceRef+'tools/atla-ai/resources/nih3d-biomedical-scope-2026/summary.json',
    sourceRef+'tools/atla-ai/resources/nih3d-educational-evidence-2026/summary.json'],
  unmet:'Review '+counts.scientificRelevanceReviewsPending+' uncertain models, validate geometry/anatomy, SAEK, EOPPEP, Anatomy Lab and Cockpit links by domain experts'
 },
 {
  id:'NIH-03',task:'Store ALL selected source original formats including dependent textures/animations where any',
  state:status.PARTIAL,verified:counts.fullOriginalModelsSHARecovered+' original NIH models, '+counts.uniqueOriginalSourceFilesSHARecovered+' source-file URLs stored and anonymously restored',
  evidence:[sourceRef+'tools/atla-ai/resources/nih3d-verified-originals-2026.json',
    BASE+'/packages'],
  unmet:'Most biomedical models and any external texture/animation dependencies are not yet proven archived; check original source formats per model and license'
 },
 {
  id:'NIH-04',task:'SHA256, manifests, all split parts, long-term preservation and recovery',
  state:status.PARTIAL,verified:counts.uniqueOriginalBytesSHARecovered+' source bytes revalidated via GHCR and '+counts.currentTechnicalStructuralFilesSHAReverified+' independent format screens',
  evidence:[sourceRef+'docs/ATLA_NIH3D_GEOMETRY_STRUCTURAL_QA_2026.json',
    sourceRef+'tools/atla-ai/resources/nih3d-verified-originals-2026.json'],
  unmet:'Reconcile 250 RESULT.json, tar.zst + split parts, original file hashes and permanent recovery across every selected package'
 },
 {
  id:'NIH-05',task:'Preserve and independently recover expiring historical GitHub Actions artifacts',
  state:status.PARTIAL,verified:counts.historicalRecoveredReleaseAssets+' recovered GitHub Release assets currently visible',
  evidence:[BASE+'/actions/runs/'+runID,
    sourceRef+'docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.json',
    BASE+'/releases'],
  unmet:'Unexpired artifacts require urgent verified extraction; old report records '+old.problemCount+' historical archive gaps. Published assets are not verified source SHA-256.'
 },
 {
  id:'NIH-06',task:'Safe future expansion without duplicating data or unrelated NIH devices',
  state:status.PARTIAL,verified:'Idempotent, biomedical-only, rights-gated bounded GHCR source archive workflow',
  evidence:[sourceRef+'.github/workflows/atla-nih3d-planned-batch-execution.yml',
    sourceRef+'scripts/nih3d-plan-next-originals.mjs'],
  unmet:'Guarantee sustained storage, capacity, repository operational limits and robust resume after failures'
 },
 {
  id:'NIH-07',task:'3D viewer completeness and visual correctness for textures, animation, layers and interaction',
  state:status.PENDING,
  evidence:[BASE+'/actions',sourceRef+'docs/ATLA_MASTER_PLAN_ANATOMY_LAB_AND_CLINICAL_COCKPIT_2026.md'],
  unmet:'Independent visual screenshot-based mobile/desktop tests of real selected models in full Anatomy Lab and Clinical Cockpit viewer'
 },
 {
  id:'NIH-08',task:'Published live browser app loads actual selected original 3D objects',
  state:status.PENDING,evidence:[BASE+'/actions/workflows/pages/pages-build-deployment',sourceRef+'docs/ATLA_NIH3D_CONTEXTUAL_INTEGRATION.md'],
  unmet:'Production URL, CORS, real model textures/animations, 3D rendering, clinical correctness and mobile interactions have not been fully verified'
 },
 {
  id:'NIH-09',task:'Independent technical and scientific assessment (not automatic clinical certification)',
  state:status.PARTIAL,verified:'Independent technical byte/format checks exist; '+counts.independentClinicalModelApprovals+' independent clinical approvals',
  evidence:[sourceRef+'docs/ATLA_NIH3D_GEOMETRY_STRUCTURAL_QA_2026.json',
    sourceRef+'docs/ATLA_INDEPENDENT_SCIENTIFIC_QA_2026-11-03.md'],
  unmet:'Independent credentialed scientific review, per-model medical anatomy accuracy and pedagogical validation'
 },
 {
  id:'ATLA-01',task:'Safely synchronize draft PR #197 after completing NIH3D, with zero loss of newer main binaries',
  state:status.PENDING,evidence:[BASE+'/pull/197',sourceRef+'tools/atla-ai/resources/nih3d-verified-originals-2026.json'],
  unmet:'Preserve draft; rebase/reconcile against current main only after NIH3D audit and ensure all 3D manifests survive'
 },
 {
  id:'ATLA-02',task:'One ATLA learning assistant, no duplicate MENTOR and no lost learner progress',
  state:status.PENDING,evidence:[BASE+'/pull/197'],
  unmet:'PR #197 CI recheck, learner profile migrations, end-to-end navigation and regression, no external AI endpoint activation'
 },
 {
  id:'ATLA-03',task:'Final integrated live production browser QA and release acceptance',
  state:status.PENDING,evidence:[BASE+'/actions',BASE+'/pull/197'],
  unmet:'At least desktop/mobile production screenshot and interaction proof, learning progress retention and rollback validation'
 }
];
const pending=issues.filter(x=>x.state!==status.DONE);
const pr=online.pr197;
const gh={
 mainSha:online.main.sha??null,
 pr197:pr?.number?{number:pr.number,draft:pr.draft,headSha:pr.head?.sha,
  baseSha:pr.base?.sha,mergeable:pr.mergeable,changedFiles:pr.changed_files,
  url:pr.html_url,merged:pr.merged}: {unverified:pr?.unavailable??'not fetched'},
 historicalArtifactRun:runID,
 historicalUnexpiredArtifacts:legacyArtifactRows.length?legacyArtifactRows.filter(x=>!x.expired)
  .map(x=>({name:x.name,size:x.size_in_bytes,expiresAt:x.expires_at})):[],
 earliestHistoricalArtifactExpiryUTC:legacyArtifactRows.length?
  [...legacyArtifactRows].filter(x=>!x.expired).map(x=>x.expires_at).sort()[0]:null,
 historicalRecoveredReleaseTags:recovered.map(x=>({tag:x.tag_name,
  assets:x.assets.length,bytes:x.assets.reduce((s,a)=>s+a.size,0),url:x.html_url})),
 unavailable:Object.entries(online).filter(([,value])=>value?.unavailable).map(([key,value])=>({key,error:value.unavailable}))
};
const report={
 schemaVersion:1,title:'ATLA NIH3D + ATLA unified verifiable completion register',
 compiledAtUTC:new Date().toISOString(),sourceGitRepository:REPO,
 rule:'All original goals must be independently verified before whole-task completion. No metadata-only, job-only, release-only or AI-generated clinical approval claims.',
 state:pending.length?'CENTRAL_TASK_INCOMPLETE':'VERIFIED_FULL_COMPLETION',
 completionPercentage:null,verifiedChecks:checks,counts,
 statusDefinitions:status,github:gh,issues,
 workScope:'Complete medically/scientifically relevant subset of NIH; save original metadata for all entries and retain uncertain science/hardware for review',
 coreSafety:{
  noAIEndpointActivationRequested:true,
  noExistingOriginalArchivesRemovedByThisRegister:true,
  noClinicalAccuracyInferredFromTechnicalSHA:true,
  noDraftPR197MergeUntilNIHComplete:true,
  noHistoricalArtifactEquatedWithPermanentPreservation:true
 },
 missingAcceptanceProofs:pending.map(x=>({id:x.id,required:x.unmet}))
};
const out='docs/ATLA_NIH3D_ATLA_CENTRAL_LEDGER_2026.json';
await fs.mkdir('docs',{recursive:true});
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
const short=x=>String(x??'').replace(/\|/g,'\\|').replace(/\n/g,' ');
const md=[
 '# ATLA NIH3D + ATLA — ενιαίο μητρώο εκκρεμοτήτων',
 '',
 'Δημιουργήθηκε (UTC): '+report.compiledAtUTC,
 '',
 '**Κατάσταση αρχικού έργου: ΟΧΙ ολοκληρωμένο.** Μη υπολογίσιμο ποσοστό μέχρι πλήρη τεκμηρίωση όλων των κριτηρίων.',
 '',
 '## Επαληθευμένα συγκεντρωτικά στοιχεία',
 '',
 '- Πλήρης πηγή μεταδεδομένων (snapshot): **'+counts.sourceEntries+'** εγγραφές, **'+counts.originalMetadataSourceReferences+'** πρωτότυπες αναφορές.',
 '- Βιοϊατρικά υποψήφια **'+counts.biomedicalCandidates+'**· εκκρεμής σχετικότητα **'+counts.scientificRelevanceReviewsPending+'**· πιθανώς άσχετα αλλά διατηρούμενα **'+counts.likelyNonmedicalPreserved+'**.',
 '- Πλήρως ανακτημένα πρωτότυπα από GHCR: **'+counts.fullOriginalModelsSHARecovered+' μοντέλα, '+counts.uniqueOriginalSourceFilesSHARecovered+' μοναδικά αρχεία, '+counts.uniqueOriginalBytesSHARecovered+' bytes**.',
 '- Τεχνικό SHA256 + δομικό screening: **'+counts.currentTechnicalStructuralFilesSHAReverified+'** αρχεία· ανεξάρτητες επιστημονικές/κλινικές εγκρίσεις **'+counts.independentClinicalModelApprovals+'**.',
 '- Ιστορικά 250 shards: παλιό report **'+counts.historicalCanonicalArchiveShards+'/250** canonical shards, **'+counts.historicalUnresolvedAuditProblems+'** προβλήματα. Ενδέχεται να είναι παρωχημένο και δεν υποκαθιστά νέο έλεγχο.',
 '- Μη ληγμένα Actions artifacts από 41363970707: **'+counts.activeLegacyArtifactsFound+'**, πρώτη λήξη **'+(gh.earliestHistoricalArtifactExpiryUTC??'άγνωστη')+'**. Προσωρινή φύλαξη.',
 '',
 '## Κεντρικός στόχος → υποεργασίες → αποδεικτικά',
 '',
 '| ID | Στόχος | Κατάσταση | Απόδειξη | Τι απομένει |',
 '|---|---|---|---|---|',
 ...issues.map(i=>'| '+i.id+' | '+short(i.task)+' | '+i.state+' | '+i.evidence.map(u=>'[αρχείο/CI]('+u+')').join(' · ')+' | '+short(i.unmet)+' |'),
 '',
 '## Υποχρεωτικά όρια',
 '',
 'Το GHCR, τα Releases, τα tar.zst, τα split parts και τα προσωρινά Actions artifacts είναι ΔΙΑΦΟΡΕΤΙΚΕΣ αποθήκες με πιθανές επικαλύψεις. Κανένα δεν χαρακτηρίζεται πλήρες χωρίς ανεξάρτητο SHA-256 ανά πρωτότυπο και έλεγχο όλων των αρχικών file refs. Στοχεύουμε στα ιατρικά και βιοεπιστημονικά χρήσιμα μοντέλα, όχι όλη την ιστοσελίδα. Οι 12 υποεργασίες δεν αντιστοιχούν σε αξιόπιστο ποσοστό έργου.',
 '',
 '**PR #197:** παραμένει draft και πρέπει να συγχρονιστεί μετά NIH3D, χωρίς αλλαγή σε AI endpoint, εκπαιδευτική μνήμη ή ήδη συγχωνευμένα assets.',
 ''
].join('\n');
await fs.writeFile('docs/ATLA_NIH3D_ATLA_CENTRAL_LEDGER_2026.md',md);
console.log(JSON.stringify({state:report.state,checks,counts,issues:issues.length,pending:pending.length,observedMain:gh.mainSha,pr197:gh.pr197,firstExpiry:gh.earliestHistoricalArtifactExpiryUTC},null,2));
