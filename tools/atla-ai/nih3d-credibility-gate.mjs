import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const APPROVALS_PATH='tools/atla-ai/resources/nih3d-credibility-approvals.json';
export function sourceFingerprint(entry) {
 const id=Number(entry?.entryId??entry?.id);
 if(!Number.isSafeInteger(id)||id<1||id>25000)throw Error('Invalid NIH source identity');
 const fields=[id,entry.accession,entry.title,entry.category,entry.url,entry.licenseRaw??entry.license,entry.sourceVersion??entry.version,entry.creator??''];
 return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
export function validateApprovalRegistry(registry){
 if(registry.schemaVersion!==1||registry.policy!=='DENY_UNREVIEWED'||
    registry.minimumCredibilityScore!==80||!Array.isArray(registry.approvals))
  throw Error('Invalid NIH source-credibility registry');
 const ids=new Set();
 for(const record of registry.approvals){
  if(!Number.isSafeInteger(record.entryId)||record.entryId<1||record.entryId>25000||ids.has(record.entryId)||
    record.decision!=='APPROVED_FOR_ARCHIVE'||
    !Number.isInteger(record.reliabilityScore)||record.reliabilityScore<80||record.reliabilityScore>100||
    !['VERIFIED_INSTITUTIONAL','EXTERNALLY_REVIEWED'].includes(record.originVerification)||
    typeof record.reviewedBy!=='string'||record.reviewedBy.trim().length<3||
    typeof record.reviewedAt!=='string'||!/^20\d\d-\d\d-\d\d$/.test(record.reviewedAt)||
    !Array.isArray(record.independentEvidence)||!record.independentEvidence.length||
    !record.independentEvidence.every(url=>typeof url==='string'&&url.startsWith('https://')&&
      !url.startsWith('https://3d.nih.gov/')&&url.length<2048)||
    typeof record.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(record.fingerprint))
   throw Error('Invalid or duplicate NIH source approval');
  ids.add(record.entryId);
 }
 return registry;
}
export function readApprovalRegistry(path=APPROVALS_PATH){
 return validateApprovalRegistry(JSON.parse(readFileSync(path,'utf8')));
}
export function checkSourceCredibility(entry,registry){
 validateApprovalRegistry(registry);
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
