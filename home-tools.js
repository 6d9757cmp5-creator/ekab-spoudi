/* Interactive home widgets: practice (ERC quiz, review cards) and tools used on a shift.
   Formulas are the standard ones taught in the course; each widget says it is a learning aid. */
import { store, esc } from './shell.js?v=8';

const $ = (s, r = document) => r.querySelector(s);
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const json = (k, f) => { try { const v = JSON.parse(store.get(k) || 'null'); return v ?? f; } catch (_) { return f; } };
const files = {};
const load = f => files[f] ||= fetch(f).then(r => r.ok ? r.json() : null).catch(() => null);
const isRead = (c, n) => store.get(`ekab.saek.read.v1.${c}.${n}`) === '1';
const once = (el, fn) => { if (el.dataset.bound) return; el.dataset.bound = '1'; fn(); };
const head = (icon, title, extra = '') => `<h3 class="w-head">${svg(icon)}<span>${title}</span>${extra}</h3>`;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ICON = {
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  cpr: '<path d="M12 21s-7-4.4-9.3-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
  events: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  tap: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  burns: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  drip: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  apgar: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/>',
  shock: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  lexicon: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16M9 8h7M9 12h5"/>'
};

export const TOOLS = {
  /* ---- Practice ---- */
  quiz: { title: 'Γρήγορο κουίζ', group: 'study', size: 'm', icon: ICON.quiz,
    desc: 'Ερωτήσεις πολλαπλής επιλογής (ERC 2025 κ.ά.) με εξήγηση και πηγή.',
    html: () => head(ICON.quiz, 'Γρήγορο κουίζ', '<span class="w-tag w-quiz-score"></span>') + '<p class="w-q"></p><div class="w-opts" role="group"></div><p class="w-expl" hidden></p><div class="w-actions"><button class="b-btn ghost" type="button" data-next hidden>Επόμενη</button></div>',
    async paint(el) {
      const all = (await load('./supplementary_exercises.json') || []).filter(x => Array.isArray(x.options) && Number.isInteger(x.answer));
      if (!all.length) { $('.w-q', el).textContent = 'Οι ερωτήσεις δεν φορτώθηκαν.'; return; }
      const score = json('ekab.home.quiz.v1', { right: 0, total: 0 });
      const paintScore = () => { $('.w-quiz-score', el).textContent = score.total ? `${score.right}/${score.total}` : 'Νέο'; };
      const ask = () => {
        const q = all[Math.floor(Math.random() * all.length)];
        $('.w-q', el).textContent = q.question;
        const opts = $('.w-opts', el), expl = $('.w-expl', el), next = $('[data-next]', el);
        expl.hidden = true; next.hidden = true;
        opts.innerHTML = q.options.map((o, i) => `<button type="button" class="w-opt" data-i="${i}">${esc(o)}</button>`).join('');
        opts.onclick = e => {
          const b = e.target.closest('.w-opt'); if (!b || opts.dataset.done) return;
          opts.dataset.done = '1';
          const ok = Number(b.dataset.i) === q.answer;
          score.total++; if (ok) score.right++; store.set('ekab.home.quiz.v1', JSON.stringify(score)); paintScore();
          opts.querySelectorAll('.w-opt').forEach(x => { x.disabled = true; if (Number(x.dataset.i) === q.answer) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          expl.innerHTML = `<b>${ok ? 'Σωστό.' : 'Λάθος.'}</b> ${esc(q.explanation || '')}${q.source ? ` <a href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">Πηγή</a>` : ''}`;
          expl.hidden = false; next.hidden = false; next.focus();
        };
        delete opts.dataset.done;
      };
      once(el, () => $('[data-next]', el).addEventListener('click', ask));
      paintScore(); ask();
    } },

  cards: { title: 'Κάρτες επανάληψης', group: 'study', size: 'm', icon: ICON.cards,
    desc: 'Ερωτήσεις από τα κεφάλαια ΣΑΕΚ που έχεις διαβάσει. Απαντάς από μνήμης και μετά βλέπεις.',
    html: () => head(ICON.cards, 'Κάρτες επανάληψης', '<span class="w-tag w-card-src"></span>') + '<div class="w-card" aria-live="polite"><p class="w-q"></p><p class="w-card-a" hidden></p></div><div class="w-actions"><button class="b-btn" type="button" data-flip>Δες την απάντηση</button><button class="b-btn ghost" type="button" data-know hidden>Το ήξερα</button><button class="b-btn ghost" type="button" data-again hidden>Ξανά</button></div>',
    async paint(el) {
      const bank = (await load('./saek-exams-bank.json'))?.items || [];
      if (!bank.length) { $('.w-q', el).textContent = 'Οι κάρτες δεν φορτώθηκαν.'; return; }
      const read = bank.filter(x => isRead(x.courseId, x.chapter));
      const pool = read.length ? read : bank;
      $('.w-card-src', el).textContent = read.length ? `${read.length} από διαβασμένα` : 'Όλη η ύλη';
      // Cards answered "again" come back first, then the rest in random order.
      let again = json('ekab.home.cards.v1', []); if (!Array.isArray(again)) again = [];
      let deck = [...pool.filter(x => again.includes(x.id)), ...shuffle(pool.filter(x => !again.includes(x.id)))], i = 0;
      const show = () => {
        const c = deck[i % deck.length];
        $('.w-q', el).textContent = c.question; $('.w-card-a', el).textContent = c.answer; $('.w-card-a', el).hidden = true;
        $('[data-flip]', el).hidden = false; $('[data-know]', el).hidden = true; $('[data-again]', el).hidden = true;
        el.dataset.card = c.id;
      };
      once(el, () => {
        $('[data-flip]', el).addEventListener('click', () => { $('.w-card-a', el).hidden = false; $('[data-flip]', el).hidden = true; $('[data-know]', el).hidden = false; $('[data-again]', el).hidden = false; $('[data-know]', el).focus(); });
        const mark = keep => { const id = el.dataset.card; again = again.filter(x => x !== id); if (keep) again.push(id); store.set('ekab.home.cards.v1', JSON.stringify(again.slice(-200))); i++; show(); };
        $('[data-know]', el).addEventListener('click', () => mark(false));
        $('[data-again]', el).addEventListener('click', () => mark(true));
      });
      show();
    } },

  /* ---- Shift tools ---- */
  cpr: { title: 'Μετρονόμος ΚΑΡΠΑ', group: 'tools', size: 'm', icon: ICON.cpr,
    desc: 'Ήχος και φως στον ρυθμό 100–120/λεπτό, μέτρηση συμπιέσεων 30:2 και κύκλων 2 λεπτών.',
    html: () => head(ICON.cpr, 'Μετρονόμος ΚΑΡΠΑ', '<span class="w-tag w-cpr-cycle">Κύκλος 0</span>') + `<div class="w-cpr"><span class="w-beat" aria-hidden="true"></span><div><p><span class="w-num w-cpr-count">0</span><span class="w-unit"> / 30</span></p><p class="w-sub w-cpr-time">2:00 μέχρι έλεγχο ρυθμού</p></div></div>
      <div class="w-actions"><button class="b-btn" type="button" data-cpr-go>Έναρξη</button><div class="w-seg" role="group" aria-label="Ρυθμός">${[100, 110, 120].map(r => `<button type="button" data-rate="${r}" aria-pressed="${r === 110}">${r}</button>`).join('')}</div></div>`,
    paint(el) {
      once(el, () => {
        let rate = 110, timer = null, n = 0, started = 0, cycle = 0, ctx = null;
        const beep = hi => { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hi ? 1000 : 700; g.gain.setValueAtTime(.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .08); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .09); } catch (_) {} };
        const tick = () => {
          n = n % 30 + 1; $('.w-cpr-count', el).textContent = n; beep(n === 30);
          const b = $('.w-beat', el); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
          const left = Math.max(0, 120 - Math.floor((Date.now() - started) / 1000));
          $('.w-cpr-time', el).textContent = left ? `${clock(left)} μέχρι έλεγχο ρυθμού` : 'Έλεγχος ρυθμού / αλλαγή συμπιεστή';
          if (!left) { cycle++; started = Date.now(); $('.w-cpr-cycle', el).textContent = `Κύκλος ${cycle}`; try { navigator.vibrate?.([200, 100, 200]); } catch (_) {} }
        };
        const run = on => { clearInterval(timer); timer = null; if (on) { if (!started) started = Date.now(); timer = setInterval(tick, 60000 / rate); } $('[data-cpr-go]', el).textContent = on ? 'Παύση' : 'Έναρξη'; el.classList.toggle('w-running', on); };
        $('[data-cpr-go]', el).addEventListener('click', () => run(!timer));
        el.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => { rate = Number(b.dataset.rate); el.querySelectorAll('[data-rate]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (timer) run(true); }));
      });
    } },

  events: { title: 'Χρόνοι συμβάντος', group: 'tools', size: 'm', icon: ICON.events,
    desc: 'Πατάς ό,τι έγινε και κρατιέται η ώρα: άφιξη, ΚΑΡΠΑ, απινίδωση, φάρμακο, αναχώρηση. Για την παράδοση.',
    html: () => head(ICON.events, 'Χρόνοι συμβάντος', '<button class="w-link" type="button" data-ev-copy>Αντιγραφή</button>') + `<div class="w-chips">${['Άφιξη', 'Έναρξη ΚΑΡΠΑ', 'Απινίδωση', 'Αδρεναλίνη', 'Αεραγωγός', 'ROSC', 'Αναχώρηση', 'Άφιξη ΤΕΠ'].map(t => `<button type="button" data-ev="${t}">${t}</button>`).join('')}</div><ol class="w-log"></ol><button class="w-link" type="button" data-ev-clear>Καθαρισμός</button>`,
    paint(el) {
      const K = 'ekab.home.events.v1';
      const paint = () => {
        const log = json(K, []);
        const t0 = log[0]?.t;
        $('.w-log', el).innerHTML = log.slice(-8).map(x => `<li><b>${new Date(x.t).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b> ${esc(x.e)}<small>${t0 && x.t !== t0 ? '+' + clock(Math.round((x.t - t0) / 1000)) : ''}</small></li>`).join('') || '<li><small>Πάτα ένα συμβάν για να καταγραφεί η ώρα.</small></li>';
      };
      once(el, () => {
        el.addEventListener('click', async e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.ev) { const log = json(K, []); log.push({ e: b.dataset.ev, t: Date.now() }); store.set(K, JSON.stringify(log.slice(-50))); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 300); paint(); }
          if (b.dataset.evClear !== undefined && confirm('Να διαγραφούν οι χρόνοι αυτού του συμβάντος;')) { store.set(K, '[]'); paint(); }
          if (b.dataset.evCopy !== undefined) { const text = json(K, []).map(x => `${new Date(x.t).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} ${x.e}`).join('\n'); try { await navigator.clipboard.writeText(text); b.textContent = 'Αντιγράφηκε'; setTimeout(() => { b.textContent = 'Αντιγραφή'; }, 1500); } catch (_) {} }
        });
      });
      paint();
    } },

  tap: { title: 'Μέτρηση σφυγμών / αναπνοών', group: 'tools', size: 's', icon: ICON.tap,
    desc: 'Χτύπα το κουμπί σε κάθε σφύξη ή αναπνοή· βγαίνει ο ρυθμός ανά λεπτό.',
    html: () => head(ICON.tap, 'Ρυθμός ανά λεπτό') + '<p><span class="w-num w-tap-rate">—</span><span class="w-unit"> /λεπτό</span></p><p class="w-sub w-tap-n">Χτύπα σε κάθε σφύξη</p><div class="w-actions"><button class="b-btn w-tap-btn" type="button" data-tap>Χτύπα</button><button class="b-btn ghost" type="button" data-tap-reset aria-label="Μηδενισμός μέτρησης">↺</button></div>',
    paint(el) {
      once(el, () => {
        let taps = [];
        const show = () => {
          const n = taps.length; $('.w-tap-n', el).textContent = n < 2 ? 'Χτύπα σε κάθε σφύξη' : `${n} χτυπήματα`;
          if (n < 4) { $('.w-tap-rate', el).textContent = '—'; return; }
          const span = taps[n - 1] - taps[0]; $('.w-tap-rate', el).textContent = Math.round((n - 1) / span * 60000);
        };
        $('[data-tap]', el).addEventListener('click', () => { const t = Date.now(); if (taps.length && t - taps[taps.length - 1] > 4000) taps = []; taps.push(t); taps = taps.slice(-16); show(); });
        $('[data-tap-reset]', el).addEventListener('click', () => { taps = []; show(); });
      });
    } },

  burns: { title: 'Κανόνας των 9', group: 'tools', size: 'm', icon: ICON.burns,
    desc: 'Επιφάνεια εγκαύματος σε ενήλικα: διαλέγεις περιοχές και βγαίνει το ποσοστό (%ΣΕΣ).',
    html: () => head(ICON.burns, 'Κανόνας των 9 · ενήλικας', '<span class="w-tag"><b class="w-burn-total">0</b>%</span>') + `<div class="w-chips">${[['Κεφαλή/τράχηλος', 9], ['Θώρακας', 9], ['Κοιλιά', 9], ['Άνω ράχη', 9], ['Κάτω ράχη', 9], ['Δεξί άνω άκρο', 9], ['Αριστ. άνω άκρο', 9], ['Δεξί κάτω άκρο εμπρός', 9], ['Δεξί κάτω άκρο πίσω', 9], ['Αριστ. κάτω άκρο εμπρός', 9], ['Αριστ. κάτω άκρο πίσω', 9], ['Περίνεο', 1]].map(([n, v]) => `<button type="button" aria-pressed="false" data-burn="${v}">${n} <small>${v}%</small></button>`).join('')}</div><p class="w-sub">Η παλάμη του ασθενούς ≈ 1%. Εκπαιδευτικό εργαλείο.</p>`,
    paint(el) {
      once(el, () => el.addEventListener('click', e => {
        const b = e.target.closest('[data-burn]'); if (!b) return;
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        $('.w-burn-total', el).textContent = [...el.querySelectorAll('[data-burn][aria-pressed="true"]')].reduce((s, x) => s + Number(x.dataset.burn), 0);
      }));
    } },

  drip: { title: 'Ρυθμός έγχυσης', group: 'tools', size: 'm', icon: ICON.drip,
    desc: 'Σταγόνες/λεπτό και ml/ώρα από όγκο, χρόνο και συσκευή χορήγησης.',
    html: () => head(ICON.drip, 'Ρυθμός έγχυσης') + `<div class="w-form"><label>Όγκος (ml)<input type="number" inputmode="decimal" min="1" value="500" data-d="v"></label><label>Χρόνος (λεπτά)<input type="number" inputmode="decimal" min="1" value="60" data-d="t"></label><label>Συσκευή<select data-d="f"><option value="20">20 σταγ./ml (κανονική)</option><option value="15">15 σταγ./ml</option><option value="10">10 σταγ./ml</option><option value="60">60 σταγ./ml (μικροσταγόνες)</option></select></label></div><p class="w-result"><b class="w-drip-gtt">—</b> σταγόνες/λεπτό · <b class="w-drip-mlh">—</b> ml/ώρα</p>`,
    paint(el) {
      const calc = () => { const v = Number($('[data-d="v"]', el).value), t = Number($('[data-d="t"]', el).value), f = Number($('[data-d="f"]', el).value); const ok = v > 0 && t > 0; $('.w-drip-gtt', el).textContent = ok ? Math.round(v * f / t) : '—'; $('.w-drip-mlh', el).textContent = ok ? Math.round(v / t * 60) : '—'; };
      once(el, () => el.addEventListener('input', calc));
      calc();
    } },

  apgar: { title: 'APGAR', group: 'tools', size: 'm', icon: ICON.apgar,
    desc: 'Βαθμολογία νεογνού στο 1ο και 5ο λεπτό.',
    html: () => head(ICON.apgar, 'APGAR νεογνού', '<span class="w-tag">Σύνολο <b class="w-apgar-total">10</b></span>') + `<div class="w-form w-form-2">${[['Χροιά', ['Κυανή/ωχρή', 'Κυανά άκρα', 'Ροδαλή']], ['Σφύξεις', ['Απουσία', '<100', '≥100']], ['Αντανακλαστικά', ['Καμία', 'Μορφασμός', 'Κλάμα/βήχας']], ['Τόνος', ['Χαλαρός', 'Λίγη κάμψη', 'Ενεργή κίνηση']], ['Αναπνοή', ['Απουσία', 'Αργή/ακανόνιστη', 'Καλή/κλάμα']]].map(([n, o]) => `<label>${n}<select>${o.map((t, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${i} · ${t}</option>`).reverse().join('')}</select></label>`).join('')}</div><p class="w-sub w-apgar-note"></p>`,
    paint(el) {
      const calc = () => { const t = [...el.querySelectorAll('select')].reduce((s, x) => s + Number(x.value), 0); $('.w-apgar-total', el).textContent = t; $('.w-apgar-note', el).textContent = t >= 7 ? '7–10: φυσιολογικό' : t >= 4 ? '4–6: χρειάζεται υποστήριξη' : '0–3: άμεση ανάνηψη'; };
      once(el, () => el.addEventListener('change', calc));
      calc();
    } },

  shock: { title: 'Δείκτης shock & ΜΑΠ', group: 'tools', size: 'm', icon: ICON.shock,
    desc: 'Shock index (ΚΣ/ΣΑΠ) και μέση αρτηριακή πίεση από σφύξεις και πίεση.',
    html: () => head(ICON.shock, 'Δείκτης shock & ΜΑΠ') + `<div class="w-form"><label>Σφύξεις<input type="number" inputmode="numeric" min="0" placeholder="π.χ. 110" data-s="hr"></label><label>Συστολική<input type="number" inputmode="numeric" min="0" placeholder="π.χ. 100" data-s="sbp"></label><label>Διαστολική<input type="number" inputmode="numeric" min="0" placeholder="π.χ. 60" data-s="dbp"></label></div><p class="w-result">SI <b class="w-si">—</b> · ΜΑΠ <b class="w-map">—</b> mmHg</p><p class="w-sub w-si-note">Φυσιολογικός SI περίπου 0,5–0,7· ≥1 υποψία shock.</p>`,
    paint(el) {
      const calc = () => {
        const v = k => Number($(`[data-s="${k}"]`, el).value), hr = v('hr'), s = v('sbp'), d = v('dbp');
        const si = hr > 0 && s > 0 ? hr / s : null, map = s > 0 && d > 0 ? (s + 2 * d) / 3 : null;
        $('.w-si', el).textContent = si ? si.toFixed(2).replace('.', ',') : '—'; $('.w-map', el).textContent = map ? Math.round(map) : '—';
        $('.w-si', el).classList.toggle('warn', !!si && si >= 1); $('.w-map', el).classList.toggle('warn', !!map && map < 65);
      };
      once(el, () => el.addEventListener('input', calc));
      calc();
    } },

  lexicon: { title: 'Λεξικό EN ↔ EL', group: 'tools', size: 'm', icon: ICON.lexicon,
    desc: '7.000+ ιατρικοί όροι: γράφεις στα αγγλικά ή στα ελληνικά και βλέπεις την απόδοση.',
    html: () => head(ICON.lexicon, 'Λεξικό EN ↔ EL') + '<label class="sr-only" for="w-lex-q">Αναζήτηση όρου</label><input class="w-input" id="w-lex-q" type="search" placeholder="π.χ. stroke ή εγκεφαλικό" autocomplete="off"><ul class="w-items w-lex"></ul>',
    paint(el) {
      once(el, () => {
        const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');
        let data = null, t = null;
        const run = async () => {
          const q = norm($('.w-input', el).value.trim()), ul = $('.w-lex', el);
          if (q.length < 2) { ul.innerHTML = ''; return; }
          data ||= ((await load('./medical-lexicon.json'))?.items || []).map(x => ({ en: x.en, el: (x.el || []).join(' · '), k: norm(x.en + ' ' + (x.el || []).join(' ')) }));
          const hits = data.filter(x => x.k.includes(q)).sort((a, b) => a.k.indexOf(q) - b.k.indexOf(q)).slice(0, 5);
          ul.innerHTML = hits.map(x => `<li><span><b>${esc(x.en)}</b> — ${esc(x.el)}</span></li>`).join('') || '<li><small>Δεν βρέθηκε όρος.</small></li>';
        };
        $('.w-input', el).addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 150); });
      });
    } }
};
