/** Σελίδα αδειών: η αναφορά δημιουργού που ζητούν οι άδειες CC BY / CC BY-SA / ODC-By, σε ξεχωριστή σελίδα. */
const list=await fetch(new URL('media/media.json',import.meta.url)).then(r=>r.json());
const ul=document.getElementById('credits');
const link=(href,text,rel)=>{const a=document.createElement('a');a.href=href;a.textContent=text;a.rel=rel;return a;};
for(const m of list){
 const li=document.createElement('li');
 li.append(link(m.source,m.title,'noopener'),` · ${m.author} · `,m.licenceUrl?link(m.licenceUrl,m.licence,'license noopener'):m.licence,` · Αλλαγές: ${m.changes}`);
 ul.append(li);
}
document.body.dataset.ready='1';
