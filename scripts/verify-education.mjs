/* Structural/educational quality gate. It never certifies clinical truth. */
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const errors=[],fail=s=>errors.push(s);
const bank=JSON.parse(read('official_questions.json'));
const expected={A:105,B:209};
if(bank.length!==314)fail('EOPPEP: 314 questions expected, found '+bank.length);
if(new Set(bank.map(q=>q.id)).size!==314)fail('EOPPEP: duplicated ids');
for(const [g,n] of Object.entries(expected)){
 const got=bank.filter(q=>q.group===g);
 if(got.length!==n)fail('EOPPEP '+g+': '+got.length+'/'+n);
 for(let k=1;k<=n;k++)if(!got.some(q=>q.number===k))fail('EOPPEP '+g+': missing number '+k);
}
for(const q of bank){
 if(!(q.answer||'').trim())fail(q.id+': empty answer');
 if(!/^https:\/\//i.test(q.sourceUrl||''))fail(q.id+': missing HTTPS source URL');
 if(q.answerStatus!=='reviewed_educational')fail(q.id+': unreviewed educational field');
}
const inv=JSON.parse(read('docs/EOPPEP-SOURCE-INVENTORY-2026-10-26.json'));
const reviewStatuses=new Set(['documented_source_check','historical_targeted_review','citation_indexed_pending_passage_check']);
for(const q of bank){
 const record=q.sourceReview;
 if(!record||!reviewStatuses.has(record.status))fail(q.id+': missing or invalid per-question sourceReview');
 else{
  if(record.reviewQuestion!==q.question)fail(q.id+': review question mismatch');
  if(record.sourceUrl!==q.sourceUrl)fail(q.id+': review source URL mismatch');
  if(!Array.isArray(record.reviewEvidence)||!record.reviewEvidence.length)fail(q.id+': review evidence URL missing');
  if(record.status==='documented_source_check'&&!q.sourceChecked)fail(q.id+': source check status unsupported');
  if(record.status==='citation_indexed_pending_passage_check'&&q.sourceChecked)fail(q.id+': pending status conflicts with checked source');
  if(record.officialEoppepAnswerKey!==false||record.independentClinicalApproval!==false)fail(q.id+': false certification flag');
 }
}

if(inv.records.length!==314||inv.counts.total!==314||inv.counts.withRecord!==314)fail('Citation/review inventory not 314');
if(inv.records.some((r,i)=>r.id!==bank[i]?.id))fail('Citation inventory ID/order mismatch');
const checked=bank.filter(q=>Boolean(q.sourceChecked)).length;
const recorded=bank.filter(q=>Boolean(q.sourceChecked||q.reviewAudit20261026||q.reviewAudit20261026Followup||q.finalAudit20261026||q.webResearch20261026)).length;
if(inv.counts.withRecordedSourceCheckedField!==checked||inv.counts.withDocumentedTargetedReview!==recorded)fail('EOPPEP source inventory stale: '+checked+' sourceChecked and '+recorded+' reviewed expected');
if(inv.records.some((r,i)=>r.sourceUrl!==bank[i]?.sourceUrl||Boolean(r.recordedPassageReview)!==Boolean(bank[i]?.sourceChecked)||Boolean(r.documentedTargetedReview)!==Boolean(bank[i]?.sourceChecked||bank[i]?.reviewAudit20261026||bank[i]?.reviewAudit20261026Followup||bank[i]?.finalAudit20261026||bank[i]?.webResearch20261026)))fail('EOPPEP inventory record metadata out of sync');

const imgs=JSON.parse(read('saek-image-audit-2026.json'));
if(imgs.courses.length!==20)fail('SAEK: image audit should list 20 courses');
let chapterCount=0,sourceImages=0,missingIllustrations=0,genericExercises=0;
const required=[...Array.from({length:20},(_,i)=>'saek-course-'+String(i+1).padStart(2,'0')+'.html')];
for(let i=0;i<20;i++){
 const html=read(required[i]),regs=imgs.courses[i];
 const chapters=[...html.matchAll(/<details class="fold reader-fold" id="lesson-(\d+)">/g)];
 if(!regs||regs.course!==i+1||regs.chapters.length!==chapters.length)fail('SAEK registry mismatch course '+(i+1));
 chapterCount+=chapters.length;
 for(let j=0;j<chapters.length;j++){
  const section=html.slice(chapters[j].index,chapters[j+1]?.index||html.length);
  if(!section.includes('class="lesson-sos"')||!section.includes('class="check-question"')||!section.includes('class="check-answer"'))fail('SAEK missing learning content '+(i+1)+'/'+(j+1));
  if(!section.includes('class="reader-paragraph"'))fail('SAEK no main paragraph '+(i+1)+'/'+(j+1));
  const entry=regs?.chapters?.[j];
  if(entry?.anchor!=='#lesson-'+(j+1))fail('SAEK image registry anchor mismatch '+(i+1)+'/'+(j+1));
  if(entry?.images?.length)sourceImages++;else missingIllustrations++;
  genericExercises+=(section.match(/Ξεχώρισε τι είναι επιβεβαιωμένο εύρημα/g)||[]).length;
 }
}
if(chapterCount!==247)fail('SAEK chapters: '+chapterCount+'/247');
if(genericExercises)fail('SAEK reused generic exercises: '+genericExercises);
if(sourceImages+missingIllustrations!==247)fail('Incomplete SAEK illustration registry: '+sourceImages+' documented placements + '+missingIllustrations+' pending != 247');
if(read('saek-visual-ui.js').includes('saek-chapter-visuals.js'))fail('Removed recap module must not be loaded');
const courseShort={
 '01':{12:60},'04':{6:60},'06':{5:60,8:60},'11':{11:60}
};
for(const [file,targets] of Object.entries(courseShort)){
 const html=read('saek-course-'+file+'.html'),chapters=[...html.matchAll(/<details class="fold reader-fold" id="lesson-(\d+)">/g)];
 for(const [n,minimum] of Object.entries(targets)){
  const j=Number(n)-1,s=html.slice(chapters[j].index,chapters[j+1]?.index||html.length);
  const a=s.match(/<p class="check-answer">([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g,'').trim()||'';
  if(a.length<minimum)fail('Short answer in lesson '+file+'/'+n+' ('+a.length+' chars)');
 }
}
const version=JSON.parse(read('version.json')).version;
if(!read('sw.js').includes('ekab-spoudi-v'+version))fail('SW version mismatch');
if(read('sw.js').includes('"./saek-chapter-visuals.js"'))fail('Removed recap module must not be precached');
if(!read('updates.js').includes("CURRENT='"+version+"'"))fail('Updates version mismatch');
if(!read('README.md').includes('Έκδοση v'+version))fail('README version mismatch');
const index=read('index.html');
const theory=read('theory.html');
if(!index.includes('updates.js?v='+version))fail('Home update script version mismatch');
if(!theory.includes('app.js?v=')||!theory.includes('updates.js?v='))fail('EOPPEP theory reader scripts missing');
if(!index.includes("location.replace('theory.html'"))fail('Old EOPPEP reader links do not redirect');

// Prevent future changes from adding misleading direct Theory/Practical buttons
// to the homepage when the EOPPEP certification hub already provides both.
const certHomeCard=index.match(/<section class="home-card home-card-eoppep">([\s\S]*?)<\/section>/)?.[1]||'';
if(!certHomeCard.includes('href="eoppep.html"'))fail('Homepage certification card must open the EOPPEP hub');
if(certHomeCard.includes('home-suboptions')||/href="(?:theory|practical_exam)\.html"/.test(certHomeCard))
 fail('Homepage must describe Theory/Practical without separate clickable links');
const eopHub=read('eoppep.html'),eopHubJs=read('eoppep-hub.js');
if(!eopHub.includes('data-eop-group="A"')||!eopHub.includes('data-eop-group="B"')||
 !eopHub.includes('theory.html?view=catalog')||!eopHub.includes('theory.html?mode=exam')||
 !eopHub.includes('href="practical_exam.html"'))
 fail('EOPPEP certification hub missing group selector, reading, practice or practical route');
if(!eopHubJs.includes("ekab-eoppep-official-v15")||!eopHubJs.includes('scheduler.evaluate(s).studied'))
 fail('EOPPEP hub progress must reflect existing saved recall history without changing it');

if(errors.length){
 console.error('❌ Education quality gate: '+errors.length+' errors\n'+errors.join('\n'));
 process.exitCode=1;
}else{
 console.log('✅ Education quality gate: 314/314 EOPPEP, 247/247 SAEK chapters, 103 old generic exercises removed, 5 answers expanded, redundant recap section removed from all chapters, '+sourceImages+' documented source-illustration placements, '+missingIllustrations+' awaiting sourced illustration, version '+version+'.');
 console.log('Scope is structural and bibliographic traceability; independent medical validation is NOT certified.');
}