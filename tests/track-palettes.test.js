import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_PALETTES } from '../src/track-palettes.ts';
import { COAST_PALETTE } from '../src/coast-visuals.ts';

test('typed palette catalog preserves the ten existing tracks and adds the separate circuit and gated Frostbite', () => {
  assert.deepEqual(Object.keys(TRACK_PALETTES).sort(),
    ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic','harbor-circuit','frostbite-canyon','dune-tempest','skyfall-archipelago'].sort());
  assert.equal(TRACK_PALETTES.coast, COAST_PALETTE);
  assert.equal(TRACK_PALETTES.neon.road, '#101c2e');
  assert.equal(TRACK_PALETTES.canyon.rail, '#ffc36f');
  assert.equal(TRACK_PALETTES['dune-tempest'].road, '#d4a064');
});


test('Dune and Skyfall CourseGraph races have complete WebGL theme palettes', () => {
  for (const id of ['dune-tempest', 'skyfall-archipelago']) {
    const palette = TRACK_PALETTES[id];
    assert.ok(palette, `${id} must not crash when the race renderer selects a fog palette`);
    for (const key of ['top', 'horizon', 'fog', 'rock', 'road', 'ground', 'rail', 'sun']) {
      assert.match(palette[key], /^#[0-9a-f]{6}$/i, `${id}.${key}`);
    }
    assert.ok(Number.isFinite(palette.warmth), `${id} warmth`);
  }
  assert.notEqual(TRACK_PALETTES['dune-tempest'].fog, TRACK_PALETTES['skyfall-archipelago'].fog);
});
