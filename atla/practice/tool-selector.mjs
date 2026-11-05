/**
 * Conservative ATLA teaching-tool selection. No automatic tool load.
 * An ordinary explanation often needs only text; tools are suggested only
 * when the question explicitly requests a matching, existing resource.
 */
import {approvedTeachingVideo} from '../ai/teaching-policy.mjs';
import {loadLibrary,selectAtlaVisual,viewerHref} from '../../tools/atla-ai/nih3d-library.mjs';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ');

const VISUAL_REQUEST=/(?:3d|τρισδιαστατ|δειξε|να (?:το|τη|την|τον) δω|οπτικ)/;
const STRUGGLING=/(?:δεν (?:το |τη |την |τον )?(?:καταλαβ|κατανο)|πιο απλα|με αλλο τροπο|διαφορετικ)/;
/**
 * The specific 3D model that helps with this question, from the shared library.
 * The registry is fetched only after the learner asks to see something or says it is unclear;
 * otherwise text is enough and nothing is downloaded. A registry failure just means no offer.
 */
export async function chooseTeachingModel({question='',mode='lesson',revealed=false,confirmedAnatomy=false,from='',needsSupport=false,load=loadLibrary,rootUrl=new URL('../../',import.meta.url)}={}){
 const q=norm(question).slice(0,300);
 // needsSupport comes from the learner's own history; a model is then offered without being asked for.
 const requestedVisual=VISUAL_REQUEST.test(q),struggling=needsSupport||STRUGGLING.test(q);
 if(!q||(!requestedVisual&&!struggling))return null;
 let library;
 try{library=await load(rootUrl)}catch{return null}
 const model=selectAtlaVisual(library,{text:question,mode,revealed,confirmedAnatomy,requestedVisual,struggling});
 if(!model)return null;
 return {kind:'anatomy-model',href:viewerHref(model,{rootUrl,tool:mode==='simulation'?'cockpit':'anatomy',from}),
  label:'Άνοιξε το 3D μοντέλο: '+model.label,reason:'library-structure-match',accession:model.accession,
  modelLabel:model.label,requestedVisual};
}

export function chooseTeachingTool({question='',chapterId='',videos=[]}={}){
 const q=norm(question).slice(0,300);
 if(!q)return null;
 const videoIntent=/(βιντεο|video|οπτικοακουστικ)/.test(q);
 if(videoIntent){
  const item=approvedTeachingVideo(chapterId,videos);
  return item?{kind:'video',href:item.url,label:'Εγκεκριμένο βίντεο μαθήματος',reason:'approved-chapter-match'}:null;
 }
 if(/(?:3d|τρισδιαστατ)/.test(q)&&/(ανατομι|καρδι|πνευμον|εγκεφαλ|αγγει|σκελετ|οστ|μυ|νευρ)/.test(q)){
  return {kind:'anatomy',href:'ui-tools/anatomy-3d/index.html',label:'Άνοιξε 3D Ανατομία',reason:'explicit-anatomy-visualization'};
 }
 if(/(?:ecg|ηκγ|ηλεκτροκαρδιογραφ)/.test(q)&&/(ασκησ|εξασκησ|εργαστηρι|προσομοιω|δειξε)/.test(q)){
  return {kind:'ecg',href:'mentor-ecg.html',label:'Άνοιξε εκπαιδευτική άσκηση ECG',reason:'explicit-ecg-practice'};
 }
 if(/(?:πρωτοκολλ|αλγοριθμ)/.test(q)&&/(δειξε|ανοιξε|βρεσ|μελετ|διαβασ)/.test(q)){
  return {kind:'protocol',href:'protocols.html',label:'Άνοιξε τη βιβλιοθήκη πρωτοκόλλων',reason:'explicit-protocol-reference'};
 }
 if(/(?:προσομοιω|κλινικο σεναριο|σεναριο περιστατικ)/.test(q)&&/(τραυμα|ασθεν|περιστατικ|προσομοιω)/.test(q)){
  return {kind:'simulation',href:'mentor-next.html',label:'Άνοιξε εκπαιδευτικό προσομοιωτή',reason:'explicit-simulation-practice'};
 }
 return null;
}
