/** One fail-closed bridge from learning surfaces to the shared 3D library. No progress or scores touched. */
import {loadLibrary,selectLibraryModels,viewerHref} from './nih3d-library.mjs';
const el=id=>document.getElementById(id);
const root=new URL('../../',import.meta.url);
const library=()=>loadLibrary(root).catch(()=>null);
function createLink(model,{tool='anatomy',from='',newTab=false}={}){
 const span=document.createElement('span');span.className='nih3d-research-reference';
 const anchor=document.createElement('a');
 anchor.href=viewerHref(model,{rootUrl:root,tool,from});
 anchor.textContent='3D · '+model.label+(newTab?' ↗':'');
 anchor.dataset.accession=model.accession;
 if(newTab){anchor.target='_blank';anchor.rel='noopener'}
 anchor.title='Άνοιγμα από τη βιβλιοθήκη 3D. Χωρίς κλινική επικύρωση.';
 const note=document.createElement('small');note.textContent=' · Εκπαιδευτικό μοντέλο, χωρίς κλινική επικύρωση';
 span.append(anchor,note);return span;
}
function lessonHost(chapter){
 const existing=chapter.querySelector('.saek-anatomy-jump-actions');
 if(existing)return existing;
 const host=chapter.querySelector('.body .reader-main')||chapter.querySelector('.body');
 if(!host)return null;
 const aside=document.createElement('aside');aside.className='saek-anatomy-jump';
 aside.setAttribute('aria-label','Σχετικά μοντέλα 3D');
 const buttons=document.createElement('div');buttons.className='saek-anatomy-jump-actions';
 aside.append(buttons);
 const first=host.querySelector(':scope > .reader-paragraph, :scope > p');
 if(first)first.after(aside);else host.prepend(aside);
 return buttons;
}
function lesson(){
 const match=location.pathname.match(/saek-course-(\d{2})\.html$/);
 if(!match)return false;
 const course=match[1];
 library().then(data=>{
  for(const chapter of document.querySelectorAll('details[id^="lesson-"]')){
   if(chapter.querySelector('.nih3d-research-reference'))continue;
   const models=selectLibraryModels(data,{surface:'lesson',courseId:course,chapterId:chapter.id.slice(7)});
   if(!models.length)continue;
   const target=lessonHost(chapter);
   if(!target)continue;
   const from=location.pathname+location.search+'#'+chapter.id;
   for(const model of models)target.append(createLink(model,{from}));
  }
 });
 return true;
}
function exam(){
 const box=el('examReference');if(!box)return false;
 let latest=0;
 async function update({text,revealed}={}){
  const request=++latest;
  box.querySelector('.nih3d-research-reference')?.remove();
  if(!revealed)return;
  const data=await library();
  if(request!==latest)return;
  // A new tab keeps the running exam and its answers exactly as they are.
  const [model]=selectLibraryModels(data,{surface:'exam',text,revealed});
  if(model)box.append(createLink(model,{newTab:true}));
 }
 window.addEventListener('atla:saek-exam-question',event=>update(event.detail));
 return true;
}
function anatomy(){
 const name=el('detailName'),card=el('detailCard');if(!name||!card)return false;
 let latest=0;
 const update=async()=>{
  const request=++latest;
  card.querySelector('.nih3d-research-reference')?.remove();
  if(card.hidden)return;
  const data=await library();
  if(request!==latest)return;
  const [model]=selectLibraryModels(data,{surface:'anatomy',text:name.textContent});
  if(model)card.append(createLink(model,{from:location.pathname+location.search}));
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
 let latest=0;
 // Synthetic MENTOR cases currently contain no confirmed named anatomical injury.
 // A mere road incident is not evidence of a fracture; consequently no model is displayed.
 const update=async event=>{
  const request=++latest;
  document.querySelector('.nih3d-research-reference[data-cockpit]')?.remove();
  const confirmedAnatomy=event?.detail?.clinicalStructureConfirmed===true;
  if(!confirmedAnatomy)return;
  const data=await library();
  if(request!==latest)return;
  const [model]=selectLibraryModels(data,{surface:'cockpit',confirmedAnatomy,
   text:typeof event.detail.confirmedAnatomy==='string'?event.detail.confirmedAnatomy:''});
  if(!model)return;
  const link=createLink(model,{tool:'cockpit',newTab:true});
  link.dataset.cockpit='true';brief.after(link);
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
