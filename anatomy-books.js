(()=>{'use strict';
const $=id=>document.getElementById(id);
const fold=value=>String(value||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el');
const PAGE=30;
let items=[],limit=PAGE;
function matches(){
 const words=fold($('bookSearch').value).split(/\s+/).filter(Boolean),book=$('bookChoice').value;
 return items.filter(item=>(!book||item.book===book)&&words.every(word=>item.hay.includes(word)));
}
function card(item){
 const node=document.createElement('article');node.className='panel';node.id=item.id;
 const title=document.createElement('h2');title.textContent=item.chapter;
 const meta=document.createElement('p');meta.className='small muted';meta.textContent=item.book+' · σελ. '+item.page;
 const text=document.createElement('p');text.textContent=item.text;
 const link=document.createElement('a');link.href=item.pdf+'#page='+item.pdfPage;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Άνοιγμα της σελίδας στο PDF';
 node.append(title,meta,text,link);
 return node;
}
function render(){
 const found=matches();
 $('bookCount').textContent=found.length+' σελίδες από '+items.length;
 $('bookResults').replaceChildren(...found.slice(0,limit).map(card));
 $('bookMore').hidden=found.length<=limit;
}
function openHash(){
 const id=decodeURIComponent(location.hash.slice(1));
 const item=items.find(x=>x.id===id);
 if(!item)return;
 $('bookSearch').value='';$('bookChoice').value='';
 $('bookCount').textContent=item.book;
 $('bookResults').replaceChildren(card(item));
 $('bookMore').hidden=true;
}
fetch('anatomy-books.json?v=1').then(response=>{if(!response.ok)throw Error(String(response.status));return response.json()}).then(data=>{
 items=(data.items||[]).map(item=>({...item,hay:fold(item.chapter+' '+item.text)}));
 for(const book of [...new Set(items.map(x=>x.book))]){const option=document.createElement('option');option.value=book;option.textContent=book;$('bookChoice').append(option)}
 render();openHash();
}).catch(()=>{$('bookCount').textContent='Τα βιβλία δεν φορτώθηκαν. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.'});
$('bookSearch').addEventListener('input',()=>{limit=PAGE;render()});
$('bookChoice').addEventListener('change',()=>{limit=PAGE;render()});
$('bookMore').addEventListener('click',()=>{limit+=PAGE;render()});
window.addEventListener('hashchange',openHash);
})();
