#!/usr/bin/env node
// Read-only repository hygiene and pre-push gate. Never print matched values.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'third_party', 'dist', 'build', 'coverage', 'audit-results', 'automation-reports']);
const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.jsonc', '.md', '.html', '.css', '.yml', '.yaml', '.toml', '.properties', '.py', '.sh', '.ps1', '.txt']);
const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const MAX_FILE_BYTES = 1_000_000;
const MAX_FINDINGS = 400;

const sensitivePatterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'critical'],
  ['provider-token', /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{25,}|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{15,}|sk_(?:live|test)_[A-Za-z0-9]{16,})\b/g, 'critical'],
  ['bearer-literal', /\bBearer\s+[A-Za-z0-9._-]{30,}\b/g, 'critical'],
  ['hardcoded-secret-candidate', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password)\b\s*[:=]\s*['"`]([^'"`\n]{20,})['"`]/gi, 'review'],
  ['email-candidate', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'review'],
  ['greek-mobile-candidate', /(?:^|[^\d])(?:\+30[\s-]*)?69\d{8}(?!\d)/g, 'review']
];

function safePath(path) { return path.replaceAll('\\', '/'); }
function lineNumber(content, index) { return content.slice(0, index).split('\n').length; }
export function detectSensitive(content, path) {
  const matches = [];
  for (const [kind, pattern, severity] of sensitivePatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const value = match[1] ?? match[0];
      if (kind === 'hardcoded-secret-candidate' && /^(?:example|placeholder|your[_-]|fake|dummy|replace|changeme|test[_-]|\$\{|process\.|env\.)/i.test(value)) continue;
      if (kind === 'email-candidate' && /@(?:example\.(?:com|org|net)|localhost|test\.invalid)$/i.test(value)) continue;
      matches.push({ kind, severity, path, line: lineNumber(content, match.index) });
      if (matches.length >= MAX_FINDINGS) return matches;
    }
  }
  return matches;
}

function filesUnder(root) {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(full); continue; }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      const isSensitiveName = /(?:^|\.)env(?:\.|$)|credential|secret|token|private.*key/i.test(entry.name);
      if ((TEXT_EXT.has(ext) || isSensitiveName) && statSync(full).size <= MAX_FILE_BYTES) files.push(full);
    }
  }
  walk(root);
  return files.sort();
}

export function scanRepository(root) {
  const files = filesUnder(root);
  const findings = [], exact = new Map(), blocks = new Map(), duplicateFiles = [], duplicateBlocks = [];
  const safeJsonCandidates = [];
  for (const full of files) {
    const path = safePath(relative(root, full));
    const data = readFileSync(full, 'utf8');
    findings.push(...detectSensitive(data, path));
    const digest = createHash('sha256').update(data).digest('hex');
    if (data.length >= 200 && exact.has(digest)) duplicateFiles.push({ first: exact.get(digest), second: path });
    else exact.set(digest, path);
    if (extname(path) === '.json' && /[\t ]+$/m.test(data)) {
      try { JSON.parse(data); safeJsonCandidates.push(path); } catch { /* not a valid JSON target */ }
    }
    if (!SOURCE_EXT.has(extname(path)) || /(?:\.min\.|\.test\.|\.spec\.)/.test(path)) continue;
    const lines = data.split(/\r?\n/);
    for (let i = 0; i + 11 < lines.length; i += 4) {
      const chunk = lines.slice(i, i + 12).map(x => x.trim()).join('\n');
      if (chunk.length < 360) continue;
      const hash = createHash('sha256').update(chunk).digest('hex');
      const previous = blocks.get(hash);
      if (previous && previous.path !== path && duplicateBlocks.length < 100) duplicateBlocks.push({ first: previous, second: { path, line: i + 1 } });
      else if (!previous) blocks.set(hash, { path, line: i + 1 });
    }
  }
  return { scannedFiles: files.length, findings: findings.slice(0, MAX_FINDINGS), truncatedFindings: findings.length > MAX_FINDINGS,
    duplicateFiles: duplicateFiles.slice(0, 100), duplicateBlocks: duplicateBlocks.slice(0, 100),
    fixableJson: safeJsonCandidates.length, safeJsonCandidates: safeJsonCandidates.slice(0, 100) };
}

export function scanDiff(diff) {
  const findings = [];
  let path = '';
  let line = 0;
  for (const raw of diff.split(/\r?\n/)) {
    const file = raw.match(/^\+\+\+ b\/(.+)$/);
    if (file) { path = file[1]; continue; }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { line = Number(hunk[1]); continue; }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      // Existing values are never copied into the report or console.
      const found = detectSensitive(raw.slice(1), path);
      findings.push(...found.map(f => ({ ...f, line })));
      line++;
    } else if (raw.startsWith(' ')) line++;
  }
  return findings.slice(0, MAX_FINDINGS);
}

export function formatMarkdown(report) {
  const counts = report.findings.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {});
  const rows = Object.entries(counts).map(([type, count]) => `| ${type} | ${count} |`).join('\n') || '| Δεν καταγράφηκαν υποψίες | 0 |';
  const locations = report.findings.slice(0, 80).map(x => `- ${x.kind} (${x.severity}): \`${x.path}:${x.line}\``).join('\n') || '- Κανένα εύρημα';
  const duplicateLocations = report.duplicateFiles.slice(0, 30).map(x => `- Ίδιο αρχείο: \`${x.first}\` / \`${x.second}\``).join('\n') || '- Δεν βρέθηκαν ακριβώς ίδια αρχεία';
  const fixLocations = (report.safeJsonCandidates || []).slice(0, 40).map(x => `- \`${x}\``).join('\n') || '- Δεν βρέθηκαν υποψήφιες μικροδιορθώσεις JSON';
  return `# ΕΚΑΒ Σπουδή — αυτοματοποιημένος έλεγχος repository\n\nΗμερομηνία (UTC): ${report.generatedAt}\n\nΑρχεία που ελέγχθηκαν: ${report.scannedFiles}. Οι ενδείξεις **δεν αποδεικνύουν** πραγματική διαρροή. Δεν αποθηκεύονται τιμές κλειδιών ή προσωπικών δεδομένων.\n\n| Κατηγορία | Πλήθος |\n|---|---:|\n${rows}\n\n## Σημεία για ανθρώπινο έλεγχο\n${locations}\n\n## Διπλότυπα\n- Ίδια αρχεία: ${report.duplicateFiles.length}\n- Παρόμοια ακριβή τμήματα κώδικα: ${report.duplicateBlocks.length}\n${duplicateLocations}\n\n## Προτεινόμενες μικροδιορθώσεις\nJSON αρχεία με διορθώσιμα κενά: ${report.fixableJson}.\n${fixLocations}\n\n**Κανένα στοιχείο δεν διαγράφεται και καμία αλλαγή δεν δημοσιεύεται αυτόματα.**\n`;
}

