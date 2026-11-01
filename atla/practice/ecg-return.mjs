/**
 * ECG Lab's safe way back to the exact learning context.
 * Only two curated, fixed entrypoints. All other requests retain Paramedic.
 */
export function returnDestination(search){
 const p=new URLSearchParams(String(search||'').replace(/^\?/,''));
 if(p.get('from')==='02'&&p.get('chapter')==='7'){
  return {href:'saek-course-02.html#lesson-7',label:'← Επιστροφή στο κεφάλαιο ΣΑΕΚ'};
 }
 if(p.get('from')==='eoppep'&&p.get('question')==='EOP-A-070'){
  return {href:'theory.html?question=EOP-A-070',label:'← Επιστροφή στην ερώτηση ΕΟΠΠΕΠ'};
 }
 return {href:'paramedic.html#skills',label:'← Paramedic · Κλινικές δεξιότητες'};
}
if(typeof document!=='undefined'){
 const ready=()=>{
  const back=document.querySelector('.ecg-wrap > a[href="paramedic.html#skills"]');
  if(!back)return;
  const route=returnDestination(location.search);
  back.href=route.href;back.textContent=route.label;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
}
