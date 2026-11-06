/** ATLA source-only PubMed bibliography. NO AI prompts, abstracts or clinical answers. */
const allowedTopics=new Set(["prehospital","resuscitation","trauma","airway-respiratory","cardiac-emergency","stroke-neurology","pediatric-emergency","sepsis-shock","medication-safety","simulation-training"]);
const forbidden=["abstract","full_text","fullText","content","text","passages","clinical_advice","medical_claims","recommendation","answer"];
const noText=o=>forbidden.every(k=>!Object.hasOwn(o,k));
const iso=v=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const fail=reason=>{throw Error("research-source-unverified:"+reason)};
const plain=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ς/g,"σ").toLowerCase().trim();
export const QUEUE_PATHS=Object.freeze({
 metadata:"tools/atla-ai/knowledge-refresh/queue/last-scan.json",
 health:"tools/atla-ai/knowledge-refresh/queue/source-health.json",
 pending:"tools/atla-ai/knowledge-refresh/queue/pending-pubmed.json",
 review:"tools/atla-ai/knowledge-refresh/queue/ai-research-review.json"
});
export function validateResearch({metadata,health,pending,review}={}){
 const at=metadata?.checked_at;
 if(metadata?.schema_version!==1||!iso(at)||!Number.isInteger(metadata.pubmed_topics_checked)||
    metadata.pubmed_topics_checked<1||!Array.isArray(metadata.pubmed_failures)||
    metadata.pubmed_failures.length>=metadata.pubmed_topics_checked||
    !Number.isInteger(metadata.pending_papers)||metadata.full_texts_imported!==0||
    metadata.model_training_performed!==false||metadata.clinical_retrieval_updated!==false)fail("scan");
 if(health?.schema_version!==1||health.checked_at!==at||!Array.isArray(health.sources)||
    health.sources.length!==metadata.monitored_urls||
    health.sources.filter(x=>x.ok===true).length!==metadata.monitored_ok||
    health.sources.some(x=>x.clinical_approval!==false||x.knowledge_ingestion_enabled!==false))fail("source-health");
 if(pending?.schema_version!==1||pending.checked_at!==at||!Array.isArray(pending.items)||
    pending.items.length>100||pending.items.length!==metadata.pending_papers)fail("pending");
 if(review?.schema_version!==2||review.generated_at!==at||
    review.stage!=="research-only-awaiting-independent-review"||
    review.ai_configured!==false||review.clinical_knowledge_imported!==0||
    review.existing_curriculum_changed!==false||!Array.isArray(review.items)||
    review.items.length>pending.items.length)fail("review");
 const ids=new Set(),dois=new Set(),records=[];
 for(const p of pending.items){
  if(!p||typeof p!=="object")fail("record");
  const pmid=String(p.pmid??""),url="https://pubmed.ncbi.nlm.nih.gov/"+pmid+"/";
  if(!/^\d{1,10}$/.test(pmid)||ids.has(pmid)||p.id!=="pubmed-"+pmid||
     p.source_url!==url||typeof p.title!=="string"||!p.title.trim()||p.title.length>700||
     typeof p.journal!=="string"||!p.journal.trim()||p.journal.length>250||
     typeof p.published_at!=="string"||p.published_at.length>100||
     p.provenance!=="NCBI-PubMed-summary-metadata-not-article-endorsement"||
     p.status!=="pending-review"||p.source_quality!=="unassessed"||
     p.independent_review!=="required"||p.content_imported!==false||
     p.clinical_approval!==false||p.atla_ai_retrieval_enabled!==false||
     !Array.isArray(p.topic_ids)||!p.topic_ids.length||
     p.topic_ids.some(t=>!allowedTopics.has(t))||!noText(p))fail("unsafe-article:"+pmid);
  const doi=typeof p.doi==="string"?p.doi.trim():"";
  if(doi&&(!/^10\.\d{4,9}\/\S+$/i.test(doi)||dois.has(doi.toLowerCase())))fail("doi:"+pmid);
  ids.add(pmid);if(doi)dois.add(doi.toLowerCase());
  records.push(Object.freeze({pmid,title:p.title.trim(),journal:p.journal.trim(),
   publishedAt:p.published_at,doi:doi||null,url,topics:Object.freeze([...p.topic_ids]),
   status:"pending-independent-scientific-review",clinicalKnowledge:false,
   citation:p.journal.trim()+" · "+p.published_at+" · PMID "+pmid}));
 }
 const seenReview=new Set();
 for(const r of review.items){
  if(!r||!ids.has(String(r.pmid))||seenReview.has(String(r.pmid))||
     r.id!=="pubmed-"+r.pmid||r.source_url!=="https://pubmed.ncbi.nlm.nih.gov/"+r.pmid+"/"||
     r.status!=="pending-independent-scientific-review"||
     r.clinical_approval!==false||r.learner_visible!==false||
     r.atla_ai_retrieval_enabled!==false||r.full_text_stored!==false||
     r.assessment!==null||!noText(r))fail("unsafe-review");
  seenReview.add(String(r.pmid));
 }
 return Object.freeze({checkedAt:at,stage:"research-metadata-only",scientificApproval:false,
  clinicalRetrievalAllowed:false,count:records.length,records:Object.freeze(records)});
}
export function searchResearch(catalog,query="",limit=20){
 if(catalog?.stage!=="research-metadata-only"||catalog.scientificApproval!==false||
    catalog.clinicalRetrievalAllowed!==false||!Array.isArray(catalog.records))fail("unsafe-search");
 const tokens=plain(String(query).slice(0,140)).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,8);
 const found=catalog.records.filter(p=>{
  const hay=plain([p.title,p.journal,p.pmid,p.doi,...p.topics].join(" "));
  return tokens.every(t=>hay.includes(t));
 });
 return {total:found.length,rows:found.slice(0,Math.max(1,Math.min(25,Math.floor(Number(limit))||20)))};
}
/** Read-only GET. Any missing or mismatched snapshot hides the WHOLE research section. */
export async function loadResearch({fetcher=globalThis.fetch,base="./"}={}){
 if(typeof fetcher!=="function")fail("fetch");
 const names=Object.keys(QUEUE_PATHS);
 const data=await Promise.all(names.map(async k=>{
  const response=await fetcher(base+QUEUE_PATHS[k],{method:"GET",cache:"no-store",credentials:"omit"});
  if(!response?.ok)fail("unavailable:"+k);
  return response.json();
 }));
 return validateResearch(Object.fromEntries(names.map((k,i)=>[k,data[i]])));
}
