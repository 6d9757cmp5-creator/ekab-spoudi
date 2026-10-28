/* One safe read-progress controller for all 20 SAEK course pages.
 * Replaces the old repeated inline controller without altering course text, IDs or storage keys.
 */
(() => {
  'use strict';
  const match = location.pathname.match(/saek-course-(\d{2})\.html$/);
  if (!match) return;
  const courseId = match[1], prefix = 'ekab.saek.read.v1.' + courseId + '.';
  const buttons = [...document.querySelectorAll('.read-button[data-lesson]')];
  if (!buttons.length) return;
  let storageWritable = true;

  function storageUnavailable() {
    storageWritable = false;
    let note = document.getElementById('saek-storage-status');
    if (!note) {
      note = document.createElement('p');
      note.id = 'saek-storage-status';
      note.className = 'small';
      note.setAttribute('role', 'status');
      const host = document.querySelector('.lesson-progress') ||
        document.getElementById('read-summary')?.parentElement;
      if (host) host.after(note);
      else document.body.append(note);
    }
    note.textContent =
      'Η αποθήκευση προόδου δεν είναι διαθέσιμη σε αυτόν τον browser. Η ύλη παραμένει αναγνώσιμη, αλλά δεν μπορείς να σημειώσεις κεφάλαια ως διαβασμένα.';
    for (const button of buttons) {
      button.disabled = true;
      button.title = 'Η αποθήκευση προόδου δεν είναι διαθέσιμη';
    }
    for (const button of document.querySelectorAll('[data-export-all]')) button.disabled = true;
  }

  function storageCheck() {
    const probe = '__ekab_saek_storage_probe__';
    try {
      const previous = localStorage.getItem(probe);
      localStorage.setItem(probe, '1');
      if (localStorage.getItem(probe) !== '1') throw Error('Storage write failed');
      if (previous === null) localStorage.removeItem(probe);
      else localStorage.setItem(probe, previous);
      return true;
    } catch {
      storageUnavailable();
      return false;
    }
  }

  function isRead(index) {
    try { return localStorage.getItem(prefix + index) === '1'; }
    catch { storageUnavailable(); return false; }
  }

  function paint() {
    let done = 0;
    for (const button of buttons) {
      const index = Number(button.dataset.lesson);
      if (!Number.isInteger(index) || index < 1 || index > 50) continue;
      const read = isRead(index);
      if (read) done++;
      button.textContent = read ? '✓ Διαβάστηκε · αναίρεση' : '○ Ολοκλήρωσα την ανάγνωση';
      button.setAttribute('aria-pressed', String(read));
      button.classList.toggle('completed', read);
      const status = document.getElementById('status-' + index);
      if (status) status.textContent = read ? 'Διαβάστηκε' : 'Δεν ολοκληρώθηκε';
    }
    const summary = document.getElementById('read-summary');
    if (summary) summary.textContent = done + '/' + buttons.length + ' κεφάλαια μελετημένα';
    const percent = buttons.length ? Math.round(100 * done / buttons.length) : 0;
    const pct = document.getElementById('read-percent');
    if (pct) pct.textContent = percent + '%';
    const bar = document.getElementById('lesson-progress-bar');
    if (bar) bar.style.width = percent + '%';
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (!storageWritable) return;
      const key = prefix + button.dataset.lesson;
      try {
        if (localStorage.getItem(key) === '1') localStorage.removeItem(key);
        else localStorage.setItem(key, '1');
      } catch { storageUnavailable(); return; }
      paint();
      window.dispatchEvent(new Event('ekab:progress-changed'));
    });
  }

  window.addEventListener('storage', event => {
    if (!event.key || event.key.startsWith(prefix)) paint();
  });
  window.addEventListener('pageshow', paint);
  window.addEventListener('focus', paint);
  window.addEventListener('ekab:cloud-applied', paint);
  storageCheck();
  paint();
})();
