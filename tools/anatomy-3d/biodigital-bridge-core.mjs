/**
 * ATLA ↔ BioDigital Human: input validation and curated ATLA-only learning routes.
 * No BioDigital proprietary assets, tokens, or internal engine are copied here.
 * The BioDigital iframe remains provider-hosted and requires an authorized published URL.
 */
export const ATLA_TOPICS=Object.freeze([
  {id:'heart',name:'Καρδιά',system:'cardiac',focus:'heart',prompt:'Εντόπισε την καρδιά και παρατήρησε τη θέση της στον θώρακα.'},
  {id:'brain',name:'Εγκέφαλος',system:'nervous',focus:'brain',prompt:'Παρατήρησε την προστασία του εγκεφάλου από το κρανίο.'},
  {id:'lungs',name:'Πνεύμονες',system:'respiratory',focus:'lung',prompt:'Εντόπισε τους πνεύμονες και τη σχέση τους με τον θωρακικό κλωβό.'},
  {id:'kidney',name:'Νεφροί',system:'urinary',focus:'kidney',prompt:'Εντόπισε τους νεφρούς στο οπίσθιο κοιλιακό τοίχωμα.'},
  {id:'stomach',name:'Στομάχι',system:'digestive',focus:'stomach',prompt:'Εντόπισε το στομάχι στο ανώτερο τμήμα της κοιλιάς.'},
  {id:'skull',name:'Κρανίο',system:'skeletal',focus:'skull',prompt:'Εντόπισε την οστέινη προστασία της κεφαλής.'}
]);
const paths=new Set(['/viewer','/viewer/','/widget','/widget/']);
/** Only provider-published viewer URLs; never permit arbitrary iframe origins. */
export function validateViewerUrl(input){
  if(typeof input!=='string'||input.length>4096||!input.trim())return null;
  let u;
  try{u=new URL(input.trim())}catch{return null}
  if(u.protocol!=='https:'||u.hostname!=='human.biodigital.com'||u.port||u.username||u.password||!paths.has(u.pathname))return null;
  if(!['id','m','be'].some(key=>Boolean(u.searchParams.get(key))))return null;
  if([...u.searchParams].some(([k,v])=>k.length>80||v.length>2000))return null;
  u.hash='';
  return u.href;
}
/** ATLA anatomy's documented focus query: no third-party assets required. */
export function nativeAtlasUrl(topicId){
  const t=ATLA_TOPICS.find(t=>t.id===topicId);
  if(!t)return null;
  return './index.html?'+new URLSearchParams({system:t.system,focus:t.focus}).toString();
}
/** Command whitelist prevents a user string from being executed as an API command. */
export const HUMAN_COMMANDS=Object.freeze({
  left:['camera.orbit',{yaw:-10}],
  right:['camera.orbit',{yaw:10}],
  reset:['camera.reset',undefined],
  labelsOn:['labels.show',undefined],
  labelsOff:['labels.hide',undefined],
  xrayOn:['scene.enableXray',undefined],
  xrayOff:['scene.disableXray',undefined],
  next:['timeline.nextChapter',undefined],
  previous:['timeline.previousChapter',undefined],
  play:['timeline.play',{loop:false}],
  pause:['timeline.pause',undefined],
  quizEnter:['quiz.enter',undefined],
  quizExit:['quiz.exit',undefined],
  restore:['scene.reset',undefined]
});
/** Only IDs reported by BioDigital's own scene.picked event are eligible.
 * Object-map metadata uses an explicit replace flag to hide other objects.
 */
export function isolatePickedObjectMap(objectId){
  if(typeof objectId!=='string'||objectId.length>240||!/^[a-zA-Z0-9_.:\-]+$/.test(objectId)||['replace','__proto__','constructor','prototype'].includes(objectId))return null;
  const map=Object.create(null);
  map.replace=true;
  map[objectId]=true;
  return map;
}
