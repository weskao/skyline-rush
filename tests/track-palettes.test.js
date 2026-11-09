import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_PALETTES } from '../src/track-palettes.ts';
import { COAST_PALETTE } from '../src/coast-visuals.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';

test('every registered CourseGraph runtime has a complete renderer palette', () => {
  for (const id of Object.keys(COURSE_RUNTIMES)) {
    const palette = TRACK_PALETTES[id];
    assert.ok(palette, `${id} needs lighting before its first racing frame`);
    for (const key of ['top', 'horizon', 'fog', 'rock', 'road', 'ground', 'rail', 'sun']) {
      assert.match(palette[key], /^#[0-9a-f]{6}$/i, `${id}.${key}`);
    }
    assert.ok(Number.isFinite(palette.warmth));
  }
});

test('typed palette catalog preserves the ten existing tracks and adds the separate circuit and gated Frostbite', () => {
  assert.deepEqual(Object.keys(TRACK_PALETTES).sort(),
    ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic','harbor-circuit','frostbite-canyon','dune-tempest','skyfall-archipelago','stormline-megacity','volcanic-crown','monsoon-ruins'].sort());
  assert.equal(TRACK_PALETTES.coast, COAST_PALETTE);
  assert.equal(TRACK_PALETTES.neon.road, '#101c2e');
  assert.equal(TRACK_PALETTES.canyon.rail, '#ffc36f');
  assert.equal(TRACK_PALETTES['dune-tempest'].road, '#d4a064');
  for (const id of Object.keys(COURSE_RUNTIMES)) {
    assert.ok(TRACK_PALETTES[id], `shared world renderer needs a palette for ${id}`);
  }
});

test('Dune and Skyfall CourseGraph races keep distinct sky/fog identities', () => {
  assert.notEqual(TRACK_PALETTES['dune-tempest'].fog, TRACK_PALETTES['skyfall-archipelago'].fog);
});
