/**
 * Actual headless Chromium smoke for Mentor Foundation.
 * Does not require any Appwrite or AI credentials, nor modify legacy app files.
 */
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const types={'.webp':'image/webp','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
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
  assert.equal(await page.title(),'MENTOR · Εργαστήριο αποστολών (δοκιμή)');
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
  const refusal=await page.locator('#coach-dialogue .coach-message').last().textContent();
  assert.match(refusal,/Δεν έχω ακόμη τεκμηριωμένη απάντηση|Δεν αξιολογώ ελεύθερο ιατρικό κείμενο/,'Mentor must refuse unsupported treatment questions');
  assert.match(refusal,/δεν είναι ενεργή|δεν είναι διαθέσιμ/,'Mentor must clearly state that unverified clinical AI is unavailable');
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
  // Public Mentor bibliography: mobile Chromium/WebKit search and fail-closed review state.
  await page.goto('http://127.0.0.1:'+port+'/mentor-library.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('library-status').textContent.includes('μόνο στοιχεία πηγών'));
  assert.equal(await page.locator('#sources-list .source-card').count(),15);
  assert.match(await page.locator('#source-counts').textContent(),/0 κλινικά εγκεκριμένες/);
  await page.locator('#source-stage').selectOption('identified');
  assert.equal(await page.locator('#sources-list .source-card').count(),8);
  await page.locator('#source-search').fill('ERC');
  assert.equal(await page.locator('#sources-list .source-card').count(),1);
  assert.match(await page.locator('#sources-list .source-card h2').textContent(),/Guidelines 2025/);
  await page.locator('#source-stage').selectOption('all');
  await page.locator('#source-search').fill('πηγη-που-δεν-υπαρχει');
  assert.equal(await page.locator('#sources-list .source-card').count(),0);
  assert.match(await page.locator('#sources-visible').textContent(),/0 από 15/);
  await page.locator('#source-search').fill('');
  assert.equal(await page.locator('#sources-list .source-card').count(),15);
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
  // Non-AI oral examination: explicit self-review, no microphone, grades or transcript persistence.
  await page.goto('http://127.0.0.1:'+port+'/mentor-oral.html',{waitUntil:'networkidle'});
  assert.match(await page.title(),/Προφορική εξάσκηση/);
  assert.match(await page.locator('#oral-position').textContent(),/Ερώτηση 1 \/ 6/);
  await page.locator('#oral-answer').fill('Δοκιμαστικές προσωρινές σημειώσεις');
  await page.locator('#oral-reveal').click();
  assert.equal(await page.locator('#oral-checks input[type="checkbox"]').count(),3);
  await page.locator('#oral-checks input[type="checkbox"]').nth(0).check();
  await page.locator('#oral-checks input[type="checkbox"]').nth(2).check();
  assert.match(await page.locator('#oral-review-note').textContent(),/2 από 3/);
  await page.locator('#oral-next').click();
  assert.match(await page.locator('#oral-position').textContent(),/Ερώτηση 2 \/ 6/);
  await page.locator('#oral-prev').click();
  assert.equal(await page.locator('#oral-answer').inputValue(),'Δοκιμαστικές προσωρινές σημειώσεις');
  assert.equal(await page.locator('#oral-checks input:checked').count(),2);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#oral-answer').inputValue(),'','oral transcript is not persisted');
  assert.equal(await page.locator('#oral-review').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('a[href="ui-tools/anatomy-3d/index.html"]').count(),1);
  assert.equal(await page.locator('a[href="mentor-oral.html"]').count(),2);
  // ECG Lab: synthetic signal only, local control without personal clinical inference.
  await page.goto('http://127.0.0.1:'+port+'/mentor-ecg.html',{waitUntil:'networkidle'});
  assert.match(await page.title(),/ECG Lab/);
  const ecgBefore=await page.locator('#ecg-curve').getAttribute('points');
  assert.ok(ecgBefore.split(' ').length>=400);
  await page.locator('[data-ecg-rate="115"]').click();
  assert.match(await page.locator('#ecg-rate-out').textContent(),/115/);
  const ecgAfter=await page.locator('#ecg-curve').getAttribute('points');
  assert.notEqual(ecgBefore,ecgAfter,'synthetic waveform changes with illustrative rate');
  assert.match(await page.locator('#ecg-caption').textContent(),/Καμία κλινική μέτρηση/);
  await page.locator('#ecg-toggle-key').click();
  assert.equal(await page.locator('#ecg-key').isVisible(),true);
  assert.equal(await page.locator('#ecg-toggle-key').getAttribute('aria-expanded'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // MENTOR master roadmap must truthfully represent ECG, oral and live prototypes.
  await page.goto('http://127.0.0.1:'+port+'/ui-tools/mentor-roadmap.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('.capability-card').length===25);
  assert.equal(await page.locator('.capability-card').count(),25);
  const ecgCapability=page.locator('.capability-card').filter({hasText:'ECG Lab — διαδραστικό συνθετικό σχήμα'});
  const oralCapability=page.locator('.capability-card').filter({hasText:'Προφορική εξάσκηση — χωρίς AI'});
  await ecgCapability.locator('summary').click();
  assert.equal(await ecgCapability.getByRole('link',{name:'Άνοιγμα συνθετικού ECG Lab'}).count(),1);
  await oralCapability.locator('summary').click();
  assert.equal(await oralCapability.getByRole('link',{name:'Άνοιγμα προφορικής εξάσκησης'}).count(),1);
  assert.match(await page.locator('.capability-card').filter({hasText:'Πλήρης AI καθηγητής'}).textContent(),/Μη διαθέσιμο/);
  await page.locator('[data-filter="available"]').click();
  assert.ok((await page.locator('.capability-card:visible').count())>8);
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator('.capability-card:visible').count(),25);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // Whole-app Mentor read-only source browser: all public assets and zero changes to legacy storage.
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('a[href="mentor-readonly.html"]').count(),1);
  const beforeReadOnly=await page.evaluate(()=>Object.fromEntries(
    Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).map(k=>[k,localStorage.getItem(k)])
  ));
  await page.goto('http://127.0.0.1:'+port+'/mentor-readonly.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('loaded-summary').textContent.includes('καταχωρίσεις από'),{timeout:20000});
  const loadedSources=await page.locator('#loaded-summary').textContent();
  assert.match(loadedSources,/13\/13 πηγές/,'Mentor reader should load all available public source files');
  assert.ok(Number(loadedSources.match(/^\d+/)?.[0]||0)>=800,'catalog includes educational course and exam data');
  await page.locator('#reader-kind').selectOption('eoppep');
  assert.match(await page.locator('#reader-status').textContent(),/314 αποτελέσματα/);
  await page.locator('#reader-input').fill('ρινικών κοιλοτήτων');
  await page.getByRole('button',{name:'Αναζήτηση'}).click();
  assert.match(await page.locator('#reader-status').textContent(),/[1-9]\d* αποτελέσματα/);
  const firstReading=page.locator('.reader-result').first();
  await firstReading.locator('summary').click();
  assert.match(await firstReading.locator('.reader-text').textContent(),/αέρα|αναπνοή/);
  await page.locator('#reader-progress').click();
  assert.match(await page.locator('#progress-preview').textContent(),/Καταχωρίσεις ανάγνωσης ΣΑΕΚ/);
  const afterReadOnly=await page.evaluate(()=>Object.fromEntries(
    Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).map(k=>[k,localStorage.getItem(k)])
  ));
  assert.deepEqual(afterReadOnly,beforeReadOnly,'Mentor reader must not mutate any local progress or grade');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  // Presence experience: actual interaction, no new AI, no writes to legacy progress.
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#mentor-avatar').count(),1,'One visible mentor character');
  assert.equal(await page.locator('#mentor-presence-line').isVisible(),true);
  assert.equal(await page.locator('#mentor-hero-question').isVisible(),true);
  const legacyBeforePresence=await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15'));
  await page.locator('#mentor-hero-question').fill('Τι να μελετήσω σήμερα;');
  await page.locator('#mentor-hero-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#mentor-presence-line').textContent.includes('Προτείνω'));
  assert.match(await page.locator('#mentor-voice-status').textContent(),/περιορισμένο εκπαιδευτικό/);
  assert.equal(await page.locator('#coach-dialogue .coach-message').count(),3,'Hero question also appears in Tutor conversation');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),legacyBeforePresence);
  await page.locator('#mentor-intro-chat').click();
  assert.equal(await page.locator('#tab-route').getAttribute('aria-selected'),'true','Conversation button opens working tutor');
  assert.equal(await page.locator('#coach-question').evaluate(x=>document.activeElement===x),true,'Tutor input focused');
  const home=await readFile(resolve(root,'index.html'),'utf8');
  assert.match(home,/class="home-mentor-presence(?:\s|\")/);
  assert.match(home,/href="mentor-readonly.html"/);
  assert.match(home,/href="mentor-live.html"/);
  // Natural-device voice: explicit voice controls, rate selection and permission-safe mic.
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#mentor-voice-select').count(),1,'installed Greek voice picker is present');
  assert.equal(await page.locator('#mentor-intro-mic').count(),1,'explicit mic control is present');
  assert.equal(await page.locator('#mentor-speech-wave').count(),1,'voice waveform exists');
  await page.locator('#mentor-voice-speed').evaluate(el=>{el.value='1.05';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.match(await page.locator('#mentor-voice-speed-label').textContent(),/1,05/);
  assert.match(await page.locator('#mentor-microphone-privacy').textContent(),/υπηρεσία του παρόχου του browser/);
  const privacyBefore=await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15'));
  await page.locator('#mentor-hero-question').fill('Τι να μελετήσω;');
  await page.locator('#mentor-hero-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('mentor-presence-line').textContent.includes('Προτείνω'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),privacyBefore,'mentor voice settings did not touch legacy EOPPEP');
  const micSupported=await page.evaluate(()=>typeof(window.SpeechRecognition||window.webkitSpeechRecognition)==='function');
  assert.equal(await page.locator('#mentor-intro-mic').isDisabled(),!micSupported,'mic available only where browser supports recognition');
  // Lifelike portrait regression: actual pixels, two entry points and lip-cycle cleanup.
  // Home portrait already verified by separate home browser QA.
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#mentor-avatar .mentor-photo-img').evaluate(x=>x.complete&&x.naturalWidth===220&&x.naturalHeight===228),true,'Classroom portrait loads actual WebP');
  const motion=await page.evaluate(async()=>{
    const {createMentorAvatar}=await import('/mentor-avatar-live.mjs');
    const element=document.getElementById('mentor-avatar');
    const live=createMentorAvatar(element);
    live.start('Άλφα ωμέγα');
    const started=element.classList.contains('mentor-photo-speaking');
    live.boundary({charIndex:0});
    const open=element.dataset.viseme;
    live.boundary({charIndex:5});
    const round=element.dataset.viseme;
    live.stop();
    const ended=!element.classList.contains('mentor-photo-speaking')&&element.dataset.viseme==='rest';
    return {started,open,round,ended};
  });
  assert.equal(motion.started,true);
  const reduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  if(!reduced){assert.equal(motion.open,'open');assert.equal(motion.round,'round');}
  assert.equal(motion.ended,true,'Stopping speech removes the live mouth state');
  // Actual GPU-backed MENTOR hologram or explicit portrait fallback in WebKit.
  assert.equal(await page.locator('#mentor-3d-canvas').count(),1,'WebGL hologram canvas exists');
  const hologram=await page.evaluate(()=>{
    const canvas=document.getElementById('mentor-3d-canvas');
    const mode=document.getElementById('mentor-view-3d');
    const surface=document.querySelector('.mentor-intro-visual');
    const gl=canvas.getContext('webgl');
    return {supported:!mode.disabled,view:surface.dataset.mentorView,
      gpu:!!(gl&&gl.getParameter(gl.CURRENT_PROGRAM)),
      width:canvas.width,height:canvas.height};
  });
  const cinematic=await page.evaluate(()=>{
    const pic=document.querySelector('.cinematic-character');
    const stage=document.getElementById('mentor-cinematic-stage');
    return {image:!!pic&&pic.complete&&pic.naturalWidth===320&&pic.naturalHeight===763,
      visible:!!stage&&getComputedStyle(stage).display!=='none',
      hiddenCartoon:getComputedStyle(document.getElementById('mentor-3d-panel')).display==='none'};
  });
  assert.deepEqual(cinematic,{image:true,visible:true,hiddenCartoon:true},'Approved full-body image loads while low-fidelity character is hidden');
  assert.equal(await page.locator('[data-cinematic-mode]').count(),3,'Three real interactive mode buttons');
  await page.locator('[data-cinematic-mode="text"]').click();
  assert.equal(await page.locator('[data-cinematic-mode="text"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-cinematic-mode="hologram"]').click();
  assert.equal(await page.locator('#mentor-cinematic-stage').getAttribute('class').then(x=>x.includes('is-glowing')),true);
  if(hologram.supported){
    assert.equal(hologram.view,'photo','Photoreal approved MENTOR is default, not procedural 3D');
    assert.equal(hologram.gpu,true,'Real GLSL program is active on GPU');
    assert.ok(hologram.width>100&&hologram.height>100,'Canvas has drawable resolution');
    await page.locator('#mentor-3d-rotation').evaluate(el=>{
      el.value='74';el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    assert.equal(await page.locator('#mentor-3d-rotation').inputValue(),'74');
    await page.locator('#mentor-view-photo').evaluate(el=>el.click());
    assert.equal(await page.locator('.mentor-intro-visual').getAttribute('data-mentor-view'),'photo');
    await page.locator('#mentor-view-3d').evaluate(el=>el.click());
    assert.equal(await page.locator('.mentor-intro-visual').getAttribute('data-mentor-view'),'3d');
    await page.locator('#mentor-view-photo').evaluate(el=>el.click());
    assert.match(await page.locator('#mentor-3d-status').textContent(),/προσεγγιστικό/);
  }else{
    assert.equal(hologram.view,'photo','Portrait remains functional if WebGL is unavailable');
    assert.match(await page.locator('#mentor-3d-status').textContent(),/δεν είναι διαθέσιμη/);
  }
  // Safari WebKit sometimes reports a malformed optional update-check URL from legacy code.
  // This is unrelated to the avatar and must not mask other browser exceptions.
  const actionableErrors=errors.filter(e=>!e.includes('Fetch API cannot load http: /127.0.0.1:')||!e.includes('/version.json?nocache='));
  // Whole prehospital atlas: 360 outline entries only. No AI, medical actions or legacy writes.
  await page.goto('http://127.0.0.1:'+port+'/mentor-lab.html',{waitUntil:'networkidle'});
  assert.ok(await page.locator('a[href="mentor-scenarios.html"]').count()>=1);
  const atlasStorageBefore=await page.evaluate(()=>Object.fromEntries(
    Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).map(k=>[k,localStorage.getItem(k)])
  ));
  await page.goto('http://127.0.0.1:'+port+'/mentor-scenarios.html',{waitUntil:'networkidle'});
  assert.match(await page.title(),/Άτλας προνοσοκομειακών/);
  assert.equal((await page.locator('#atlas-categories').textContent()).trim(),'32');
  assert.equal((await page.locator('#atlas-scenarios').textContent()).trim(),'360');
  assert.equal((await page.locator('#atlas-reviewed').textContent()).trim(),'0');
  assert.equal(await page.locator('.case').count(),40);
  await page.locator('#atlas-search').fill('τροχαίο');
  await page.waitForFunction(()=>document.querySelector('#atlas-report').textContent.includes('από'));
  assert.ok((await page.locator('.case').count())>=4);
  await page.locator('#atlas-search').fill('');
  await page.locator('#atlas-category').selectOption('PED');
  assert.match(await page.locator('#atlas-report').textContent(),/14 περιγράμματα|από 14/);
  await page.locator('#atlas-population').selectOption('child');
  assert.equal(await page.locator('.case').count(),14);
  await page.locator('#atlas-level').selectOption('foundation');
  assert.equal(await page.locator('.case').count(),3);
  await page.locator('.case').first().locator('summary').click();
  assert.match(await page.locator('.case').first().textContent(),/Κλινικές ενέργειες και δοσολογίες: ανενεργές/);
  await page.locator('#atlas-category').selectOption('all');
  await page.locator('#atlas-level').selectOption('all');
  await page.locator('#atlas-population').selectOption('all');
  assert.equal(await page.locator('.case').count(),40);
  await page.locator('#atlas-more').click();
  assert.equal(await page.locator('.case').count(),80);
  const atlasStorageAfter=await page.evaluate(()=>Object.fromEntries(
    Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).map(k=>[k,localStorage.getItem(k)])
  ));
  assert.deepEqual(atlasStorageAfter,atlasStorageBefore,'Scenario atlas cannot change student progress or storage');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ekab-eoppep-official-v15')),original);
  assert.deepEqual(actionableErrors,[],'No actionable browser JS errors');
  console.log('PASS: mobile '+(process.env.MENTOR_TEST_BROWSER||'chromium')+' EKAB+MCI+equipment flows, reload persistence, exported activity data, zero legacy mutations and scoped delete');
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
