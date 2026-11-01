import {CATEGORIES,TOPICS} from './protocols-data.mjs';
const $=id=>document.getElementById(id);
const safeText=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');
let current='all';
const categoryFor=id=>CATEGORIES.find(c=>c.id===id)?.label||'Εκπαιδευτικό θέμα';
function appendLink(parent,label,url,cls){
 const a=document.createElement('a');a.textContent=label;a.href=url;a.className=cls;parent.append(a);
}
function renderCategories(){
 const nav=$('protocol-categories');nav.replaceChildren();
 const options=[{id:'all',label:'Όλα τα θέματα',icon:'▦'},...CATEGORIES];
 for(const c of options){
  const btn=document.createElement('button');btn.type='button';btn.className='category';
  btn.textContent=c.icon+'  '+c.label;btn.setAttribute('aria-pressed',String(current===c.id));
  btn.addEventListener('click',()=>{current=c.id;renderCategories();renderTopics();});
  nav.append(btn);
 }
}
function renderTopics(){
 const q=safeText($('protocol-search').value.trim());
 const entries=TOPICS.filter(t=>(current==='all'||t.category===current)&&safeText(t.name+' '+t.scenario+' '+categoryFor(t.category)).includes(q));
 $('protocol-list-title').textContent=current==='all'?'Όλα τα εκπαιδευτικά θέματα':categoryFor(current);
 $('protocol-count').textContent=entries.length+' από '+TOPICS.length+' διαθέσιμα θέματα';
 $('protocol-empty').hidden=entries.length>0;
 const list=$('protocol-list');list.replaceChildren();
 for(const t of entries){
  const card=document.createElement('article');card.className='topic';
  const title=document.createElement('h3');title.textContent=t.name;
  const category=document.createElement('p');category.textContent=categoryFor(t.category);
  const desc=document.createElement('p');desc.textContent='Εκπαιδευτική εστίαση: '+t.focus+'.';
  const badge=document.createElement('span');badge.className='tag';badge.textContent='Όχι επαληθευμένο επιχειρησιακό πρωτόκολλο';
  const actions=document.createElement('div');actions.className='actions';
  const topic=encodeURIComponent(t.id);
  appendLink(actions,'Εργαστήριο Πρωτοκόλλων','mentor-protocol-suite.html?topic='+topic+'&view=lab','btn');
  appendLink(actions,'Ανασκόπηση Πρωτοκόλλου','mentor-protocol-suite.html?topic='+topic+'&view=debrief','btn alt');
  appendLink(actions,'Βοήθεια από MENTOR OS','mentor-lab.html?topic='+topic+'#mentor-presence','btn soft');
  card.append(title,category,desc,badge,actions);list.append(card);
 }
}
$('protocol-search').addEventListener('input',renderTopics);
const requested=new URLSearchParams(location.search).get('category');
if(CATEGORIES.some(c=>c.id===requested))current=requested;
renderCategories();renderTopics();
