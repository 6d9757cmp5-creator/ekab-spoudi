/**
 * Auto-create unlisted, REVIEW-ONLY Scrimba Explain drafts from existing SAEK
 * theory. No Codex, LLM API key or API billing is required by this script.
 * Generated teaching images MUST be reviewed before becoming student material.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { load } from 'cheerio';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MAX = Math.max(1, Math.min(10, Number(process.env.MAX_NEW || 1)));
const ENDPOINT = 'https://scrimba.com/explain/pr/mcp';
const OUTPUT = 'saek-auto-video-drafts.json';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s, n) => clean(s).slice(0, n).trim();

function loadRegistry() {
  const scope = { window: {} };
  const js = fs.readFileSync('saek-videos.js', 'utf8');
  vm.runInNewContext(js, scope, { timeout: 2000, filename: 'saek-videos.js' });
  return scope.window.EKAB_COURSE_VIDEO_SERIES || {};
}

function loadDrafts() {
  if (!fs.existsSync(OUTPUT)) return { schema: 1, status: 'review_required', entries: [] };
  const doc = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
  if (!Array.isArray(doc.entries)) throw new Error('Invalid draft manifest');
  return doc;
}

function nextChapters(registry, drafts) {
  const known = new Set(drafts.entries.map(x => x.courseId + '-' + x.chapter));
  const done = new Set();
  for (const [id, course] of Object.entries(registry)) {
    for (const part of course.parts || []) done.add(id + '-' + part.chapter);
  }
  const rows = [];
  for (let i = 1; i <= 20; i++) {
    const id = String(i).padStart(2, '0');
    const file = 'saek-course-' + id + '.html';
    if (!fs.existsSync(file)) continue;
    const $ = load(fs.readFileSync(file, 'utf8'));
    const courseTitle = clean($('h2.reader-title').first().text()) || (registry[id] && registry[id].title) || ('ΣΑΕΚ ' + id);
    $('.fold.reader-fold[id^="lesson-"]').each((_, el) => {
      const ch = Number(String($(el).attr('id') || '').replace('lesson-', ''));
      const key = id + '-' + ch;
      if (!ch || known.has(key) || done.has(key)) return;
      const title = clean($(el).find('.chapter-heading').first().clone().children('small').remove().end().text());
      const introductory = clean($(el).find('p.reader-paragraph').first().text());
      const sos = clean($(el).find('p.lesson-sos').first().text()).replace(/^SOS\s*[·:-]?\s*/i, '');
      const details = $(el).find('details.lesson-more p').map((_, p) => clean($(p).text())).get().filter(x => x.length > 60);
      const question = clean($(el).find('.check-question').first().text());
      const answer = clean($(el).find('.check-answer').first().text());
      const material = [introductory, sos, ...details].filter(Boolean).join(' ');
      if (title && material.length >= 300) {
        rows.push({ courseId: id, chapter: ch, title, courseTitle, introductory, sos, details, question, answer });
      }
    });
  }
  return rows.slice(0, MAX);
}

function buildMarkup(ch) {
  const id = 'saek' + ch.courseId + 'c' + ch.chapter;
  const title = ch.title;
  const sections = [];
  const add = (body) => sections.push(body);
  const narrate = (heading, content, anchor) =>
    '<say lang="el-GR" title="' + esc(heading) + '" text="' +
    esc('[' + heading + '](#' + anchor + ') ' + content) + '"></say>';

  const intro = clip(ch.introductory, 1300);
  const sos = clip(ch.sos, 750);
  const main1 = clip(ch.details[0] || intro, 1250);
  const main2 = clip(ch.details[1] || sos, 1250);
  const overview = 'Το μάθημα αυτό ανήκει στη ΣΑΕΚ Διασώστη – Πλήρωμα Ασθενοφόρου. Ακολουθούμε την ήδη καταχωρισμένη γραπτή ύλη, χωρίς να εισάγουμε νέες κλινικές οδηγίες. ';
  add('<item anchor="' + id + 'intro" title="' + esc(title) + '" text="' +
      esc(ch.courseTitle + ' · Κεφάλαιο ' + ch.chapter + '\nΠρώτα η έννοια, έπειτα η εφαρμογή') + '"></item>');
  add(narrate('Τι θα μάθουμε', overview + intro, id + 'intro'));

  // Purposefully abstract and conservative visual: does not claim exact anatomy.
  add('<item type="image" anchor="' + id + 'picture" title="Οπτική εισαγωγή" prompt="' +
      esc('Professional calm Greek healthcare training infographic, 16:9 wide. Topic: ' +
      title + '. Use a clean educational composition on neutral background. ' +
      'Show a respectful generic paramedic training context, not patient treatment. ' +
      'Do not depict specific anatomy, devices or procedural steps unless accurate. ' +
      'No English labels or decorative watermark.') + '"></item>');
  add(narrate('Η βασική έννοια', intro, id + 'picture'));

  add('<item layout="cards" anchor="' + id + 'key" title="Τι κρατάμε" >' +
      '<item anchor="' + id + 'keya" title="Βασικό σημείο" text="' + esc(clip(sos || intro, 430)) + '"></item>' +
      '<item anchor="' + id + 'keyb" title="Σύνδεση με την πράξη" text="' +
      esc('Συγκρίνουμε τα ευρήματα με την εκπαίδευση και τα ισχύοντα πρωτόκολλα· δεν υποθέτουμε διάγνωση.') + '"></item>' +
      '</item>');
  add(narrate('Σημείο SOS', sos || intro, id + 'key'));

  add('<item anchor="' + id + 'details" title="Περισσότερη εξήγηση" text="' +
      esc(clip(main1, 700)) + '"></item>');
  add(narrate('Πώς και γιατί', main1, id + 'details'));

  if (main2 && main2 !== main1) {
    add('<item anchor="' + id + 'depth" title="Σύνδεση της γνώσης" text="' +
        esc(clip(main2, 700)) + '"></item>');
    add(narrate('Σε βάθος', main2, id + 'depth'));
  }
  if (ch.question && ch.answer) {
    add('<item layout="cards" anchor="' + id + 'quiz" title="Αυτοέλεγχος">' +
        '<item anchor="' + id + 'q" title="Ερώτηση" text="' + esc(clip(ch.question, 700)) + '"></item>' +
        '<item anchor="' + id + 'a" title="Ενδεικτική απάντηση" text="' + esc(clip(ch.answer, 700)) + '"></item>' +
        '</item>');
    add(narrate('Αυτοέλεγχος', ch.question + ' Η ενδεικτική απάντηση είναι: ' + ch.answer, id + 'quiz'));
  }
  return sections.join('\n');
}

