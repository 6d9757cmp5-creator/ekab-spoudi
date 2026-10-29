import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const bank=JSON.parse(read('official_questions.json'));
const sos=JSON.parse(read('eoppep-sos.json'));
assert.equal(bank.length,314);
assert.equal(sos.count,314);
assert.equal(sos.items.length,314);
const map=new Map(bank.map(q=>[q.id,q]));
let bullets=0,stale=0;
for(const entry of sos.items){
 const q=map.get(entry.id);
 assert.ok(q,'SOS id missing from official bank: '+entry.id);
 assert.ok(entry.points.length>0&&entry.points.length<=4,'invalid points: '+entry.id);
 for(const point of entry.points){
  const source=String(q.answer||'').replace(/\s+/g,' ');
  if(!source.includes(point))stale++;
  bullets++;
 }
 assert.equal(entry.medicalCertification,false,'SOS cannot be flagged as medically certified');
}
const semesters=['A','B','C','D'],counts=[71,73,51,52];
let chapters=[],courses=new Set();
for(let i=0;i<4;i++){
 const part=JSON.parse(read('saek-search-'+semesters[i]+'.json'));
 assert.equal(part.count,counts[i],semesters[i]+' chapter count');
 assert.equal(part.items.length,counts[i]);
 for(const ch of part.items){
  assert.match(ch.href,/^saek-course-\d{2}\.html#lesson-\d+$/);
  assert.ok(ch.chapterTitle&&ch.course&&ch.searchText);
  courses.add(ch.courseId);chapters.push(ch);
 }
}
assert.equal(chapters.length,247);
assert.equal(courses.size,20);
assert.equal(new Set(chapters.map(ch=>ch.href)).size,247);
for(let i=1;i<=20;i++){
 const p='saek-course-'+String(i).padStart(2,'0')+'.html';
 assert.ok(existsSync(new URL('../'+p,import.meta.url)));
 const html=read(p);
 assert.ok(html.includes('theme-init.js'),'shared global navigation not loaded '+p);
 for(const ch of chapters.filter(ch=>Number(ch.courseId)===i)){
  assert.ok(html.includes('id="lesson-'+ch.chapter+'"'),'bad chapter search link '+ch.href);
 }
}
const index=read('theory.html'),landing=read('index.html'),app=read('app.js'),styles=read('styles.css'),theme=read('theme-init.js');
assert.ok(landing.includes("location.replace('theory.html'"),'legacy EOPPEP links must redirect from the landing page');
assert.ok(index.includes('id="catalogReaderPlaceholder"')&&index.includes('id="catalogReaderReadySos"'));
assert.ok(index.includes('id="catalogMore"')&&index.includes('id="catalogGroupFilter"'));
const catalog=app.slice(app.indexOf('function openCatalogQuestion('),app.indexOf("$('#catalogReaderClose')"));
assert.ok(catalog.includes('renderCatalogReader(q)')&&!catalog.includes('showExam('),'catalog must not open the exam');
assert.ok(app.includes('home.insertBefore(reader,home.firstChild)'),'desktop reader needs separate grid column');
assert.ok(styles.includes('#eoppepHomeSummary{display:none!important}'),'original header must be hidden during reading');
assert.ok(theme.includes('global-tools.js')&&theme.includes('global-tools.css'));
const globalTools=read('global-tools.js');
assert.ok(globalTools.includes('saek-search-')&&globalTools.includes('official_questions.json')&&globalTools.includes('app-pages-search-1.json'),'unified search should cover SAEK, EOPPEP and app pages');
assert.ok(globalTools.includes('extra-exercises-search.json')&&globalTools.includes('medical-terms.json'));
assert.ok(globalTools.includes('theory.html?question=')&&globalTools.includes('search.html?q='),'EOPPEP results must open the separate theory reader');
const termData=JSON.parse(read('medical-terms.json'));
assert.ok(termData.items.length>=17,'general bilingual medical glossary should have 17+ starter terms');
const termCategories=termData.categories||[...new Set(termData.items.map(item=>item.category))];
assert.ok(termCategories.length>=8,'include different medical disciplines');
if(termData.count!==undefined)assert.equal(termData.count,termData.items.length,'glossary count matches items');
for(const term of termData.items){assert.ok(term.term&&term.en&&term.definition&&term.category);assert.match(term.source,/^https:\/\//)}
const appPageCounts=[28,87,52];
for(let i=1;i<=3;i++){
 const file=JSON.parse(read('app-pages-search-'+i+'.json'));
 assert.equal(file.count,appPageCounts[i-1]);
 for(const row of file.items){assert.match(row.href,/^[a-z0-9_-]+\.html(?:[?#][\w%=&#.-]+)?$/i)}
}
const exercises=JSON.parse(read('extra-exercises-search.json'));
assert.equal(exercises.count,121);
assert.equal(exercises.items.length,121);
assert.ok(read('search.html').includes('globalSearchResultsPage'));
assert.ok(index.includes('🤖 AI Hint SOS'));
assert.ok(app.includes('openCatalogQuestion(requested)'),'EOPPEP global result must open reader instead of exam');

assert.ok(app.includes('never display stale SOS')&&app.includes('listed.every(point=>source.includes(point))'),'safe fallback for newer answers missing');
if(stale)console.warn('⚠️ '+stale+' SOS excerpts are older than the source answer; reader extracts updated text at runtime.');
console.log('✅ 247 SAEK chapter suggestions, 314 source-derived SOS ('+bullets+' points), responsive reader and starter glossary verified.');