function run() {
  const args = process.argv.slice(2);
  const reportDir = args.includes('--report-dir') ? args[args.indexOf('--report-dir') + 1] : 'automation-reports';
  const root = process.cwd();
  const report = { generatedAt: new Date().toISOString(), ...scanRepository(root) };
  if (args.includes('--staged') || args.includes('--diff-base')) {
    const diffArgs = args.includes('--staged') ? ['diff', '--cached', '--no-ext-diff', '--unified=0'] :
      ['diff', '--no-ext-diff', '--unified=0', `${args[args.indexOf('--diff-base') + 1]}...HEAD`];
    const patch = execFileSync('git', diffArgs, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    report.newFindings = scanDiff(patch);
  }
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(reportDir, 'latest.md'), formatMarkdown(report));
  const critical = (report.newFindings || report.findings).filter(x => x.severity === 'critical');
  const newPersonal = (report.newFindings || []).filter(x => x.severity === 'review');
  console.log(`Hygiene: ${report.scannedFiles} files, ${report.findings.length} candidates, ${report.duplicateFiles.length} exact duplicates, ${report.duplicateBlocks.length} repeated code blocks.`);
  console.log(`Reports written to ${reportDir} (values redacted).`);
  if (critical.length || newPersonal.length) {
    console.error(`BLOCKED: ${critical.length} possible secrets, ${newPersonal.length} new personal-data candidates. Inspect the report before proceeding.`);
    process.exitCode = 1;
  }
}
if (process.argv[1] && /repository-hygiene\.mjs$/.test(basename(process.argv[1]))) run();
