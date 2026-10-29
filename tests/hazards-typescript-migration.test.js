import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('hazard creation and oscillation have one strictly typed source', async () => {
  assert.equal(existsSync(new URL('../src/hazards.ts', import.meta.url)), true,
    'Gauntlet obstacle generation should use native TypeScript');
  assert.equal(existsSync(new URL('../src/hazards.js', import.meta.url)), false,
    'do not retain duplicate untyped hazard implementations');
  const { createHazards, hazardX } = await import('../src/hazards.ts');
  const track = { seed: 42, length: 5000, sections: [
    { type: 'tunnel', from: 600, to: 1000 },
    { type: 'shortcut', from: 2100, to: 2400 },
  ] };
  const lanes = [-7.5, -2.5, 2.5, 7.5];
  const standard = createHazards(track, lanes, 'standard');
  assert.deepEqual(createHazards(track, lanes, 'standard'), standard);
  assert.ok(standard.length > 0);
  assert.ok(standard.every(h => Number.isFinite(h.distance) && Number.isFinite(h.x)));
  assert.ok(standard.every(h => !track.sections.some(s =>
    h.distance >= s.from - 35 && h.distance <= s.to + 35)));
  assert.ok(standard.every(h => Math.abs(hazardX(h, 10)) <= 9));
  assert.deepEqual(createHazards(track, lanes, 'extreme'), createHazards(track, lanes, 'extreme'));
  assert.throws(() => createHazards({ ...track, seed: NaN }, lanes), /Invalid gauntlet rules/);
  assert.throws(() => createHazards(track, [Infinity]), /Invalid gauntlet rules/);
});
