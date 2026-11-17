/* Keep reading and practice separate while reusing the existing tools. */
(() => {
  function init() {
    const file = location.pathname.split('/').pop();
    const params = new URLSearchParams(location.search);
    const saek = /^saek-course-\d{2}\.html$/.test(file) || ['saek.html', 'saek-exams.html'].includes(file);
    const seminar = file === 'seminar-prep.html';
    const eoppep = ['eoppep.html', 'theory.html', 'practical_exam.html', 'supplementary_practice.html'].includes(file);
    if (!saek && !seminar && !eoppep) return;
    const type = saek ? 'saek' : seminar ? 'seminars' : 'eoppep';
    const practice = params.get('section') === 'practice' || params.get('mode') === 'exam' ||
      ['saek-exams.html', 'practical_exam.html', 'supplementary_practice.html'].includes(file);
    document.body.dataset.learningSection = practice ? 'practice' : 'study';
    const main = document.querySelector('main, .main'); if (!main) return;
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'learning-hubs.css?v=20261117-1'; document.head.append(style);
    const nav = document.createElement('nav'); nav.className = 'learning-context'; nav.setAttribute('aria-label', 'Μελέτη και εξάσκηση');
    const title = document.createElement('strong'); title.textContent = (practice ? 'Εξάσκηση' : 'Μελέτη') + ' · ' + (saek ? 'ΣΑΕΚ' : seminar ? 'Σεμινάρια' : 'ΕΟΠΠΕΠ');
    nav.append(title);
    for (const [mode, label] of [['study', 'Μελέτη'], ['practice', 'Εξάσκηση']]) {
      const a = document.createElement('a'); a.textContent = label;
      a.href = seminar && /^#(bls|pbls|ils|phtls|als)$/.test(location.hash) ? 'seminar-prep.html?section=' + mode + location.hash : mode + '.html?type=' + type;
      nav.append(a);
    }
    main.prepend(nav);
    if (file === 'theory.html' && practice) {
      const title = document.querySelector('#setup h2'); if (title) title.textContent = 'Ρυθμίσεις εξάσκησης ΕΟΠΠΕΠ';
      const begin = document.getElementById('begin'); if (begin) begin.textContent = 'Έναρξη εξάσκησης';
      const back = document.getElementById('goHome'); if (back) back.textContent = 'Επιστροφή στις ρυθμίσεις εξάσκησης';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
