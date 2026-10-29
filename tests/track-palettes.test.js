import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_PALETTES } from '../src/track-palettes.ts';
import { COAST_PALETTE } from '../src/coast-visuals.ts';

test('typed palette catalog preserves the ten existing tracks', () => {
  assert.deepEqual(Object.keys(TRACK_PALETTES).sort(),
    ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic'].sort());
  assert.equal(TRACK_PALETTES.coast, COAST_PALETTE);
  assert.equal(TRACK_PALETTES.neon.road, '#101c2e');
  assert.equal(TRACK_PALETTES.canyon.rail, '#ffc36f');
});
