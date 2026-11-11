/**
 * Links from SAEK chapters and EOPPEP questions to the matching part of the ECG lab.
 * A curated list, checked against each chapter and question (2026-11-11): only places whose
 * subject the lab really teaches. Rhythm-quiz links open the trainer, never a pre-chosen answer.
 * Reads the page only; no grades, progress or notes are written.
 */
const BASICS={href:'mentor-ecg.html#ecg-heading',title:'Εξάσκηση στα κύματα P–QRS–T',
 note:'Τι σημαίνει κάθε κύμα και μέτρηση συχνότητας σε λωρίδα ρυθμού.'};
const RHYTHMS={href:'mentor-ecg.html#ecg-monitor-training',title:'Αναγνώριση ρυθμών στο monitor ΗΚΓ',
 note:'Κοιλιακή μαρμαρυγή, κοιλιακή ταχυκαρδία, ασυστολία και άλλοι ρυθμοί, με έλεγχο απάντησης.'};
const stemi=(id,title,leads)=>({href:'mentor-ecg.html?example='+id+'#ecg-monitor-training',title,
 note:'Σχηματικό ΗΚΓ 12 απαγωγών: ανάσπαση ST στις '+leads+'.'});
const ANTERIOR=stemi('stemi-anterior','Πρόσθιο έμφραγμα σε ΗΚΓ 12 απαγωγών','V1–V4');
const INFERIOR=stemi('stemi-inferior','Κατώτερο έμφραγμα σε ΗΚΓ 12 απαγωγών','II, III, aVF');
const LATERAL=stemi('stemi-lateral','Πλάγιο έμφραγμα σε ΗΚΓ 12 απαγωγών','I, aVL, V5, V6');
const INFARCTS=[ANTERIOR,INFERIOR,LATERAL];

export const SAEK_ECG=Object.freeze({
 'saek-course-02.html#lesson-7':[BASICS],          // Καρδιακός κύκλος και ηλεκτρική αγωγή
 'saek-course-10.html#lesson-1':INFARCTS,          // Θωρακικός πόνος και καρδιαγγειακά
 'saek-course-10.html#lesson-7':INFARCTS,          // Πόνος θώρακα και οξύ στεφανιαίο σύνδρομο
 'saek-course-16.html#lesson-7':[RHYTHMS],         // Ανακοπή: αναγνώριση και ενεργοποίηση
 'saek-course-17.html#lesson-9':[RHYTHMS]          // Βασική αναζωογόνηση σε ενήλικο
});
export const EOPPEP_ECG=Object.freeze({
 'EOP-A-046':[BASICS],'EOP-A-070':[BASICS],
 'EOP-A-071':[ANTERIOR],'EOP-A-072':[INFERIOR],'EOP-A-073':[LATERAL],
 'EOP-A-074':[RHYTHMS],'EOP-A-075':[RHYTHMS],
 'EOP-B-004':[RHYTHMS],'EOP-B-007':[RHYTHMS],'EOP-B-165':[RHYTHMS],
 'EOP-B-117':[RHYTHMS],'EOP-B-132':[RHYTHMS],
 'EOP-B-012':INFARCTS,'EOP-B-140':INFARCTS
});

function panel(doc,links,base){
 const box=doc.createElement('aside');box.className='ecg-lesson-links';box.setAttribute('aria-label','Εξάσκηση στο Εργαστήριο ΗΚΓ');
 const h=doc.createElement('p');h.className='ecg-lesson-links-title';h.textContent='〽️ Εξάσκηση στο Εργαστήριο ΗΚΓ';box.append(h);
 for(const link of links){
  const a=doc.createElement('a');a.href=new URL(link.href,base).href;
  const t=doc.createElement('strong');t.textContent=link.title;
  const n=doc.createElement('small');n.textContent=link.note;
  a.append(t,n);box.append(a);
 }
 return box;
}
function style(doc){
 if(doc.getElementById('ecg-lesson-links-style'))return;
 const s=doc.createElement('style');s.id='ecg-lesson-links-style';
 s.textContent='.ecg-lesson-links{margin:14px 0;padding:12px 14px;border:1px solid #9fd3cf;border-radius:12px;background:#eef9f7;color:#163b44}'+
  '.ecg-lesson-links-title{margin:0 0 8px;font-weight:800}.ecg-lesson-links a{display:block;padding:9px 0;color:#075e63;text-decoration:none;border-top:1px solid #cfe9e6}'+
  '.ecg-lesson-links a strong{display:block}.ecg-lesson-links a small{display:block;color:#3f5d66;font-size:.8rem}'+
  'html[data-theme="dark"] .ecg-lesson-links{background:#173b3f;border-color:#3d7a77;color:#e4f6f3}html[data-theme="dark"] .ecg-lesson-links a{color:#9ee6dc;border-color:#2f5e5f}html[data-theme="dark"] .ecg-lesson-links a small{color:#b8d4d6}';
 doc.head.append(s);
}

/** SAEK lesson page: one box at the end of each matching chapter. */
export function installSaekEcgLinks(doc=document,base=new URL('../../',import.meta.url)){
 const file=location.pathname.split('/').pop();let n=0;
 for(const [key,links] of Object.entries(SAEK_ECG)){
  const [page,id]=key.split('#');if(page!==file)continue;
  const chapter=doc.getElementById(id);if(!chapter||chapter.querySelector('.ecg-lesson-links'))continue;
  chapter.append(panel(doc,links,base));n++;
 }
 if(n)style(doc);
 return n;
}

/** EOPPEP reader: the box follows the question on screen; never shown in the exam view. */
export function eoppepQuestionId(text){
 const m=/^Ομάδα ([AB]) · Ερώτηση (\d+) \/ (105|209)$/.exec(String(text||'').trim());
 return m?'EOP-'+m[1]+'-'+String(Number(m[2])).padStart(3,'0'):'';
}
export function installEoppepEcgLinks(doc=document,base=new URL('../../',import.meta.url)){
 const number=doc.getElementById('catalogReaderNumber'),anchor=doc.getElementById('catalogReaderReadySos');
 if(!number||!anchor)return false;
 let box=null;
 const sync=()=>{
  box?.remove();box=null;
  const exam=doc.getElementById('examView');
  if(exam&&!exam.classList.contains('hidden'))return;
  const links=EOPPEP_ECG[eoppepQuestionId(number.textContent)];
  if(!links)return;
  style(doc);box=panel(doc,links,base);anchor.after(box);
 };
 new MutationObserver(sync).observe(number,{childList:true,characterData:true,subtree:true});
 sync();
 return true;
}

if(typeof document!=='undefined'){
 const page=location.pathname.split('/').pop();
 const boot=()=>{if(page==='theory.html')installEoppepEcgLinks();else installSaekEcgLinks();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
