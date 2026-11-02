import {saekTool,nextContextualAction,scenarioForChapter} from '../learning/contextual-tools.mjs';
/**
 * Chapter-local practice for the real SAEK reader.
 * Uses only the already-present chapter heading/SOS; no invented medical facts,
 * no AI evaluation, grades, progress writes or cross-chapter scenario claims.
 */
const COURSE=/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/;
const LESSON=/^lesson-(?:[1-9]|[1-9][0-9]|100)$/;
const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function practiceHref(file,lesson,title){
 if(!COURSE.test(file)||!LESSON.test(lesson))return '';
 const query=new URLSearchParams({from:file,chapter:lesson,focus:String(title||'').trim().slice(0,90)});
 return 'mentor-next.html?'+query.toString();
}
export function installSaekPractice(root=document){
 const file=location.pathname.split('/').pop()||'';
 if(!COURSE.test(file))return 0;
 let count=0;
 for(const chapter of root.querySelectorAll('.reader-chapters > details.reader-fold[id]')){
  if(!LESSON.test(chapter.id)||chapter.querySelector('[data-atlas-chapter-practice]'))continue;
  const heading=chapter.querySelector('.chapter-heading');
  const title=(heading?.childNodes?.[0]?.textContent||heading?.textContent||'Κεφάλαιο').trim();
  const content=chapter.querySelector(':scope > .body');
  if(!content)continue;
  const practice=$('details','atlas-chapter-practice');
  practice.dataset.atlasChapterPractice='true';
  const summary=$('summary','','Μικρή εξάσκηση · Ανάκληση γνώσης');
  const inner=$('div','atlas-chapter-practice-inner');
  const description=$('p','','Χωρίς να αντιγράψεις το κείμενο, γράψε τι θυμάσαι από το κεφάλαιο «'+title+'».');
  const label=$('label','atlas-practice-label','Η δική μου απάντηση (προσωρινή, δεν αποθηκεύεται)');
  const answer=$('textarea','atlas-practice-answer');answer.rows=3;answer.maxLength=1200;
  answer.placeholder='Γράψε με δικά σου λόγια…';
  const uid='atlas-practice-'+file.replace(/[^a-z0-9]/gi,'-')+'-'+chapter.id;
  label.htmlFor=uid;answer.id=uid;
  const controls=$('div','atlas-practice-actions');
  const compare=$('button','atlas-practice-btn','','');compare.textContent='Σύγκριση με SOS';compare.type='button';
  const reference=$('p','atlas-practice-reference');
  reference.hidden=true;reference.textContent=chapter.querySelector('.lesson-sos')?.textContent?.trim()||'Δεν υπάρχει συνοπτικό SOS γι’ αυτό το κεφάλαιο.';
  compare.addEventListener('click',()=>{reference.hidden=!reference.hidden;compare.textContent=reference.hidden?'Σύγκριση με SOS':'Απόκρυψη SOS';});
  // No automatic simulator link: a case must be mapped and clinically checked for this chapter.
  const atlas=$('button','atlas-practice-atlas','Ρώτησε το ATLAS');atlas.type='button';atlas.dataset.atlaOpen='true';
  atlas.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('ekab:atlas-context',{detail:{source:file,chapter:chapter.id,focus:title}}));});
  controls.append(compare,atlas);
  const mapped=saekTool(file,chapter.id);
  // A lesson with no approved link remains a lesson; do not show irrelevant tools.
  let contextualResult=null;
  if(mapped){
   const status=$('p','atlas-contextual-result');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const explain=$('button','atlas-practice-btn','Δεν το κατάλαβα');
   explain.type='button';
   explain.addEventListener('click',()=>{
    const choice=nextContextualAction({file,chapter:chapter.id,feedback:'need_explanation'});
    reference.hidden=false;compare.textContent='Απόκρυψη SOS';
    status.textContent=choice.title+'. Η επεξήγηση δεν σημαίνει αποτυχία ή βαθμολόγηση.';
   });
   const ready=$('button','atlas-practice-btn','Θέλω να εξασκηθώ');
   ready.type='button';
   ready.addEventListener('click',()=>{
    const choice=nextContextualAction({file,chapter:chapter.id,feedback:'ready_to_practice'});
    if(!choice)return;
    const link=$('a','atlas-practice-link',choice.title);link.href=choice.href;
    const why=$('p','atlas-contextual-why',choice.reason);
    status.replaceChildren(why,link);
   });
   controls.append(explain,ready);
   contextualResult=status;
  }
  // Even a matching title is insufficient: no cases are enabled without all reviews.
  const verifiedScenario=scenarioForChapter(file,chapter.id);
  if(verifiedScenario){
   const link=$('a','atlas-practice-cockpit','Σχετική αποστολή');
   link.href=verifiedScenario.href;controls.append(link);
  }
  const note=$('p','atlas-practice-disclaimer','Αυτό είναι αυτοέλεγχος ανάκλησης, όχι βαθμολογούμενη εξέταση. Τα κλινικά περιστατικά θα συνδέονται μόνο μετά από έλεγχο συνάφειας.');
  inner.append(description,label,answer,controls,reference,note);
  if(contextualResult)controls.after(contextualResult);
  practice.append(summary,inner);
  // Put in the actual lesson, never a separate destination or duplicated textbook.
  content.append(practice);
  count++;
 }
 return count;
}
if(typeof document!=='undefined'){
 const boot=()=>{if(document.querySelector('.reader-chapters > details.reader-fold'))installSaekPractice();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
