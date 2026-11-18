const EOP_KEY = 'ekab-eoppep-official-v15';
const SAEK_KEY = 'ekab.saek.exams.v1';
const PHARMA_KEY = 'ekab.pharma.adaptive.v1';
const SEMINAR_KEY = 'ekab.seminar-prep.local.v1';
const MIN_ATTEMPTS = 3;
const SEMINARS = Object.freeze({
  bls: ['BLS / AED', 'seminar-prep.html'],
  pbls: ['PBLS', 'seminar-prep.html'],
  ils: ['ILS', 'seminar-prep.html'],
  phtls: ['PHTLS', 'seminar-prep.html'],
  als: ['ALS', 'seminar-prep.html']
});

function readObject(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 2_000_000) return {};
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function number(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
}

function uniqueIndexes(values, max) {
  return new Set((Array.isArray(values) ? values : [])
    .filter(value => Number.isInteger(value) && value >= 0 && value < max)).size;
}

function candidate(label, correct, attempts, href) {
  if (attempts < MIN_ATTEMPTS) return null;
  return Object.freeze({
    label,
    correct,
    attempts,
    accuracy: Math.round((correct / attempts) * 100),
    href
  });
}

/** Read existing assessment history only; never creates or changes learner data. */
export function weakestStudyArea(storage) {
  try { storage ??= globalThis.localStorage; } catch { return null; }
  if (!storage || typeof storage.getItem !== 'function') return null;
  const areas = [];

  const pharma = readObject(storage, PHARMA_KEY);
  let pharmaCorrect = 0, pharmaAttempts = 0;
  for (const [id, row] of Object.entries(pharma)) {
    if (!/^(?:single|combo)-[a-z0-9-]{1,40}$/.test(id) || !row || typeof row !== 'object') continue;
    const attempts = number(row.attempts);
    pharmaAttempts += attempts;
    pharmaCorrect += Math.min(attempts, number(row.correct));
  }
  const pharmaResult = candidate('Φαρμακολογία', pharmaCorrect, pharmaAttempts, 'farmaka.html#phCaseStage');
  if (pharmaResult) areas.push(pharmaResult);

  const eoppep = readObject(storage, EOP_KEY);
  let eopCorrect = 0, eopAttempts = 0;
  for (const [id, row] of Object.entries(eoppep)) {
    if (!/^EOP-[AB]-\d{3}$/.test(id) || !row || typeof row !== 'object') continue;
    const attempts = number(row.selfAttempts);
    eopAttempts += attempts;
    eopCorrect += Math.min(attempts, number(row.selfCorrect));
  }
  const eopResult = candidate('ΕΟΠΠΕΠ', eopCorrect, eopAttempts, 'eoppep.html');
  if (eopResult) areas.push(eopResult);

  const saek = readObject(storage, SAEK_KEY);
  const history = saek.history && typeof saek.history === 'object' && !Array.isArray(saek.history) ? saek.history : {};
  let saekCorrect = 0, saekAttempts = 0;
  for (const [id, row] of Object.entries(history)) {
    if (!/^saek-(?:0[1-9]|1\d|20)-(?:[1-9]|[1-9]\d)$/.test(id) || !row || typeof row !== 'object') continue;
    const correct = number(row.correct), partial = number(row.partial), incorrect = number(row.incorrect);
    saekCorrect += correct;
    saekAttempts += correct + partial + incorrect;
  }
  const saekResult = candidate('ΣΑΕΚ', saekCorrect, saekAttempts, 'saek-exams.html');
  if (saekResult) areas.push(saekResult);

  const seminarData = readObject(storage, SEMINAR_KEY);
  for (const [id, [label, href]] of Object.entries(SEMINARS)) {
    const row = seminarData[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const scenario = row.scenarioGrades && typeof row.scenarioGrades === 'object' ? Object.values(row.scenarioGrades) : [];
    const correct = uniqueIndexes(row.right, 48) + uniqueIndexes(row.mcRight, 12) + scenario.filter(item => item?.verdict === 'correct').length;
    const incorrect = uniqueIndexes(row.needs, 48) + uniqueIndexes(row.mcNeeds, 12) + scenario.filter(item => item?.verdict === 'incorrect' || item?.verdict === 'partial').length;
    const result = candidate(label, correct, correct + incorrect, href);
    if (result) areas.push(result);
  }

  return areas.sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label, 'el'))[0] || null;
}
