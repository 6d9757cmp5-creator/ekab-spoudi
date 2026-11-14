import { canonicalLearnerProfile } from './atla/student/profile.mjs';
import { choosePrimary } from './atla/learning/next-step.mjs';
function routeFor(href){
 if(/^saek-course-(\d{2})\.html/.test(href)) return `course/${href.match(/^saek-course-(\d{2})/)[1]}`;
 if(href.startsWith('saek')) return 'library?type=saek';
 if(href.startsWith('theory.html')) return 'library?type=eoppep';
 if(href.startsWith('eoppep')) return 'library?type=eoppep';
 return 'library';
}
function update(){
 const card=document.querySelector('#atlaCard');if(!card)return;
 try{
  const profile=canonicalLearnerProfile(window.localStorage,{scheduler:window.EkabStudyScheduler||null});
  const selected=document.querySelector('#goalSelect')?.value||'';
  const recommendation=choosePrimary(profile.stats,['saek','eoppep'].includes(selected)?selected:'');
  card.querySelector('[data-atla-goal]').textContent=recommendation.goal==='eoppep'?'Πιστοποίηση ΕΟΠΠΕΠ':'Σπουδές ΣΑΕΚ';
  card.querySelector('[data-atla-next]').textContent=recommendation.label;
  card.querySelector('[data-atla-read]').textContent=`${profile.stats.saek.read} / ${profile.stats.saek.readTotal}`;
  card.querySelector('[data-atla-attempted]').textContent=String(profile.stats.eoppep.attempted);
  card.querySelector('[data-atla-link]').dataset.route=routeFor(recommendation.href);
  card.dataset.ready='true';
 }catch{card.querySelector('[data-atla-next]').textContent='Η πρόταση θα εμφανιστεί όταν φορτώσουν τα δεδομένα μελέτης.';}
}
window.addEventListener('ekab:home-ready',update);
document.querySelector('#goalSelect')?.addEventListener('change',update);
setTimeout(update,0);
