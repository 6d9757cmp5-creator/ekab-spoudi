/**
 * EOPPEP reader-only optional bridge: one curated ECG exercise after reading.
 * Not mounted in the examination view; no answer, grade or progress writes.
 */
import {eoppepTool} from '../learning/contextual-tools.mjs';
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
export function installEoppepContext(root=document){
 const reader=root.getElementById('catalogReaderContent');
 const anchor=root.getElementById('catalogReaderReadySos');
 if(!reader||!anchor||root.getElementById('atlas-eoppep-tool'))return false;
 const panel=el('section','atlas-contextual-panel');
 panel.id='atlas-eoppep-tool';panel.hidden=true;
 panel.setAttribute('aria-label','Προαιρετική εξάσκηση σχετική με την ερώτηση');
 const title=el('h4','','Σχετική πρακτική · προαιρετικά');
 const why=el('p','atlas-contextual-why');
 const button=el('button','atlas-contextual-action','Έτοιμος για απλή εξάσκηση');
 button.type='button';
 const slot=el('div','atlas-contextual-result');
 slot.setAttribute('aria-live','polite');
 panel.append(title,why,button,slot);anchor.after(panel);
 let selected=null;
 const isReader=()=>{
   const exam=root.getElementById('examView');
   const home=root.getElementById('homeView');
   return !reader.hidden && !home?.classList.contains('hidden') &&
     (exam?.classList.contains('hidden')??true) &&
     new URLSearchParams(location.search).get('mode')!=='exam';
 };
 const sync=id=>{
   selected=eoppepTool(id,{readerVisible:isReader(),activeExam:!isReader()});
   panel.hidden=!selected;slot.replaceChildren();
   if(!selected)return;
   why.textContent=selected.reason;
 };
 button.addEventListener('click',()=>{
   if(!selected||!isReader())return;
   const a=el('a','atlas-contextual-link',selected.title);
   a.href=selected.href;
   slot.replaceChildren(a);
 });
 window.addEventListener('ekab:eoppep-reader',event=>{
   if(event.detail?.mode!=='reader')return;
   sync(String(event.detail.id||''));
 });
 sync(reader.dataset.atlaReaderQuestionId||'');
 return true;
}
if(typeof document!=='undefined'){
 const boot=()=>installEoppepContext();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
