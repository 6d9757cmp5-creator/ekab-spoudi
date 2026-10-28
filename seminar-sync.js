/* Shared seminar sync validation and conflict handling. No network or user-data logs. */
export const SEMINAR_KEY='ekab.seminar-prep.local.v1';
export const SEMINAR_COURSES=Object.freeze(['bls','pbls','ils','phtls','als']);
const indexLimits={studied:12,right:48,needs:48,oral:12,mcRight:12,mcNeeds:12,retryIndices:12};
const noteLimits={qNotes:[48,2000],oralNotes:[12,3500]};
const otherMaps={scenarioGrades:12,scenarioFeedback:12,mcAnswers:12};
const allowed=new Set([...Object.keys(indexLimits),...Object.keys(noteLimits),...Object.keys(otherMaps),'scenarioHistory','mixedRun']);
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const indices=(a,n)=>Array.isArray(a)&&a.length<=n&&new Set(a).size===a.length&&a.every(i=>Number.isInteger(i)&&i>=0&&i<n);
const mapKeys=(m,n)=>plain(m)&&Object.keys(m).length<=n&&Object.keys(m).every(k=>/^(0|[1-9]\d*)$/.test(k)&&Number(k)<n);
const verdicts=new Set(['correct','partial','incorrect','uncertain']);
function validRun(v){
 if(v===null)return true;
 if(!plain(v)||!Array.isArray(v.items)||v.items.length!==10||!plain(v.responses)||!Number.isInteger(v.pos)||v.pos<0||v.pos>10)return false;
 const units=new Set();let mc=0,written=0;
 for(const item of v.items){
  if(!plain(item)||!Number.isInteger(item.unit)||item.unit<0||item.unit>=12||units.has(item.unit))return false;units.add(item.unit);
  if(item.type==='multiple'){if(!Array.isArray(item.order)||item.order.length!==4||!indices(item.order,4))return false;mc++;}
  else if(item.type==='written'){if(!Number.isInteger(item.prompt)||item.prompt<0||item.prompt>3)return false;written++;}
  else return false;
 }
 if(mc!==7||written!==3||Object.keys(v.responses).length>10)return false;
 for(const [key,answer]of Object.entries(v.responses)){
  if(!/^(0|[1-9])$/.test(key)||!plain(answer))return false;
  if(v.items[Number(key)].type==='multiple'){
   if(!Number.isInteger(answer.choice)||answer.choice<0||answer.choice>3||!['right','needs'].includes(answer.grade))return false;
  }else if(!['right','needs','skipped'].includes(answer.grade))return false;
 }
 return true;
}
export function validSeminarCourse(p){
 if(!plain(p)||Object.keys(p).some(k=>!allowed.has(k)))return false;
 try{if(JSON.stringify(p).length>250000)return false}catch{return false}
 for(const [key,limit]of Object.entries(indexLimits))if(p[key]!==undefined&&!indices(p[key],limit))return false;
 for(const [key,[limit,maxLen]]of Object.entries(noteLimits)){
  const m=p[key];if(m===undefined)continue;if(!mapKeys(m,limit))return false;
  if(Object.values(m).some(v=>typeof v!=='string'||v.length>maxLen))return false;
 }
 for(const [key,limit]of Object.entries(otherMaps)){
  const m=p[key];if(m===undefined)continue;if(!mapKeys(m,limit))return false;
  for(const v of Object.values(m)){
   if(key==='mcAnswers'){if(!Number.isInteger(v)||v<0||v>3)return false;continue}
   if(!plain(v)||!verdicts.has(v.verdict)||typeof v.criticalError!=='boolean')return false;
   if(key==='scenarioFeedback'&&(['explanation','takeaway','modelAnswer'].some((k,i)=>typeof v[k]!=='string'||v[k].length>[1100,350,700][i])))return false;
  }
 }
 if(p.scenarioHistory!==undefined&&(!Array.isArray(p.scenarioHistory)||p.scenarioHistory.length>20||JSON.stringify(p.scenarioHistory).length>25000))return false;
 if(p.mixedRun!==undefined&&!validRun(p.mixedRun))return false;
 return true;
}
const present=p=>Object.values(indexLimits).length&&Object.keys(indexLimits).some(k=>p[k]?.length>0)
  ||Object.keys(noteLimits).some(k=>Object.keys(p[k]||{}).length>0)
  ||Object.keys(otherMaps).some(k=>Object.keys(p[k]||{}).length>0)
  ||Boolean(p.mixedRun)||Boolean(p.scenarioHistory?.length);
export function readSeminarValues(){
 const raw=localStorage.getItem(SEMINAR_KEY);if(!raw)return {};
 let value;try{value=JSON.parse(raw)}catch{throw Error('invalid-local-seminar-data')}
 if(!plain(value))throw Error('invalid-local-seminar-data');
 const result={};
 for(const id of SEMINAR_COURSES){
  if(!value[id])continue;
  if(!validSeminarCourse(value[id]))throw Error('invalid-local-seminar-data');
  if(present(value[id]))result['s:'+id]=value[id];
 }
 return result;
}
export function applySeminarValues(values){
 const courses={};
 for(const id of SEMINAR_COURSES){
  const course=values['s:'+id];
  if(course!==undefined){if(!validSeminarCourse(course))throw Error('invalid-cloud-seminar-data');courses[id]=course;}
 }
 if(Object.keys(courses).length)localStorage.setItem(SEMINAR_KEY,JSON.stringify(courses));
 else localStorage.removeItem(SEMINAR_KEY);
}
const unique=(a,b,limit)=>[...new Set([...(a||[]),...(b||[])])].filter(i=>Number.isInteger(i)&&i>=0&&i<limit).sort((x,y)=>x-y);
function combineRun(a,b,preferred){
 if(!a)return b||null;if(!b)return a;
 if(JSON.stringify(a.items)!==JSON.stringify(b.items)){
  const aa=Object.keys(a.responses||{}).length,bb=Object.keys(b.responses||{}).length;
  return aa!==bb?(aa>bb?a:b):preferred;
 }
 return {...preferred,responses:{...(a.responses||{}),...(b.responses||{}),...(preferred.responses||{})},pos:Math.max(a.pos||0,b.pos||0)};
}
// This is used only for concurrent changes (vector clocks incomparable).
// Sequential edits, including explicit resets, retain the causally newer state.
export function mergeSeminarCourse(a,b,preferred){
 const merged={...a,...b,...preferred};
 for(const [key,limit]of Object.entries(indexLimits))merged[key]=unique(a[key],b[key],limit);
 for(const key of [...Object.keys(noteLimits),...Object.keys(otherMaps)])merged[key]={...(a[key]||{}),...(b[key]||{}),...(preferred[key]||{})};
 merged.needs=merged.needs.filter(i=>!merged.right.includes(i));
 merged.mcNeeds=merged.mcNeeds.filter(i=>!merged.mcRight.includes(i));
 const history=[...(a.scenarioHistory||[]),...(b.scenarioHistory||[])];
 merged.scenarioHistory=[...new Map(history.map(x=>[JSON.stringify(x),x])).values()].slice(-20);
 merged.mixedRun=combineRun(a.mixedRun,b.mixedRun,preferred.mixedRun);
 return merged;
}
