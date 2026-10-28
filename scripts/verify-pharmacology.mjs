// Static clinical-content gate. Does NOT certify medical/SmPC accuracy.
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const failures=[];
const fail=m=>failures.push(m);
const win={};
const context=vm.createContext({window:win});
for(const f of ['farmaka-catalog.js','farmaka-clinical-2026.js']){
  try{vm.runInContext(read(f),context,{filename:f,timeout:3000})}
  catch(e){fail(f+': runtime '+e.message)}
}
for(const f of ['farmaka-ui.js','farmaka-catalog.js','farmaka-clinical-2026.js']){
  try{new vm.Script(read(f),{filename:f})}catch(e){fail(f+': syntax '+e.message)}
}
const lib=win.EKAB_PHARMA;
if(!lib||!Array.isArray(lib.medicines))fail('Missing pharma catalog');
else{
 const meds=lib.medicines;
 if(meds.length!==76)fail('Expected 76 cards after 70 + 6: '+meds.length);
 const ids=new Set(),names=new Set();
 for(const m of meds){
   if(ids.has(m.id))fail('Duplicate id '+m.id);ids.add(m.id);
   if(names.has(m.name))fail('Duplicate name '+m.name);names.add(m.name);
   for(const p of ['name','english','scope','mechanism','indication','caution','monitor','notes','source']){
     if(!m[p])fail('Missing '+p+' in '+m.name);
   }
   if(!lib.sources[m.source]?.url)fail('Missing source link '+m.name);
   if(!['basic','protocol','advanced'].includes(m.scope))fail('Invalid scope '+m.name);
   for(const p of ['adultDose','paediatricDose','route','contraindications','interactions','pregnancy','renalLiver','storage','governance','evidenceKey','evidenceLevel','clinicalApproval']){
     if(!m.clinical?.[p])fail('Missing clinical '+p+' in '+m.name);
   }
   if(!lib.sources[m.clinical?.evidenceKey]?.url)fail('Missing clinical evidence URL in '+m.name);
   if(!/εκκρεμ|Εκκρεμ/.test(m.clinical?.clinicalApproval||''))fail('False approval or missing signoff warning: '+m.name);
 }
 for(const name of ['Αδρεναλίνη — καρδιακή ανακοπή','Αδρεναλίνη — αναφυλαξία','Τρανεξαμικό οξύ (TXA)','Κεφτριαξόνη — ύποπτη μηνιγγίτιδα']){
  if(!names.has(name))fail('Missing high-risk item '+name);
 }
 const im=meds.find(m=>m.name==='Αδρεναλίνη — αναφυλαξία');
 const arrest=meds.find(m=>m.name==='Αδρεναλίνη — καρδιακή ανακοπή');
 if(im&&!/IM/.test(im.clinical.route))fail('Anaphylaxis IM route not separated');
 if(arrest&&!/IV\/IO/.test(arrest.clinical.route))fail('ALS IV/IO route not separated');
 const txa=meds.find(m=>m.name==='Τρανεξαμικό οξύ (TXA)');
 if(txa&&!/2 ωρών/.test(txa.clinical.adultDose))fail('Missing special head injury 2 hour pathway');
}
/* Level 4 is a separate educational exercise, NOT a fourth permission scope. */
try { vm.runInContext(read('farmaka-cases.js'),context,{filename:'farmaka-cases.js',timeout:3000}) }
catch(e){ fail('Level 4 scenarios: runtime '+e.message) }
const cases=win.EKAB_PHARMA_CASES;
if(!Array.isArray(cases)||cases.length!==7)fail('Level 4: expected seven short cases');
else {
 const unique=new Set();
 for(const item of cases){
  if(!item.id||unique.has(item.id))fail('Level 4: duplicate/missing case ID '+item.id);
  unique.add(item.id);
  if(!item.topic||!item.question||!item.why)fail('Level 4: missing educational explanation '+item.id);
  if(!Array.isArray(item.options)||item.options.length!==3||item.options.some(x=>!x?.trim()))fail('Level 4: three choices required '+item.id);
  if(!Number.isInteger(item.correct)||item.correct<0||item.correct>=item.options.length)fail('Level 4: invalid correct index '+item.id);
  if(!/^https:\/\//.test(item.sourceUrl||'')||!item.sourceTitle)fail('Level 4: verifiable source required '+item.id);
 }
}
try{new vm.Script(read('farmaka-cases.js'),{filename:'farmaka-cases.js'})}catch(e){fail('Level 4 JS syntax: '+e.message)}
const page=read('farmaka.html');
const order=['farmaka-catalog.js','farmaka-clinical-2026.js','farmaka-ui.js'].map(f=>page.indexOf(f));
if(order.some(x=>x<0)||!(order[0]<order[1]&&order[1]<order[2]))fail('Script missing or wrong execution order');
for(const f of ['index.html','saek.html','practical_exam.html']){
 if(!read(f).includes('href="farmaka.html"'))fail('Pharmacology missing from menu: '+f);
}
const sw=read('sw.js');
for(const f of ['farmaka.html','farmaka-catalog.js','farmaka-clinical-2026.js','farmaka-ui.js'])if(!sw.includes('"./'+f+'"'))fail('Offline cache missing '+f);
const version=JSON.parse(read('version.json')).version;
if(!sw.includes('ekab-spoudi-v'+version))fail('SW release mismatch');
if(!read('updates.js').includes("CURRENT='"+version+"'"))fail('Update controller mismatch');
const home=read('index.html'),theory=read('theory.html');
if(!home.includes('updates.js?v='+version))fail('Home update script version mismatch');
if(!theory.includes('app.js?v=')||!theory.includes('progress.js?v='))fail('Theory reader scripts missing');
const ui=read('farmaka-ui.js');
if(!ui.includes('ph-extended-body'))fail('Expanded clinical cards are not shown');
if(!ui.includes("var quiz = ["))fail('Self-assessment quiz not found');
if(!page.includes('id="scopeLegend"')||!page.includes('Τι σημαίνουν τα 3 χρώματα;'))fail('Scope legend must be concise and discoverable');
if(!page.includes('id="clinicalThinking"')||!page.includes('id="phCaseStage"'))fail('Level 4 learning panel missing');
if(!page.includes('farmaka-cases.js?v='))fail('Level 4 module not loaded by page');
if(!sw.includes('"./farmaka-cases.js"'))fail('Level 4 not cached for offline study');
if(!page.includes('Η ανεξάρτητη κλινική έγκριση εκκρεμεί'))fail('Medical disclaimer removed');
if(failures.length){console.error('❌ Pharmacology: '+failures.length+' problems\n'+failures.join('\n'));process.exitCode=1;}
else console.log('✅ Pharmacology structure: '+lib.medicines.length+' cards, 11 categories, three permission scopes, seven Level 4 situations, source links, 12-question teaching module, navigation, offline and release consistency. NOTE: this does not mean independent clinical/SmPC approval.');
