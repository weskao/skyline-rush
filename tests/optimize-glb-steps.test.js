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

test('ktx2 entries encode each slot before meshopt (no lossy meshopt re-encode), chaining to the output', () => {
  const steps = optimizeSteps({ ...validEntry(), decoders: ['meshopt', 'ktx2'] }, 'raw.glb', 'out.glb');
  assert.deepEqual(steps.map(s => [s[0], s.find(a => a.startsWith('--slots='))]), [
    ['uastc', '--slots=normalTexture'],
    ['uastc', '--slots=occlusionTexture'],
    ['uastc', '--slots=metallicRoughnessTexture'],
    ['etc1s', '--slots=baseColorTexture'],
    ['etc1s', '--slots=emissiveTexture'],
    ['optimize', undefined],
  ]);
  assert.equal(steps[0][1], 'raw.glb');
  for (let i = 1; i < steps.length; i++) assert.equal(steps[i][1], steps[i - 1][2], `step ${i} reads the previous output`);
  assert.equal(steps.at(-1)[2], 'out.glb');
  // gltf-transform rejects `--flag value` after --slots ("Too many arguments"); options use `--flag=value` or a bare boolean.
  for (const step of steps.slice(0, -1)) assert.ok(step.slice(3).every(a => /^--[a-z-]+(=\S+)?$/.test(a)), step.join(' '));
  // RDO only on the smooth AO map (keeps roadster2 inside its byte budget); normals stay plain UASTC to avoid block artefacts.
  assert.deepEqual(steps.map(s => s.includes('--rdo')), [false, true, false, false, false, false]);
});

test('low LOD: simplify then halve textures before the KTX2 passes, keeping the same meshopt flags', () => {
  const entry = { ...validEntry(), decoders: ['meshopt', 'ktx2'] };
  const full = optimizeSteps(entry, 'raw.glb', 'out.glb');
  const low = optimizeSteps(entry, 'raw.glb', 'low.glb', { lod: 'low' });
  assert.deepEqual(low.slice(0, 2).map(s => s[0]), ['simplify', 'resize']);
  assert.equal(low[0][1], 'raw.glb');
  assert.ok(low[1].includes('--width=512') && low[1].includes('--height=512'), low[1].join(' '));
  for (let i = 1; i < low.length; i++) assert.equal(low[i][1], low[i - 1][2], `step ${i} reads the previous output`);
  assert.equal(low.at(-1)[2], 'low.glb');
  // after the LOD prep, the chain is the full chain (same KTX2 passes and meshopt flags)
  assert.deepEqual(low.slice(2).map(s => [s[0], ...s.slice(3)]), full.map(s => [s[0], ...s.slice(3)]));
  // pivots and named nodes survive: simplify never flattens/joins and keeps borders so the UV atlas stays seamless
  assert.ok(low[0].includes('--lock-border'), low[0].join(' '));
  for (const step of low.slice(0, 2)) assert.ok(step.slice(3).every(a => /^--[a-z-]+(=\S+)?$/.test(a)), step.join(' '));
});
