import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const APPROVALS_PATH='tools/atla-ai/resources/nih3d-credibility-approvals.json';
export function sourceFingerprint(entry) {
 const id=Number(entry.entryId??entry.id);
 const fields=[id,entry.accession,entry.title,entry.category,entry.url,entry.licenseRaw??entry.license,entry.sourceVersion??entry.version,entry.creator??''];
 return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
export function readApprovalRegistry(path=APPROVALS_PATH){
 const registry=JSON.parse(readFileSync(path,'utf8'));
 if(registry.schemaVersion!==1||registry.policy!=='DENY_UNREVIEWED'||
    registry.minimumCredibilityScore!==80||!Array.isArray(registry.approvals))
  throw Error('Invalid NIH source-credibility registry');
 const ids=new Set();
 for(const record of registry.approvals){
  if(!Number.isSafeInteger(record.entryId)||ids.has(record.entryId)||
    record.decision!=='APPROVED_FOR_ARCHIVE'||record.reliabilityScore<80||
    !['VERIFIED_INSTITUTIONAL','EXTERNALLY_REVIEWED'].includes(record.originVerification)||
    !record.reviewedBy||!record.reviewedAt||!Array.isArray(record.independentEvidence)||
    !record.independentEvidence.length||!record.fingerprint)
   throw Error('Invalid or duplicate NIH source approval');
  ids.add(record.entryId);
 }
 return registry;
}
export function checkSourceCredibility(entry,registry){
 if(!registry)throw Error('Source credibility registry required');
 const record=registry.approvals.find(a=>a.entryId===Number(entry.entryId??entry.id));
 if(!record)return {approved:false,reason:'NO_DOCUMENTED_SOURCE_REVIEW'};
 if(record.fingerprint!==sourceFingerprint(entry))
  return {approved:false,reason:'SOURCE_METADATA_CHANGED'};
 return {approved:true,reason:'DOCUMENTED_REVIEW',score:record.reliabilityScore};
}
export function requireSourceCredibility(entry,registry){
 const result=checkSourceCredibility(entry,registry);
 if(!result.approved)throw Error('NIH_SOURCE_REVIEW_REQUIRED '+(entry.entryId??entry.id)+' '+result.reason);
 return result;
}