function unwrap(res) {
  if (res.isError) throw new Error(JSON.stringify(res.content || res));
  if (res.structuredContent && typeof res.structuredContent === 'object') {
    const obj = res.structuredContent;
    return obj.result && typeof obj.result === 'object' ? obj.result : obj;
  }
  for (const block of res.content || []) {
    if (block.type !== 'text') continue;
    try {
      const obj = JSON.parse(block.text);
      return obj.result && typeof obj.result === 'object' ? obj.result : obj;
    } catch { /* continue */ }
  }
  throw new Error('Scrimba MCP returned no structured result');
}

async function call(client, name, args) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return unwrap(await client.callTool({ name, arguments: args }));
    } catch (e) {
      const msg = String(e);
      const retryable = /429|Too Many|rate limit|timeout|503|502|504/i.test(msg);
      if (!retryable || attempt === 3) throw e;
      await delay(Math.min(150000, 30000 * (attempt + 1)));
    }
  }
  throw new Error('Unexpected retry exit');
}

async function main() {
  const registry = loadRegistry();
  const drafts = loadDrafts();
  const todo = nextChapters(registry, drafts);
  console.log('Next SAEK chapters:', todo.map(x => x.courseId + '-' + x.chapter));
  if (!todo.length) return;
  const client = new Client({ name: 'ekab-spoudi-saek-draft-builder', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));
    const listed = await client.listTools();
    for (const name of ['start_explainer_stream', 'append_explainer_chunk', 'finish_explainer_stream']) {
      if (!(listed.tools || []).some(x => x.name === name)) throw new Error('Missing MCP tool: ' + name);
    }
    for (const lesson of todo) {
      console.log('Generating draft for', lesson.courseId, lesson.chapter, lesson.title);
      let started;
      try {
        started = await call(client, 'start_explainer_stream', {
          title: lesson.courseTitle + ' ' + lesson.chapter + ' — ' + lesson.title,
          description: 'Προσχέδιο ελληνικής εκπαιδευτικής αφήγησης αποκλειστικά από τη γραπτή θεωρία ΣΑΕΚ.',
          mode: 'landscape'
        });
        if (!started.stream_token || !started.guide) throw new Error('Missing stream credentials');
        if (!String(started.explainer_contract || '').includes('END OF EXPLAINER CONTRACT')) {
          throw new Error('Incomplete explainer contract');
        }
        const appended = await call(client, 'append_explainer_chunk', {
          stream_token: started.stream_token,
          markup: buildMarkup(lesson)
        });
        const finished = await call(client, 'finish_explainer_stream', {
          stream_token: started.stream_token, guide: started.guide
        });
        const url = finished.url || appended.url;
        if (!url || !/^https:\/\/scrimba\.com\/explain\//.test(url)) throw new Error('No valid explainer URL');
        if ((finished.says || appended.says || 0) < 4) throw new Error('Unexpectedly short narration');
        drafts.entries.push({
          courseId: lesson.courseId,
          chapter: lesson.chapter,
          courseTitle: lesson.courseTitle,
          title: lesson.title,
          url, state: 'requires_visual_and_medical_review',
          narrationMs: appended.narration_ms || null,
          createdAt: new Date().toISOString(),
          source: 'saek-course-' + lesson.courseId + '.html'
        });
        fs.writeFileSync(OUTPUT, JSON.stringify(drafts, null, 2) + '\n');
        console.log('DRAFT CREATED', lesson.courseId + '-' + lesson.chapter, url);
      } catch (error) {
        console.error('Stopping after video generation error:', String(error));
        // Preserve successful videos, never publish a broken or unreviewed draft.
        if (drafts.entries.length) fs.writeFileSync(OUTPUT, JSON.stringify(drafts, null, 2) + '\n');
        throw error;
      }
      await delay(7000);
    }
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
