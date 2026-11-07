// Task 4: optimize-glb adds KTX2 passes only for entries that opt in to the ktx2 decoder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeSteps } from '../scripts/assets/optimize-glb.mjs';
import { validEntry } from './model-fixtures.js';

const KEEP = ['--flatten', 'false', '--join', 'false', '--palette', 'false', '--simplify', 'false', '--instance', 'false', '--prune', 'false'];

test('meshopt-only entries keep the single Phase 2 optimize step', () => {
  assert.deepEqual(optimizeSteps({ ...validEntry(), decoders: ['meshopt'] }, 'raw.glb', 'out.glb'), [
    ['optimize', 'raw.glb', 'out.glb', '--compress', 'meshopt', '--texture-compress', 'false', ...KEEP],
  ]);
});

test('ktx2 entries add UASTC for data slots, then ETC1S for colour slots, ending at the output path', () => {
  const steps = optimizeSteps({ ...validEntry(), decoders: ['meshopt', 'ktx2'] }, 'raw.glb', 'out.glb');
  assert.deepEqual(steps.map(s => s[0]), ['optimize', 'uastc', 'etc1s']);
  assert.equal(steps[0][1], 'raw.glb');
  assert.equal(steps[1][1], steps[0][2], 'each step reads the previous output');
  assert.equal(steps[2][1], steps[1][2]);
  assert.equal(steps[2][2], 'out.glb');
  assert.deepEqual(steps[1].slice(steps[1].indexOf('--slots'), steps[1].indexOf('--slots') + 2), ['--slots', '{normalTexture,occlusionTexture,metallicRoughnessTexture}']);
  assert.deepEqual(steps[2].slice(steps[2].indexOf('--slots'), steps[2].indexOf('--slots') + 2), ['--slots', '{baseColorTexture,emissiveTexture}']);
});
