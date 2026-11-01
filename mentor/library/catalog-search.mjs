/** Safe, deterministic search of public metadata. No clinical retrieval. */
export function normalizeSearch(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el').trim();
}
export function assertPublicCatalog(data){
  if(data?.schema_version!==1||!Array.isArray(data.sources)||data.sources.length>200)throw Error('Invalid bibliography format');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('Duplicate bibliography source ID');
  for(const s of data.sources){
    if(typeof s.id!=='string'||!s.id||typeof s.title!=='string'||!s.title||
       typeof s.publisher!=='string'||!/^https:\/\//.test(s.source_url||'')||
       typeof s.extracted_for_review!=='boolean'||
       s.clinical_retrieval_enabled!==false||
       s.independent_clinical_review!=='not_verified'||
       s.publication_rights_review!=='not_verified')throw Error('Unverified or unsafe bibliography entry');
    if(['text','passages','content','text_path','html'].some(k=>Object.hasOwn(s,k)))
      throw Error('Clinical source content must not be public');
  }
  if(data.counts?.identified!==data.sources.length||
     data.counts?.extracted_in_isolated_review_branch!==data.sources.filter(s=>s.extracted_for_review).length||
     data.counts?.clinically_approved!==0)throw Error('Bibliography counts out of sync');
  return data.sources;
}
export function filterCatalog(sources,{query='',stage='all'}={}){
  if(!['all','extracted','identified'].includes(stage))throw Error('Invalid bibliography filter');
  const needle=normalizeSearch(query).slice(0,120);
  return sources.filter(s=>{
    if(stage==='extracted'&&!s.extracted_for_review)return false;
    if(stage==='identified'&&s.extracted_for_review)return false;
    const haystack=normalizeSearch([s.title,s.publisher,s.source_url,s.license_summary].join(' '));
    return !needle||haystack.includes(needle);
  });
}
