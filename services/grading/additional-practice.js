/* Shared scoring for the existing supplementary multiple-choice bank. */
(() => {
  window.EkabAdditionalPractice = {
    key: 'ekab-verified-stats-v1',
    record(stats, id, correct) {
      const previous = stats[id] || { n: 0, c: 0, streak: 0 };
      stats[id] = { n: previous.n + 1, c: previous.c + (correct ? 1 : 0), streak: correct ? previous.streak + 1 : 0 };
      return stats[id];
    }
  };
})();
