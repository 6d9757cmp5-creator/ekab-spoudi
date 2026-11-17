/* Additional practice only. Question content and existing progress keys stay unchanged. */
(() => {
  'use strict';
  const store = 'ekab-verified-stats-v1';
  const $ = id => document.getElementById(id);
  let questions = [], stats = {}, current = null, answered = false;
  const cycleSeen = new Set();

  function cleanStats(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Μη έγκυρη πρόοδος.');
    const result = Object.create(null);
    for (const [id, s] of Object.entries(value)) {
      if (!s || !Number.isInteger(s.n) || !Number.isInteger(s.c) || !Number.isInteger(s.streak) ||
          s.n < 0 || s.c < 0 || s.c > s.n || s.streak < 0 || s.streak > s.c) {
        throw new Error('Μη έγκυρα στοιχεία προόδου.');
      }
      result[id] = { n: s.n, c: s.c, streak: s.streak };
    }
    return result;
  }

  function save() {
    try { localStorage.setItem(store, JSON.stringify(stats)); }
    catch { $('load-status').hidden = false; $('load-status').textContent = 'Η εξάσκηση λειτουργεί, αλλά η πρόοδος δεν μπόρεσε να αποθηκευτεί σε αυτόν τον browser.'; }
  }

  function groupStats(items) {
    const attempts = items.reduce((sum, q) => sum + (stats[q.id]?.n || 0), 0);
    const correct = items.reduce((sum, q) => sum + (stats[q.id]?.c || 0), 0);
    const seen = items.filter(q => (stats[q.id]?.n || 0) > 0).length;
    return { attempts, seen, rate: attempts ? Math.round(correct / attempts * 100) + '%' : '—' };
  }

  function selectedQuestions() {
    return questions.filter(q => $('category').value === 'all' || q.category === $('category').value);
  }

  function refresh() {
    const total = groupStats(questions);
    $('count').textContent = questions.length;
    $('coverage').textContent = total.seen + '/' + questions.length;
    $('rate').textContent = total.rate;
    const selected = selectedQuestions();
    const selectedStats = groupStats(selected);
    $('selection-summary').textContent = selected.length + ' ασκήσεις · έχεις απαντήσει ' + selectedStats.seen + ' διαφορετικές.';
    const progress = $('category-progress');
    progress.replaceChildren();
    for (const category of [...new Set(questions.map(q => q.category))].sort((a, b) => a.localeCompare(b, 'el'))) {
      const items = questions.filter(q => q.category === category), s = groupStats(items);
      const row = document.createElement('div'); row.className = 'supp-category';
      const title = document.createElement('strong'); title.textContent = category;
      const detail = document.createElement('p');
      detail.textContent = 'Απαντημένες: ' + s.seen + '/' + items.length + ' · Σωστές προσπάθειες: ' + s.rate;
      row.append(title, detail); progress.append(row);
    }
  }

  function choose() {
    const items = selectedQuestions();
    let pending = items.filter(q => !cycleSeen.has(q.id));
    if (!pending.length) { cycleSeen.clear(); pending = items; }
    const weights = pending.map(q => {
      const s = stats[q.id] || { n: 0, c: 0, streak: 0 };
      return Math.max(.05, ((s.n ? 1 : 6) + (s.n - s.c) * 4) / (1 + s.streak * s.streak * 2));
    });
    let random = Math.random() * weights.reduce((a, b) => a + b, 0);
    return pending.find((q, i) => (random -= weights[i]) <= 0) || pending.at(-1);
  }

  function next() {
    current = choose();
    if (!current) return;
    cycleSeen.add(current.id); answered = false;
    $('next').disabled = true; $('feedback').hidden = true;
    $('qmeta').textContent = current.category + ' · ' + cycleSeen.size + '/' + selectedQuestions().length + ' στον κύκλο εξάσκησης';
    $('question').textContent = current.question;
    $('options').replaceChildren();
    current.options.forEach((text, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => answer(index));
      $('options').append(button);
    });
    $('question').focus();
  }

  function sourceLink(title, url) {
    const a = document.createElement('a');
    a.textContent = title;
    try { if (new URL(url).protocol === 'https:') a.href = url; } catch { /* Keep malformed source labels as text. */ }
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }

  function answer(index) {
    if (answered) return;
    answered = true;
    const correct = index === current.answer;
    window.EkabAdditionalPractice.record(stats, current.id, correct);
    save(); refresh();
    [...$('options').children].forEach((button, i) => {
      button.disabled = true;
      if (i === current.answer) { button.classList.add('correct'); button.textContent = 'Σωστή απάντηση: ' + current.options[i]; }
      else if (i === index) { button.classList.add('wrong'); button.textContent = 'Η επιλογή σου: ' + current.options[i]; }
    });
    const feedback = $('feedback'); feedback.replaceChildren();
    const result = document.createElement('strong'); result.textContent = correct ? 'Σωστό.' : 'Λάθος.';
    const explanation = document.createElement('p'); explanation.textContent = current.explanation;
    feedback.append(result, explanation);
    if (current.source) feedback.append(sourceLink('Πηγή της άσκησης', current.source));
    if (current.evidence?.length) {
      const evidence = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = 'Αναλυτική τεκμηρίωση'; evidence.append(summary);
      for (const item of current.evidence) {
        const p = document.createElement('p');
        p.append(sourceLink(item.title, item.url), document.createTextNode(' — ' + (item.location || '')));
        evidence.append(p);
      }
      feedback.append(evidence);
    }
    feedback.hidden = false; $('next').disabled = false;
  }

  $('category').addEventListener('change', () => { cycleSeen.clear(); refresh(); });
  $('start').addEventListener('click', () => {
    if (!selectedQuestions().length) return;
    cycleSeen.clear(); $('home').hidden = true; $('quiz').hidden = false; next();
  });
  $('next').addEventListener('click', next);
  $('exit').addEventListener('click', () => {
    $('quiz').hidden = true; $('home').hidden = false; $('start').focus();
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('Να διαγραφεί μόνο η πρόοδος των πρόσθετων ασκήσεων;')) return;
    for (const q of questions) delete stats[q.id];
    save(); refresh();
  });
  $('export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ stats, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ekab-progress.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('restore').addEventListener('change', async event => {
    try {
      const file = event.target.files[0]; if (!file) return;
      if (file.size > 2000000) throw new Error('Το αρχείο είναι πολύ μεγάλο.');
      const restored = cleanStats(JSON.parse(await file.text()).stats);
      if (!confirm('Να αντικατασταθεί η αποθηκευμένη πρόοδος αυτής της τράπεζας με το αντίγραφο;')) return;
      stats = restored; save(); refresh(); $('restoreStatus').textContent = 'Η πρόοδος επανήλθε.';
    } catch (error) { $('restoreStatus').textContent = 'Δεν έγινε επαναφορά: ' + error.message; }
    event.target.value = '';
  });

  async function init() {
    try {
      const saved = localStorage.getItem(store);
      if (saved) stats = cleanStats(JSON.parse(saved));
    } catch { $('restoreStatus').textContent = 'Δεν διαβάστηκε η προηγούμενη πρόοδος. Το αρχικό αρχείο αποθήκευσης δεν διαγράφηκε.'; }
    try {
      const response = await fetch('supplementary_exercises.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data) || !data.length || data.some(q => !q.id || !q.category || !q.question ||
          !Array.isArray(q.options) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)) {
        throw new Error('Μη έγκυρη λίστα ασκήσεων.');
      }
      questions = data;
      for (const category of [...new Set(questions.map(q => q.category))].sort((a, b) => a.localeCompare(b, 'el'))) {
        const option = document.createElement('option'); option.value = category; option.textContent = category;
        $('category').append(option);
      }
      refresh(); $('category').disabled = false; $('start').disabled = false; $('load-status').hidden = true;
    } catch {
      $('load-status').textContent = 'Δεν φορτώθηκαν οι ασκήσεις. Έλεγξε τη σύνδεση και ανανέωσε τη σελίδα.';
    }
  }
  init();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
