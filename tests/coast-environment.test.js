// A low HDRI sun, once the environment is turned so it sits ahead of the car (coast-sky.ts), is mirrored by the wet
// road: uncapped it is a white-out over the whole road (seen in WebGL, rain and dusk, 2026-11-14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DataUtils } from 'three';
import { capRadiance } from '../src/coast-environment.ts';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';

const half = values => Uint16Array.from(values, DataUtils.toHalfFloat);
const floats = data => Array.from(data, DataUtils.fromHalfFloat);

test('capRadiance scales a too-bright texel down to the cap and keeps its hue; the rest is untouched', () => {
  const data = half([0.5, 0.25, 0.125, 1, 3, 1.5, 0.75, 1, 60000, 30000, 15000, 1, 4, 4, 2, 1]);
  capRadiance(data, 4);
  const out = floats(data);
  assert.deepEqual(out.slice(0, 8), [0.5, 0.25, 0.125, 1, 3, 1.5, 0.75, 1], 'under the cap: bit-identical');
  assert.deepEqual(out.slice(8, 12), [4, 2, 1, 1], 'the sun: brightest channel at the cap, ratios kept, alpha kept');
  assert.deepEqual(out.slice(12), [4, 4, 2, 1], 'at the cap: untouched');
});

test('every variant whose sun is low enough for the road to mirror it caps its environment radiance', () => {
  for (const [name, v] of Object.entries(COAST_ENV_VARIANTS)) {
    const elevation = Math.asin(v.sky.sunDirection[1]) * 180 / Math.PI;
    if (elevation < 15) assert.ok(v.radianceCap >= 1 && v.radianceCap <= v.sky.range, `${name}: capped at or under what the sky dome itself shows`);
  }
});
