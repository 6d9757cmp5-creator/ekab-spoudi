/* SAEK reading progress. Existing storage keys are retained. */
(()=>{'use strict';
 const PREFIX='ekab.saek.read.v1.';
 const chapters=[...document.querySelectorAll('.reader-fold')];
 const id=location.pathname.match(/saek-course-(\d{2})\.html$/)?.[1];
 let storageAvailable=true;
 function unavailable(){
  storageAvailable=false;
  let note=document.getElementById('saek-storage-status');
  if(!note){note=document.createElement('p');note.id='saek-storage-status';note.className='small';note.setAttribute('role','status');(document.querySelector('.lesson-progress')||document.querySelector('#library-done')?.closest('section'))?.after(note)}
  if(note)note.textContent='Η αποθήκευση προόδου δεν είναι διαθέσιμη σε αυτόν τον browser. Μπορείς να διαβάσεις όλη την ύλη, αλλά η πρόοδος δεν αποθηκεύεται.';
  document.querySelectorAll('.read-button').forEach(b=>{b.disabled=true;b.title='Η αποθήκευση προόδου δεν είναι διαθέσιμη'});
  document.querySelectorAll('[data-export-all]').forEach(b=>{b.disabled=true;b.title='Η αποθήκευση προόδου δεν είναι διαθέσιμη'});
 }
 function read(key){try{return localStorage.getItem(key)==='1'}catch{unavailable();return false}}
 function paint(){
  if(id){let done=0;chapters.forEach(ch=>{const n=ch.id.replace('lesson-',''),checked=read(PREFIX+id+'.'+n),b=ch.querySelector('.read-button'),st=document.getElementById('status-'+n);if(checked)done++;if(b){b.textContent=checked?'✓ Διαβάστηκε · αναίρεση':'○ Ολοκλήρωσα την ανάγνωση';b.setAttribute('aria-pressed',String(checked));b.classList.toggle('completed',checked)}if(st)st.textContent=checked?'Διαβάστηκε':'Δεν ολοκληρώθηκε'});
   const pct=chapters.length?Math.round(done/chapters.length*100):0;
   const summary=document.getElementById('read-summary'),percent=document.getElementById('read-percent'),bar=document.getElementById('lesson-progress-bar');
   if(summary)summary.textContent=done+'/'+chapters.length+' κεφάλαια μελετημένα';if(percent)percent.textContent=pct+'%';if(bar)bar.style.width=pct+'%';
  }
  let total=0;document.querySelectorAll('[data-course-progress]').forEach(el=>{const course=el.dataset.courseProgress,count=Number(el.textContent.split('/')[1]?.match(/^\d+/)?.[0]||0);let done=0;for(let n=1;n<=count;n++)if(read(PREFIX+course+'.'+n))done++;total+=done;el.textContent=done+'/'+count+' διαβασμένα'});
  const all=document.getElementById('library-done');if(all)all.textContent=total;
 }
 document.querySelectorAll('.read-button').forEach(b=>b.addEventListener('click',()=>{if(!storageAvailable)return;const key=PREFIX+id+'.'+b.dataset.lesson;try{if(localStorage.getItem(key)==='1')localStorage.removeItem(key);else localStorage.setItem(key,'1')}catch{unavailable();return}paint();window.dispatchEvent(new Event('ekab:progress-changed'))}));
 window.addEventListener('storage',e=>{if(e.key===null||e.key.startsWith(PREFIX))paint()});
 window.addEventListener('pageshow',paint);paint();
})();
