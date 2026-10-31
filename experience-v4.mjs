/**
 * Read-only, lightweight navigation enhancements over EXISTING educational pages.
 * Creates no duplicate learning engine, scoring, MENTOR session or saved state.
 */
function start(){
 const body=document.body;
 if(!body||body.dataset.ekabExperience)return;
 const main=document.querySelector('.main,.ph-main,.seminar-main');
 if(!main||!document.querySelector('.top'))return;
 body.dataset.ekabExperience='4';
 body.classList.add('ekab-experience');
 const h=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const nav=h('nav','ex-section-nav');nav.setAttribute('aria-label','Γρήγορη πλοήγηση στην εκπαιδευτική ενότητα');
 const course=/^saek-course-(?:0[1-9]|1\d|20)\.html$/.test(location.pathname.split('/').pop()||'');
 if(course){
  const entries=[...document.querySelectorAll('.chapter-toc-links a[href^="#lesson-"]')]
   .filter(a=>/^#lesson-(?:[1-9]|[1-9]\d)$/.test(a.getAttribute('href')||''));
  if(!entries.length)return;
  const title=h('strong','','Γρήγορη πλοήγηση · Κεφάλαια');
  const label=h('label','','Μετάβαση σε κεφάλαιο');label.htmlFor='ex-chapter-select';
  const select=h('select');select.id='ex-chapter-select';
  const placeholder=h('option','','Διάλεξε κεφάλαιο…');placeholder.value='';select.append(placeholder);
  const allowed=new Set();
  entries.forEach(a=>{const hash=a.getAttribute('href');allowed.add(hash);const opt=h('option','',a.textContent.trim().slice(0,110));opt.value=hash;select.append(opt)});
  select.addEventListener('change',()=>{
   if(!allowed.has(select.value))return;
   const existing=entries.find(a=>a.getAttribute('href')===select.value);
   const target=document.getElementById(select.value.slice(1));
   const fold=target?.closest('details.reader-fold');
   if(fold)fold.open=true;
   if(target?.matches('details.reader-fold'))target.open=true;
   if(existing)existing.click();
   else if(target)target.scrollIntoView({block:'start',behavior:'smooth'});
  });
  const contents=h('button','','☰ Περιεχόμενα');contents.type='button';
  contents.addEventListener('click',()=>{
   const target=document.querySelector('.chapter-toc');
   if(!target)return;
   if(target.tagName==='DETAILS')target.open=true;
   target.scrollIntoView({behavior:'smooth',block:'start'});
  });
  const back=h('a','','← Όλα τα μαθήματα');back.href='saek.html';
  nav.append(title,label,select,contents,back);
  const breadcrumb=main.querySelector('.reader-breadcrumb');
  if(breadcrumb)breadcrumb.insertAdjacentElement('afterend',nav);
  else main.prepend(nav);
  return;
 }
 // For lengthy topic pages, jump to existing sections only. Never show hidden screens.
 const isPharma=main.classList.contains('ph-main'),isSeminar=main.classList.contains('seminar-main');
 if(!isPharma&&!isSeminar)return;
 const groups=[...main.querySelectorAll(':scope > section[id]')]
  .filter(s=>s.id&&!s.hidden&&s.querySelector('h2,h3'));
 if(groups.length<3)return;
 const label=h('strong','','Γρήγορα στην ενότητα');
 const select=h('select');select.id='ex-section-select';select.setAttribute('aria-label','Επίλεξε ενότητα');
 const first=h('option','','Επίλεξε θέμα…');first.value='';select.append(first);
 groups.forEach(section=>{
  const opt=h('option','',section.querySelector('h2,h3').textContent.trim().slice(0,100));
  opt.value=section.id;select.append(opt);
 });
 select.addEventListener('change',()=>{
  const item=groups.find(s=>s.id===select.value);if(item)item.scrollIntoView({block:'start',behavior:'smooth'});
 });
 const back=h('a','','← Αρχική');back.href='index.html';
 nav.append(label,select,back);
 main.prepend(nav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
