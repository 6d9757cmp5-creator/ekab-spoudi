/* Supplementary questions in the existing exam sequence; official progress stays separate. */
(() => {
  const key = 'ekab-verified-stats-v1';
  const node = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
  window.EkabAdditionalQuestion = function (question, position, total, advance) {
    const study = document.getElementById('study'); study.dataset.supplementary = 'true';
    let panel = document.getElementById('supplementaryPanel');
    if (!panel) { panel = node('div'); panel.id = 'supplementaryPanel'; study.append(panel); }
    panel.hidden = false; panel.replaceChildren(node('p', 'Συμπληρωματική άσκηση · εκτός των 314 επίσημων · ' + position + '/' + total),
      node('h2', question.question));
    const options = node('div'); options.className = 'supplementary-mixed-options';
    const feedback = node('div'); feedback.setAttribute('aria-live', 'polite');
    let answered = false;
    question.options.forEach((text, index) => {
      const button = node('button', text); button.type = 'button'; button.className = 'btn secondary';
      button.addEventListener('click', () => {
        if (answered) return; answered = true;
        const correct = index === question.answer;
        try {
          const stats = JSON.parse(localStorage.getItem(key) || '{}');
          window.EkabAdditionalPractice.record(stats, question.id, correct);
          localStorage.setItem(key, JSON.stringify(stats));
        } catch { feedback.append(node('p', 'Η απάντηση δεν μπόρεσε να αποθηκευτεί.')); }
        for (const [i, option] of [...options.children].entries()) {
          option.disabled = true;
          if (i === question.answer) option.textContent = 'Σωστή απάντηση: ' + question.options[i];
        }
        feedback.append(node('strong', correct ? 'Σωστό.' : 'Λάθος.'), node('p', question.explanation));
        if (typeof question.source === 'string' && question.source.startsWith('https://')) {
          const source = node('a', 'Πηγή συμπληρωματικής άσκησης'); source.href = question.source;
          source.target = '_blank'; source.rel = 'noopener noreferrer'; feedback.append(source);
        }
      }); options.append(button);
    });
    const next = node('button', 'Επόμενη ερώτηση'); next.type = 'button'; next.className = 'btn'; next.addEventListener('click', () => advance(1));
    const exit = node('button', 'Ρυθμίσεις εξάσκησης'); exit.type = 'button'; exit.className = 'btn secondary';
    exit.addEventListener('click', () => { study.classList.add('hidden'); document.getElementById('setup').classList.remove('hidden'); });
    panel.append(options, feedback, next, exit);
  };
})();
