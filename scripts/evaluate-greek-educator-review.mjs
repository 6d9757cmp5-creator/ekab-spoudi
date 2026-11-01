/**
 * Dual-review reconciliation for a BLINDED synthetic Greek answer packet.
 * Never writes into the student-facing grader or creates gold labels.
 * ID and qualification attestations cannot independently prove credentials.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const VERDICTS=new Set(['correct','partial','incorrect','uncertain']);
function fail(reason){throw new Error('Review rejected: '+reason);}
function validateBallot(ballot,packet){
 if(!ballot||ballot.schemaVersion!==1||typeof ballot.reviewerCode!=='string'||!/^[A-Za-z0-9_-]{4,50}$/.test(ballot.reviewerCode))
  fail('reviewer must provide a pseudonymous code (4–50 safe characters)');
 if(typeof ballot.qualification!=='string'||ballot.qualification.trim().length<8)fail('reviewer qualification required');
 if(ballot.independentAttestation!==true)fail('explicit independent-review attestation required');
 if(!/^20\d\d-\d\d-\d\d$/.test(ballot.reviewedAt)||!Number.isFinite(Date.parse(ballot.reviewedAt)))fail('review date required');
 if(!Array.isArray(ballot.entries)||ballot.entries.length!==packet.items.length)fail('all blinded items must have a separate assessment');
 const needed=new Set(packet.items.map(x=>x.caseId));
 const seen=new Set();
 for(const entry of ballot.entries){
  if(typeof entry?.caseId!=='string'||!needed.has(entry.caseId)||seen.has(entry.caseId))fail('missing/unknown/duplicate case identifier');
  seen.add(entry.caseId);
  if(!VERDICTS.has(entry.verdict))fail('missing or invalid verdict for '+entry.caseId);
  if(typeof entry.rationale!=='string'||entry.rationale.trim().length<16)fail('a case-specific rationale is required for '+entry.caseId);
  if(typeof entry.sourceCitation!=='string'||entry.sourceCitation.trim().length<8)fail('source citation required for '+entry.caseId);
  if(typeof entry.criticalSafetyError!=='boolean')fail('explicit safety flag required for '+entry.caseId);
  if(entry.criticalSafetyError && entry.verdict==='correct')fail('critical safety error must never have a correct verdict');
 }
 return new Map(ballot.entries.map(x=>[x.caseId,x]));
}
export function evaluateBallots(packet,ballotA,ballotB){
 if(!packet||packet.packetVersion!==1||packet.containsProvisionalLabels!==false||!Array.isArray(packet.items)||packet.items.length===0)fail('invalid or unblinded packet');
 const a=validateBallot(ballotA,packet),b=validateBallot(ballotB,packet);
 if(ballotA.reviewerCode===ballotB.reviewerCode)fail('two DIFFERENT independent reviewer codes are required');
 const agreement=[],disagreement=[],safetyConcerns=[];
 for(const item of packet.items){
  const first=a.get(item.caseId),second=b.get(item.caseId);
  const verdictAgreement=first.verdict===second.verdict;
  const safetyAgreement=first.criticalSafetyError===second.criticalSafetyError;
  if(first.criticalSafetyError||second.criticalSafetyError)safetyConcerns.push(item.caseId);
  if(verdictAgreement&&safetyAgreement)agreement.push({caseId:item.caseId,provisionalTwoReviewerConsensus:first.verdict,criticalSafetyError:first.criticalSafetyError,
   sourceVerification:'REQUIRES_MANUAL_CHECK_OF_CITED_PRIMARY_SOURCES'});
  else disagreement.push({caseId:item.caseId,firstVerdict:first.verdict,secondVerdict:second.verdict,
   firstSafety:first.criticalSafetyError,secondSafety:second.criticalSafetyError,
   action:'Independent third-person adjudication required; do NOT auto-promote'});
 }
 return {
  protocolVersion:1,total:packet.items.length,
  twoReviewerAgreementCount:agreement.length,
  twoReviewerDisagreementCount:disagreement.length,
  safetyConcernCount:safetyConcerns.length,
  agreementRateProvisional:Number((100*agreement.length/packet.items.length).toFixed(1)),
  agreement,disagreement,safetyConcerns,
  goldStandardCount:0,
  medicallyCertified:false,
  modelQualityAccuracy:'NOT_MEASURED',
  caveat:'Self-declared reviewer codes/qualifications and source citations are not verified identities, credentials or primary-source checks. Agreement is a review CANDIDATE only; adjudication and credential/source verification are required before gold labels.'
 };
}
const here=fileURLToPath(import.meta.url);
if(process.argv[1]===here){
 const argIndex=flag=>process.argv.indexOf(flag);
 const getPath=flag=>{const i=argIndex(flag);return i<0?null:process.argv[i+1];};
 const first=getPath('--first'),second=getPath('--second'),packetFile=getPath('--packet')||'audit-results/educator-review/blind-review-packet.json';
 mkdirSync('audit-results/educator-review',{recursive:true});
 if(!first||!second){
  const status={status:'not_reviewed',twoReviewerAgreementCount:0,goldStandardCount:0,
   note:'No reviewer ballots supplied. No independent human educational validation has taken place.'};
  writeFileSync('audit-results/educator-review/reconciliation.json',JSON.stringify(status,null,2)+'\n');
  console.log('HUMAN_REVIEW_STATUS',status.status,'0 reviewed; zero model calls');
 }else{
  const packet=JSON.parse(readFileSync(packetFile,'utf8'));
  const result=evaluateBallots(packet,JSON.parse(readFileSync(first,'utf8')),JSON.parse(readFileSync(second,'utf8')));
  writeFileSync('audit-results/educator-review/reconciliation.json',JSON.stringify(result,null,2)+'\n');
  console.log('HUMAN_REVIEW_CANDIDATES',result.twoReviewerAgreementCount,'disagreements',result.twoReviewerDisagreementCount,'gold labels',0);
  if(result.twoReviewerDisagreementCount>0)process.exitCode=2;
 }
}
