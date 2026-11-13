/**
 * Εργαστήρια δεξιοτήτων (Αεραγωγός, Εξοπλισμός, Ακρόαση): έλεγχος δεδομένων και αξιολόγηση.
 * Καθαρές συναρτήσεις, χωρίς DOM. Κάθε εργαστήριο είναι ένα JSON στο labs/ και κάθε μέσο (εικόνα, ήχος)
 * καταγράφεται στο media/media.json (άδειες, για τη σελίδα αδειών). Το loadLab() αρνείται εργαστήριο με
 * απάντηση εκτός επιλογών, άσκηση χωρίς αιτιολόγηση, υποενότητα χωρίς πηγή ή κείμενο με δόση.
 * Δεν βαθμολογεί επίσημα, δεν αποθηκεύει και δεν πιστοποιεί πρακτική επάρκεια.
 */
export const TYPES=Object.freeze(['label','identify','truefalse','order','classify','numbers','locate']);
// Δόσεις και ροές δεν ανήκουν σε αυτά τα εργαστήρια (ακολουθείται το πρωτόκολλο της υπηρεσίας).
const DOSE=/\d\s*(mg|mcg|μg|ml|l\/min|lpm|λίτρα)/i;

const deepFreeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(deepFreeze);Object.freeze(o);}return o;};
export const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();

/**
 * Σημεία ακρόασης στον σχηματικό θώρακα (viewBox 300×360). front: πρόσθια όψη, όπου τα δεξιά του ασθενούς
 * είναι αριστερά στην οθόνη· back: οπίσθια όψη, όπου τα δεξιά του ασθενούς είναι δεξιά στην οθόνη.
 * Οι καρδιακές εστίες ακολουθούν τα μεσοπλεύρια διαστήματα του σχήματος (πλευρά k στο y=62+22k).
 */
export const CHEST_POINTS=deepFreeze({
 front:[
  {id:'aortic',x:132,y:117,label:'Αορτική εστία'},{id:'pulmonic',x:168,y:117,label:'Πνευμονική εστία'},
  {id:'erb',x:168,y:139,label:'Σημείο Erb'},{id:'tricuspid',x:166,y:161,label:'Τριγλωχινική εστία'},
  {id:'mitral',x:206,y:183,label:'Μιτροειδής εστία (κορυφή)'},
  {id:'f-ru',x:104,y:96,label:'Δεξιά άνω (πρόσθια)'},{id:'f-lu',x:196,y:96,label:'Αριστερά άνω (πρόσθια)'},
  {id:'f-rm',x:96,y:152,label:'Δεξιά μέση (πρόσθια)'},{id:'f-rl',x:100,y:210,label:'Δεξιά κάτω (πρόσθια)'},
  {id:'f-ll',x:212,y:214,label:'Αριστερά κάτω (πρόσθια)'}
 ],
 // Στην πλάτη τα σημεία είναι ανάμεσα στη σπονδυλική στήλη και την ωμοπλάτη και κάτω από αυτήν (όχι πάνω στο οστό).
 back:[
  {id:'b-lu',x:126,y:98,label:'Αριστερά άνω (οπίσθια)'},{id:'b-ru',x:174,y:98,label:'Δεξιά άνω (οπίσθια)'},
  {id:'b-lm',x:124,y:150,label:'Αριστερά μέση (οπίσθια)'},{id:'b-rm',x:176,y:150,label:'Δεξιά μέση (οπίσθια)'},
  {id:'b-ll',x:100,y:214,label:'Αριστερά κάτω (οπίσθια)'},{id:'b-rl',x:200,y:214,label:'Δεξιά κάτω (οπίσθια)'}
 ]
});
export const pointLabel=id=>[...CHEST_POINTS.front,...CHEST_POINTS.back].find(p=>p.id===id)?.label||id;

/** Όλα τα αρχεία μέσων που χρησιμοποιεί ένα εργαστήριο. */
export function mediaOf(lab){
 const out=new Set();
 for(const t of lab.topics)for(const e of t.exercises){
  if(e.image)out.add(e.image);if(e.media)out.add(e.media);
  for(const it of e.items||[])if(it.media)out.add(it.media);
 }
 return [...out];
}

function fail(where,what){throw Error(`invalid-lab: ${where}: ${what}`);}
function checkText(where,...texts){for(const t of texts)if(DOSE.test(t||''))fail(where,'dose-like text: '+t);}

/** Ελέγχει και παγώνει ένα εργαστήριο. Τα μέσα εμφανίζονται πάντα· οι άδειες ελέγχονται μόνο στα tests. */
export function loadLab(lab){
 if(!lab?.id||!Array.isArray(lab.topics)||!lab.topics.length)fail(lab?.id||'?','no topics');
 const topicIds=new Set(),exIds=new Set();
 for(const t of lab.topics){
  const w=lab.id+'/'+t.id;
  if(!t.id||topicIds.has(t.id))fail(w,'duplicate topic');topicIds.add(t.id);
  if(!t.title||!t.goal)fail(w,'title/goal');
  if(!Array.isArray(t.sources)||!t.sources.length)fail(w,'no sources');
  for(const s of t.sources)if(!s.label||!(s.href||s.book))fail(w,'source without link');
  if(!Array.isArray(t.exercises)||!t.exercises.length)fail(w,'no exercises');
  for(const e of t.exercises){
   const we=w+'/'+e.id;
   if(!e.id||exIds.has(e.id))fail(we,'duplicate exercise');exIds.add(e.id);
   if(!TYPES.includes(e.type))fail(we,'type '+e.type);
   if(!e.prompt)fail(we,'prompt');
   checkText(we,e.prompt,e.why);
   CHECK[e.type](e,we);
  }
 }
 return deepFreeze(structuredClone(lab));
}

