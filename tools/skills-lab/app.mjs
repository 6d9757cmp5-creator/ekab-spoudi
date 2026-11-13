/**
 * Εργαστήρια δεξιοτήτων: διεπαφή. Η σελίδα δηλώνει ποιο εργαστήριο φορτώνει με <body data-lab="...">.
 * Όλη η αξιολόγηση γίνεται στο core.mjs· εδώ μόνο εμφάνιση. Δεν αποθηκεύει τίποτα.
 */
import {loadLab,grade,CHEST_POINTS,mediaOf} from './core.mjs';
import {parseWav,spectrogram,drawSound,clippedFraction} from './sound.mjs';

const base=new URL('./',import.meta.url);
const [labJson,mediaList]=await Promise.all([
 fetch(new URL(`labs/${document.body.dataset.lab}.json`,base)).then(r=>r.json()),
 fetch(new URL('media/media.json',base)).then(r=>r.json())
]);
const LAB=loadLab(labJson,mediaList);
const MEDIA=new Map(mediaList.map(m=>[m.file,m]));
const mediaUrl=f=>new URL('media/'+f,base).href;

const $=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const getTopic=id=>LAB.topics.find(t=>t.id===id);
const state={topic:getTopic(new URLSearchParams(location.search).get('topic'))?.id||LAB.topics[0].id,right:0,total:0};
const mark=ok=>ok?'✓ ':'✗ ';

function score(r){
 state.right+=r.correct;state.total+=r.total;
 document.getElementById('sl-score').textContent=`Σωστά σημεία: ${state.right} / ${state.total}`;
}
function checkButton(label,onClick){const b=$('button','vs-primary sl-check',label);b.type='button';b.addEventListener('click',onClick);return b;}
function resultBox(){const d=$('div','sl-result');d.setAttribute('aria-live','polite');return d;}
/** Δείχνει «Σωστά x από y», τη γραμμή κάθε στοιχείου με αιτιολόγηση και τη γενική εξήγηση της άσκησης. */
function showResult(box,e,r,labelOf){
 box.replaceChildren();score(r);
 const v=$('p','sl-verdict '+(r.correct===r.total?'sl-ok':'sl-partial'),`Σωστά ${r.correct} από ${r.total}.`);v.setAttribute('role','status');box.append(v);
 const ul=$('ul','sl-rows');
 r.rows.forEach((row,i)=>{
  const li=$('li',row.ok?'sl-ok':'sl-bad',mark(row.ok)+labelOf(row,i)+(row.ok?'':' → σωστό: '+row.expected));
  if(row.why)li.append($('span','sl-why',' · '+row.why));ul.append(li);
 });
 box.append(ul);if(e.why)box.append($('p','sl-explain',e.why));
}

function credit(file){
 const m=MEDIA.get(file),p=$('figcaption','sl-credit');
 const a=$('a','',`${m.author} · ${m.licence}`);a.href=m.source;a.rel='noopener';a.target='_blank';
 p.append('Πηγή: ',a);return p;
}
function picture(file,alt){
 const f=$('figure','sl-figure');const img=$('img');img.src=mediaUrl(file);img.alt=alt;img.loading='lazy';img.decoding='async';
 f.append(img,credit(file));return f;
}

/** Ήχος: κυματομορφή και φασματογράφημα από το ίδιο το αρχείο, δείκτης θέσης κατά την αναπαραγωγή, κλικ για μετάβαση. */
const soundCache=new Map();
function soundView(file,label){
 const f=$('figure','sl-sound');
 const canvas=$('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Κυματομορφή (πάνω) και φασματογράφημα (κάτω) του αποσπάσματος «${label}»`);
 const audio=$('audio');audio.controls=true;audio.preload='none';audio.src=mediaUrl(file);audio.setAttribute('aria-label','Αναπαραγωγή: '+label);
 const info=$('p','sl-sound-info','Φόρτωση γραφήματος…');
 f.append(canvas,audio,info,credit(file));
 let data=null,raf=0;
 const draw=()=>{if(!data)return;const w=Math.max(200,Math.round(canvas.clientWidth*(devicePixelRatio||1)));if(canvas.width!==w){canvas.width=w;canvas.height=Math.round(w*0.32);}drawSound(canvas,data.sound,data.spec,audio.paused&&!audio.currentTime?-1:audio.currentTime);};
 const tick=()=>{draw();if(!audio.paused)raf=requestAnimationFrame(tick);};
 audio.addEventListener('play',()=>{cancelAnimationFrame(raf);tick();});
 audio.addEventListener('pause',draw);audio.addEventListener('seeked',draw);
 canvas.addEventListener('click',ev=>{if(!data)return;const r=canvas.getBoundingClientRect();audio.currentTime=(ev.clientX-r.left)/r.width*data.sound.samples.length/data.sound.rate;draw();});
 const load=async()=>{
  if(!soundCache.has(file))soundCache.set(file,fetch(mediaUrl(file)).then(r=>r.arrayBuffer()).then(b=>{const sound=parseWav(b);return {sound,spec:spectrogram(sound.samples,sound.rate,{maxHz:1500})};}));
  data=await soundCache.get(file);
  const sec=data.sound.samples.length/data.sound.rate,clip=clippedFraction(data.sound.samples);
  info.textContent=`${sec.toFixed(1)} δευτ. · φασματογράφημα 0–1500 Hz · κορεσμός (ψαλιδισμένα δείγματα): ${(clip*100).toFixed(2)} %`;
  info.dataset.clipped=String(clip);draw();
 };
 const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){io.disconnect();load().catch(()=>{info.textContent='Το γράφημα δεν φορτώθηκε· ο ήχος παίζει κανονικά.';});}},{rootMargin:'200px'});
 io.observe(f);
 addEventListener('resize',draw);
 return f;
}
function mediaBlock(file,alt,label){return file.endsWith('.wav')?soundView(file,label):picture(file,alt);}

