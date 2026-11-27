/* Home widgets: glanceable, live tiles. Every number comes from data on this device or a public schedule;
   a tile with nothing to show says so instead of inventing a value. */
import { heraklionOnDuty } from './services/on-duty/heraklion.mjs';
import { weakestStudyArea } from './services/progress/study-pulse.mjs';
import { STORAGE_KEY, EXAM_TYPES, parseExams, daysUntil } from './services/study-plan/plan.mjs';
import { store, esc } from './shell.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// Counts up to a number once, so a changed value is noticed.
function countTo(el, value) {
  const from = Number(el.dataset.n || 0);
  el.dataset.n = value;
  if (reduced || from === value) { el.textContent = value; return; }
  const t0 = performance.now(), dur = 600;
  const step = t => { const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (value - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* Εφημερία: hospital on call, time left in the 08:00–08:00 shift as a draining bar. */
function duty() {
  const tile = $('[data-tile="duty"]'); if (!tile) return;
  const d = heraklionOnDuty(new Date());
  if (!d) {
    $('.w-big', tile).textContent = 'Άγνωστη';
    $('.w-sub', tile).textContent = 'Το πρόγραμμα δεν καλύπτει τη σημερινή ημέρα.';
    $('.w-bar i', tile).style.transform = 'scaleX(0)'; $('.w-call', tile).hidden = true; return;
  }
  // periodEnd is the next duty day as UTC midnight; the change happens at 08:00 Athens time.
  const now = new Date(), athens = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Athens' })) - new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const left = Math.max(0, d.periodEnd + 8 * 3600e3 - athens - now.getTime());
  const h = Math.floor(left / 3600e3), m = Math.floor(left % 3600e3 / 60e3);
  $('.w-big', tile).textContent = d.name;
  $('.w-sub', tile).textContent = left > 0 ? `Αλλάζει σε ${h} ώ ${m} λ · 08:00` : 'Αλλαγή εφημερίας τώρα';
  $('.w-bar i', tile).style.transform = `scaleX(${Math.min(left / 86400e3, 1)})`;
  const call = $('.w-call', tile); call.href = 'tel:' + d.phone; call.setAttribute('aria-label', 'Κλήση ' + d.name + ' ' + d.displayPhone); call.hidden = false;
}

/* Παλμός μελέτης: accuracy ring of the weakest area (needs 3 graded answers in one area). */
function pulse() {
  const tile = $('[data-tile="pulse"]'); if (!tile) return;
  const a = weakestStudyArea();
  const ring = $('.w-ring', tile);
  if (!a) {
    ring.style.setProperty('--p', 0); $('.w-ring b', tile).textContent = '—';
    $('.w-sub', tile).textContent = 'Απάντησε 3 ερωτήσεις σε μια ενότητα για να φανεί το αδύναμο σημείο.';
    tile.href = './practice.html'; return;
  }
  requestAnimationFrame(() => ring.style.setProperty('--p', a.accuracy));
  $('.w-ring b', tile).textContent = a.accuracy + '%';
  $('.w-sub', tile).textContent = `Πιο αδύναμο: ${a.label} · ${a.correct}/${a.attempts} σωστές`;
  tile.href = './' + a.href;
}

/* Συνέπεια μελέτης: consecutive days with a study page opened, and the last 7 days as bars. */
function streak() {
  const tile = $('[data-tile="streak"]'); if (!tile) return;
  let days = [];
  try { days = JSON.parse(store.get('ekab.study.days.v1') || '[]'); } catch (_) {}
  const set = new Set(Array.isArray(days) ? days : []);
  const today = new Date();
  let run = 0; const d = new Date(today);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not studied yet: the streak still counts up to yesterday
  while (set.has(dayKey(d))) { run++; d.setDate(d.getDate() - 1); }
  countTo($('.w-num', tile), run);
  $('.w-unit', tile).textContent = run === 1 ? 'ημέρα στη σειρά' : 'ημέρες στη σειρά';
  const names = ['Κ', 'Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ'];
  $('.w-week', tile).innerHTML = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(today); x.setDate(today.getDate() - 6 + i);
    const on = set.has(dayKey(x));
    return `<span class="${on ? 'on' : ''}${i === 6 ? ' today' : ''}" style="--i:${i}"><i></i>${names[x.getDay()]}</span>`;
  }).join('');
  $('.w-week', tile).setAttribute('aria-label', `Μελέτη τις τελευταίες 7 ημέρες: ${[...Array(7)].filter((_, i) => { const x = new Date(today); x.setDate(today.getDate() - 6 + i); return set.has(dayKey(x)); }).length} από 7`);
}

/* Ημερολόγιο: this month, today, study days and exam days; the next exam with a countdown. */
function calendar() {
  const tile = $('[data-tile="cal"]'); if (!tile) return;
  let exams = [];
  try { exams = parseExams(store.get(STORAGE_KEY) || '[]'); } catch (_) {}
  let days = [];
  try { days = JSON.parse(store.get('ekab.study.days.v1') || '[]'); } catch (_) {}
  const studied = new Set(Array.isArray(days) ? days : []);
  const examOn = new Map(exams.map(e => [e.date, EXAM_TYPES[e.type] || 'Εξέταση']));
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1), count = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
  $('.w-month', tile).textContent = now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  let cells = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'].map(n => `<b aria-hidden="true">${n}</b>`).join('');
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let day = 1; day <= count; day++) {
    const k = dayKey(new Date(y, m, day)), ex = examOn.get(k);
    const cls = [day === now.getDate() ? 'today' : '', studied.has(k) ? 'study' : '', ex ? 'exam' : ''].filter(Boolean).join(' ');
    cells += `<span class="${cls}"${ex ? ` title="${esc(ex)}"` : ''}>${day}</span>`;
  }
  $('.w-cal', tile).innerHTML = cells;
  const upcoming = exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
  const next = $('.w-next', tile);
  if (upcoming) {
    const left = daysUntil(upcoming.date);
    next.innerHTML = `<span class="w-dot exam"></span><span><b>${esc(EXAM_TYPES[upcoming.type] || 'Εξέταση')}</b> ${left === 0 ? 'σήμερα' : left === 1 ? 'αύριο' : `σε ${left} ημέρες`}</span>`;
  } else {
    next.innerHTML = '<span class="w-dot"></span><span>Καμία εξέταση. <a href="./study-plan.html">Πρόσθεσε ημερομηνία</a></span>';
  }
}

