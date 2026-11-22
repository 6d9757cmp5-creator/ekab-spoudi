/* BETA 22/11: εφέ όπως στη σελίδα αναφοράς (ekab-home-beta …?ui=hospital-phone):
   φως που ακολουθεί το ποντίκι μέσα στις κάρτες (--glow-x/--glow-y), γραμμή έμφασης στο μενού, διαδοχική εμφάνιση,
   λάμψη στις μπάρες προόδου, παλμός/κύμα ΗΚΓ. Όλα σβήνουν με «Κινήσεις: όχι» ή με τη ρύθμιση μειωμένης κίνησης. */
(function () {
  'use strict';
  const CARDS = '.bp-card,.v6-live-card,.v6-path-section,.v6-continue,.v6-atla-card,.beta-cal,.metric.card,.v6-chart-card';
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest(CARDS); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--glow-x', (e.clientX - r.left) + 'px'); c.style.setProperty('--glow-y', (e.clientY - r.top) + 'px');
  }, { passive: true });
  const MINI = { 'Πίνακας ελέγχου': 'Σήμερα', 'Μελέτη': '247 κεφάλαια', 'Εξάσκηση': 'Ερωτήσεις', 'Εργαλεία': 'Πρακτικά', 'Ημερολόγιο εξετάσεων': 'Προθεσμίες', 'Σεμινάρια': 'BLS · ALS', 'Επικοινωνία & AED': 'Τηλέφωνα' };
  function decorate() {
    document.querySelectorAll('.sidebar a').forEach((a, i) => {
      if (a.dataset.fx) return; a.dataset.fx = '1'; a.classList.add('fx-side'); a.style.setProperty('--i', i);
      const t = (a.textContent || '').trim(); if (MINI[t]) a.dataset.mini = MINI[t];
    });
    const head = document.querySelector('.bp-head .v6-overline');
    if (head && !head.querySelector('.fx-wave')) head.insertAdjacentHTML('beforeend', '<svg class="fx-wave" viewBox="0 0 60 14" aria-hidden="true"><path d="M0 7h14l3-5 4 10 4-8 3 3h32" pathLength="1"/></svg>');
    document.querySelectorAll('.v6-live-card .v6-overline, .v6-live-card [class*=overline]').forEach(o => { if (!o.querySelector('.fx-dot')) o.insertAdjacentHTML('afterbegin', '<i class="fx-dot" aria-hidden="true"></i>'); });
    document.querySelectorAll('main.content section, main.content .v6-live-widgets > *, main.content .bp-kpis > *').forEach((s, i) => { if (!s.dataset.fxIn) { s.dataset.fxIn = '1'; s.style.setProperty('--fx-d', Math.min(i * 45, 700) + 'ms'); s.classList.add('fx-arrive'); } });
  }
  const obs = new MutationObserver(decorate);
  function start() { decorate(); obs.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
