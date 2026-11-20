import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectSensitive, scanDiff, scanRepository, formatMarkdown } from './repository-hygiene.mjs';

test('identifies secrets without recording the original values', () => {
  const value = 'ghp_' + 'A'.repeat(36);
  const findings = detectSensitive(`const token = '${value}';`, 'sample.js');
  assert.equal(findings[0].kind, 'provider-token');
  assert.equal(findings[0].line, 1);
  assert.doesNotMatch(JSON.stringify(findings), /ghp_A/);
});

test('recognizes new personal data in a changed line only', () => {
  const syntheticEmail = ['some.person', 'realmail.test'].join('@');
  const patch = ['diff --git a/a.md b/a.md', '--- a/a.md', '+++ b/a.md', '@@ -2,0 +3,2 @@', `+contact: ${syntheticEmail}`, '+example: bot@example.com'].join('\n');
  const findings = scanDiff(patch);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
  assert.equal(findings[0].kind, 'email-candidate');
});

test('finds duplicates while omitting binary files, generated data and values from reports', () => {
  const root = mkdtempSync(join(tmpdir(), 'ekab-hygiene-'));
  try {
    mkdirSync(join(root, 'a'));
    mkdirSync(join(root, 'b'));
    mkdirSync(join(root, 'vendor'));
    const common = 'export const description = "' + 'original educational content '.repeat(14) + '";\n';
    writeFileSync(join(root, 'a', 'one.js'), common);
    writeFileSync(join(root, 'b', 'two.js'), common);
    writeFileSync(join(root, 'vendor', 'ignored.js'), 'private content');
    const report = { generatedAt: '2026-11-20T00:00:00Z', ...scanRepository(root) };
    assert.equal(report.scannedFiles, 2);
    assert.equal(report.duplicateFiles.length, 1);
    assert.match(formatMarkdown(report), /Ίδια αρχεία: 1/);
    assert.doesNotMatch(formatMarkdown(report), /original educational content/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
