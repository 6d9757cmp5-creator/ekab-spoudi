import { SAEK_COURSES } from './services/study-plan/plan.mjs';

const mode = document.body.dataset.learningMode;
const params = new URLSearchParams(location.search);
const type = ['saek', 'eoppep', 'seminars'].includes(params.get('type')) ? params.get('type') : 'saek';
const content = document.getElementById('learning-content');
const study = mode === 'study';
const other = study ? 'practice' : 'study';
if (!study && type !== 'seminars') {
  location.replace(new URL(type === 'saek' ? './saek-exams.html' : './theory.html?mode=exam&section=practice' + (params.get('bank') === 'all' ? '&bank=all' : ''),location.href));
}
const node = (tag, text, cls) => {
  const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n;
};
const link = (text, href) => { const n = node('a', text, 'btn secondary'); n.href = href; return n; };
document.querySelector(`[data-learning-type="${type}"]`).setAttribute('aria-current', 'page');
content.replaceChildren();
const cross = document.getElementById('learning-crosslink');
function crossLink(courses = '') {
  const destination = study && type !== 'seminars' ?
    (type === 'saek' ? 'saek-exams.html' : 'theory.html?mode=exam&section=practice') :
    other + '.html?type=' + type + (courses ? '&courses=' + encodeURIComponent(courses) : '');
  cross.replaceChildren(link(study ? 'Πήγαινε στην εξάσκηση αυτής της ενότητας' : 'Πήγαινε στη μελέτη αυτής της ενότητας',
    destination));
}
crossLink();

if (type === 'saek') {
  content.append(node('h2', study ? 'Μαθήματα ΣΑΕΚ' : 'Εξάσκηση ΣΑΕΚ'));
  if (!study) {
    content.append(node('p', 'Διάλεξε εξάμηνο, μάθημα, αριθμό ερωτήσεων και δυσκολία στην επόμενη σελίδα.'),
      link('Άνοιγμα εξετάσεων ΣΑΕΚ', 'saek-exams.html'));
  } else {
    const label = node('label', 'Εξάμηνο'); label.htmlFor = 'hub-semester';
    const select = node('select'); select.id = 'hub-semester';
    for (const value of ['all', 'Α', 'Β', 'Γ', 'Δ']) {
      const option = node('option', value === 'all' ? 'Όλα τα εξάμηνα' : value + '΄ εξάμηνο'); option.value = value; select.append(option);
    }
    const list = node('div', null, 'learning-courses');
    function courses() {
      list.replaceChildren();
      for (const course of SAEK_COURSES.filter(c => select.value === 'all' || c.semester === select.value)) {
        const card = node('article', null, 'learning-course');
        card.append(node('h3', course.title), node('p', course.semester + '΄ εξάμηνο · ' + course.chapters + ' κεφάλαια'),
          link('Μελέτη μαθήματος', 'saek-course-' + course.id + '.html#lesson-1'), link('▶ Εισαγωγή', 'saek-course-' + course.id + '.html#course-intro'));
        list.append(card);
      }
    }
    select.addEventListener('change', courses); content.append(label, select, list); courses();
  }
} else if (type === 'eoppep') {
  content.append(node('h2', '314 επίσημες ερωτήσεις ΕΟΠΠΕΠ'), node('p', '105 γενικές και 209 ειδικές ερωτήσεις.'));
  if (study) {
    content.append(link('Άνοιγμα καταλόγου και απαντήσεων', 'theory.html?view=catalog&section=study'));
  } else {
    const label = node('label', 'Ερωτήσεις εξάσκησης'); label.htmlFor = 'eoppep-bank';
    const bank = node('select'); bank.id = 'eoppep-bank';
    for (const [value, title] of [['official', 'Μόνο οι 314 επίσημες'], ['all', 'Όλες: 314 επίσημες + 121 συμπληρωματικές (435)']]) {
      const option = node('option', title); option.value = value; bank.append(option);
    }
    const start = link('Έναρξη εξάσκησης', 'theory.html?mode=exam&section=practice'); start.id = 'eoppep-start';
    bank.addEventListener('change', () => { start.href = 'theory.html?mode=exam&section=practice' + (bank.value === 'all' ? '&bank=all' : ''); });
    content.append(label, bank, node('p', 'Οι συμπληρωματικές ασκήσεις επισημαίνονται ξεχωριστά και δεν προσμετρώνται στην επίσημη πρόοδο.'), start,
      link('Πρακτικό μέρος ΕΟΠΠΕΠ', 'practical_exam.html'));
  }
} else {
  content.append(node('h2', 'Ποια σεμινάρια θέλεις;'), node('p', 'Επίλεξε ένα ή περισσότερα.'));
  const names = [['bls', 'BLS / AED'], ['pbls', 'PBLS'], ['ils', 'ILS'], ['phtls', 'PHTLS'], ['als', 'ALS']];
  const selected = new Set((params.get('courses') || '').split(',').filter(id => names.some(n => n[0] === id)));
  const choices = node('div'); const list = node('div', null, 'learning-courses');
  function seminars() {
    const ids = [...selected].join(',');
    const url = new URL(location.href); if (ids) url.searchParams.set('courses', ids); else url.searchParams.delete('courses');
    history.replaceState(null, '', url); crossLink(ids); list.replaceChildren();
    if (!selected.size) list.append(node('p', 'Επίλεξε τουλάχιστον ένα σεμινάριο από τη λίστα.'));
    for (const [id, name] of names.filter(([id]) => selected.has(id))) {
      const card = node('article', null, 'learning-course');
      card.append(node('h3', name), link(study ? 'Μελέτη ' + name : 'Τεστ και διαγωνίσματα ' + name,
        'seminar-prep.html?section=' + mode + '#' + id)); list.append(card);
    }
  }
  for (const [id, name] of names) {
    const label = node('label', null, 'learning-seminar-choice'); const check = node('input');
    check.type = 'checkbox'; check.value = id; check.checked = selected.has(id);
    check.addEventListener('change', () => { check.checked ? selected.add(id) : selected.delete(id); seminars(); });
    label.append(check, document.createTextNode(name)); choices.append(label);
  }
  content.append(choices, list); seminars();
}
