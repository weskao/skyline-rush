// Phase 2 pipeline integrity check: docs/designs/3d-pipeline/phase2-model-contracts.md §3 step 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGlb } from '../scripts/assets/check-glb.mjs';
import { validEntry } from './model-fixtures.js';

const entry = { ...validEntry(), nodes: ['probe_body', 'wheel_fl'], materials: ['probe_paint', 'probe_tire'] };

/** A summary that satisfies `entry`; each test breaks exactly one thing. */
const summary = (over = {}) => ({
  triangles: 100, bytes: 2000, nodeNames: ['probe_body', 'wheel_fl', 'extra'],
  usedMaterials: ['probe_paint', 'probe_tire'], maxTexturePx: 0,
  animationNames: ['spin'], rawAnimationNames: ['spin'], ...over,
});

test('a conforming summary has no violations', () => {
  assert.deepEqual(checkGlb(summary(), entry), []);
});

test('triangles over budget', () => {
  const v = checkGlb(summary({ triangles: entry.budgets.triangles + 1 }), entry);
  assert.equal(v.length, 1);
  assert.match(v[0], /^triangles:/);
});

test('bytes over budget', () => {
  const v = checkGlb(summary({ bytes: entry.budgets.bytes + 1 }), entry);
  assert.equal(v.length, 1);
  assert.match(v[0], /^bytes:/);
});

test('missing node name is reported exactly, case-sensitively', () => {
  const v = checkGlb(summary({ nodeNames: ['probe_body', 'Wheel_FL'] }), entry);
  assert.deepEqual(v.map(x => x.split(':')[0]), ['nodes']);
  assert.match(v[0], /wheel_fl/);
});

test('unused material is reported', () => {
  const v = checkGlb(summary({ usedMaterials: ['probe_paint'] }), entry);
  assert.deepEqual(v.map(x => x.split(':')[0]), ['materials']);
  assert.match(v[0], /probe_tire/);
});

test('textures over textureMaxPx (0 = no textures allowed)', () => {
  assert.match(checkGlb(summary({ maxTexturePx: 1 }), entry)[0], /^textures:/);
  const textured = { ...entry, budgets: { ...entry.budgets, textureMaxPx: 1024 } };
  assert.deepEqual(checkGlb(summary({ maxTexturePx: 1024 }), textured), []);
  assert.match(checkGlb(summary({ maxTexturePx: 2048 }), textured)[0], /^textures:/);
});

test('animation names must equal the raw export', () => {
  const v = checkGlb(summary({ animationNames: ['spin_2'] }), entry);
  assert.deepEqual(v.map(x => x.split(':')[0]), ['animations']);
  assert.deepEqual(checkGlb(summary({ animationNames: [], rawAnimationNames: [] }), entry), []);
});

test('several broken rules yield one violation each', () => {
  const v = checkGlb(summary({ triangles: 1e9, bytes: 1e9, usedMaterials: ['probe_paint'] }), entry);
  assert.equal(v.length, 3);
});

test('production shape: createModelCache({ baseUrl }) loads the committed probe via the default manifest and Meshopt', async () => {
  const { createModelCache } = await import('../src/asset-model-loader.ts');
  const { readFileSync } = await import('node:fs');
  const glb = readFileSync(new URL('../public/models/pipeline-probe/pipeline-probe.glb', import.meta.url));
  const urls = [];
  const fetch = async (url) => { urls.push(url); return new Response(glb); };
  const handle = await createModelCache({ baseUrl: '/skyline-rush/', fetch }).load('pipeline-probe');
  assert.equal(handle.kind, 'model', `got ${JSON.stringify(handle)}`);
  assert.deepEqual(urls, ['/skyline-rush/models/pipeline-probe/pipeline-probe.glb']);
  assert.ok(handle.instance().getObjectByName('wheel_rr'));
  handle.release();
});
