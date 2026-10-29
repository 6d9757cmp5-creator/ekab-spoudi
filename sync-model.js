import { validSeminarCourse, mergeSeminarCourse, SEMINAR_COURSES } from './seminar-sync.js';
import { validNote, validNoteId } from './notes-store.js';
export const SCHEMA = 'ekab-sync-v1';
export const DRAFT_SEPARATOR = '\n\n—— Σημείωση από άλλη συσκευή ——\n\n';
const fields = new Set(['seen','weak','selfCorrect','selfAttempts','streak','draft','reviewHistory','nextReviewAt','readCompletedAt','sosNotes','readerNotes']);
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
    if(match[4]==='nextReviewAt'||match[4]==='readCompletedAt')return typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
    return match[4]==='draft' ? typeof value==='string'&&value.length<=250000 : ['sosNotes','readerNotes'].includes(match[4]) ? typeof value==='string'&&value.length<=15000 : Number.isSafeInteger(value)&&value>=0&&value<=1e9;
  }
  if (/^r:(0[1-9]|1\d|20):([1-9]|1\d|20)$/.test(key)) return value===null || value==='1';
  if (/^c:(0[1-9]|1\d|20)$/.test(key)) return value===null || typeof value==='string' && /^([1-9]|[12]\d|3[0-2])$/.test(value);
  if (/^t:[a-f0-9]{32}:(saek|eoppep|bls|pbls|ils|phtls|als|pharma):(study|exam)$/.test(key))
    return value===null || Number.isSafeInteger(value)&&value>=0&&value<=315360000;
  if (key==='x:saek-exams') {
    if(value===null)return true;
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>247)return false;
    try{if(JSON.stringify(value).length>200000)return false}catch{return false}
    return Object.entries(value).every(([id,h])=>
      /^saek-(0[1-9]|1\d|20)-([1-9]|[12]\d|3[0-2])$/.test(id)&&h&&typeof h==='object'&&!Array.isArray(h)
      &&Object.keys(h).every(k=>['correct','partial','incorrect','lastAt'].includes(k))
      &&['correct','partial','incorrect'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0&&h[k]<=100000)
      &&Number.isSafeInteger(h.lastAt)&&h.lastAt>=0&&h.lastAt<=4102444800000);
  }
  if (key.startsWith('n:')&&validNoteId(key.slice(2)))return value===null||validNote(value);
  if (key==='theme') return value===null || value==='dark' || value==='light';
  if (/^s:(bls|pbls|ils|phtls|als)$/.test(key)) return value===null || validSeminarCourse(value);
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
  // A device with a shorter seminar record must not erase learning already
  // present on the other device, even when its write is causally newer.
  // A confirmed whole-course reset is represented by a null tombstone below.
  if(key.startsWith('s:')&&a.v!==null&&b.v!==null&&stable(a.v)!==stable(b.v)){
    const preferred=a.at>b.at || a.at===b.at&&(a.writer>b.writer||a.writer===b.writer&&stable(a.v)>stable(b.v))?a:b;
    return {v:mergeSeminarCourse(a.v,b.v,preferred.v),clock:joinClock(a.clock,b.clock),
      at:Math.max(a.at,b.at),writer:preferred.writer,retired};
  }
  // Independent device time counters only increase; never sum two copies of the same device.
  if(key.startsWith('t:')&&a.v!==null&&b.v!==null){
    const preferred=(a.v>=b.v)?a:b;
    return {...preferred,v:Math.max(a.v,b.v),clock:joinClock(a.clock,b.clock),retired};
  }
  // Merge exam answers by question ID; preserve the larger observed counters.
  if(key==='x:saek-exams'&&a.v!==null&&b.v!==null){
    const history={...a.v};
    for(const [id,h] of Object.entries(b.v)){
      const old=history[id];
      history[id]=old?{
        correct:Math.max(old.correct,h.correct),
        partial:Math.max(old.partial,h.partial),
        incorrect:Math.max(old.incorrect,h.incorrect),
        lastAt:Math.max(old.lastAt,h.lastAt)
      }:h;
    }
    const preferred=a.at>=b.at?a:b;
    return {v:history,clock:joinClock(a.clock,b.clock),at:Math.max(a.at,b.at),writer:preferred.writer,retired};
  }
  if(ad&&!bd)return {...a,retired};if(bd&&!ad)return {...b,retired};
  const winner=a.at>b.at || a.at===b.at&&(a.writer>b.writer||a.writer===b.writer&&stable(a.v)>stable(b.v))?a:b;
  let v=winner.v;
  if(stable(a.v)===stable(b.v))v=a.v;
  else if(key.startsWith('s:')) {
    if(a.v===null||b.v===null)v=winner.v;
    else v=mergeSeminarCourse(a.v,b.v,winner.v);
  }
  else if(key.startsWith('n:')&&a.v&&b.v) {
    // Distinct offline edits to the same personal note retain both texts,
    // rather than silently discarding someone's work.
    const pieces=[...new Set([a.v.body,b.v.body].filter(Boolean).flatMap(x=>x.split(DRAFT_SEPARATOR)))].sort();
    const combined=pieces.join(DRAFT_SEPARATOR);
    v={...winner.v,body:combined.length<=8000?combined:winner.v.body};
  }
  else if(/:(?:draft|sosNotes|readerNotes)$/.test(key)) {
    const parts=[...new Set([a.v,b.v].filter(x=>x!==null&&x!=='').flatMap(x=>x.split(DRAFT_SEPARATOR)))].sort();
    v=parts.join(DRAFT_SEPARATOR);
  } else if(key.endsWith(':reviewHistory')) {
    const events=[...(a.v||[]),...(b.v||[])];v=[...new Map(events.map(e=>[stable(e),e])).values()].sort((x,y)=>Date.parse(x.at)-Date.parse(y.at)||x.result.localeCompare(y.result)).slice(-72);
  } else if(key.endsWith(':nextReviewAt')&&a.v&&b.v) {
    v=Date.parse(a.v)<Date.parse(b.v)?a.v:b.v;
  } else if(key.endsWith(':readCompletedAt')) {
    // Explicit undo (null) is allowed, including concurrent edits.
    v=winner.v;
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
