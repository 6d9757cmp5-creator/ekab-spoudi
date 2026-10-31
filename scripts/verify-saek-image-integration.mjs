/**
 * Static 247-chapter image-integration verification (Node 22, no dependencies).
 * Does NOT establish rendered browser visibility, medical approval or live publication.
 */
import { readFile, stat, writeFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const registry = JSON.parse(await read('saek-image-audit-2026.json'));
const sw = await read('sw.js');
const loader = await read('saek-visual-ui.js');
const imageUI = await read('saek-reviewed-image-ui.js');
const errors = [], warnings = [];
const hasDocumentedHumanReview = a =>
  a.clinicalReview === 'approved' &&
  typeof a.independentReviewer === 'string' && !!a.independentReviewer.trim() &&
  typeof a.independentReviewDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}/.test(a.independentReviewDate) &&
  typeof a.independentReviewEvidence?.documentUrl === 'string' &&
  /^https:\\/\\//.test(a.independentReviewEvidence.documentUrl) &&
  typeof a.independentReviewEvidence?.reviewerQualification === 'string' &&
  !!a.independentReviewEvidence.reviewerQualification.trim() &&
  !/(?:Claude|Anthropic|ChatGPT|OpenAI|GPT|LLM|\\bAI\\b)/i.test(a.independentReviewer);
const expected = { 'Α': 71, 'Β': 73, 'Γ': 51, 'Δ': 52 };
const bySemester = Object.fromEntries(Object.keys(expected).map(s => [s, { chapters: 0, selected: 0 }]));
const assets = registry.assets || {};
let chapters = 0, selected = 0, imagePlacements = 0;

if (!loader.includes('saek-reviewed-image-ui.js'))
  errors.push('The lesson visual loader does not include the sourced-image UI.');
if (!imageUI.includes("fetch('saek-image-audit-2026.json')"))
  errors.push('The sourced-image UI does not load the audit registry.');
if (!imageUI.includes('Η επιλογή εικόνας δεν σημαίνει πλήρη κάλυψη'))
  errors.push('The UI must disclose that selected imagery is not complete lesson coverage.');
if (!imageUI.includes('ανεξάρτητη επιστημονική έγκριση'))
  errors.push('The UI must disclose the absence of independent scientific approval.');
// Generic EMS background links must never be presented as scientific validation.
if (!imageUI.includes('όχι τεκμηρίωση σχήματος') || imageUI.includes("'Επιστημονική τεκμηρίωση'"))
  errors.push('The image UI must distinguish generic background links from scientific evidence.');
// Offline/lazy-load failures must allow a user-triggered retry without resetting study progress.
if (!imageUI.includes("image.addEventListener('load'") ||
    !imageUI.includes("image.addEventListener('error'") ||
    !imageUI.includes("image.removeAttribute('src')") ||
    !imageUI.includes('Επανάληψη φόρτωσης εικόνας'))
  errors.push('The sourced-image UI must recover from failed image loads without a page reload.');
// A missing/offline registry must not fail silently: users need a retry without a page reload.
if (!imageUI.includes('showRegistryFailure(err)') ||
    !imageUI.includes('saek-image-registry-error') ||
    !imageUI.includes('Επανάληψη φόρτωσης εικόνων') ||
    !imageUI.includes("document.getElementById('saek-image-registry-error')?.remove()"))
  errors.push('The registry fetch failure must be visible and recoverable without resetting progress.');
for (const path of ['saek-image-audit-2026.json', 'saek-visual-ui.js',
                    'saek-reviewed-image-ui.js', 'saek-visual-ui.css']) {
  if (!sw.includes('./' + path)) errors.push('Offline precache is missing ' + path);
}

