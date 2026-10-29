/**
 * MENTOR OS stage-gate policy:
 * Owner acceptance of technical audit may start development, but never grants
 * independent clinical clearance, publisher rights or permission to publish.
 */
import {assertNoClinicalApproval} from '../review/rights-policy.mjs';

export function validateStageGates(gate,{manifest,catalog}={}){
 if(gate?.schema_version!==1||gate.project!=='ΕΚΑΒ Σπουδή — MENTOR OS'||
   gate.user_instruction?.acceptance!=='owner-accepted-for-next-stage'||
   gate.user_instruction?.authority!=='project-owner-for-roadmap-only'||
   gate.user_instruction?.independent_medical_attestation!==false||
   gate.user_instruction?.publisher_rights_document_verified!==false)
  throw Error('Invalid Stage 2 owner approval');
 const phase2=gate.stage_2,phase3=gate.stage_3,controls=gate.controls;
 if(phase2?.owner_gate!=='accepted-to-proceed'||
   phase2.automated_checks!=='completed'||
   phase2.clinician_review!=='pending-independent-clinician'||
   phase2.publisher_rights_verification!=='pending'||
   phase2.publication_clearance!==false||
   phase2.source_texts_clinically_approved!==0||
   phase2.total_source_texts!==7||
   phase2.high_risk_samples_queued!==106||
   phase3?.development_authorized!==true||
   phase3.development_status!=='ready-to-proceed-in-draft')
  throw Error('Attempt to confuse owner readiness with independent approval');
 if(controls?.clinical_retrieval_enabled!==false||
   controls.model_training_enabled!==false||
   controls.medical_decision_support_enabled!==false||
   controls.approved_for_publication!==false||
   controls.can_start_stage_3_development!==true||
   controls.legacy_progress_protected!==true)
  throw Error('Clinical production gate must remain closed');
 if(!Array.isArray(phase3.prohibited_until_signoff)||phase3.prohibited_until_signoff.length<4||
    !Array.isArray(phase3.allowed_now)||phase3.allowed_now.length<4)
  throw Error('Development and clinical safeguards missing');
 if(manifest||catalog){
   if(!manifest||!catalog)throw Error('Missing book audit context');
   assertNoClinicalApproval(manifest,catalog.sources);
   if(manifest.books.length!==gate.stage_1.imported_books||
      manifest.books.reduce((total,b)=>total+b.passage_count,0)!==gate.stage_1.extracted_passages)
     throw Error('Stage metrics do not match actual corpus');
 }
 return Object.freeze({
   stage_2_owner_gate:'accepted-to-proceed',
   stage_3_development_authorized:true,
   independent_clinical_approval:false,
   publisher_rights_verified:false,
   production_clinical_release_allowed:false
 });
}
