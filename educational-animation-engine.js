/* Educational Animation ENGINE — source-bound publication gate.
 * No rendering, API calls or video generation occurs in this module.
 * Domain-neutral: SAEK is the initial rollout, not a hardcoded content limit.
 */
(function(root){
'use strict';
const STATES=Object.freeze(['scheduled','generating','review','approved','published','failed']);
const NAME='Educational Animation ENGINE';
function normalize(entry){
 if(!entry||typeof entry!=='object')throw Error('Missing video record');
 const {id,sourceId,sourceHash,videoUrl,status,clinicalApproval,coverageApproval,assetApproval}=entry;
 if(!id||!sourceId||!sourceHash)throw Error('Missing immutable source identity');
 if(!STATES.includes(status))throw Error('Invalid video state');
 return {id:String(id),sourceId:String(sourceId),sourceHash:String(sourceHash),
   videoUrl:typeof videoUrl==='string'?videoUrl:null,status,
   clinicalApproval:clinicalApproval===true,coverageApproval:coverageApproval===true,
   assetApproval:assetApproval===true};
}
function canPublish(record,currentSourceHash){
 const r=normalize(record);
 return r.status==='published' && r.sourceHash===currentSourceHash &&
  r.clinicalApproval && r.coverageApproval && r.assetApproval &&
  !!r.videoUrl && /^https:\/\//.test(r.videoUrl);
}
function resolve(records,sourceId,currentHash){
 if(!Array.isArray(records))return null;
 return records.map(normalize).find(r=>r.sourceId===sourceId&&canPublish(r,currentHash))||null;
}
function changed(record,newHash){return normalize(record).sourceHash!==newHash;}
root.EducationalAnimationENGINE=Object.freeze({NAME,STATES,normalize,canPublish,resolve,changed});
})(typeof window!=='undefined'?window:globalThis);
