/**
 * Actual headless Chromium smoke for Mentor Foundation.
 * Does not require any Appwrite or AI credentials, nor modify legacy app files.
 */
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const root=resolve('.');
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const ext=file.slice(file.lastIndexOf('.'));
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});
    res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
let browser;
try{
  const requested=process.env.MENTOR_TEST_BROWSER||'chromium';
  if(!['chromium','webkit'].includes(requested))throw new Error('Unsupported browser '+requested);
  browser=await (requested==='webkit'?webkit:chromium).launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const url='http://127.0.0.1:'+port+'/mentor-lab.html';
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#status').waitFor();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('έτοιμο'));
  assert.equal(await page.title(),'MENTOR OS · Εργαστήριο αποστολών (δοκιμή)');
  assert.equal(await page.locator('#phase').isVisible(),false);
  await page.getByRole('button',{name:/Δύσπνοια σε οικία/}).click();
  await page.waitForFunction(()=>document.getElementById('case-title').textContent==='Δύσπνοια σε οικία');
  assert.equal((await page.locator('#step-count').textContent()).trim(),'0 / 4');
  await page.getByRole('button',{name:/Πλησιάζω αμέσως/}).click();
  await page.waitForFunction(()=>document.getElementById('feedback').dataset.result==='review');
  assert.equal((await page.locator('#step-count').textContent()).trim(),'0 / 4');
  await page.getByRole('button',{name:/Ελέγχω πρώτα την ασφάλεια/}).click();
  await page.waitForFunction(()=>document.getElementById('step-count').textContent==='1 / 4');
  await page.locator('#tab-memory').click();
  await page.waitForFunction(()=>document.getElementById('sessions-count').textContent==='1');
  assert.equal((await page.locator('#review-count').textContent()).trim(),'1');
  await page.screenshot({path:'mentor-foundation-mobile.png',fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('step-count').textContent==='1 / 4');
  // New multi-person lab: one case, 3 synthetic people and structured reporting.
  await page.locator('#mode-mci').click();
  await page.getByRole('button',{name:/Τροχαίο με τρεις εμπλεκομένους/}).click();
  await page.waitForFunction(()=>document.getElementById('mci-title').textContent==='Τροχαίο με τρεις εμπλεκομένους');
  assert.equal(await page.locator('#mci-people .patient-card').count(),3);
  await page.locator('#mci-actions').getByRole('button',{name:/Ξεκινώ χωρίς έλεγχο κινδύνων/}).click();
  await page.waitForFunction(()=>document.getElementById('mci-feedback').dataset.result==='review');
  assert.equal((await page.locator('#mci-count').textContent()).trim(),'0 / 4');
  await page.locator('#mci-actions').getByRole('button',{name:/Εξετάζω την ασφάλεια/}).click();
  await page.waitForFunction(()=>document.getElementById('mci-count').textContent==='1 / 4');
  await page.locator('#mci-actions').getByRole('button',{name:/Δίνω σαφή αρχική αναφορά/}).click();
  await page.waitForFunction(()=>document.getElementById('mci-count').textContent==='2 / 4');
  for(const letter of ['Α','Β','Γ']){
    await page.locator('#mci-actions').getByRole('button',{name:new RegExp('Καταγράφω την παρουσία του Άτομο '+letter)}).click();
  }
  await page.waitForFunction(()=>document.getElementById('mci-count').textContent==='3 / 4');
  assert.equal(await page.locator('#mci-people .patient-tag.noted').count(),3);
  await page.locator('#mci-actions').getByRole('button',{name:/Παραδίδω μόνο τις παρατηρήσεις/}).click();
  await page.waitForFunction(()=>document.getElementById('mci-count').textContent==='4 / 4');
  assert.equal(await page.locator('#mci-done').isVisible(),true);

  // Equipment training: a separate deterministic session and feedback.
  await page.locator('#mode-equipment').click();
  await page.getByRole('button',{name:/Αυτόματος εξωτερικός απινιδωτής/}).click();
  await page.waitForFunction(()=>document.getElementById('equipment-title').textContent==='Αυτόματος εξωτερικός απινιδωτής');
  await page.locator('#equipment-actions').getByRole('button',{name:/Μπορώ να τη χρησιμοποιήσω χωρίς να γνωρίζω/}).click();
  await page.waitForFunction(()=>document.getElementById('equipment-feedback').dataset.result==='review');
  await page.locator('#equipment-actions').getByRole('button',{name:/Εκπαιδευτική αναγνώριση ενός αυτόματου/}).click();
  await page.locator('#equipment-actions').getByRole('button',{name:/Ακολουθώ εγκεκριμένη εκπαίδευση/}).click();
  await page.locator('#equipment-actions').getByRole('button',{name:/Διαχωρίζω τις μετρήσεις/}).click();
  await page.waitForFunction(()=>document.getElementById('equipment-count').textContent==='3 / 3');
  assert.equal(await page.locator('#equipment-done').isVisible(),true);
  await page.locator('#tab-memory').click();
  await page.waitForFunction(()=>document.getElementById('extra-completed').textContent==='2');
  assert.equal((await page.locator('#mci-sessions').textContent()).trim(),'1');
  assert.equal((await page.locator('#equipment-sessions').textContent()).trim(),'1');
  await page.screenshot({path:'mentor-foundation-mobile-advanced.png',fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#mode-mci').click();
  await page.waitForFunction(()=>document.getElementById('mci-count').textContent==='4 / 4');
  await page.locator('#mode-equipment').click();
  await page.waitForFunction(()=>document.getElementById('equipment-count').textContent==='3 / 3');
  // Legacy PR #22 migration: personal learning plan remains editable and isolated.
  await page.locator('#tab-route').click();
  await page.waitForFunction(()=>document.getElementById('selected-goals-plan').textContent.includes('ΣΑΕΚ'));
  assert.equal(await page.locator('[data-study-goal="saek"]').isChecked(),true);
  await page.locator('[data-study-goal="eoppep"]').check();
  await page.locator('[data-study-goal="seminars"]').check();
  await page.locator('#study-duration').selectOption('15');
  await page.locator('#study-path-mode').selectOption('exam');
  await page.waitForFunction(()=>document.getElementById('selected-goals-plan').textContent.includes('Δοκιμαστική αυτοαξιολόγηση'));
  assert.equal(await page.locator('.study-goal-card').count(),3);
  assert.equal(await page.locator('.study-goal-card .study-goal-link').count(),3);
  const studyMinutes=await page.locator('.study-goal-card .study-task').allTextContents();
  assert.equal(studyMinutes.length,9);
  assert.equal(studyMinutes.reduce((n,text)=>{
    const match=text.match(/(\d+) λεπτά/);
    assert.ok(match,'each practice step must show a duration');
    return n+Number(match[1]);
  },0),15,'selected time budget must be shared across all goals');
  const prefs=JSON.parse(await page.evaluate(()=>localStorage.getItem('ekab.mentor.preferences.v1')));
  assert.deepEqual(prefs,{goals:['saek','eoppep','seminars'],minutes:15,mode:'exam'});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#tab-route').click();
  assert.equal(await page.locator('[data-study-goal="seminars"]').isChecked(),true);
  assert.equal(await page.locator('#study-duration').inputValue(),'15');
  assert.equal(await page.locator('#study-path-mode').inputValue(),'exam');
  assert.equal(await page.locator('.study-goal-card').count(),3);
  await page.locator('[data-study-goal="saek"]').uncheck();
  await page.locator('[data-study-goal="eoppep"]').uncheck();
  await page.locator('[data-study-goal="seminars"]').uncheck();
  await page.waitForFunction(()=>document.getElementById('selected-goals-plan').textContent.includes('Επίλεξε τουλάχιστον έναν στόχο'));
  await page.locator('[data-study-goal="saek"]').check();
  const original='{"EOP-A-001":{"selfAttempts":2}}';
  await page.evaluate(x=>localStorage.setItem('ekab-eoppep-official-v15',x),original);
  await page.locator('#tab-route').click();
  await page.locator('#read-legacy').click();
  await page.waitForFunction(()=>document.getElementById('legacy-result').textContent.includes('1 / 314'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // Guided Mentor tutor: read-only adaptation from existing synthetic learning history.
  await page.locator('#coach-form').waitFor();
  assert.equal(await page.locator('#coach-dialogue .coach-message').count(),1);
  await page.locator('[data-coach-intent="focus"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#coach-dialogue .coach-message').length===3);
  assert.match(await page.locator('#coach-dialogue').textContent(),/Ασφάλεια σκηνής/);
  await page.locator('#coach-question').fill('Πώς τα πάω στην παράδοση;');
  await page.locator('#coach-send').click();
  await page.waitForFunction(()=>document.querySelectorAll('#coach-dialogue .coach-message').length===5);
  assert.match(await page.locator('#coach-dialogue').textContent(),/Δομημένη παράδοση/);
  await page.locator('#coach-question').fill('Ποια θεραπεία να δώσω;');
  await page.locator('#coach-send').click();
  await page.waitForFunction(()=>document.querySelectorAll('#coach-dialogue .coach-message').length===7);
  assert.match(await page.locator('#coach-dialogue').textContent(),/Δεν αξιολογώ ελεύθερο ιατρικό κείμενο/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#tab-route').click();
  assert.equal(await page.locator('#coach-dialogue .coach-message').count(),1,'tutor chat is not persisted');
  await page.locator('#tab-memory').click();
  const download=page.waitForEvent('download');
  await page.locator('#export-mentor').click();
  const item=await download;
  assert.match(item.suggestedFilename(),/mentor-os-study-backup\.json/);
  const backup=JSON.parse(await readFile(await item.path(),'utf8'));
  assert.equal(backup.schema,'ekab-mentor-export-v2');
  assert.equal(backup.sessions.length,1);
  assert.equal(backup.activities.length,2);
  page.once('dialog',d=>d.accept());
  await page.locator('#clear-mentor').click();
  await page.waitForFunction(()=>document.getElementById('sessions-count').textContent==='0');
  await page.waitForFunction(()=>document.getElementById('extra-completed').textContent==='0');
  assert.equal((await page.locator('#mci-sessions').textContent()).trim(),'0');
  assert.equal((await page.locator('#equipment-sessions').textContent()).trim(),'0');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // MENTOR physician reference desk: verified source index, specialty routing, and honest fallback.
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('clinical-count').textContent.includes('17 ειδικότητες'));
  assert.match(await page.locator('#clinical-count').textContent(),/51 ερωτήσεις αναφοράς/);
  assert.match(await page.locator('#clinical-count').textContent(),/14 επίσημοι επιστημονικοί κόμβοι/);
  assert.match(await page.locator('#clinical-count').textContent(),/0 κλινικά εγκεκριμένες/);
  await page.locator('#tab-clinical').click();
  await page.locator('#clinical-specialty').selectOption('nephrology');
  await page.waitForFunction(()=>document.getElementById('clinical-status').textContent.includes('3 από 51'));
  assert.equal(await page.locator('.clinical-entry').count(),3);
  await page.locator('#clinical-query').fill('κρεατινίνη');
  await page.waitForFunction(()=>document.querySelector('#clinical-status').textContent.startsWith('Εμφανίζονται'));
  assert.ok(await page.locator('.clinical-entry').count()>0,'Kidney function should route to nephrology references');
  assert.match(await page.locator('.clinical-entry .clinical-citations a').first().getAttribute('href'),/^https:\/\/kdigo.org\/guidelines\/?$/);
  assert.match(await page.locator('.clinical-caution').first().textContent(),/δεν|χωρίς|Δεν/);
  await page.locator('#clinical-specialty').selectOption('all');
  await page.locator('#clinical-query').fill('εξωγαλαξιακό άσχετο αστροναυτικό');
  await page.waitForFunction(()=>document.querySelector('.clinical-empty'));
  assert.match(await page.locator('.clinical-empty').textContent(),/Δεν έχω ελεγμένη απάντηση/);
  await page.screenshot({path:'mentor-clinical-desk-mobile.png',fullPage:true});
  await page.locator('#tab-route').click();
  await page.locator('#coach-question').fill('Γιατί ένα μόνο eGFR δεν σημαίνει χρόνια νεφρική νόσο;');
  await page.locator('#coach-to-clinical').click();
  await page.waitForFunction(()=>document.getElementById('clinical-query').value.includes('eGFR'));
  await page.locator('#tab-route').click();
  await page.locator('#coach-question').fill('Γιατί ένα μόνο eGFR δεν σημαίνει χρόνια νεφρική νόσο;');
  await page.locator('#coach-send').click();
  await page.waitForFunction(()=>document.querySelector('#coach-dialogue .coach-message-assistant:last-child')?.textContent.includes('Ιατρική βιβλιογραφική αναφορά'));
  const clinicalAnswer=await page.locator('#coach-dialogue .coach-message-assistant').last().textContent();
  assert.match(clinicalAnswer,/eGFR|νεφρική/i);
  assert.match(clinicalAnswer,/Δεν παρέχω κλινική απόφαση/);
  assert.match(await page.locator('#coach-dialogue .coach-message-assistant .coach-reference-links a').last().getAttribute('href'),/^https:\/\//);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // The MENTOR "knowledge boost" is a working source-linked non-AI helper.
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('knowledge-count').textContent.includes('59 ελληνικές κάρτες'));
  assert.match(await page.locator('#knowledge-count').textContent(),/8 τεκμηριωμένες βιβλιογραφικές πηγές/);
  assert.match(await page.locator('#knowledge-count').textContent(),/0 ιατρικά εγκεκριμένες/);
  await page.locator('#tab-knowledge').click();
  await page.locator('#knowledge-query').fill('QRS');
  await page.waitForFunction(()=>document.getElementById('knowledge-status').textContent.startsWith('Εμφανίζονται'));
  assert.ok(await page.locator('.knowledge-card').count()>0,'QRS knowledge search should have an actual card');
  assert.match(await page.locator('.knowledge-card').first().textContent(),/QRS/i);
  await page.locator('.knowledge-card').first().locator('button.knowledge-reveal').click();
  assert.equal(await page.locator('.knowledge-card').first().locator('.knowledge-answer').isVisible(),true);
  assert.match(await page.locator('.knowledge-card').first().locator('.knowledge-answer').textContent(),/εκπόλωση|κοιλ/i);
  assert.match(await page.locator('.knowledge-card').first().locator('a.knowledge-reference').first().getAttribute('href'),/^https:\/\//);
  await page.locator('#knowledge-query').fill('');
  await page.locator('#knowledge-topic').selectOption('pediatrics');
  await page.waitForFunction(()=>document.getElementById('knowledge-status').textContent.includes('4 από 59'));
  assert.equal(await page.locator('.knowledge-card').count(),4);
  await page.locator('#knowledge-next').click();
  assert.ok((await page.locator('#knowledge-practice h3').textContent()).length>14);
  await page.screenshot({path:'mentor-knowledge-mobile.png',fullPage:true});
  await page.locator('#tab-route').click();
  await page.locator('#coach-question').fill('καρδιά');
  await page.locator('#coach-to-knowledge').click();
  await page.waitForFunction(()=>document.getElementById('knowledge-query').value==='καρδιά');
  assert.ok(await page.locator('.knowledge-card').count()>0,'Mentor coach lookup opens actual knowledge');
  // Deterministic mentor coach answers conceptual questions from authored source cards.
  await page.locator('#tab-route').click();
  await page.locator('#coach-question').fill('Τι είναι το QRS;');
  await page.locator('#coach-send').click();
  await page.waitForFunction(()=>document.querySelector('#coach-dialogue .coach-message-assistant:last-child')?.textContent.includes('Κάρτα γνώσης'));
  const groundedReply=await page.locator('#coach-dialogue .coach-message-assistant').last().textContent();
  assert.match(groundedReply,/QRS/);
  assert.match(groundedReply,/wtcs\.pressbooks\.pub\/anatphys/);
  assert.match(groundedReply,/εκκρεμεί επιστημονικός έλεγχος/);
  assert.match(groundedReply,/Δεν αποτελεί οδηγία για πραγματικό ασθενή/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original,
    'Knowledge cards and self-test must not affect official EOPPEP progress');
  assert.ok(!(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('knowledge')))),
    'Knowledge does not store the questions or ratings in legacy localStorage');
  // MENTOR book bridge: actual copied book text, hash-verified lazy lookup (never clinical synthesis).
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('mentor-book-count').textContent.includes('7 εισαγμένα'));
  assert.match(await page.locator('#mentor-book-count').textContent(),/0 εγκεκριμένα/);
  assert.match(await page.locator('#mentor-book-count').textContent(),/7 διαθέσιμα/);
  assert.equal(await page.locator('#mentor-book-track').inputValue(),'paramedic');
  assert.equal(await page.locator('#mentor-book-select option').count(),5,'Paramedic route includes only applicable preview books');
  let previewChoices=await page.locator('#mentor-book-select option').evaluateAll(options=>options.map(o=>o.value));
  assert.ok(previewChoices.includes('wistech-emr-2025'));
  assert.ok(previewChoices.includes('who-bec'));
  assert.ok(!previewChoices.includes('medical-surgical-nursing'));
  await page.locator('#mentor-book-track').selectOption('medicine');
  assert.equal(await page.locator('#mentor-book-select option').count(),5,'Medicine route includes advanced medical references');
  previewChoices=await page.locator('#mentor-book-select option').evaluateAll(options=>options.map(o=>o.value));
  assert.ok(previewChoices.includes('medical-surgical-nursing'));
  assert.ok(previewChoices.includes('who-bec'),'Shared book is visible in both study routes');
  assert.ok(!previewChoices.includes('wistech-emr-2025'));
  await page.locator('#mentor-book-track').selectOption('paramedic');
  assert.match(await page.locator('#panel-books .disclaimer').textContent(),/εκκρεμ|έλεγχο/i);

  await page.locator('#tab-books').click();
  await page.locator('#mentor-book-query').fill('αεραγωγός');
  await page.locator('#mentor-book-submit').click();
  await page.waitForFunction(()=>document.getElementById('mentor-book-status').textContent.startsWith('Βρέθηκαν'));
  assert.ok(await page.locator('#mentor-book-results .review-result').count()>0,'Actual EMR source is searchable in Greek');
  assert.match(await page.locator('#mentor-book-results .review-watermark').first().textContent(),/ΑΝΕΛΕΓΚΤΟ/);
  assert.match(await page.locator('#mentor-book-results .review-excerpt').first().textContent(),/airway/i);
  assert.match(await page.locator('#mentor-book-results .review-result a').first().getAttribute('href'),/^https:\/\/wtcs.pressbooks.pub\/emergencymedtech\//);
  const snippet=await page.locator('#mentor-book-results .review-excerpt').first().textContent();
  assert.ok(snippet.length<275,'No full unreviewed chapter is displayed');
  // Explicitly exercise EACH imported book, including the two with user-attested licenses.
  // They remain unapproved for clinical AI even when editorial search works.
  const extraBooks=[
    ['openrn-health','airway'],['openrn-skills','airway'],
    ['openrn-pharm','dose'],['openrn-advanced','airway'],
    ['who-bec','airway'],['medical-surgical-nursing','shock']
  ];
  for(const [sourceId,term] of extraBooks){
    await page.locator('#mentor-book-track').selectOption(
      ['openrn-advanced','medical-surgical-nursing'].includes(sourceId)?'medicine':'paramedic');
    await page.locator('#mentor-book-select').selectOption(sourceId);
    await page.locator('#mentor-book-query').fill(term);
    await page.locator('#mentor-book-submit').click();
    await page.waitForFunction(()=>document.getElementById('mentor-book-status').textContent.startsWith('Βρέθηκαν'),{timeout:30000});
    const matches=await page.locator('#mentor-book-results .review-result').count();
    assert.ok(matches>0,'Source lookup has real excerpts: '+sourceId);
    assert.match(await page.locator('#mentor-book-results .review-watermark').first().textContent(),/ΑΝΕΛΕΓΚΤΟ/);
    const excerpt=await page.locator('#mentor-book-results .review-excerpt').first().textContent();
    assert.ok(excerpt.length<=275,'Source preview is bounded: '+sourceId);
    assert.match(await page.locator('#mentor-book-results .review-result a').first().getAttribute('href'),/^https:\/\//);
  }
  await page.locator('#mentor-book-track').selectOption('paramedic');
  await page.locator('#mentor-book-select').selectOption('wistech-emr-2025');
  await page.locator('#mentor-book-query').fill('αεραγωγός');
  await page.locator('#mentor-book-submit').click();
  await page.waitForFunction(()=>document.getElementById('mentor-book-status').textContent.startsWith('Βρέθηκαν'));
  await page.screenshot({path:'mentor-foundation-mobile-books.png',fullPage:true});
  await page.locator('#tab-route').click();
  await page.locator('#coach-question').fill('shock');
  await page.locator('#coach-to-books').click();
  await page.waitForFunction(()=>document.getElementById('mentor-book-query').value==='shock');
  await page.waitForFunction(()=>document.getElementById('mentor-book-status').textContent.startsWith('Βρέθηκαν'));
  assert.ok(await page.locator('#mentor-book-results .review-result').count()>0,'Mentor lookup button searches source');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original,'Book lookup must not alter EOPPEP');
  assert.ok(!(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('review-corpus')))),'Queries are not stored');

  // Public Mentor bibliography: mobile Chromium/WebKit search and fail-closed review state.
  await page.goto('http://127.0.0.1:'+port+'/mentor-library.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('library-status').textContent.includes('μόνο στοιχεία πηγών'));
  assert.equal(await page.locator('#sources-list .source-card').count(),28);
  assert.match(await page.locator('#source-counts').textContent(),/0 κλινικά εγκεκριμένες/);
  assert.match(await page.locator('#source-counts').textContent(),/18 για Paramedic/);
  assert.match(await page.locator('#source-counts').textContent(),/20 για Ιατρική/);
  assert.equal(await page.locator('#study-paths .study-path').count(),4);
  await page.locator('#source-track').selectOption('paramedic');
  assert.equal(await page.locator('#study-paths .study-path').count(),8);
  assert.ok((await page.locator('#study-paths').textContent()).includes('Εκτίμηση ασθενούς'));
  await page.locator('#source-track').selectOption('medicine');
  assert.equal(await page.locator('#study-paths .study-path').count(),8);
  assert.ok((await page.locator('#study-paths').textContent()).includes('Παθολογία'));
  await page.locator('#source-track').selectOption('all');
  await page.locator('#source-track').selectOption('paramedic');
  assert.equal(await page.locator('#sources-list .source-card').count(),18);
  await page.locator('#source-track').selectOption('medicine');
  assert.equal(await page.locator('#sources-list .source-card').count(),20);
  await page.locator('#source-track').selectOption('paramedic');
  await page.locator('#source-search').fill('αιμορραγία');
  assert.ok(await page.locator('#sources-list .source-card').count()>0);
  assert.ok((await page.locator('#sources-list').textContent()).includes('PHTLS'));
  await page.locator('#source-track').selectOption('medicine');
  await page.locator('#source-search').fill('Guyton');
  assert.equal(await page.locator('#sources-list .source-card').count(),1);
  await page.locator('#source-search').fill('');
  await page.locator('#source-track').selectOption('all');
  await page.locator('#source-stage').selectOption('identified');
  assert.equal(await page.locator('#sources-list .source-card').count(),21);
  await page.locator('#source-search').fill('ERC');
  assert.equal(await page.locator('#sources-list .source-card').count(),1);
  assert.match(await page.locator('#sources-list .source-card h2').textContent(),/Guidelines 2025/);
  await page.locator('#source-stage').selectOption('all');
  await page.locator('#source-search').fill('πηγη-που-δεν-υπαρχει');
  assert.equal(await page.locator('#sources-list .source-card').count(),0);
  assert.match(await page.locator('#sources-visible').textContent(),/0 από 28/);
  await page.locator('#source-search').fill('');
  assert.equal(await page.locator('#sources-list .source-card').count(),28);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // Two-person incident: predefined synthetic vitals, decision feedback and scoped replay.
  await page.goto('http://127.0.0.1:'+port+'/mentor-live.html',{waitUntil:'networkidle'});
  assert.match(await page.title(),/Δύο τραυματίες/);
  assert.equal(await page.locator('#live-patients .live-patient').count(),2);
  assert.equal((await page.locator('#live-step').textContent()).trim(),'Στάδιο 1 / 4');
  assert.equal(await page.locator('#live-patients .live-patient').first().locator('.live-vitals strong').first().textContent(),'106');
  await page.getByRole('button',{name:/Μπαίνω αμέσως στον χώρο/}).click();
  await page.waitForFunction(()=>document.querySelector('#live-review').textContent.includes('1 για επανάληψη'));
  assert.match(await page.locator('#live-step').textContent(),/Στάδιο 1/);
  await page.getByRole('button',{name:/Αναγνωρίζω κινδύνους/}).click();
  await page.waitForFunction(()=>document.getElementById('live-step').textContent.includes('Στάδιο 2'));
  await page.getByRole('button',{name:/Ενημερώνω με σαφήνεια/}).click();
  await page.getByRole('button',{name:/Καταγράφω ξεχωριστά/}).click();
  await page.getByRole('button',{name:/Το συμβάν, τον αριθμό ατόμων/}).click();
  await page.waitForFunction(()=>document.getElementById('live-complete').hidden===false);
  assert.equal(await page.locator('#live-timeline li').count(),5);
  assert.equal(await page.locator('#live-patients .live-patient').count(),2);
  assert.match(await page.locator('#live-time').textContent(),/10΄/);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#live-complete').isVisible(),true,'live-session history persisted locally');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  const liveKey=await page.evaluate(()=>localStorage.getItem('ekab.mentor.live-two-patients.v1'));
  assert.ok(liveKey&&JSON.parse(liveKey).events.length===5,'isolated Mentor incident log');
  page.once('dialog',d=>d.accept());
  await page.locator('#live-reset').click();
  await page.waitForFunction(()=>document.getElementById('live-step').textContent.includes('Στάδιο 1'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab.mentor.live-two-patients.v1')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original,'legacy EOPPEP history untouched');
  await page.screenshot({path:'mentor-live-two-person-mobile.png',fullPage:true});
  assert.deepEqual(errors,[],'No browser JS errors');
  console.log('PASS: mobile '+(process.env.MENTOR_TEST_BROWSER||'chromium')+' EKAB+MCI+equipment flows, reload persistence, exported activity data, zero legacy mutations and scoped delete');
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
