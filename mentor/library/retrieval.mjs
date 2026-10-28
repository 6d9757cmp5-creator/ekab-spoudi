/**
 * MENTOR OS: source-attributed, deterministic retrieval over approved passages.
 * No AI provider calls. This is an independent library, not the answer grader.
 */
export function normalizeGreek(text) {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function tokens(text) {
  return [...new Set(normalizeGreek(text).split(/\s+/).filter(t => t.length > 2))];
}
export function validatePassage(p) {
  if (!p || typeof p !== 'object') return false;
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(p.id || '')) return false;
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(p.source_id || '')) return false;
  if (typeof p.text !== 'string' || p.text.length < 30 || p.text.length > 8000) return false;
  if (typeof p.source_url !== 'string' || !/^https:\/\//.test(p.source_url)) return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  if (!['human-reviewed','draft'].includes(p.review_status)) return false;
  return true;
}
/** Return only passages that have been explicitly reviewed. No fallback to draft content. */
export function retrieve({query,passages,limit=5,topics=[]}) {
  if (!Array.isArray(passages)) throw new TypeError('passages must be an array');
  const q=tokens(query);
  if (!q.length) return [];
  const allow=new Set(topics.map(normalizeGreek));
  const results=passages.filter(p => validatePassage(p) && p.review_status==='human-reviewed')
    .filter(p => !allow.size || (p.topics || []).some(t=>allow.has(normalizeGreek(t))))
    .map(p => {
      const titleTokens=new Set(tokens(p.title+' '+(p.topics||[]).join(' ')));
      const bodyTokens=new Set(tokens(p.text));
      let score=0;
      for(const t of q){if(titleTokens.has(t))score+=4;if(bodyTokens.has(t))score+=1;}
      return {id:p.id,source_id:p.source_id,title:p.title,text:p.text,source_url:p.source_url,edition:p.edition||null,section:p.section||null,score};
    }).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return results.slice(0,Math.max(1,Math.min(10,Math.trunc(limit)||5)));
}
