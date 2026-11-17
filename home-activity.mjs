/* Actual continuation history from the shared resume service; no goal or AI engine. */
function node(tag, text, className) {
  const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n;
}
function link(text, href, className) {
  const n = node('a', text, className); n.href = href; return n;
}
function update() {
  const card = document.getElementById('atlaCard'); if (!card) return;
  const service = window.EkabStudyResume;
  const entries = service?.entries() || [];
  card.replaceChildren(node('h2', 'Προσωπική καθοδήγηση'), node('p', 'Οι ενότητες που άνοιξες σε αυτή τη συσκευή.', 'small muted'));
  const list = node('div'); list.id = 'activityList';
  if (!entries.length) list.append(node('p', 'Δεν υπάρχει καταγεγραμμένη συνέχεια ακόμη. Ξεκίνα από τη Μελέτη ή την Εξάσκηση.', 'learning-activity-empty'));
  for (const entry of entries) {
    const row = node('div', null, 'learning-activity-row'); row.dataset.activityId = entry.id;
    const a = link('', entry.href);
    a.append(node('strong', entry.label), node('small', entry.at ? 'Τελευταίο άνοιγμα: ' + new Date(entry.at).toLocaleDateString('el-GR') : 'Προηγούμενο άνοιγμα'));
    const remove = node('button', 'Αφαίρεση'); remove.type = 'button';
    remove.setAttribute('aria-label', 'Αφαίρεση από τη λίστα: ' + entry.label);
    remove.addEventListener('click', () => {
      if (!confirm('Να αφαιρεθεί αυτή η καταχώριση από τη λίστα συνέχειας; Οι απαντήσεις και η πρόοδός σου διατηρούνται.')) return;
      if (service.dismiss(entry.id)) update();
      else remove.textContent = 'Δεν αποθηκεύτηκε';
    });
    row.append(a, remove); list.append(row);
  }
  card.append(list); card.dataset.ready = 'true';
  document.querySelector('.v6-today')?.remove();
  const primary = document.querySelector('.v6-continue');
  const copy = node('div', null, 'v6-continue-copy');
  copy.append(node('div', entries.length ? 'ΣΥΝΕΧΕΙΑ ΑΠΟ ΤΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ ΣΟΥ' : 'ΜΕΛΕΤΗ ΚΑΙ ΕΞΑΣΚΗΣΗ', 'v6-overline'),
    node('h2', entries[0]?.label || 'Τι θέλεις να μελετήσεις;'),
    node('p', entries.length ? 'Συνέχισε από την ενότητα που είχες ανοίξει.' : 'ΣΑΕΚ, ΕΟΠΠΕΠ ή τα σεμινάρια που σε ενδιαφέρουν.'),
    link(entries.length ? 'Συνέχεια' : 'Επιλογή μελέτης', entries[0]?.href || 'study.html', 'v6-primary-button'));
  primary?.replaceChildren(copy);
}
window.addEventListener('ekab:home-ready', update);
window.addEventListener('storage', update);
window.addEventListener('ekab:cloud-applied', update);
setTimeout(update, 0);
