/** Visible, privacy-safe lesson context for the existing 3D MENTOR OS. */
import {ALL_TOPICS} from './protocols-data.mjs';
import {contextFromQuery,makeJourneyUrl,returnPage} from './mentor/context/journey.mjs';

const context=contextFromQuery(location.search);
const topic=context&&ALL_TOPICS.find(item=>item.id===context.topic);
if(topic){
 const hero=document.getElementById('mentor-presence');
 const field=document.getElementById('mentor-hero-question');
 const focus=context.focus||topic.name;
 if(hero&&!hero.querySelector('[data-mentor-study-return]')){
  const panel=document.createElement('div');
  panel.dataset.mentorStudyReturn='true';
  panel.style.cssText='margin:14px 0;padding:12px 14px;border-radius:11px;border:1px solid #84b9c3;background:#e7f3f6;color:#153a4a;line-height:1.55;';
  const info=document.createElement('p');info.setAttribute('role','status');
  info.style.cssText='margin:0 0 8px;font-weight:650;';
  info.textContent='Κοινό εκπαιδευτικό πλαίσιο: '+focus+' · '+topic.name+'. Το Εργαστήριο Πρωτοκόλλων συνδέει μάθημα και ανασκόπηση. Ο MENTOR παρέχει προαιρετική καθοδήγηση. Δεν μεταφέρονται προσωπικά δεδομένα ή βαθμοί.';
  panel.append(info);
  const source=returnPage(context);
  if(source){
   const back=document.createElement('a');back.href=new URL(source,new URL('./',import.meta.url)).href;
   back.textContent='← Επιστροφή στην εκπαιδευτική ενότητα';
   back.style.cssText='font-weight:800;color:#075e78;display:inline-block;margin:4px 12px 7px 0;';
   panel.append(back);
  }
  const lab=document.createElement('a');lab.href=makeJourneyUrl('mentor-protocol-suite.html',context,'lab');
  lab.textContent='Εργαστήριο Πρωτοκόλλων →';lab.style.cssText='font-weight:800;color:#075e78;display:inline-block;margin:4px 12px 7px 0;';
  panel.append(lab);
  hero.insertBefore(panel,hero.firstChild);
 }
 // Existing CTAs must open the SAME topic; do not create another MENTOR instance.
 for(const anchor of document.querySelectorAll('a[href^="mentor-protocol-suite.html?"]')){
  const previous=new URL(anchor.href,location.href);
  anchor.href=makeJourneyUrl('mentor-protocol-suite.html',context,previous.searchParams.get('view'));
 }
 if(field&&!field.value)field.value='Θέλω να μελετήσω το θέμα: '+focus;
}
