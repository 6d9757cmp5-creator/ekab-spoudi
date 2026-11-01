/** One contextual bridge to the EXISTING MENTOR, never a second system.
 * Carries only whitelisted public source, topic and visible heading via URL.
 * Never reads grade/progress/note data or changes their storage.
 */
import {journeyFromPage,makeJourneyUrl} from './mentor/context/journey.mjs';
const heading=document.querySelector('main .reader-title, main h1, main h2');
const context=journeyFromPage(location.pathname,heading?.textContent||document.title);
const main=document.querySelector('main');
if(context&&main&&!document.querySelector('[data-mentor-connected-study]')){
 const panel=document.createElement('section');
 panel.className='mentor-connected-study';
 panel.dataset.mentorConnectedStudy='true';
 panel.setAttribute('aria-label','Σχετικές ασκήσεις πρωτοκόλλων και βοήθεια MENTOR');
 const label=document.createElement('h2');
 label.textContent='Συνέχισε τη σχετική εξάσκηση';
 const explanation=document.createElement('p');
 explanation.textContent='Εκπαιδευτικό θέμα: '+(context.focus||context.topic)+'. Η άσκηση και η ανασκόπηση θα χρησιμοποιούν το ίδιο θέμα, με δυνατότητα επιστροφής σε αυτή την ενότητα. Δεν μεταφέρονται βαθμοί, σημειώσεις ή προσωπικά δεδομένα.';
 const actions=document.createElement('div');
 actions.className='mentor-connected-actions';
 const links=[
  ['Εργαστήριο Πρωτοκόλλων',makeJourneyUrl('mentor-protocol-suite.html',context,'lab')],
  ['Ανασκόπηση Πρωτοκόλλου',makeJourneyUrl('mentor-protocol-suite.html',context,'debrief')],
  ['MENTOR OS',makeJourneyUrl('mentor-lab.html',context)]
 ];
 for(const [title,dest] of links){
  const a=document.createElement('a');a.href=new URL(dest,new URL('./',import.meta.url)).href;
  a.textContent=title;actions.append(a);
 }
 panel.append(label,explanation,actions);
 const style=document.createElement('style');
 style.textContent='.mentor-connected-study{margin:18px auto;padding:17px 19px;border-radius:16px;border:1px solid #9dcbd5;background:linear-gradient(130deg,#eaf5f8,#f7fbfc);color:#153648;box-sizing:border-box;max-width:1080px}.mentor-connected-study h2{font-size:1.12rem;margin:0 0 7px;color:#153648}.mentor-connected-study p{font-size:.89rem;line-height:1.5;margin:0 0 12px;color:#375567}.mentor-connected-actions{display:flex;flex-wrap:wrap;gap:8px}.mentor-connected-actions a{padding:10px 13px;border-radius:10px;background:#15546c;color:#fff;font-weight:750;font-size:.84rem;text-decoration:none;min-height:43px;display:inline-flex;align-items:center}.mentor-connected-actions a:nth-child(2){background:#fff;color:#15546c;border:1px solid #9dcbd5}.mentor-connected-actions a:nth-child(3){background:#d9ebef;color:#15445a}.mentor-connected-actions a:focus-visible{outline:3px solid #1dabc5;outline-offset:3px}@media(prefers-color-scheme:dark){.mentor-connected-study{background:#173745;color:#edf7f9;border-color:#507987}.mentor-connected-study h2{color:#edf7f9}.mentor-connected-study p{color:#c5dde4}}';
 document.head.append(style);
 const first=main.querySelector(':scope > section');
 if(first)first.insertAdjacentElement('afterend',panel);else main.prepend(panel);
}
