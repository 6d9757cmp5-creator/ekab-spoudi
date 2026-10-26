export const SCHEMA = 'ekab-sync-v1';
export const DRAFT_SEPARATOR = '\n\n—— Σημείωση από άλλη συσκευή ——\n\n';
const fields = new Set(['seen','weak','selfCorrect','selfAttempts','streak','draft','reviewHistory','nextReviewAt']);
const fileId = v => typeof v === 'string' && /^[A-Za-z0-9][\w.-]{0,35}$/.test(v);
export function stable(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
}
export function validValue(key, value) {
  let match;
  if ((match = /^q:(EOP-([AB])-(\d{3})):(\w+)$/.exec(key))) {
    if (!fields.has(match[4]) || +match[3]<1 || +match[3]>(match[2]==='A'?105:209)) return false;
    if(value===null)return true;
    if(match[4]==='reviewHistory')return Array.isArray(value)&&value.length<=72&&value.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).every(k=>['at','localDay','result'].includes(k))&&typeof e.at==='string'&&e.at.length<=40&&Number.isFinite(Date.parse(e.at))&&typeof e.localDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.localDay)&&['correct','assisted','incorrect','review'].includes(e.result));
    if(match[4]==='nextReviewAt')return typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
    return match[4]==='draft' ? typeof value==='string' && value.length<=250000 : Number.isSafeInteger(value)&&value>=0&&value<=1e9;
  }
  if (/^r:(0[1-9]|1\d|20):([1-9]|1\d|20)$/.test(key)) return value===null || value==='1';
  if (/^c:(0[1-9]|1\d|20)$/.test(key)) return value===null || typeof value==='string' && /^([1-9]|[12]\d|3[0-2])$/.test(value);
  if (key==='theme') return value===null || value==='dark' || value==='light';
  if (/^p:[A-Za-z0-9_-]{1,80}$/.test(key)) {
    return value===null || value && typeof value==='object' && !Array.isArray(value) &&
      typeof value.name==='string' && value.name.length<=255 && /\.pdf$/i.test(value.name) &&
      typeof value.course==='string' && value.course.length<=1000 && typeof value.semester==='string' && value.semester.length<=64 &&
      Number.isFinite(value.created) && value.created>=0 && Number.isSafeInteger(value.size) && value.size>=0 && value.size<=50000000 &&
      typeof value.hash==='string' && /^[a-f0-9]{64}$/.test(value.hash) && fileId(value.fileId);
  }
  return false;
}
function joinClock(a,b) { const c={...a};for(const [k,v] of Object.entries(b))c[k]=Math.max(c[k]||0,v);return c; }
function dominates(a,b) { return Object.entries(b).every(([k,v])=>(a[k]||0)>=v); }
export function mergeEntry(key,a,b) {
  if (!a) return b;if(!b)return a;
  const retired=[...new Set([...(a.retired||[]),...(b.retired||[])])].sort();
  const ad=dominates(a.clock,b.clock),bd=dominates(b.clock,a.clock);
  if(ad&&!bd)return {...a,retired};if(bd&&!ad)return {...b,retired};
  const winner=a.at>b.at || a.at===b.at&&(a.writer>b.writer||a.writer===b.writer&&stable(a.v)>stable(b.v))?a:b;
  let v=winner.v;
  if(stable(a.v)===stable(b.v))v=a.v;
  else if(key.endsWith(':draft')) {
    const parts=[...new Set([a.v,b.v].filter(x=>x!==null&&x!=='').flatMap(x=>x.split(DRAFT_SEPARATOR)))].sort();
    v=parts.join(DRAFT_SEPARATOR);
  } else if(key.endsWith(':reviewHistory')) {
    const events=[...(a.v||[]),...(b.v||[])];v=[...new Map(events.map(e=>[stable(e),e])).values()].sort((x,y)=>Date.parse(x.at)-Date.parse(y.at)||x.result.localeCompare(y.result)).slice(-72);
  } else if(key.endsWith(':nextReviewAt')&&a.v&&b.v) {
    v=Date.parse(a.v)<Date.parse(b.v)?a.v:b.v;
  } else if(/^q:/.test(key)&&typeof a.v==='number'&&typeof b.v==='number') {
    v=key.endsWith(':streak')?Math.min(a.v,b.v):Math.max(a.v,b.v);
  } else if((key.startsWith('p:')||key.startsWith('r:')||key.startsWith('q:'))&&(a.v===null||b.v===null)) v=a.v??b.v;
  return {v,clock:joinClock(a.clock,b.clock),at:Math.max(a.at,b.at),writer:winner.writer,retired};
}
export function mergeEntries(a,b) {
  const out={...a};for(const [key,value] of Object.entries(b))out[key]=mergeEntry(key,out[key],value);return out;
}
export function captureEdits(entries, previous, observed, device, now=Date.now()) {
  const next={...entries};
  for(const key of new Set([...Object.keys(previous),...Object.keys(observed)])) {
    const value=observed[key]??null;
    if(stable(previous[key]??null)===stable(value))continue;
    if(!validValue(key,value))throw new Error('invalid-local-data');
    const old=entries[key],clock={...(old?.clock||{})};clock[device]=(clock[device]||0)+1;
    const retired=[...new Set([...(old?.retired||[]),...(key.startsWith('p:')&&old?.v?.fileId&&old.v.fileId!==value?.fileId?[old.v.fileId]:[])])];
    next[key]={v:value,clock,at:now,writer:device,retired};
  }
  return next;
}
export function visibleEntries(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([,e])=>e.v!==null).map(([key,e])=>[key,e.v]));
}
export function validateManifest(data,userId) {
  if(!data||data.schema!==SCHEMA||data.userId!==userId||!/^[a-f0-9]{32}$/.test(data.device||'')||!data.entries||Array.isArray(data.entries)||typeof data.entries!=='object'||Object.keys(data.entries).length>6000)throw new Error('invalid-cloud-data');
  for(const [key,e] of Object.entries(data.entries)) {
    if(!e||!validValue(key,e.v)||!e.clock||typeof e.clock!=='object'||Array.isArray(e.clock)||Object.keys(e.clock).length>100||!Object.keys(e.clock).length||!Number.isFinite(e.at)||e.at<0||!/^[a-f0-9]{32}$/.test(e.writer||'')||!Array.isArray(e.retired||[])||(e.retired||[]).length>2000)throw new Error('invalid-cloud-data');
    for(const [d,n]of Object.entries(e.clock))if(!/^[a-f0-9]{32}$/.test(d)||!Number.isSafeInteger(n)||n<1)throw new Error('invalid-cloud-data');
    if((e.retired||[]).some(x=>!fileId(x)))throw new Error('invalid-cloud-data');
  }
  return data;
}
