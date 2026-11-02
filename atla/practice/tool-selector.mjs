/**
 * Conservative ATLA teaching-tool selection. No automatic tool load.
 * An ordinary explanation often needs only text; tools are suggested only
 * when the question explicitly requests a matching, existing resource.
 */
import {approvedTeachingVideo} from '../ai/teaching-policy.mjs';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ');

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
