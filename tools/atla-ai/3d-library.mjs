/**
 * The 3D library page: every model of the shared registry, reached by branches (section, then
 * body region or kind, then a sub-branch for large groups) or by search. The address keeps the
 * branch, so the phone's back button walks up the tree. Each entry opens the shared viewer.
 */
import {libraryEntries,searchKey} from './model-preview-catalog.mjs';
import {loadLibrary} from './nih3d-library.mjs';

const PAGE=60;
const SECTIONS=[['anatomy','Ανατομία','Φυσιολογική ανατομία ανά περιοχή του σώματος','🫀'],
 ['pathology','Κακώσεις και παθολογία','Κατάγματα, εξαρθρήματα, ανευρύσματα και άλλα ευρήματα','🦴'],
 ['atlas','Πλήρεις άτλαντες','BodyParts3D με χιλιάδες ανατομικές δομές','🧭'],
 ['simulation','Κλινικός Προσομοιωτής','Ασθενείς και ανθρώπινο σώμα με κινήσεις','🚑'],
 ['science','Λοιπά επιστημονικά','Μόρια, κύτταρα, ιοί, βοηθήματα και σπάνια ευρήματα','🔬']];
const $=id=>document.getElementById(id);
const megabytes=bytes=>bytes==null?'':(bytes/1048576).toLocaleString('el',{maximumFractionDigits:1})+' MB';
const plural=n=>n+(n===1?' μοντέλο':' μοντέλα');

/** Groups entries by a key, keeping first-seen order, as [key,label,entries]. */
function branches(entries,key,label){
 const map=new Map();
 for(const e of entries){if(!map.has(e[key]))map.set(e[key],[e[key],e[label],[]]);map.get(e[key])[2].push(e)}
 return [...map.values()].sort((a,b)=>b[2].length-a[2].length||a[1].localeCompare(b[1],'el'));
}

async function boot(){
 const search=$('library-search'),crumbs=$('library-path'),tiles=$('library-branches'),list=$('library-list'),count=$('count'),more=$('more');
 let entries;
 try{entries=libraryEntries(await loadLibrary(),{from:location.pathname})}
 catch{count.textContent='Η βιβλιοθήκη δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.';return}
 let shown=PAGE;
 const path=()=>decodeURIComponent(location.hash.slice(1)).split('/').filter(Boolean).slice(0,3);
 const tile=(label,detail,n,parts,icon='')=>{
  const a=document.createElement('a');a.className='tile';a.href='#'+parts.map(encodeURIComponent).join('/');
  const strong=document.createElement('strong');strong.textContent=(icon?icon+' ':'')+label;
  const small=document.createElement('small');small.textContent=[detail,plural(n)].filter(Boolean).join(' · ');
  a.append(strong,small);return a;
 };
 const card=entry=>{
  const li=document.createElement('li');li.className='item';
  const title=document.createElement('h3');title.textContent=entry.label;
  const meta=document.createElement('span');meta.className='meta';
  meta.textContent=[entry.sourceLabel,entry.subLabel??entry.branchLabel,megabytes(entry.bytes)].filter(Boolean).join(' · ');
  li.append(title,meta);
  if(entry.terms.length){const t=document.createElement('span');t.className='terms';t.textContent=entry.terms.join(', ');li.append(t)}
  if(entry.restriction&&entry.source!=='nih3d'){const n=document.createElement('span');n.className='note';n.textContent=entry.restriction;li.append(n)}
  const open=document.createElement('a');open.className='open';open.href=entry.href;
  open.textContent=entry.group==='atlas'?'Άνοιγμα άτλαντα':'Άνοιγμα 3D';
  li.append(open);return li;
 };
 const showList=items=>{
  list.replaceChildren(...items.slice(0,shown).map(card));
  more.hidden=items.length<=shown;
  return items.length>shown?' · εμφανίζονται τα πρώτα '+shown:'';
 };
 const crumb=(label,parts)=>{const a=document.createElement('a');a.href='#'+parts.map(encodeURIComponent).join('/');a.textContent=label;return a};
 const render=()=>{
  const words=searchKey(search.value).split(/\s+/).filter(Boolean);
  const [section,branch,sub]=path();
  const sectionInfo=SECTIONS.find(s=>s[0]===section);
  // Breadcrumb: every level above the current one is one tap away.
  const trail=[crumb('Βιβλιοθήκη',[])];
  let scope=entries;
  if(sectionInfo){scope=scope.filter(e=>e.group===section);trail.push(crumb(sectionInfo[1],[section]))}
  if(sectionInfo&&branch){scope=scope.filter(e=>e.branch===branch);if(scope[0])trail.push(crumb(scope[0].branchLabel,[section,branch]))}
  if(sectionInfo&&branch&&sub){scope=scope.filter(e=>e.sub===sub);if(scope[0])trail.push(crumb(scope[0].subLabel,[section,branch,sub]))}
  crumbs.replaceChildren(...trail.flatMap((a,i)=>i?[document.createTextNode(' › '),a]:[a]));
  trail.at(-1).setAttribute('aria-current','page');
  tiles.replaceChildren();
  if(words.length){
   // Search covers the branch you are in, or the whole library from the top.
   const found=scope.filter(e=>words.every(w=>e.search.includes(w)));
   count.textContent=found.length?plural(found.length)+(sectionInfo?' σε αυτή την ενότητα':'')+showList(found):'Δεν βρέθηκε μοντέλο. Δοκίμασε άλλη λέξη.';
   if(!found.length)showList([]);
   return;
  }
  if(!sectionInfo){
   tiles.append(...SECTIONS.map(([key,label,detail,icon])=>tile(label,detail,entries.filter(e=>e.group===key).length,[key],icon)));
   count.textContent='Διάλεξε ενότητα · '+plural(entries.length)+' συνολικά';
   showList([]);return;
  }
  if(!branch){
   const groups=branches(scope,'branch','branchLabel');
   if(groups.length>1){
    tiles.append(...groups.map(([key,label,items])=>tile(label,'',items.length,[section,key])));
    count.textContent=sectionInfo[1]+' · '+plural(scope.length);showList([]);return;
   }
  }else if(!sub&&scope.some(e=>e.sub)){
   const groups=branches(scope,'sub','subLabel');
   if(groups.length>1&&scope.length>12){
    tiles.append(...groups.map(([key,label,items])=>tile(label,'',items.length,[section,branch,key])));
   }
  }
  count.textContent=plural(scope.length)+showList(scope);
 };
 search.addEventListener('input',()=>{shown=PAGE;render()});
 more.addEventListener('click',()=>{shown+=PAGE;render()});
 window.addEventListener('hashchange',()=>{shown=PAGE;render();$('library-path').scrollIntoView({block:'nearest'})});
 const wanted=new URLSearchParams(location.search).get('q');
 if(wanted)search.value=wanted.slice(0,80);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
