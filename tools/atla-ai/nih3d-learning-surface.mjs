/** A single, fail-closed NIH 3D source-link bridge. No student progress or exam scores touched. */
import {selectNihResearchSource,officialResearchLink} from './nih3d-research-context.mjs';
const el=id=>document.getElementById(id);
function createLink(record){
 const ref=officialResearchLink(record);
 if(!ref)return null;
 const span=document.createElement('span');span.className='nih3d-research-reference';
 const anchor=document.createElement('a');
 anchor.href=ref.href;anchor.target=ref.target;anchor.rel=ref.rel;
 anchor.textContent=ref.label+' ↗';
 anchor.title=ref.description;
 const note=document.createElement('small');note.textContent=' · Ερευνητική πηγή, όχι κλινική επικύρωση';
 span.append(anchor,note);return span;
}
function lesson(){
 const match=location.pathname.match(/saek-course-(\d{2})\.html$/);
 if(!match)return false;
 const course=match[1];
 for(const chapter of document.querySelectorAll('details[id^="lesson-"]')){
  const number=chapter.id.slice(7);
  const target=chapter.querySelector('.saek-anatomy-jump-actions');
  const chapterBody=chapter.querySelector('.body .reader-main')||chapter.querySelector('.body');
  if(!target||!chapterBody||target.querySelector('.nih3d-research-reference'))continue;
  const ref=selectNihResearchSource({surface:'lesson',courseId:course,chapterId:number,text:chapterBody.textContent});
  if(ref){const link=createLink(ref);if(link)target.append(link);}
 }
 return true;
}
function exam(){
 const box=el('examReference');if(!box)return false;
 function update({text,revealed}={}){
  box.querySelector('.nih3d-research-reference')?.remove();
  const ref=selectNihResearchSource({surface:'exam',text,revealed});
  if(!ref)return;
  const link=createLink(ref);if(link)box.append(link);
 }
 window.addEventListener('atla:saek-exam-question',event=>update(event.detail));
 return true;
}
function anatomy(){
 const name=el('detailName'),card=el('detailCard');if(!name||!card)return false;
 const update=()=>{
  card.querySelector('.nih3d-research-reference')?.remove();
  if(card.hidden)return;
  const ref=selectNihResearchSource({surface:'anatomy',text:name.textContent});
  if(ref){const link=createLink(ref);if(link)card.append(link);}
 };
 const observer=new MutationObserver(update);
 observer.observe(name,{subtree:true,childList:true,characterData:true});
 observer.observe(card,{attributes:true,attributeFilter:['hidden']});
 update();
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 return true;
}
function cockpit(){
 const title=el('next-case-title'),brief=el('next-case-briefing');if(!title||!brief)return false;
 // Synthetic MENTOR cases currently contain no confirmed named anatomical injury.
 // A mere road incident is not evidence of a fracture; consequently no model is displayed.
 const update=event=>{
  document.querySelector('.nih3d-research-reference[data-cockpit]')?.remove();
  const ref=selectNihResearchSource({
    surface:'cockpit',
    text:typeof event?.detail?.confirmedAnatomy==='string'?event.detail.confirmedAnatomy:'',
    confirmedAnatomy:event?.detail?.clinicalStructureConfirmed===true
  });
  if(!ref)return;
  const link=createLink(ref);if(link){link.dataset.cockpit='true';brief.after(link);}
 };
 window.addEventListener('atla:nih3d-cockpit-anatomy',update);
 return true;
}
export function mountNih3dResearchReferences(){
 if(typeof document==='undefined')return 'no-dom';
 if(lesson())return 'lesson';
 if(exam())return 'exam';
 if(anatomy())return 'anatomy';
 if(cockpit())return 'cockpit';
 return 'no-match';
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountNih3dResearchReferences,{once:true});
 else mountNih3dResearchReferences();
}
