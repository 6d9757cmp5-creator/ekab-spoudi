/* Continue from real recent activity; keep empty states out of the home dashboard. */
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(text, href, className) {
  const element = node('a', text, className);
  element.href = href;
  return element;
}

function update() {
  const card = document.getElementById('atlaCard');
  const primary = document.querySelector('.v6-continue');
  const secondary = card?.closest('.v6-secondary-column');
  const dashboard = document.querySelector('.v6-dashboard');
  if (!card || !primary) return;

  const entries = window.EkabStudyResume?.entries() || [];
  const [current, ...previous] = entries;
  primary.hidden = !current;
  card.hidden = previous.length === 0;
  if (secondary) secondary.hidden = previous.length === 0;
  dashboard?.classList.toggle('v6-dashboard-no-history', previous.length === 0);

  if (current) {
    const copy = node('div', null, 'v6-continue-copy');
    copy.append(
      node('div', 'ΣΥΝΕΧΕΙΑ ΑΠΟ ΤΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ ΣΟΥ', 'v6-overline'),
      node('h2', current.label),
      node('p', 'Συνέχισε από την ενότητα που είχες ανοίξει.'),
      link('Συνέχεια →', current.href, 'v6-primary-button')
    );
    primary.replaceChildren(copy);
  }

  card.replaceChildren(
    node('h2', 'Πρόσφατη δραστηριότητα'),
    node('p', 'Άλλες ενότητες που άνοιξες σε αυτή τη συσκευή.', 'small muted')
  );

  if (previous.length) {
    const list = node('div');
    list.id = 'activityList';
    for (const entry of previous) {
      const row = node('div', null, 'learning-activity-row');
      row.dataset.activityId = entry.id;

      const item = link('', entry.href);
      item.append(
        node('strong', entry.label),
        node('small', entry.at
          ? 'Τελευταίο άνοιγμα: ' + new Date(entry.at).toLocaleDateString('el-GR')
          : 'Προηγούμενο άνοιγμα')
      );

      const remove = node('button', 'Αφαίρεση');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Αφαίρεση από τη λίστα: ' + entry.label);
      remove.addEventListener('click', () => {
        if (!confirm('Να αφαιρεθεί αυτή η καταχώριση από τη λίστα συνέχειας; Οι απαντήσεις και η πρόοδός σου διατηρούνται.')) return;
        if (window.EkabStudyResume?.dismiss(entry.id)) update();
        else remove.textContent = 'Δεν αποθηκεύτηκε';
      });

      row.append(item, remove);
      list.append(row);
    }
    card.append(list);
  }

  card.dataset.ready = 'true';
}

window.addEventListener('ekab:home-ready', update);
window.addEventListener('storage', update);
window.addEventListener('ekab:cloud-applied', update);
setTimeout(update, 0);
