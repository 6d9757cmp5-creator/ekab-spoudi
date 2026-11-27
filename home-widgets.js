/* Home: live bar (own GPS, hospital on call) and the study widgets the learner picks and orders.
   Every number comes from data on this device, the app's own files or a public schedule; a widget with
   nothing to show says so instead of inventing a value. */
import { heraklionOnDuty } from './services/on-duty/heraklion.mjs';
import { weakestStudyArea } from './services/progress/study-pulse.mjs';
import { STORAGE_KEY, EXAM_TYPES, SAEK_COURSES, parseExams, daysUntil, examItems, buildPlan } from './services/study-plan/plan.mjs';
import { store, esc } from './shell.js?v=11';
import { TOOLS } from './home-tools.js?v=2';

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const json = (k, f) => { try { const v = JSON.parse(store.get(k) || 'null'); return v ?? f; } catch (_) { return f; } };
// Same item for everyone on a given day, different every day.
const daily = n => { const d = new Date(); return (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % n; };
const files = {};
const load = f => files[f] ||= fetch(f).then(r => r.ok ? r.json() : null).catch(() => null);

function countTo(el, value) {
  const from = Number(el.dataset.n || 0);
  el.dataset.n = value;
  if (reduced || from === value) { el.textContent = value; return; }
  const t0 = performance.now(), dur = 600;
  const step = t => { const k = Math.min((t - t0) / dur, 1); el.textContent = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const studyDays = () => { const d = json('ekab.study.days.v1', []); return new Set(Array.isArray(d) ? d : []); };
const exams = () => { try { return parseExams(store.get(STORAGE_KEY) || '[]'); } catch (_) { return []; } };
const nextExam = () => exams().filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
const isRead = (c, n) => store.get(`ekab.saek.read.v1.${c}.${n}`) === '1';

const I = {
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  ring: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
  pill: '<path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7zM7 10l7 7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M9 2h6M19 5l1.5-1.5"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 3.1a2 2 0 0 1-.6 1.8L8.5 11a16 16 0 0 0 4.4 4.4l1.6-1.5a2 2 0 0 1 1.7-.6l3.1.5a2 2 0 0 1 1.7 2z"/>'
};
const head = (icon, title, extra = '') => `<h3 class="w-head">${svg(I[icon])}<span>${title}</span>${extra}</h3>`;

/* ---------- Widgets. size: s = one cell, m = two cells wide, l = two by two. ---------- */
const W = {
  streak: { icon: I.flame, group: 'study', title: 'Συνέπεια μελέτης', desc: 'Συνεχόμενες ημέρες μελέτης και οι τελευταίες 7 ημέρες.', size: 's', base: true,
    html: () => head('flame', 'Συνέπεια μελέτης') + '<p><span class="w-num">0</span></p><p class="w-unit">ημέρες στη σειρά</p><div class="w-week" role="img"></div>',
    paint(el) {
      const set = studyDays(), today = new Date();
      let run = 0; const d = new Date(today);
      if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not studied yet: count up to yesterday
      while (set.has(dayKey(d))) { run++; d.setDate(d.getDate() - 1); }
      countTo($('.w-num', el), run);
      $('.w-unit', el).textContent = run === 1 ? 'ημέρα στη σειρά' : 'ημέρες στη σειρά';
      const names = ['Κ', 'Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ']; let on7 = 0;
      $('.w-week', el).innerHTML = Array.from({ length: 7 }, (_, i) => {
        const x = new Date(today); x.setDate(today.getDate() - 6 + i); const on = set.has(dayKey(x)); if (on) on7++;
        return `<span class="${on ? 'on' : ''}${i === 6 ? ' today' : ''}" style="--i:${i}"><i></i>${names[x.getDay()]}</span>`;
      }).join('');
      $('.w-week', el).setAttribute('aria-label', `Μελέτη ${on7} από τις τελευταίες 7 ημέρες`);
    } },

  pulse: { icon: I.pulse, group: 'study', title: 'Παλμός μελέτης', desc: 'Το πιο αδύναμο σημείο σου από τις απαντήσεις που έχεις δώσει.', size: 's', base: true, link: './practice.html',
    html: () => head('pulse', 'Παλμός μελέτης') + '<span class="w-ring" role="img"><b>—</b></span><p class="w-sub"></p>',
    paint(el) {
      const a = weakestStudyArea(), ring = $('.w-ring', el);
      if (!a) { ring.style.setProperty('--p', 0); $('b', ring).textContent = '—'; ring.setAttribute('aria-label', 'Χωρίς δεδομένα'); $('.w-sub', el).textContent = 'Απάντησε 3 ερωτήσεις σε μια ενότητα για να φανεί.'; el.href = './practice.html'; return; }
      requestAnimationFrame(() => ring.style.setProperty('--p', a.accuracy));
      $('b', ring).textContent = a.accuracy + '%'; ring.setAttribute('aria-label', `${a.accuracy}% σωστές στο πιο αδύναμο σημείο`);
      $('.w-sub', el).textContent = `${a.label} · ${a.correct}/${a.attempts} σωστές`; el.href = './' + a.href;
    } },

  cal: { icon: I.cal, group: 'study', title: 'Ημερολόγιο', desc: 'Ο μήνας με τις ημέρες μελέτης και τις εξετάσεις σου.', size: 'l', base: true,
    html: () => head('cal', '<span class="w-month"></span>', '<a class="w-edit" href="./study-plan.html">Πρόγραμμα</a>') + '<div class="w-cal"></div><p class="w-next"></p>',
    paint(el) {
      const studied = studyDays(), list = exams(), examOn = new Map(list.map(e => [e.date, EXAM_TYPES[e.type] || 'Εξέταση']));
      const now = new Date(), y = now.getFullYear(), m = now.getMonth(), count = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() + 6) % 7;
      $('.w-month', el).textContent = now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      let cells = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'].map(n => `<b aria-hidden="true">${n}</b>`).join('');
      for (let i = 0; i < lead; i++) cells += '<span></span>';
      for (let day = 1; day <= count; day++) {
        const k = dayKey(new Date(y, m, day)), ex = examOn.get(k);
        cells += `<span class="${[day === now.getDate() ? 'today' : '', studied.has(k) ? 'study' : '', ex ? 'exam' : ''].filter(Boolean).join(' ')}"${ex ? ` title="${esc(ex)}"` : ''}>${day}</span>`;
      }
      $('.w-cal', el).innerHTML = cells;
      const up = nextExam(), next = $('.w-next', el);
      if (up) { const left = daysUntil(up.date); next.innerHTML = `<span class="w-dot exam"></span><span><b>${esc(EXAM_TYPES[up.type] || 'Εξέταση')}</b> ${left === 0 ? 'σήμερα' : left === 1 ? 'αύριο' : `σε ${left} ημέρες`}</span>`; }
      else next.innerHTML = '<span class="w-dot"></span><span>Καμία εξέταση. <a href="./study-plan.html">Πρόσθεσε ημερομηνία</a></span>';
    } },

  progress: { icon: I.ring, group: 'study', title: 'Πρόοδος ΣΑΕΚ', desc: 'Διαβασμένα κεφάλαια ανά εξάμηνο.', size: 'm', link: './saek.html',
    html: () => head('ring', 'Πρόοδος ΣΑΕΚ') + '<div class="w-prog"><span class="w-ring" role="img"><b>0%</b></span><div class="w-sems"></div></div>',
    paint(el) {
      let all = 0, done = 0; const sem = {};
      for (const c of SAEK_COURSES) { for (let i = 1; i <= c.chapters; i++) { const r = isRead(c.id, i); all++; if (r) done++; (sem[c.semester] ||= [0, 0])[1]++; if (r) sem[c.semester][0]++; } }
      const pct = Math.round(done / all * 100), ring = $('.w-ring', el);
      requestAnimationFrame(() => ring.style.setProperty('--p', pct)); $('b', ring).textContent = pct + '%';
      ring.setAttribute('aria-label', `${done} από ${all} κεφάλαια`);
      $('.w-sems', el).innerHTML = Object.entries(sem).map(([s, [d, t]]) => `<div class="w-sem"><span>${s}΄</span><i><b style="--w:${d / t}"></b></i><small>${d}/${t}</small></div>`).join('');
    } },

  today: { icon: I.list, group: 'study', title: 'Σημερινό πλάνο', desc: 'Τι μελετάς και τι επαναλαμβάνεις σήμερα, από το πρόγραμμα εξετάσεων.', size: 'm',
    html: () => head('list', 'Σημερινό πλάνο', '<a class="w-edit" href="./study-plan.html">Όλο το πρόγραμμα</a>') + '<p class="w-sub w-today-sum"></p><ul class="w-items"></ul>',
    async paint(el) {
      const up = exams().filter(e => daysUntil(e.date) >= 1).sort((a, b) => a.date.localeCompare(b.date))[0];
      const sum = $('.w-today-sum', el), ul = $('.w-items', el);
      if (!up) { sum.textContent = 'Βάλε ημερομηνία εξέτασης και το πλάνο της ημέρας εμφανίζεται εδώ.'; ul.innerHTML = ''; return; }
      let bank = [];
      if (up.type === 'eoppep-theory') { const d = await load('./official_questions.json'); bank = Array.isArray(d) ? d : d?.questions || []; }
      const items = examItems(up, bank);
      let done;
      if (up.type === 'saek') done = new Set(items.filter(x => { const [c, n] = x.id.split(':'); return isRead(c, n); }).map(x => x.id));
      else if (up.type === 'eoppep-theory') { const st = json('ekab-eoppep-official-v15', {}); done = new Set(bank.filter(q => typeof st?.[q.id]?.readCompletedAt === 'string').map(q => q.id)); }
      else { const st = json('ekab.study.practical.v1', {}); done = new Set(items.filter(x => st?.[x.id]).map(x => x.id)); }
      const day = buildPlan({ items, done, daysLeft: daysUntil(up.date) }).days[0] || { add: [], review: [] };
      sum.innerHTML = `<b>${day.add.length}</b> νέα · <b>${day.review.length}</b> για επανάληψη · ${esc(EXAM_TYPES[up.type])}`;
      ul.innerHTML = [...day.add.map(x => [x, 'Νέο']), ...day.review.map(x => [x, 'Επανάληψη'])].slice(0, 4)
        .map(([x, k]) => `<li><a href="./${esc(x.href)}">${esc(x.title)}</a><small>${k}</small></li>`).join('') || '<li><small>Τίποτα για σήμερα.</small></li>';
    } },

  gcs: { icon: I.brain, group: 'tools', title: 'Κλίμακα Γλασκώβης', desc: 'Υπολογισμός GCS: μάτια, λεκτική και κινητική απάντηση.', size: 'm',
    html: () => head('brain', 'Κλίμακα Γλασκώβης', '<span class="w-gcs-total">GCS <b>15</b></span>') + `<div class="w-gcs">
      <label>Μάτια<select data-g="e"><option value="4">4 · Αυθόρμητα</option><option value="3">3 · Στη φωνή</option><option value="2">2 · Στον πόνο</option><option value="1">1 · Καθόλου</option></select></label>
      <label>Λεκτική<select data-g="v"><option value="5">5 · Προσανατολισμένος</option><option value="4">4 · Συγχυτικός</option><option value="3">3 · Ακατάλληλες λέξεις</option><option value="2">2 · Ακατάληπτοι ήχοι</option><option value="1">1 · Καμία</option></select></label>
      <label>Κινητική<select data-g="m"><option value="6">6 · Εκτελεί εντολές</option><option value="5">5 · Εντοπίζει τον πόνο</option><option value="4">4 · Αποσύρει στον πόνο</option><option value="3">3 · Κάμψη (αποφλοίωση)</option><option value="2">2 · Έκταση (απεγκεφαλισμός)</option><option value="1">1 · Καμία</option></select></label></div><p class="w-sub w-gcs-note"></p>`,
    paint(el) {
      const calc = () => {
        const v = k => Number($(`[data-g="${k}"]`, el).value), e = v('e'), vb = v('v'), m = v('m'), t = e + vb + m;
        $('.w-gcs-total b', el).textContent = t;
        $('.w-gcs-note', el).textContent = `E${e} V${vb} M${m} · ${t <= 8 ? 'Βαριά (≤8): προστασία αεραγωγού' : t <= 12 ? 'Μέτρια (9–12)' : 'Ήπια (13–15)'}`;
      };
      if (!el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('change', calc); }
      calc();
    } },

  phones: { icon: I.phone, group: 'tools', title: 'Τηλέφωνα', desc: 'Οι αριθμοί που χρειάζεσαι γρήγορα: 166, 112, νοσοκομεία Ηρακλείου.', size: 'm', link: null,
    html: () => head('phone', 'Τηλέφωνα', '<a class="w-edit" href="./contacts.html">Όλα</a>') + '<ul class="w-phones">' + [
      ['166', 'ΕΚΑΒ', '166'], ['112', 'Έκτακτη ανάγκη', '112'], ['+302813402111', 'ΠΑΓΝΗ', '2813 402111'],
      ['+302813408000', 'Βενιζέλειο', '2813 408000'], ['+302810377210', 'ΕΚΑΒ Ηρακλείου (γραφεία)', '2810 377210']
    ].map(([t, n, d]) => `<li><a href="tel:${t}"><span>${n}</span><b>${d}</b></a></li>`).join('') + '</ul>',
    paint() {} }
};
Object.assign(W, TOOLS);
const DEFAULT = ['streak', 'pulse', 'cal'];
const KEY = 'ekab.home.widgets.v1';
const order = () => { const v = json(KEY, null); return Array.isArray(v) ? v.filter(id => W[id]) : DEFAULT.slice(); };
const save = list => store.set(KEY, JSON.stringify(list));

/* ---------- Grid ---------- */
function build() {
  const grid = $('.b-tiles'); if (!grid) return;
  const list = order();
  grid.innerHTML = list.map(id => { const w = W[id]; const tag = w.link ? 'a' : 'article'; return `<${tag} class="w w-${w.size} wid-${id}" data-w="${id}"${w.link ? ` href="${w.link}"` : ''}>${w.html()}</${tag}>`; }).join('')
    || '<p class="w-empty">Δεν έχεις widget. Πάτα «Επεξεργασία» για να προσθέσεις.</p>';
  paintAll();
}
function paintAll() { for (const el of document.querySelectorAll('.b-tiles [data-w]')) { try { W[el.dataset.w].paint(el); } catch (_) {} } }

/* ---------- Edit sheet: add, remove, reorder ---------- */
function editor() {
  const btn = $('[data-widgets-edit]'), dlg = $('#widgets-sheet'); if (!btn || !dlg) return;
  const paint = () => {
    const list = order(), off = Object.keys(W).filter(id => !list.includes(id));
    $('.ws-on', dlg).innerHTML = list.map((id, i) => `<li><span class="ws-ic">${svg(W[id].icon)}</span><span class="ws-t"><b>${W[id].title}</b></span>
      <button type="button" class="ws-b" data-up="${id}" aria-label="Πιο πάνω: ${W[id].title}" ${i === 0 ? 'disabled' : ''}>${svg('<path d="m6 15 6-6 6 6"/>')}</button>
      <button type="button" class="ws-b" data-down="${id}" aria-label="Πιο κάτω: ${W[id].title}" ${i === list.length - 1 ? 'disabled' : ''}>${svg('<path d="m6 9 6 6 6-6"/>')}</button>
      <button type="button" class="ws-b ws-rm" data-rm="${id}" aria-label="Αφαίρεση: ${W[id].title}">${svg('<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>')}</button></li>`).join('') || '<li class="ws-none">Κανένα widget στην αρχική.</li>';
    const row = id => `<li><span class="ws-ic">${svg(W[id].icon)}</span><span class="ws-t"><b>${W[id].title}</b><small>${W[id].desc}</small></span>
      <button type="button" class="ws-b ws-add" data-add="${id}" aria-label="Προσθήκη: ${W[id].title}">${svg('<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>')}</button></li>`;
    const part = (g, name) => { const ids = off.filter(id => W[id].group === g); return ids.length ? `<li class="ws-group">${name}</li>` + ids.map(row).join('') : ''; };
    $('.ws-off', dlg).innerHTML = part('study', 'Μελέτη') + part('tools', 'Εργαλεία βάρδιας') || '<li class="ws-none">Όλα τα widget είναι ήδη στην αρχική.</li>';
  };
  dlg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const list = order(), d = b.dataset;
    if (d.add) list.push(d.add);
    else if (d.rm) list.splice(list.indexOf(d.rm), 1);
    else if (d.up || d.down) { const id = d.up || d.down, i = list.indexOf(id), j = i + (d.up ? -1 : 1); if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]; }
    else if (d.reset !== undefined) list.splice(0, list.length, ...DEFAULT);
    else if (d.close !== undefined) { dlg.close(); return; }
    else return;
    save(list); paint(); build();
    // Keep focus on a sensible control after the list is redrawn.
    const again = dlg.querySelector(`[data-${Object.keys(d)[0]}="${Object.values(d)[0]}"]`) || dlg.querySelector('[data-close]'); again?.focus();
  });
  btn.addEventListener('click', () => { paint(); dlg.showModal(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
}

/* ---------- Live bar: own position (refresh button) and hospital on call ---------- */
let toastTimer = null;
function toast(text) {
  const t = $('.b-toast'); if (!t) return;
  t.textContent = text; t.hidden = false; t.classList.remove('out'); void t.offsetWidth; t.classList.add('in');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.replace('in', 'out'); setTimeout(() => { t.hidden = true; }, 300); }, 4000);
}
function gps() {
  const bar = $('.lb-gps'); if (!bar) return;
  const place = $('[data-gps-place]', bar), coords = $('[data-gps-coords]', bar), map = $('[data-gps-map]', bar), copy = $('[data-gps-copy]', bar), refresh = $('[data-gps-refresh]', bar);
  let last = null;
  const locate = () => {
    if (!navigator.geolocation) { coords.textContent = 'Ο browser δεν δίνει θέση.'; refresh.hidden = true; return; }
    refresh.classList.add('spin'); refresh.disabled = true; coords.textContent = 'Αναζήτηση θέσης…';
    navigator.geolocation.getCurrentPosition(p => {
      refresh.classList.remove('spin'); refresh.disabled = false;
      const { latitude: lat, longitude: lon, accuracy } = p.coords;
      last = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      coords.textContent = `${last} · ±${Math.round(accuracy)} μ`;
      map.href = `https://www.google.com/maps?q=${lat.toFixed(5)},${lon.toFixed(5)}`; map.hidden = false; copy.hidden = false;
      // The shift counter gets the position rounded to about 10 km and names the nearest town.
      try { sessionStorage.setItem('ekab.shift.geo', JSON.stringify({ lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 })); } catch (_) {}
      dispatchEvent(new Event('ekab:geo'));
    }, e => {
      refresh.classList.remove('spin'); refresh.disabled = false;
      coords.textContent = e.code === 1 ? 'Η θέση δεν επιτράπηκε. Άλλαξέ το από τις ρυθμίσεις του browser.' : 'Δεν βρέθηκε σήμα. Πάτα ανανέωση.';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };
  refresh.addEventListener('click', locate);
  copy.addEventListener('click', async () => {
    if (!last) return;
    try { await navigator.clipboard.writeText(last); toast('Οι συντεταγμένες αντιγράφηκαν'); } catch (_) { toast('Η αντιγραφή δεν επιτρέπεται εδώ'); }
  });
  addEventListener('ekab:shift', e => { const me = e.detail?.me; if (me?.gps) place.textContent = me.place; });
  locate();
}
function duty() {
  const bar = $('.lb-duty'); if (!bar) return;
  const d = heraklionOnDuty(new Date()), name = $('[data-duty-name]', bar), when = $('[data-duty-left]', bar), call = $('[data-duty-call]', bar);
  if (!d) { name.textContent = 'Άγνωστη'; when.textContent = 'εκτός προγράμματος'; call.hidden = true; return; }
  // periodEnd is the next duty day as UTC midnight; the change happens at 08:00 Athens time.
  const now = new Date(), athens = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Athens' })) - new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const left = Math.max(0, d.periodEnd + 8 * 3600e3 - athens - now.getTime());
  name.textContent = d.name;
  when.textContent = left > 0 ? `έως 08:00 · ${Math.floor(left / 3600e3)}ώ ${Math.floor(left % 3600e3 / 60e3)}λ` : 'αλλάζει τώρα';
  call.href = 'tel:' + d.phone; call.setAttribute('aria-label', `Κλήση ${d.name} ${d.displayPhone}`); call.hidden = false;
}

build(); editor(); gps(); duty();
setInterval(duty, 30e3);
const refreshAll = () => paintAll();
addEventListener('storage', refreshAll);
addEventListener('pageshow', refreshAll);
addEventListener('ekab:progress-changed', refreshAll);
