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
 panel.setAttribute('aria-label','Εξάσκηση σε αυτό το θέμα');
 const label=document.createElement('h2');
 label.textContent='Εξάσκηση σε αυτό το θέμα';
 const explanation=document.createElement('p');
 explanation.textContent='Εκπαιδευτικό θέμα: '+(context.focus||context.topic)+'. Η άσκηση και η ανασκόπηση θα χρησιμοποιούν το ίδιο θέμα, με δυνατότητα επιστροφής σε αυτή την ενότητα. Δεν μεταφέρονται βαθμοί, σημειώσεις ή προσωπικά δεδομένα.';
 const actions=document.createElement('div');
 actions.className='mentor-connected-actions';
 const links=[
  ['Μελέτη του θέματος με τον ATLA',makeJourneyUrl('mentor-lab.html',context)]
 ];
 for(const [title,dest] of links){
  const a=document.createElement('a');a.href=new URL(dest,new URL('./',import.meta.url)).href;
  a.textContent=title;actions.append(a);
 }
 panel.append(label,explanation,actions);
 const style=document.createElement('style');
 style.textContent='.mentor-connected-study{margin:18px auto;padding:17px 19px;border-radius:16px;border:1px solid #a7ccb1;background:linear-gradient(130deg,#ecf5ef,#f7fbfc);color:#1b3823;box-sizing:border-box;max-width:1080px}.mentor-connected-study h2{font-size:1.12rem;margin:0 0 7px;color:#1b3823}.mentor-connected-study p{font-size:.89rem;line-height:1.5;margin:0 0 12px;color:#395841}.mentor-connected-actions{display:flex;flex-wrap:wrap;gap:8px}.mentor-connected-actions a{padding:10px 13px;border-radius:10px;background:#245732;color:#fff;font-weight:750;font-size:.84rem;text-decoration:none;min-height:43px;display:inline-flex;align-items:center}.mentor-connected-actions a:nth-child(2){background:#fff;color:#245732;border:1px solid #a7ccb1}.mentor-connected-actions a:nth-child(3){background:#ddebe1;color:#1f482a}.mentor-connected-actions a:focus-visible{outline:3px solid #48b064;outline-offset:3px}html[data-theme="dark"] .mentor-connected-study{background:#1d3a25;color:#f0f7f2;border-color:#557c5f}html[data-theme="dark"] .mentor-connected-study h2{color:#f0f7f2}html[data-theme="dark"] .mentor-connected-study p{color:#c9dfcf}';
 document.head.append(style);
 const first=main.querySelector(':scope > section');
 if(first)first.insertAdjacentElement('afterend',panel);else main.prepend(panel);
}
