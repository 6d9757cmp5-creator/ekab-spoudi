/**
 * ATLA research source credibility policy.
 * Allowlisted ownership enables MONITORING ONLY. It NEVER approves claims,
 * clinical retrieval, downloading full books, or using a source to treat patients.
 * Worldwide sources are welcome if their provenance/evidence passes review.
 */
const GROUPS=Object.freeze({
  'official-health-guidelines':Object.freeze([
    'www.who.int','who.int','www.resus.org.uk','www.erc.edu','erc.edu',
    'www.cdc.gov','www.nice.org.uk','www.ema.europa.eu','www.escardio.org',
    'www.idsociety.org','www.hematology.org','www.acog.org',
    'www.ginasthma.org','goldcopd.org','kdigo.org','professional.diabetes.org',
    'diabetesjournals.org','www.ems.gov'
  ]),
  'official-prehospital-education':Object.freeze([
    'www.ekab.gr','ekab.gr','www.naemt.org','naemt.org'
  ]),
  'official-textbook-publisher-metadata-only':Object.freeze([
    'www.psglearning.com','psglearning.com','shop.elsevier.com',
    'www.wolterskluwer.com','www.msdmanuals.com'
  ]),
  'academic-repository-unendorsed':Object.freeze([
    'www.ncbi.nlm.nih.gov'
  ]),
  'open-educational-material':Object.freeze([
    'openstax.org','www.openstax.org','wtcs.pressbooks.pub'
  ]),
  'technical-research-assets-not-clinical-guidance':Object.freeze([
    'humanatlas.io','physionet.org','github.com'
  ]),
  'official-document-delivery':Object.freeze([
    'cdn.who.int'
  ])
});
const lookup=new Map(Object.entries(GROUPS).flatMap(([category,hosts])=>hosts.map(h=>[h,category])));
const isPermittedGitHub=u=>/^\/(?:Z-Anatomy\/Models-of-human-anatomy|CognitionLabSNUC\/open-anatomy-atlas)(?:\/|$)/i.test(u.pathname);
const SOURCE_DENIAL=Object.freeze({
  unknown:'unrecognized-publisher-or-platform',
  unsafe:'url-must-be-plain-https-with-exact-host'
});
export function classifySource(url){
 let u;
 try{u=new URL(url)}catch{return {accepted:false,reason:SOURCE_DENIAL.unsafe};}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname||u.hostname.endsWith('.')||u.hostname.includes('%'))return {accepted:false,reason:SOURCE_DENIAL.unsafe};
 const hostname=u.hostname.toLowerCase(),category=lookup.get(hostname);
 if(!category)return {accepted:false,reason:SOURCE_DENIAL.unknown};
 if(hostname==='github.com'&&!isPermittedGitHub(u))return {accepted:false,reason:'unreviewed-repository-owner'};
 // Official publisher/index/platform ownership does not imply per-work approval.
 return {accepted:true,category,source_host:hostname,
   source_identity:'curated-owner-domain-not-individual-document-validation',
   content_verified:false,publication_quality_verified:false,
   clinical_use_approved:false,automatic_training_allowed:false,
   medical_knowledge_ingestion_allowed:false,
   eligible_for:'metadata-monitoring-only'};
}
export const SOURCE_GROUPS=GROUPS;

const EXCLUDED_PUBLICATION_PATTERNS=[
 /\bretracted publication\b/i,/\bretraction of publication\b/i,
 /\bretraction\b/i,/\bwithdrawn\b/i,/\bexpression of concern\b/i,
 /\bpublished erratum\b/i,/\bcorrection\b/i,/\bpreprint\b/i,
 /\beditorial\b/i,/\bletter\b/i,/\bcomment\b/i,
 /\bcase reports?\b/i,/\bnews\b/i,/\bcongress\b/i
];
const ELIGIBLE_EVIDENCE=[
 /\bpractice guideline\b/i,/\bguideline\b/i,
 /\bsystematic review\b/i,/\bmeta-analysis\b/i,
 /\bconsensus development conference\b/i
];
const restrictedWords=/(?:^\s*\[\s*retracted\s*\]|(?:retracted|withdrawn|expression of concern)\s*[:—-])/i;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
export function screenPubMedArticle(item){
 if(!/^\d{1,10}$/.test(String(item?.pmid||'')))return {accepted:false,reason:'missing-valid-pmid'};
 if(!clean(item.title)||!clean(item.journal)||!clean(item.published_at))
  return {accepted:false,reason:'insufficient-bibliographic-metadata'};
 const types=Array.isArray(item.publication_types)?item.publication_types:[];
 const combined=[...types,item.title].join(' ');
 if(restrictedWords.test(item.title)||EXCLUDED_PUBLICATION_PATTERNS.some(re=>re.test(combined)))
  return {accepted:false,reason:'retracted-preprint-or-non-evidence-publication'};
 if(!types.length||!types.some(type=>ELIGIBLE_EVIDENCE.some(re=>re.test(type))))
  return {accepted:false,reason:'evidence-type-unconfirmed'};
 return {accepted:true,reason:'potential-guideline-or-systematic-review-requires-independent-review',
   status:'pending-independent-review',reliability:'unassessed',
   trusted_index_not_endorsement:true,automatic_approval:false};
}
