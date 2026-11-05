/* Links the EOPPEP practical page to the Clinical Cockpit, with a way back to the same section. */
import {PRACTICAL_CASES,PRACTICAL_SKILLS} from './tools/patient-simulator/core/eoppep-practical-cases.mjs';
const href=(item,anchor)=>'mentor-next.html?case='+item.id+'&from='+encodeURIComponent(location.pathname+'#'+anchor);
function scenarioLink(item,anchor,text){
 const a=document.createElement('a');a.className='practical-cockpit-link';a.href=href(item,anchor);a.textContent=text;
 a.dataset.case=item.id;return a;
}
for(const item of PRACTICAL_CASES){
 const details=document.getElementById(item.returnAnchor);
 if(!details)continue;
 const row=document.createElement('p');row.className='practical-cockpit-row';
 row.append(scenarioLink(item,item.returnAnchor,'🩺 Εξάσκηση στον Κλινικό Προσομοιωτή · Σενάριο '+item.practicalNumber));
 details.before(row);
}
const skillsDetails=document.getElementById('practical-video-2');
if(skillsDetails){
 const box=document.createElement('section');box.className='practical-cockpit-skills';box.id='practical-skills-cockpit';
 const title=document.createElement('h3');title.textContent='Οι 12 δεξιότητες στον Κλινικό Προσομοιωτή';
 const note=document.createElement('p');note.textContent='Κάθε δεξιότητα ασκείται μέσα από τα σενάρια όπου εμφανίζεται. Η εξάσκηση είναι καταγραφή ενεργειών σε συνθετικό περιβάλλον, δεν αποτελεί πράξη ούτε βαθμολόγηση.';
 const list=document.createElement('ul');
 for(const skill of PRACTICAL_SKILLS){
  const li=document.createElement('li');li.dataset.skill=skill;
  li.append(document.createTextNode(skill+': '));
  for(const item of PRACTICAL_CASES.filter(c=>c.steps.some(s=>s.skills.includes(skill)))){
   li.append(scenarioLink(item,'practical-skills-cockpit','Σενάριο '+item.practicalNumber),document.createTextNode(' '));
  }
  list.append(li);
 }
 box.append(title,note,list);
 skillsDetails.after(box);
}
const style=document.createElement('style');
style.textContent='.practical-cockpit-row{margin:8px 0}.practical-cockpit-link{display:inline-block;padding:9px 13px;margin:2px 4px 2px 0;border-radius:10px;border:1px solid currentColor;font-weight:700;text-decoration:none}.practical-cockpit-skills{margin:14px 0}.practical-cockpit-skills li{margin:8px 0}';
document.head.append(style);
// Coming back from the Cockpit reopens the section the learner left.
const back=location.hash.slice(1)&&document.getElementById(location.hash.slice(1));
if(back){
 if(back.tagName==='DETAILS')back.open=true;
 requestAnimationFrame(()=>back.scrollIntoView({block:'start'}));
}
