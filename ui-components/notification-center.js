/* EKAB Σπουδή · local, in-app notification center (not OS push). */
(function(){
'use strict';
if(window.EkabNotificationCenter)return;
const ROOT=new URL('../',document.currentScript?.src||location.href);
const STORE='ekab.ui.notifications.v1',MAX=60;
const allowed=new Set(['update','review','sync']);
const safeText=(value,max)=>String(value||'').slice(0,max);
function load(){
 try{
  const data=JSON.parse(localStorage.getItem(STORE)||'[]');
  if(!Array.isArray(data))return [];
  return data.filter(x=>x&&typeof x.id==='string'&&/^(?:update|review|sync):[a-z0-9.:-]{1,55}$/i.test(x.id)&&allowed.has(x.kind)&&typeof x.title==='string')
   .slice(0,MAX).map(x=>({id:x.id,kind:x.kind,title:safeText(x.title,100),body:safeText(x.body,260),at:Number(x.at)||Date.now(),read:Boolean(x.read),resolved:Boolean(x.resolved)}));
 }catch{return []}
}
let entries=load(),button=null,panel=null,list=null,count=null,allRead=null;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(entries.slice(0,MAX)))}catch{/* local storage can be disabled */}}
function item(id,kind,title,body){
 if(!allowed.has(kind))return;
 const old=entries.find(x=>x.id===id);
 if(old){
  const wasResolved=old.resolved;
  old.title=title;old.body=body;old.resolved=false;
  if(wasResolved){old.read=false;old.at=Date.now();}
 }else entries.unshift({id,kind,title,body,at:Date.now(),read:false,resolved:false});
 entries.sort((a,b)=>b.at-a.at);entries=entries.slice(0,MAX);
 persist();render();
}
function resolve(id){
 const old=entries.find(x=>x.id===id);
 if(!old||old.resolved)return;
 old.resolved=true;old.read=true;persist();render();
}
function acknowledge(id){
 const old=entries.find(x=>x.id===id);
 if(old&&!old.read){old.read=true;persist();render();}
}
function text(tag,cls,value){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
}
function actionFor(entry){
 if(entry.kind==='review')return {label:'Άνοιγμα επαναλήψεων',run:()=>{location.href=new URL('theory.html#dueTodayPanel',ROOT).href;}};
 if(entry.kind==='sync')return {label:'Έλεγχος λογαριασμού',run:()=>{close();document.querySelector('[data-account-open]')?.click();}};
 if(entry.kind==='update')return {label:'Ενημέρωση τώρα',run:()=>{
  close();
  const update=document.getElementById('applyUpdate');
  if(update)update.click();
  else location.href=new URL('index.html',ROOT).href;
 }};
 return null;
}
function render(){
 if(!button)return;
 const unread=entries.filter(x=>!x.read&&!x.resolved).length;
 count.hidden=unread===0;count.textContent=unread>99?'99+':String(unread);
 button.setAttribute('aria-label',unread?'Ειδοποιήσεις, '+unread+' αδιάβαστες':'Ειδοποιήσεις');
 allRead.disabled=unread===0;
 list.replaceChildren();
 if(!entries.length){
  list.append(text('p','ekab-notice-empty','Δεν υπάρχουν ειδοποιήσεις ακόμη.'));
  return;
 }
 for(const entry of entries){
  const card=text('article','ekab-notice-entry'+(!entry.read&&!entry.resolved?' is-unread':''));
  const heading=text('div','ekab-notice-entry-heading');
  const title=text('strong',null,entry.title);
  const date=text('time',null,new Date(entry.at).toLocaleDateString('el-GR',{day:'numeric',month:'short'}));
  heading.append(title,date);
  card.append(heading,text('p',null,entry.body));
  if(entry.resolved)card.append(text('small','ekab-notice-resolved','Ολοκληρώθηκε / δεν απαιτείται ενέργεια'));
  const actions=text('div','ekab-notice-entry-actions');
  if(!entry.resolved){
   const a=actionFor(entry);
   if(a){
    const go=text('button','ekab-notice-action',a.label);go.type='button';
    go.addEventListener('click',()=>{acknowledge(entry.id);a.run();});
    actions.append(go);
   }
  }
  if(!entry.read){
   const read=text('button','ekab-notice-read','Διαβάστηκε');read.type='button';
   read.addEventListener('click',()=>acknowledge(entry.id));actions.append(read);
  }
  if(actions.childElementCount)card.append(actions);
  list.append(card);
 }
}
function close(){
 if(!panel||panel.hidden)return;
 panel.hidden=true;button.setAttribute('aria-expanded','false');
}
function mount(){
 const utility=document.querySelector('.top .header-row .utility, .header-row .utility, header .utility, .legacy-utilities .utility');
 if(!utility)return;
 const root=text('div','ekab-notice-root');
 button=text('button','utility-button ekab-notice-trigger');
 button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
 count=text('span','ekab-notice-count');count.hidden=true;button.append(count);
 panel=text('section','ekab-notice-panel');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Κέντρο ειδοποιήσεων');
 const head=text('div','ekab-notice-head');
 head.append(text('h2',null,'Ειδοποιήσεις'));
 const closeButton=text('button','ekab-notice-close','Κλείσιμο');closeButton.type='button';closeButton.addEventListener('click',()=>{close();button.focus();});
 head.append(closeButton);
 allRead=text('button','ekab-notice-markall','Σήμανση όλων ως διαβασμένων');allRead.type='button';
 allRead.addEventListener('click',()=>{entries.forEach(x=>x.read=true);persist();render();});
 list=text('div','ekab-notice-list');list.setAttribute('aria-live','polite');
 panel.append(head,allRead,list);
 root.append(button,panel);utility.append(root);
 button.addEventListener('click',()=>{
  panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden)render();
 });
 document.addEventListener('click',event=>{if(!root.contains(event.target))close();});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!panel.hidden){close();button.focus();}
 });
 document.body.classList.add('ekab-notice-center-ready');
 render();
}
function semverNewer(a,b){
 const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);
 return x.length===3&&y.length===3&&x.every(Number.isFinite)&&y.every(Number.isFinite)&&x.some((n,i)=>n>y[i]&&x.slice(0,i).every((v,j)=>v===y[j]));
}
async function checkUpdates(){
 const current=window.EkabUpdates?.version;
 if(!/^\d+\.\d+\.\d+$/.test(current||''))return;
 try{
  const response=await fetch(new URL('version.json?bellcheck='+Date.now(),ROOT),{cache:'no-store'});
  if(!response.ok)return;
  const version=(await response.json()).version;
  if(!/^\d+\.\d+\.\d+$/.test(version||''))return;
  if(semverNewer(version,current)){
   item('update:'+version,'update','Διαθέσιμη νέα έκδοση','Έκδοση v'+version+' · Μπορείς να την εγκαταστήσεις όταν είσαι έτοιμος.');
  }else for(const x of entries.filter(x=>x.kind==='update'&&!x.resolved))resolve(x.id);
 }catch{/* no network: retain local alerts without inventing a successful check */}
}
function monitorUpdateBanner(){
 const banner=document.getElementById('updateBanner'),description=document.getElementById('updateDescription');
 if(!banner||!description||typeof MutationObserver==='undefined')return;
 function update(){
  const message=description.textContent||'';
  const critical=/δεν ολοκληρώθηκε|απέτυχε|σφάλμα/i.test(message);
  const inProgress=/Προετοιμασία ενημέρωσης|Ενεργοποίηση νέας έκδοσης|Ανανέωση εφαρμογής/i.test(message);
  if(critical||inProgress)banner.dataset.ekabCritical='true';
  else delete banner.dataset.ekabCritical;
  if(critical&&!banner.hidden){
   item('update:error','update','Πρόβλημα ενημέρωσης','Η ενημέρωση δεν ολοκληρώθηκε. Δες την προειδοποίηση στην τρέχουσα σελίδα.');
  }
  const match=!banner.hidden&&message.match(/Νέα έκδοση v(\d+\.\d+\.\d+)/);
  if(match)item('update:'+match[1],'update','Διαθέσιμη νέα έκδοση','Έκδοση v'+match[1]+' · Μπορείς να την εγκαταστήσεις όταν είσαι έτοιμος.');
 }
 const observer=new MutationObserver(update);
 observer.observe(banner,{attributes:true,attributeFilter:['hidden']});
 observer.observe(description,{childList:true,characterData:true,subtree:true});
 update();
}
function today(){
 const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function dueCount(){
 const scheduler=window.EkabStudyScheduler;
 if(!scheduler||typeof scheduler.isDue!=='function')return null;
 try{
  const values=JSON.parse(localStorage.getItem('ekab-eoppep-official-v15')||'{}');
  if(!values||typeof values!=='object'||Array.isArray(values))return 0;
  return Object.entries(values).reduce((n,[key,value])=>n+(/^(?:EOP-A-(?:0(?:0[1-9]|[1-9]\d)|10[0-5])|EOP-B-(?:00[1-9]|0[1-9]\d|1\d\d|20[0-9]))$/.test(key)&&scheduler.isDue(value)?1:0),0);
 }catch{return null;}
}
function checkDue(){
 const n=dueCount();if(n===null)return;
 const id='review:'+today();
 if(n>0)item(id,'review','Επαναλήψεις ΕΟΠΠΕΠ για σήμερα',n+' ερωτήσεις είναι προγραμματισμένες για επανάληψη.');
 else resolve(id);
}
function enableDue(){
 if(window.EkabStudyScheduler){checkDue();return;}
 const script=document.createElement('script');script.src=new URL('study-scheduler.js',ROOT).href;
 script.addEventListener('load',checkDue,{once:true});document.head.append(script);
}
function monitorSync(){
 let attached=false;
 function attach(){
  const status=document.querySelector('[data-cloud-status]');
  if(!status||attached||typeof MutationObserver==='undefined')return Boolean(status);
  attached=true;
  const check=()=>{
   const current=status.dataset.syncState;
   if(current==='error')item('sync:error','sync','Απαιτείται έλεγχος συγχρονισμού','Η αποθήκευση στο cloud δεν ολοκληρώθηκε. Τα δεδομένα παραμένουν τοπικά. Δες τις λεπτομέρειες στον λογαριασμό.');
   if(current==='synced')resolve('sync:error');
  };
  new MutationObserver(check).observe(status,{attributes:true,attributeFilter:['data-sync-state'],childList:true,characterData:true,subtree:true});
  check();return true;
 }
 if(attach()||typeof MutationObserver==='undefined')return;
 const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});
 observer.observe(document.body,{childList:true,subtree:true});
}
function begin(){
 mount();
 if(!button)return;
 monitorUpdateBanner();monitorSync();enableDue();void checkUpdates();
 window.addEventListener('ekab:progress-changed',checkDue);
 window.addEventListener('ekab:cloud-applied',checkDue);
 window.addEventListener('storage',event=>{
  if(event.key===STORE){entries=load();render();}
  if(event.key==='ekab-eoppep-official-v15')checkDue();
 });
 window.addEventListener('pageshow',()=>{checkDue();void checkUpdates();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){checkDue();void checkUpdates();}});
 setInterval(checkDue,60000);
 setInterval(()=>{if(document.visibilityState==='visible')void checkUpdates();},300000);
}
window.EkabNotificationCenter=Object.freeze({publish:item,resolve,checkDue});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
