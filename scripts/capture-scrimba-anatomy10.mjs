import fs from 'node:fs';
import vm from 'node:vm';
import { chromium } from 'playwright';

const out = 'qa-scrimba-anatomy-10';
fs.mkdirSync(out, { recursive: true });
const registry = { window: {} };
vm.runInNewContext(fs.readFileSync('saek-videos.js', 'utf8'), registry, { timeout: 2000 });
const unit = registry.window.EKAB_COURSE_VIDEO_SERIES?.['01']?.parts?.find(x => x.chapter === 10);
if (!unit?.url?.startsWith('https://scrimba.com/explain/')) throw new Error('Cannot ground video URL in course manifest');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const trace = { url: unit.url, checkpoints: [], errors: [], createdAt: new Date().toISOString() };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 790 }, locale: 'el-GR' });
  const page = await ctx.newPage();
  page.on('pageerror', error => trace.errors.push('browser exception: ' + String(error).slice(0, 500)));
  page.on('response', resp => { if (resp.status() >= 400 && resp.url().includes('scrimba')) trace.errors.push('HTTP ' + resp.status() + ' ' + resp.url().slice(0, 200)); });
  await page.goto(unit.url, { waitUntil: 'domcontentloaded', timeout: 65000 });
  await page.waitForTimeout(8500);
  trace.title = await page.title();
  trace.finalUrl = page.url();
  const text = await page.locator('body').innerText({ timeout: 15000 });
  fs.writeFileSync(out + '/transcript-or-page-text.txt', text.slice(0, 120000));
  trace.textLength = text.length;
  trace.transcriptShown = text.includes('Transcript') || text.includes('Απομαγνητοφώνηση');
  await page.screenshot({ path: out + '/00-windowed.jpg', type: 'jpeg', quality: 73 });
  const player = page.locator('video');
  trace.videoTagCount = await player.count();
  const fullscreen = unit.url + (unit.url.includes('?') ? '&' : '?') + 'fullscreen=1';
  await page.goto(fullscreen, { waitUntil: 'domcontentloaded', timeout: 65000 });
  await page.waitForTimeout(7500);
  await page.screenshot({ path: out + '/01-player-start.jpg', type: 'jpeg', quality: 73 });
  // Player controls documented by Scrimba: space = play/pause, right-arrow = +5 s.
  await page.keyboard.press('Space');
  await page.waitForTimeout(1800);
  for (let i = 1; i <= 8; i++) {
    const skips = i === 1 ? 10 : 12;
    for (let j = 0; j < skips; j++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1400);
    const name = out + '/' + String(i+1).padStart(2, '0') + '-player-'+String(50+(i-1)*60)+'sec.jpg';
    await page.screenshot({ path:name, type:'jpeg', quality:73 });
    trace.checkpoints.push({number:i, nominalSeconds:50+(i-1)*60, screenshot:name});
  }
  trace.fullscreenTitle = await page.title();
  trace.fullscreenText = (await page.locator('body').innerText()).slice(0, 3200);
  fs.writeFileSync(out + '/capture-report.json', JSON.stringify(trace, null, 2) + '\n');
  console.log('AUDIT CAPTURE', JSON.stringify({title:trace.title, textLength:trace.textLength, transcriptShown:trace.transcriptShown, frames:trace.checkpoints.length, errors:trace.errors.slice(0,10)}));
} catch (e) {
  trace.errors.push('capture failed: ' + String(e));
  fs.writeFileSync(out + '/capture-report.json', JSON.stringify(trace, null, 2) + '\n');
  console.error('AUDIT CAPTURE FAILURE:', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}