function selectOf(options,placeholder,label){
 const s=$('select');s.append(new Option(placeholder,''));for(const o of options)s.append(new Option(o,o));
 if(label)s.setAttribute('aria-label',label);return s;
}

/** Λίστα με κουμπιά ↑/↓ για ασκήσεις σειράς. */
function orderList(steps,start,label){
 const ol=$('ol','sl-order');ol.setAttribute('aria-label',label);const order=start.map(i=>steps[i]);
 const draw=()=>{
  ol.replaceChildren();
  order.forEach((it,i)=>{
   const li=$('li');li.dataset.id=it.id;li.append($('span','',it.text));
   for(const [d,sym,txt] of [[-1,'↑','πάνω'],[1,'↓','κάτω']]){
    const b=$('button','sl-move',sym);b.type='button';b.disabled=i+d<0||i+d>=order.length;b.setAttribute('aria-label',`Μετακίνηση ${txt}: ${it.text}`);
    b.addEventListener('click',()=>{[order[i+d],order[i]]=[order[i],order[i+d]];draw();ol.children[i+d]?.querySelectorAll('.sl-move')[d<0?0:1]?.focus();});
    li.append(b);
   }
   ol.append(li);
  });
 };
 draw();return {el:ol,ids:()=>order.map(x=>x.id)};
}

/** Σχηματικός θώρακας (όχι ανατομική εικόνα): περίγραμμα, κλείδες, στέρνο, πλευρές ή σπονδυλική στήλη και ωμοπλάτες. */
function chestSvg(view){
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 300 280');svg.setAttribute('aria-hidden','true');
 const add=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);return n;};
 add('path',{d:'M125 4 L125 36 M175 4 L175 36',class:'sl-chest-line'});
 add('path',{d:'M60 42 Q150 26 240 42 L262 74 Q272 160 252 270 L48 270 Q28 160 38 74 Z',class:'sl-chest-body'});
 if(view==='front'){
  add('path',{d:'M150 62 Q110 50 66 58 M150 62 Q190 50 234 58',class:'sl-chest-bone'});
  for(let k=1;k<=7;k++){const y=62+22*k;add('path',{d:`M140 ${y} Q100 ${y+4} 58 ${y+22} M160 ${y} Q200 ${y+4} 242 ${y+22}`,class:'sl-chest-rib'});}
  add('rect',{x:140,y:58,width:20,height:156,rx:6,class:'sl-chest-bone'});
  add('path',{d:'M95 56 L95 262 M205 56 L205 262',class:'sl-chest-guide'});
 }else{
  add('path',{d:'M150 30 L150 268',class:'sl-chest-bone'});
  for(let k=0;k<11;k++)add('rect',{x:144,y:40+k*21,width:12,height:12,rx:3,class:'sl-chest-bone'});
  add('path',{d:'M64 78 L116 86 L96 172 Z M236 78 L184 86 L204 172 Z',class:'sl-chest-bone'});
 }
 const [l,r]=view==='front'?['Δεξιά ασθενούς','Αριστερά ασθενούς']:['Αριστερά ασθενούς','Δεξιά ασθενούς'];
 add('text',{x:8,y:22,class:'sl-chest-text'}).textContent=l;add('text',{x:292,y:22,'text-anchor':'end',class:'sl-chest-text'}).textContent=r;
 return svg;
}

