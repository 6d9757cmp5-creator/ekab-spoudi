/* Compact source disclosure shared by all educational pages. */
(function () {
  'use strict';
  function disclosure() {
    var details = document.createElement('details');
    details.className = 'compact-sources';
    var summary = document.createElement('summary');
    summary.textContent = 'Πηγές και τεκμηρίωση';
    details.append(summary);
    var body = document.createElement('div');
    body.className = 'compact-sources-body';
    details.append(body);
    return {details: details, summary: summary, body: body};
  }
  function wrap(node) {
    if (!node || node.closest('.compact-sources')) return;
    var fold = disclosure();
    node.before(fold.details);
    fold.body.append(node);
  }
  function foldSection(section) {
    if (section.classList.contains('compact-source-container')) return;
    if (section.tagName === 'DETAILS') {
      section.classList.add('compact-sources');
      section.removeAttribute('open');
      return;
    }
    var heading = section.querySelector(':scope > h2');
    var fold = disclosure();
    if (heading) {
      fold.summary.replaceChildren(heading);
    }
    while (section.firstChild) fold.body.append(section.firstChild);
    section.classList.add('compact-source-container');
    section.append(fold.details);
  }
  document.querySelectorAll('.course-sources, #references').forEach(foldSection);
  // These headings identify bibliography-only sections, never clinical lessons.
  document.querySelectorAll('section > h2').forEach(function (heading) {
    if (/^(Πηγή διάρθρωσης μαθημάτων|📚 Έλεγχος πηγών|Ύλη \/ πηγές|Ελληνικές πηγές αναφοράς|Κατάσταση πιστοποίησης|📄 Πρωτογενής βάση πιστοποίησης)$/.test(heading.textContent.trim())) {
      foldSection(heading.parentElement);
    }
  });
  // Bibliography is available at the end; it must not precede the student's work.
  document.querySelectorAll('main > section.compact-source-container, .main > section.compact-source-container, main > details#references, .main > details#references, details.hub-resources').forEach(function (section) {
    if (section.matches('details.hub-resources')) {
      var summary = section.querySelector(':scope > summary');
      if (!summary || !/Επίσημο υλικό και πηγές/.test(summary.textContent)) return;
      summary.textContent = 'Πηγές και τεκμηρίωση';
      section.classList.add('compact-sources');
      section.removeAttribute('open');
    }
    var main = section.closest('main, .main');
    if (main && section.parentElement === main) main.append(section);
  });
  document.querySelectorAll('.academic-review-link').forEach(function (link) {
    var main = link.closest('main, .main');
    if (!main) return;
    var existing = Array.from(main.children).find(function (child) {
      return child.matches('.compact-source-container, details.compact-sources');
    });
    if (existing) {
      var body = existing.querySelector('.compact-sources-body, .ph-reference-content') || existing;
      body.append(link);
      return;
    }
    var fold = disclosure();
    fold.body.append(link);
    main.append(fold.details);
  });
  document.querySelectorAll('.chapter-source-note, .review-source, .lesson-source-link, #sourceLine').forEach(wrap);
  document.querySelectorAll('#qsource, #asource').forEach(function (link) { wrap(link.parentElement); });
  document.querySelectorAll('.practical-sources, .catalog-reader-sources').forEach(function (details) {
    details.classList.add('compact-sources');
    details.removeAttribute('open');
  });
  // The dedicated bibliography reader retains its page anchors and headings.
  if (location.pathname.endsWith('/piges.html')) {
    document.querySelectorAll('.chapter').forEach(foldSection);
  }
  function revealHash() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    var parent = target.parentElement;
    while (parent) {
      if (parent.matches('details.compact-sources')) parent.open = true;
      parent = parent.parentElement;
    }
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);
})();
