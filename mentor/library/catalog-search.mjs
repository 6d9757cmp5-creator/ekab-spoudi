/** Safe, deterministic search of public metadata. No clinical retrieval. */
export function normalizeSearch(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el').trim();
}
export const LEARNING_TRACKS=Object.freeze(['paramedic','medicine']);
export function matchesLearningTrack(source,track='all'){
  if(!['all',...LEARNING_TRACKS].includes(track))throw Error('Invalid learning track');
  return track==='all'||source.learning_tracks.includes(track);
}
export function assertPublicCatalog(data){
  if(data?.schema_version!==1||!Array.isArray(data.sources)||data.sources.length>200)throw Error('Invalid bibliography format');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('Duplicate bibliography source ID');
  for(const s of data.sources){
    if(typeof s.id!=='string'||!s.id||typeof s.title!=='string'||!s.title||
       typeof s.publisher!=='string'||!/^https:\/\//.test(s.source_url||'')||
       typeof s.extracted_for_review!=='boolean'||
       !Array.isArray(s.learning_tracks)||s.learning_tracks.length<1||
       s.learning_tracks.length>LEARNING_TRACKS.length||
       new Set(s.learning_tracks).size!==s.learning_tracks.length||
       s.learning_tracks.some(t=>!LEARNING_TRACKS.includes(t))||
       (s.reference_only===true&&s.full_text_imported!==false)||
       s.clinical_retrieval_enabled!==false||
       s.independent_clinical_review!=='not_verified'||
       s.publication_rights_review!=='not_verified')throw Error('Unverified or unsafe bibliography entry');
    if(['text','passages','content','text_path','html','model_training'].some(k=>Object.hasOwn(s,k)))
      throw Error('Clinical source content must not be public');
  }
  if(data.counts?.identified!==data.sources.length||
     data.counts?.extracted_in_isolated_review_branch!==data.sources.filter(s=>s.extracted_for_review).length||
     data.counts?.clinically_approved!==0)throw Error('Bibliography counts out of sync');
  return data.sources;
}
export function filterCatalog(sources,{query='',stage='all',track='all'}={}){
  if(!['all','extracted','identified'].includes(stage))throw Error('Invalid bibliography filter');
  if(!['all',...LEARNING_TRACKS].includes(track))throw Error('Invalid learning track');
  const needle=normalizeSearch(query).slice(0,120);
  return sources.filter(s=>{
    if(!matchesLearningTrack(s,track))return false;
    if(stage==='extracted'&&!s.extracted_for_review)return false;
    if(stage==='identified'&&s.extracted_for_review)return false;
    const haystack=normalizeSearch([s.title,s.publisher,s.source_url,s.license_summary,s.edition,...(s.curriculum_topics||[])].join(' '));
    return !needle||haystack.includes(needle);
  });
}
