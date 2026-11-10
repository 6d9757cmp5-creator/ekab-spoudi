import test from 'node:test';
import assert from 'node:assert/strict';
import { educationalRhythmCases, createSyntheticEcg, toSvgPoints } from './ecg-synthetic.mjs';

test('recognition trainer contains eleven distinct labelled cases', () => {
  assert.equal(educationalRhythmCases.length, 11);
  assert.equal(new Set(educationalRhythmCases.map(({ id }) => id)).size, 11);
  for (const entry of educationalRhythmCases) {
    assert.ok(entry.id && entry.label && entry.explanation);
    assert.equal(typeof entry.sample, 'function');
  }
});

test('all schematic cases return finite samples across 12 seconds', () => {
  for (const entry of educationalRhythmCases) {
    for (let i = 0; i <= 1200; i++) {
      const sample = entry.sample(i / 100);
      assert.ok(Number.isFinite(sample), `${entry.id} invalid at sample ${i}`);
      assert.ok(Math.abs(sample) <= 20, `${entry.id} out-of-range schematic sample`);
    }
  }
});

test('legacy P-QRS-T generator remains available and rejects invalid rates', () => {
  const example = createSyntheticEcg({ bpm: 75, seconds: 6, samples: 480 });
  assert.equal(example.points.length, 480);
  assert.ok(example.points.every(point => Number.isFinite(point.value)));
  assert.ok(toSvgPoints(example).length > 1000);
  assert.throws(() => createSyntheticEcg({ bpm: 15 }));
});