/* Βάρδια: people in the app now, by area (shift-presence.js fills its own list; the tile follows it). */
function shift() {
  const tile = $('[data-tile="shift"]'); if (!tile) return;
  const paint = () => {
    const places = document.querySelector('.ekab-shift-places');
    const chip = document.querySelector('.ekab-shift-chip');
    const rows = places && !chip?.hidden ? [...places.querySelectorAll('li')].map(li => [li.querySelector('span')?.textContent, li.querySelector('b')?.textContent]) : [];
    const total = rows.reduce((n, [, c]) => n + Number(c || 0), 0);
    if (!chip || chip.hidden || !total) {
      $('.w-num', tile).textContent = '—'; $('.w-unit', tile).textContent = 'σύνδεση με τη Βάρδια…';
      $('.w-list', tile).innerHTML = ''; return;
    }
    countTo($('.w-num', tile), total);
    $('.w-unit', tile).textContent = total === 1 ? 'άτομο σε βάρδια' : 'άτομα σε βάρδια';
    $('.w-list', tile).innerHTML = rows.slice(0, 3).map(([p, c]) => `<li><span>${esc(p)}</span><b>${esc(c)}</b></li>`).join('');
  };
  // shift-presence.js mounts after load and refreshes every 45 s; reading its list every few seconds is enough.
  let last = '';
  const check = () => { const key = (document.querySelector('.ekab-shift-places')?.textContent || '') + (document.querySelector('.ekab-shift-chip')?.hidden ?? true); if (key !== last) { last = key; paint(); } };
  paint(); setInterval(check, 3000);
}

function all() { duty(); pulse(); streak(); calendar(); }
all(); shift();
setInterval(duty, 30e3);
addEventListener('storage', all);
addEventListener('pageshow', all);
addEventListener('ekab:progress-changed', all);
