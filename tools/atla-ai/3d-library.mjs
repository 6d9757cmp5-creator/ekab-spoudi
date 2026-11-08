/**
 * The 3D library page: every model of the shared registry in one searchable list. Each entry
 * opens the same viewer the lessons and tools use, so nothing here has its own copy of a model.
 */
import {libraryEntries,searchKey} from './model-preview-catalog.mjs';
import {loadLibrary} from './nih3d-library.mjs';

const PAGE=60;
const GROUPS=[['','Όλα'],['anatomy','Ανατομία'],['pathology','Κακώσεις και παθολογία'],['atlas','Πλήρεις άτλαντες'],
 ['simulation','Κλινικός Προσομοιωτής'],['science','Λοιπά επιστημονικά']];
const $=id=>document.getElementById(id);
const megabytes=bytes=>bytes==null?'':(bytes/1048576).toLocaleString('el',{maximumFractionDigits:1})+' MB';

async function boot(){
 const search=$('library-search'),source=$('library-source'),groups=$('library-groups'),list=$('library-list'),count=$('count'),more=$('more');
 let entries;
 try{entries=libraryEntries(await loadLibrary(),{from:location.pathname})}
 catch{count.textContent='Η βιβλιοθήκη δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.';return}
 let group='',shown=PAGE;
 for(const [value,label] of [...new Map(entries.map(e=>[e.source,e.sourceLabel]))]){
  source.append(new Option(label,value));
 }
 for(const [value,label] of GROUPS){
  const button=document.createElement('button');
  button.type='button';button.textContent=label;button.dataset.group=value;button.setAttribute('aria-pressed',String(value===group));
  button.addEventListener('click',()=>{group=value;shown=PAGE;for(const b of groups.children)b.setAttribute('aria-pressed',String(b===button));render()});
  groups.append(button);
 }
 const card=entry=>{
  const li=document.createElement('li');li.className='item';
  const title=document.createElement('h2');title.textContent=entry.label;
  const meta=document.createElement('span');meta.className='meta';
  meta.textContent=[entry.sourceLabel,GROUPS.find(([v])=>v===entry.group)?.[1],megabytes(entry.bytes)].filter(Boolean).join(' · ');
  li.append(title,meta);
  if(entry.terms.length){const t=document.createElement('span');t.className='terms';t.textContent=entry.terms.join(', ');li.append(t)}
  if(entry.restriction&&entry.source!=='nih3d'){const n=document.createElement('span');n.className='note';n.textContent=entry.restriction;li.append(n)}
  const open=document.createElement('a');open.className='open';open.href=entry.href;
  open.textContent=entry.group==='atlas'?'Άνοιγμα άτλαντα':'Άνοιγμα 3D';
  li.append(open);
  return li;
 };
 const render=()=>{
  const words=searchKey(search.value).split(/\s+/).filter(Boolean);
  const matches=entries.filter(e=>(!group||e.group===group)&&(!source.value||e.source===source.value)&&words.every(w=>e.search.includes(w)));
  list.replaceChildren(...matches.slice(0,shown).map(card));
  count.textContent=matches.length?matches.length+' μοντέλα'+(matches.length>shown?' · εμφανίζονται τα πρώτα '+shown:''):'Δεν βρέθηκε μοντέλο. Δοκίμασε άλλη λέξη.';
  more.hidden=matches.length<=shown;
 };
 search.addEventListener('input',()=>{shown=PAGE;render()});
 source.addEventListener('change',()=>{shown=PAGE;render()});
 more.addEventListener('click',()=>{shown+=PAGE;render()});
 const wanted=new URLSearchParams(location.search).get('q');
 if(wanted)search.value=wanted.slice(0,80);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
