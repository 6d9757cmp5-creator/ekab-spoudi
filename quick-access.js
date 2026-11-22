/* Shared quick access for the home sidebar and the inner-page shell. */
(() => {
  'use strict';
  const root = new URL('./', document.currentScript.src);
  const host = document.querySelector('[data-ekab-quick-access]');
  if (!host) return;

  const catalog = [
    ['calendar', 'study-plan.html', 'Ημερολόγιο εξετάσεων'],
    ['seminars', 'study.html?type=seminars', 'Σεμινάρια'],
    ['contacts', 'contacts.html', 'Επικοινωνία & AED'],
    ['saek-study', 'study.html?type=saek', 'Μαθήματα ΣΑΕΚ'],
    ['eoppep-study', 'study.html?type=eoppep', 'Ερωτήσεις ΕΟΠΠΕΠ'],
    ['saek-images', 'saek-images.html', 'Εικόνες ΣΑΕΚ'],
    ['saek-videos', 'saek-videos.html', 'Βίντεο ΣΑΕΚ'],
    ['saek-practice', 'saek-exams.html', 'Εξετάσεις ΣΑΕΚ'],
    ['eoppep-practice', 'theory.html?mode=exam&section=practice', 'Εξάσκηση ΕΟΠΠΕΠ'],
    ['additional-practice', 'supplementary_practice.html', 'Πρόσθετες ασκήσεις'],
    ['practical', 'practical_exam.html', 'Πρακτικό ΕΟΠΠΕΠ'],
    ['study-map', 'study_map.html', 'Χάρτης μελέτης'],
    ['skills', 'paramedic.html#skills', 'Εργαστήρια δεξιοτήτων'],
    ['anatomy', 'ui-tools/anatomy-3d/index.html', '3D Ανατομία'],
    ['pharmacology', 'farmaka.html', 'Φαρμακολογία'],
    ['protocols', 'protocols.html', 'Θέματα επειγόντων'],
    ['law', 'profession-law.html', 'Επάγγελμα & νομοθεσία'],
    ['pdf', 'pdf-library.html', 'Βιβλιοθήκη PDF']
  ];
  const byId = new Map(catalog.map(item => [item[0], item]));
  const pinsKey = 'ekab.quick-access.pins.v1';
  const visitsKey = 'ekab.quick-access.visits.v1';
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  };
  const readPins = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(pinsKey) || '[]');
      return Array.isArray(saved) ? [...new Set(saved.filter(id => byId.has(id)))].slice(0, 3) : [];
    } catch { return []; }
  };
  const visit = (() => {
    try {
      const stored = Number(localStorage.getItem(visitsKey));
      const previous = Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
      const current = previous + 1;
      localStorage.setItem(visitsKey, String(current));
      return current;
    } catch { return 1; }
  })();
  let pins = readPins();

  const heading = element('div', 'ekab-quick-heading');
  heading.append(element('span', null, 'ΓΡΗΓΟΡΗ ΠΡΟΣΒΑΣΗ'));
  const edit = element('button', 'ekab-quick-edit', 'Επιλογή');
  edit.type = 'button';
  edit.setAttribute('aria-label', 'Επιλογή αγαπημένων γρήγορης πρόσβασης');
  heading.append(edit);
  const links = element('nav', 'ekab-quick-links');
  links.setAttribute('aria-label', 'Γρήγορη πρόσβαση');
  host.append(heading, links);

  const dialog = element('dialog', 'ekab-quick-dialog');
  dialog.setAttribute('aria-labelledby', 'ekabQuickTitle');
  const title = element('h2', null, 'Γρήγορη πρόσβαση');
  title.id = 'ekabQuickTitle';
  const explanation = element('p', null, 'Διάλεξε έως 3 σταθερά αγαπημένα. Οι ελεύθερες θέσεις περνούν με σειρά από τις ενότητες της εφαρμογής και αλλάζουν κάθε δεύτερη επίσκεψη.');
  const currentHeading = element('h3', null, 'Εμφανίζονται τώρα');
  const currentLinks = element('nav', 'ekab-quick-current');
  currentLinks.setAttribute('aria-label', 'Τρέχουσα γρήγορη πρόσβαση');
  const pinsHeading = element('h3', null, 'Σταθερά αγαπημένα');
  const choices = element('div', 'ekab-quick-choices');
  const feedback = element('p', 'ekab-quick-feedback');
  feedback.setAttribute('role', 'status');
  const close = element('button', 'ekab-quick-close', 'Κλείσιμο');
  close.type = 'button';
  close.addEventListener('click', () => dialog.close());
  dialog.append(title, explanation, currentHeading, currentLinks, pinsHeading, choices, feedback, close);
  document.body.append(dialog);

  const makeLink = ([, href, label]) => {
    const target = new URL(href, root);
    const current = target.pathname === location.pathname && target.search === location.search && target.hash === location.hash;
    const row = element(current ? 'span' : 'a', 'ekab-quick-link', label);
    if (current) row.setAttribute('aria-current', 'page'); else row.href = target.href;
    return row;
  };
  const render = () => {
    const selected = pins.map(id => byId.get(id));
    const start = (Math.floor((visit - 1) / 2) * 3) % catalog.length;
    for (let i = 0; selected.length < 3 && i < catalog.length; i++) {
      const item = catalog[(start + i) % catalog.length];
      if (!pins.includes(item[0])) selected.push(item);
    }
    links.replaceChildren(...selected.map(makeLink));
    currentLinks.replaceChildren(...selected.map(makeLink));
  };

  for (const [id, , label] of catalog) {
    const choice = element('label');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.value = id;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked && pins.length >= 3) {
        checkbox.checked = false;
        feedback.textContent = 'Μπορείς να καρφιτσώσεις έως 3.';
        return;
      }
      pins = checkbox.checked ? [...pins, id] : pins.filter(value => value !== id);
      try {
        localStorage.setItem(pinsKey, JSON.stringify(pins));
        feedback.textContent = 'Αποθηκεύτηκε σε αυτή τη συσκευή.';
      } catch { feedback.textContent = 'Δεν ήταν δυνατή η αποθήκευση στη συσκευή.'; }
      render();
    });
    choice.append(checkbox, document.createTextNode(label));
    choices.append(choice);
  }
  const open = () => {
    for (const checkbox of choices.querySelectorAll('input')) checkbox.checked = pins.includes(checkbox.value);
    feedback.textContent = '';
    dialog.showModal();
  };
  edit.addEventListener('click', open);
  const topbar = document.querySelector('.v6-global-topbar, .topbar .header-tools');
  if (topbar) {
    const mobile = element('button', 'ekab-quick-mobile', 'Συντομεύσεις');
    mobile.type = 'button';
    mobile.setAttribute('aria-label', 'Άνοιγμα γρήγορης πρόσβασης');
    mobile.addEventListener('click', open);
    topbar.append(mobile);
  }
  render();
})();
