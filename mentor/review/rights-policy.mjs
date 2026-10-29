/**
 * REVIEW-ONLY verified publisher terms, 2026-10-29.
 *
 * "preview_allowed" means only bounded, non-AI, editor-facing excerpts on
 * this UNMERGED test branch. It is NEVER a declaration of production rights.
 * All seven books remain blocked from LLM training / RAG / clinical deployment.
 * This local policy is deliberately fail-closed.
 */
const records=[
 {id:'wistech-emr-2025',license:'CC BY 4.0, except separately credited third-party material',
  source:'https://wtcs.pressbooks.pub/emergencymedtech/',
  preview_allowed:true,reason:'Publisher confirms CC BY 4.0; third-party exceptions and attribution still require review'},
 {id:'openrn-health',license:'CC BY 4.0, except separately credited third-party material',
  source:'https://wtcs.pressbooks.pub/healthalts/',
  preview_allowed:true,reason:'Publisher confirms CC BY 4.0; third-party exceptions and attribution still require review'},
 {id:'openrn-skills',license:'CC BY 4.0, except separately credited third-party material',
  source:'https://wtcs.pressbooks.pub/nursingskills/',
  preview_allowed:true,reason:'Publisher confirms CC BY 4.0; third-party exceptions and attribution still require review'},
 {id:'openrn-pharm',license:'CC BY 4.0, except separately credited third-party material',
  source:'https://wtcs.pressbooks.pub/pharmacology2e/',
  preview_allowed:true,reason:'Publisher confirms CC BY 4.0; third-party exceptions and attribution still require review'},
 {id:'openrn-advanced',license:'CC BY 4.0, except separately credited third-party material',
  source:'https://wtcs.pressbooks.pub/nursingadvancedskills/',
  preview_allowed:true,reason:'Publisher confirms CC BY 4.0; third-party exceptions and attribution still require review'},
 {id:'who-bec',license:'CC BY-NC-SA 3.0 IGO: noncommercial, attribution, share-alike, no WHO/ICRC endorsement',
  source:'https://www.who.int/publications/i/item/9789241513081',
  preview_allowed:false,reason:'Noncommercial and IGO-specific conditions; deployment/redistribution context not yet approved. 2018 text has 2025 WHO update notices'},
 {id:'medical-surgical-nursing',license:'CC BY-NC-SA 4.0 per OpenStax current site; explicit prior written permission for generative-AI ingestion',
  source:'https://openstax.org/books/medical-surgical-nursing/pages/1-introduction',
  preview_allowed:false,reason:'Publisher explicitly requires PRIOR WRITTEN PERMISSION for training, ingestion into LLMs and generative-AI offerings; previous manifest CC BY 4.0 assertion is inaccurate'}
];
export const SOURCE_POLICY=Object.freeze(Object.fromEntries(records.map(item=>[item.id,Object.freeze({
 ...item,ai_retrieval_allowed:false,model_training_allowed:false,
 production_publication_allowed:false,clinical_review:'pending',rights_signoff:'pending'
})])));
export function canPreviewSource(id){
 return Object.hasOwn(SOURCE_POLICY,id) && SOURCE_POLICY[id].preview_allowed===true;
}
export function assertEditorialSource(id){
 if(!canPreviewSource(id))throw new Error('Το βιβλίο έχει περιοριστεί λόγω δικαιωμάτων και δεν επιτρέπεται προεπισκόπηση.');
 return SOURCE_POLICY[id];
}
export function assertNoClinicalApproval(manifest,sources){
 if(!Array.isArray(manifest?.books)||!Array.isArray(sources)||manifest.books.length!==7)throw Error('Rights inventory invalid');
 const all=new Set(manifest.books.map(book=>book.source_id));
 if(all.size!==7||Object.keys(SOURCE_POLICY).length!==7)throw Error('Rights inventory has duplicate/unknown entries');
 for(const [id,policy]of Object.entries(SOURCE_POLICY)){
  if(!all.has(id)||policy.ai_retrieval_allowed!==false||policy.model_training_allowed!==false||
   policy.production_publication_allowed!==false||policy.clinical_review!=='pending'||policy.rights_signoff!=='pending')
   throw Error('Unsafe publisher review state for '+id);
 }
 for(const item of sources){
  if(item.clinical_retrieval_enabled!==false||item.independent_clinical_review!=='not_verified'||
    item.publication_rights_review!=='not_verified')throw Error('Premature clinical permission in source registry');
 }
 return true;
}