const RENDER={
 label(e,box){
  const fig=picture(e.image,e.alt);fig.classList.add('sl-labelled');
  const holder=fig.querySelector('img');const wrap=$('div','sl-marker-wrap');holder.replaceWith(wrap);wrap.append(holder);
  for(const m of e.markers||[]){const s=$('span','sl-marker',String(m.n));s.style.left=m.x*100+'%';s.style.top=m.y*100+'%';s.setAttribute('aria-hidden','true');wrap.append(s);}
  const list=$('div','sl-fields');const sels={};
  for(const n of Object.keys(e.answers)){const l=$('label','',`Αριθμός ${n}`);const s=selectOf(e.options,'— επίλεξε —');s.dataset.key=n;sels[n]=s;l.append(s);list.append(l);}
  const out=resultBox();
  box.append(fig,list,checkButton('Έλεγχος',()=>{
   const r=grade(e,Object.fromEntries(Object.entries(sels).map(([k,s])=>[k,s.value])));
   showResult(out,e,r,row=>`Αριθμός ${row.key}: ${sels[row.key].value||'—'}`);
  }),out);
 },
 identify(e,box){
  const grid=$('div','sl-cards');const sels=[];
  e.items.forEach((it,i)=>{
   const card=$('div','sl-card');const label=`Απόσπασμα ${i+1}`;
   card.append($('p','sl-card-title',it.media?.endsWith('.wav')?label:`Εικόνα ${i+1}`));
   if(it.media)card.append(mediaBlock(it.media,it.alt,label));else card.append($('p','sl-card-text',it.text));
   const s=selectOf(e.options,'— επίλεξε —',`Απάντηση για ${it.media?.endsWith('.wav')?label:'εικόνα '+(i+1)}`);s.dataset.item=String(i);sels.push(s);card.append(s);grid.append(card);
  });
  const out=resultBox();
  box.append(grid,checkButton('Έλεγχος',()=>{
   const r=grade(e,sels.map(s=>s.value));
   sels.forEach((s,i)=>s.classList.toggle('sl-input-bad',!r.rows[i].ok));
   showResult(out,e,r,(row,i)=>`${e.items[i].media?.endsWith('.wav')?'Απόσπασμα':'Εικόνα'} ${i+1}: ${sels[i].value||'—'}`);
  }),out);
 },
 truefalse(e,box){
  const ol=$('ol','sl-statements');const groups=[];
  e.items.forEach((it,i)=>{
   const li=$('li');const fs=$('fieldset','sl-tf');fs.append($('legend','',it.text));
   for(const [v,t] of [['true','Σωστό'],['false','Λάθος']]){const l=$('label');const r=$('input');r.type='radio';r.name=`${e.id}-${i}`;r.value=v;l.append(r,' '+t);fs.append(l);}
   groups.push(fs);li.append(fs);ol.append(li);
  });
  const out=resultBox();
  box.append(ol,checkButton('Έλεγχος',()=>{
   const r=grade(e,groups.map(g=>{const c=g.querySelector('input:checked');return c?c.value==='true':null;}));
   showResult(out,e,r,(row,i)=>e.items[i].text);
  }),out);
 },
 order(e,box){
  const list=orderList(e.steps,e.start,e.prompt);const out=resultBox();
  box.append(list.el,checkButton('Έλεγχος σειράς',()=>{
   const r=grade(e,list.ids());
   showResult(out,e,r,(row,i)=>`Θέση ${i+1}: ${e.steps.find(s=>s.id===list.ids()[i]).text}`);
  }),out);
 },
 classify(e,box){
  const list=$('div','sl-fields sl-classify');const sels=[];
  e.items.forEach((it,i)=>{const l=$('label','',it.text);const s=$('select');s.append(new Option('— κατηγορία —',''));for(const c of e.categories)s.append(new Option(c.label,c.id));s.dataset.item=String(i);sels.push(s);l.append(s);list.append(l);});
  const out=resultBox();
  box.append(list,checkButton('Έλεγχος',()=>{
   const r=grade(e,sels.map(s=>s.value));sels.forEach((s,i)=>s.classList.toggle('sl-input-bad',!r.rows[i].ok));
   showResult(out,e,r,(row,i)=>e.items[i].text);
  }),out);
 },
 numbers(e,box){
  if(e.media)box.append(soundView(e.media,'μέτρηση'));
  const list=$('div','sl-fields');const inputs={};
  for(const f of e.fields){const l=$('label','',f.label);const i=$('input');i.inputMode='numeric';i.autocomplete='off';i.dataset.field=f.id;inputs[f.id]=i;l.append(i);list.append(l);}
  const out=resultBox();
  box.append(list,checkButton('Έλεγχος',()=>{
   const r=grade(e,Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value])));
   showResult(out,e,r,row=>`${e.fields.find(f=>f.id===row.key).label}: ${inputs[row.key].value||'—'}`);
  }),out);
 },
 locate(e,box){
  // Αρίθμηση κατά θέση (πάνω→κάτω, αριστερά→δεξιά), ώστε η σειρά των ερωτήσεων να μη φανερώνει την απάντηση.
  const points=[...CHEST_POINTS[e.map]].sort((a,b)=>a.y-b.y||a.x-b.x);const answers=e.items.map(()=>null);let current=0;
  const map=$('div','sl-chest');map.append(chestSvg(e.map));
  const btns=points.map((p,i)=>{const b=$('button','sl-point',String(i+1));b.type='button';b.dataset.point=p.id;b.style.left=p.x/300*100+'%';b.style.top=p.y/280*100+'%';b.setAttribute('aria-label',`Σημείο ${i+1}`);map.append(b);return b;});
  const ol=$('ol','sl-locate');
  const draw=()=>{
   ol.replaceChildren();
   e.items.forEach((it,i)=>{const li=$('li');const b=$('button','sl-locate-item',`${it.text}: ${answers[i]?'σημείο '+(points.findIndex(p=>p.id===answers[i])+1):'—'}`);b.type='button';b.setAttribute('aria-pressed',String(i===current));b.addEventListener('click',()=>{current=i;draw();});li.append(b);ol.append(li);});
   btns.forEach(b=>b.classList.toggle('sl-point-used',answers.includes(b.dataset.point)));
  };
  btns.forEach(b=>b.addEventListener('click',()=>{answers[current]=b.dataset.point;current=Math.min(e.items.length-1,current+1);draw();}));
  draw();
  const out=resultBox();
  box.append($('p','vs-hint','Διάλεξε μια γραμμή της λίστας (η ενεργή είναι τονισμένη) και πάτησε το σημείο στο σχήμα.'),map,ol,checkButton('Έλεγχος',()=>{
   const r=grade(e,answers);showResult(out,e,r,(row,i)=>e.items[i].text);
  }),out);
 }
};

