/* Compact home tracker: only nonzero progress, reversible study flags. */
(()=>{'use strict';const root=document.getElementById('homeMultiTracker');if(!root)return;
const SEM='ekab.seminar-prep.local.v1', EOP='ekab-eoppep-official-v15';
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
function notify(){window.dispatchEvent(new Event('ekab:progress-changed'));render()}
function reset(kind,id,label){
 if(!window.confirm('Να διαγραφεί ΟΛΗ η αποθηκευμένη πρόοδος για '+label+'; Θα χαθούν και οι βαθμολογίες, τα τεστ και το ιστορικό αυτής της ενότητας. Η ενέργεια δεν αναιρείται.'))return;
 try{
  if(kind==='seminar'){const data=get(SEM);if(!data[id])return;delete data[id];localStorage.setItem(SEM,JSON.stringify(data))}
  else if(kind==='saek'){for(const key of Object.keys(localStorage)){if(/^ekab\.saek\.read\.v1\.\d{2}\.\d{1,2}$/.test(key))localStorage.removeItem(key)}}
  else if(kind==='eoppep'){localStorage.removeItem(EOP)}
  else return;
  notify();
 }catch(e){window.alert('Δεν ήταν δυνατή η επαναφορά. Η πρόοδος μπορεί να μην έχει αλλάξει.')}
}
function row(label,count,total,kind,id){if(count<=0)return;const wrap=document.createElement('div');wrap.className='tracker-mini-item';const top=document.createElement('div');top.className='home-mini-progress-label';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=count+'/'+total+' · '+Math.round(count/total*100)+'%';top.append(a,b);wrap.append(top);
 const bar=document.createElement('div');bar.className='home-mini-progress-track';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(total));bar.setAttribute('aria-valuenow',String(count));const fill=document.createElement('span');fill.style.width=Math.min(100,100*count/total)+'%';bar.append(fill);wrap.append(bar);
 if(kind){const button=document.createElement('button');button.type='button';button.className='tracker-mini-reset';button.textContent='Επαναφορά';button.setAttribute('aria-label','Επαναφορά μελετημένων για '+label);button.title='Οριστική διαγραφή όλης της προόδου αυτής της ενότητας';button.addEventListener('click',()=>reset(kind,id,label));wrap.append(button)}root.append(wrap)}
function render(){root.replaceChildren();let done=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^ekab\.saek\.read\.v1\.\d{2}\.\d{1,2}$/.test(k)&&localStorage.getItem(k)==='1')done++}}catch{}row('ΣΑΕΚ',Math.min(done,247),247,'saek');
 const data=get(EOP),scheduler=window.EkabStudyScheduler;let n=0;if(scheduler)for(const [id,value] of Object.entries(data)){if(!/^EOP-[AB]-\d{3}$/.test(id))continue;try{if(scheduler.evaluate(value).studied)n++}catch{}}row('ΕΟΠΠΕΠ',Math.min(n,314),314,'eoppep');
 const records=get(SEM),names={bls:'BLS/AED',pbls:'PBLS',ils:'ILS',phtls:'PHTLS',als:'ALS'};for(const [id,name] of Object.entries(names)){const p=records&&records[id];if(!p||!Array.isArray(p.studied))continue;const count=new Set(p.studied.filter(i=>Number.isInteger(i)&&i>=0&&i<12)).size;row(name,count,12,'seminar',id)}
 if(!root.children.length){const msg=document.createElement('p');msg.className='home-mini-progress-message';msg.textContent='Δεν υπάρχει καταγεγραμμένη πρόοδος σε αυτή τη συσκευή. Αν μελετάς σε άλλη συσκευή, συνδέσου για συγχρονισμό.';root.append(msg)}
}
window.addEventListener('pageshow',render);window.addEventListener('focus',render);window.addEventListener('storage',render);window.addEventListener('ekab:progress-changed',render);window.addEventListener('ekab:cloud-applied',render);render()})();