const CHECK={
 label(e,w){
  if(!e.image)fail(w,'image');if(!e.alt)fail(w,'alt');
  const keys=Object.keys(e.answers||{});if(!keys.length)fail(w,'answers');
  for(const k of keys)if(!e.options.includes(e.answers[k]))fail(w,'answer not in options: '+e.answers[k]);
  for(const m of e.markers||[])if(!(String(m.n) in e.answers)||!(m.x>=0&&m.x<=1&&m.y>=0&&m.y<=1))fail(w,'marker '+m.n);
  if(!e.why)fail(w,'why');
 },
 identify(e,w){
  if(!e.items?.length||!e.options?.length)fail(w,'items/options');
  for(const it of e.items){
   if(!e.options.includes(it.answer))fail(w,'answer not in options: '+it.answer);
   if(!it.why)fail(w,'item without why');if(!it.media&&!it.text)fail(w,'item without media/text');
   if(it.media?.endsWith('.webp')&&!it.alt)fail(w,'image without alt');
   checkText(w,it.text,it.why);
  }
 },
 truefalse(e,w){
  if(!e.items?.length)fail(w,'items');
  for(const it of e.items){if(typeof it.answer!=='boolean'||!it.text||!it.why)fail(w,'item');checkText(w,it.text,it.why);}
 },
 order(e,w){
  const ids=e.steps?.map(s=>s.id)||[];if(ids.length<3||new Set(ids).size!==ids.length)fail(w,'steps');
  const st=[...(e.start||[])].sort((a,b)=>a-b);if(st.join()!==ids.map((_,i)=>i).join())fail(w,'start must be a permutation');
  if(e.start.every((v,i)=>v===i))fail(w,'start already solved');if(!e.why)fail(w,'why');
  checkText(w,...e.steps.map(s=>s.text));
 },
 classify(e,w){
  const cats=new Set(e.categories?.map(c=>c.id));if(cats.size<2||!e.items?.length)fail(w,'categories/items');
  for(const it of e.items){if(!cats.has(it.answer)||!it.text||!it.why)fail(w,'item '+it.text);checkText(w,it.text,it.why);}
 },
 numbers(e,w){
  if(!e.fields?.length)fail(w,'fields');
  for(const f of e.fields)if(!f.id||!f.label||!Number.isFinite(f.answer)||!(f.tolerance>=0))fail(w,'field '+f.id);
  if(!e.why)fail(w,'why');
 },
 locate(e,w){
  const pts=CHEST_POINTS[e.map];if(!pts)fail(w,'map');
  if(!e.items?.length)fail(w,'items');
  for(const it of e.items)if(!pts.some(p=>p.id===it.answer)||!it.text||!it.why)fail(w,'item '+it.text);
 }
};

/** Επιστρέφει {correct,total,rows}. answers: ό,τι έδωσε ο χρήστης (ανά τύπο). */
export function grade(e,answers={}){
 const rows=GRADE[e.type](e,answers);
 return {correct:rows.filter(r=>r.ok).length,total:rows.length,rows};
}
const GRADE={
 label:(e,a)=>Object.entries(e.answers).map(([n,exp])=>({key:n,ok:a[n]===exp,expected:exp,why:e.notes?.[n]||''})),
 identify:(e,a)=>e.items.map((it,i)=>({key:String(i),ok:a[i]===it.answer,expected:it.answer,why:it.why})),
 truefalse:(e,a)=>e.items.map((it,i)=>({key:String(i),ok:a[i]===it.answer,expected:it.answer?'Σωστό':'Λάθος',why:it.why})),
 order:(e,a)=>{
  const ids=e.steps.map(s=>s.id),given=Array.isArray(a)?a:[];
  if(given.length!==ids.length||new Set(given).size!==ids.length||given.some(g=>!ids.includes(g)))throw Error('invalid-order');
  return ids.map((id,i)=>({key:id,ok:given[i]===id,expected:e.steps[i].text,why:''}));
 },
 classify:(e,a)=>e.items.map((it,i)=>({key:String(i),ok:a[i]===it.answer,expected:e.categories.find(c=>c.id===it.answer).label,why:it.why})),
 numbers:(e,a)=>e.fields.map(f=>{
  const v=Number(String(a[f.id]??'').replace(',','.').trim());
  return {key:f.id,ok:String(a[f.id]??'').trim()!==''&&Number.isFinite(v)&&Math.abs(v-f.answer)<=f.tolerance,expected:`${f.answer} (±${f.tolerance})`,why:''};
 }),
 locate:(e,a)=>e.items.map((it,i)=>({key:String(i),ok:a[i]===it.answer,expected:pointLabel(it.answer),why:it.why}))
};