for (const course of registry.courses || []) {
  const id = String(course.course).padStart(2, '0');
  const filename = 'saek-course-' + id + '.html';
  const html = await read(filename).catch(() => '');
  if (!html) { errors.push('Missing course page ' + filename); continue; }
  if (!/src="saek-visual-ui\.js(?:\?[^\"]*)?"/.test(html))
    errors.push(filename + ' does not load the sourced-image integration.');
  if (!/href="saek-visual-ui\.css(?:\?[^\"]*)?"/.test(html))
    errors.push(filename + ' does not load the image layout stylesheet.');
  if (!sw.includes('./' + filename))
    errors.push(filename + ' is absent from offline precache.');
  const matches = [...html.matchAll(/<details\b[^>]*\bclass="[^"]*\breader-fold\b[^"]*"[^>]*\bid="lesson-(\d+)"/g)];
  if (matches.length !== course.chapters.length)
    errors.push(filename + ' has ' + matches.length + ' lesson DOM nodes, registry has ' + course.chapters.length);
  for (let i = 0; i < course.chapters.length; i++) {
    const chapter = course.chapters[i], dom = matches[i], number = i + 1;
    const key = id + '-' + String(number).padStart(2, '0');
    chapters++;
    if (!bySemester[course.semester]) { errors.push('Invalid semester ' + course.semester); continue; }
    bySemester[course.semester].chapters++;
    if (chapter.anchor !== '#lesson-' + number)
      errors.push(key + ' has invalid registry anchor ' + chapter.anchor);
    if (!dom || Number(dom[1]) !== number) {
      errors.push(key + ' is not in the expected HTML chapter order.');
      continue;
    }
    const section = html.slice(dom.index, matches[i + 1]?.index ?? html.length);
    if (!/<div\s+class="body"/.test(section))
      errors.push(key + ' is missing the .body insertion target.');
    if (!/<p\s+class="reader-paragraph"/.test(section))
      errors.push(key + ' is missing the .reader-paragraph insertion target.');
    const keys = chapter.images || [];
    if (!Array.isArray(keys) || keys.length === 0) {
      errors.push(key + ' has no selected image (this is not full subject coverage).');
      continue;
    }
    selected++; bySemester[course.semester].selected++;
    imagePlacements += keys.length;
    if (JSON.stringify(registry.placements?.[key]) !== JSON.stringify(keys))
      errors.push(key + ' placement mapping differs from its course registry.');
    for (const assetKey of keys)
      if (!assets[assetKey]) errors.push(key + ' references missing asset ' + assetKey);
  }
}

for (const [semester, count] of Object.entries(expected))
  if (bySemester[semester].chapters !== count)
    errors.push('Semester ' + semester + ': expected ' + count + ', found ' + bySemester[semester].chapters);

let local = 0, external = 0, missingLocal = 0;
for (const [key, asset] of Object.entries(assets)) {
  if (!asset.localPath) { external++; continue; }
  local++;
  try { if (!(await stat(asset.localPath)).isFile()) throw Error('not a file'); }
  catch { missingLocal++; errors.push('Missing local image for ' + key + ': ' + asset.localPath); }
  if (!sw.includes('./' + asset.localPath))
    errors.push('Offline precache missing local image for ' + key + ': ' + asset.localPath);
  if (!/^[a-f0-9]{64}$/.test(asset.sha256 || ''))
    errors.push('Missing SHA-256 for ' + key);
  if (asset.clinicalReview === 'approved' && !hasDocumentedHumanReview(asset))
    errors.push('Approval claimed without qualified human review evidence for ' + key);
}
if (chapters !== 247) errors.push('Expected 247 chapters, found ' + chapters);
if (selected !== 247) errors.push('Expected selected imagery for 247 chapters, found ' + selected);
if (external) warnings.push(external + ' external Commons images are not guaranteed offline and can be rate-limited.');
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'static source wiring only',
  chapters, selected, imagePlacements, bySemester,
  assets: Object.keys(assets).length, local, external, missingLocal,
  independentlyScientificallyApproved: Object.values(assets).filter(hasDocumentedHumanReview).length,
  fullyCoveredVerified: 0,
  publicationVerified: false,
  browserZoomOfflineE2EVerified: false,
  warnings, errors
};
await writeFile('saek-image-integration-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