function render(){
 const topic=getTopic(state.topic),i=LAB.topics.indexOf(topic);
 document.getElementById('sl-title').textContent=topic.title;
 document.getElementById('sl-eyebrow').textContent=`ΥΠΟΕΝΟΤΗΤΑ ${i+1}`;
 document.getElementById('sl-index').textContent=`${i+1} / ${LAB.topics.length}`;
 document.getElementById('sl-goal').textContent=topic.goal;
 const box=document.getElementById('sl-exercise');box.replaceChildren();
 topic.exercises.forEach((e,k)=>{
  const sec=$('section','sl-ex');sec.dataset.exercise=e.id;sec.dataset.type=e.type;
  sec.append($('h3','',`${k+1}. ${e.prompt}`));RENDER[e.type](e,sec);box.append(sec);
 });
 const list=document.getElementById('sl-source-list');list.replaceChildren();
 for(const s of topic.sources){const li=$('li');const a=$('a','',s.label);a.href=s.href;if(/^https?:/.test(s.href)){a.rel='noopener';a.target='_blank';}li.append(a);list.append(li);}
 for(const b of document.querySelectorAll('#sl-topic-nav button'))b.setAttribute('aria-current',b.dataset.topic===topic.id?'true':'false');
 const url=new URL(location.href);url.searchParams.set('topic',topic.id);history.replaceState(null,'',url);
}

function credits(){
 const ul=document.getElementById('sl-credits');
 for(const f of mediaOf(LAB)){
  const m=MEDIA.get(f);const li=$('li');const a=$('a','',m.title);a.href=m.source;a.rel='noopener';a.target='_blank';
  const lic=$('a','',m.licence);lic.href=m.licenceUrl;lic.rel='license noopener';lic.target='_blank';
  li.append(a,` · ${m.author} · `,lic,` · Αλλαγές: ${m.changes}`);ul.append(li);
 }
}

function boot(){
 const nav=document.getElementById('sl-topic-nav');
 LAB.topics.forEach((t,i)=>{const b=$('button','',`${i+1}. ${t.title}`);b.type='button';b.dataset.topic=t.id;b.addEventListener('click',()=>{state.topic=t.id;render();document.getElementById('sl-title').focus();});nav.append(b);});
 document.getElementById('sl-reset').addEventListener('click',()=>{state.right=0;state.total=0;document.getElementById('sl-score').textContent='Σωστά σημεία: 0 / 0';render();});
 document.getElementById('sl-title').tabIndex=-1;
 credits();render();
 document.body.dataset.ready='1';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
