import test from 'node:test';
import assert from 'node:assert/strict';
import { STORMLINE_MEGACITY, validateStormlineCourse } from '../src/courses/stormline-megacity.ts';

test('obstacle graph metadata rejects unknown edges and nonfinite local distances', () => {
  const first = STORMLINE_MEGACITY.obstacles[0];
  const invalid = {
    ...STORMLINE_MEGACITY,
    obstacles: [
      { ...first, id: 'ghost', edge: 'not-an-edge' },
      { ...first, id: 'nonfinite', s: Number.POSITIVE_INFINITY },
      { ...first, id: 'oversized', lateral: 100, radius: 3 },
    ],
  };
  const problems = validateStormlineCourse(invalid);
  for (const expected of ['Unknown obstacle edge ghost', 'Invalid obstacle distance nonfinite', 'Invalid obstacle bounds oversized']) {
    assert.ok(problems.includes(expected), `Missing validation: ${expected}, got ${problems.join('; ')}`);
  }
});

test('unsafe barriers, duplicate obstacles and non-solid puddle violations fail validation', () => {
  const construction = STORMLINE_MEGACITY.obstacles.find(o => o.kind === 'construction');
  const puddle = STORMLINE_MEGACITY.obstacles.find(o => o.kind === 'puddle');
  const invalid = {
    ...STORMLINE_MEGACITY,
    obstacles: [
      { ...construction, lateral: 2, radius: 2 },
      { ...construction },
      { ...puddle, solid: true },
    ],
  };
  const problems = validateStormlineCourse(invalid);
  assert.ok(problems.includes(`Center lane blocked ${construction.id}`), problems.join('; '));
  assert.ok(problems.includes(`Duplicate obstacle ${construction.id}`), problems.join('; '));
  assert.ok(problems.includes(`Invalid obstacle solidity ${puddle.id}`), problems.join('; '));
});

test('checkpoint height gate must cover its authored node with finite ordered bounds', () => {
  const invalid = {
    ...STORMLINE_MEGACITY,
    checkpoints: STORMLINE_MEGACITY.checkpoints.map((gate, i) =>
      i === 0 ? { ...gate, minY: 50, maxY: 20 } : gate),
  };
  assert.ok(validateStormlineCourse(invalid).includes('Invalid checkpoint height a'));
});
