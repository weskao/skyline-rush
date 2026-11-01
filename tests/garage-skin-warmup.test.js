import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('garage scene compiles its shared cosmetic materials before the first visible Studio frame', () => {
  const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(source, /warmupShaders\(renderer, garageStage\.scene, camera, composer\.renderTarget1\)/);
  assert.match(source, /garageWarmupPending/);
});

test('cosmetic selection cannot rebuild GPU resources or alter race simulation data', () => {
  const source = readFileSync(new URL('../src/aero-vfx.js', import.meta.url), 'utf8');
  assert.match(source, /setSkins\(ids\)/);
  assert.match(source, /skinTint\.value\.fromArray/);
  const setter = source.slice(source.indexOf('setSkins(ids)'), source.indexOf('group: local'));
  assert.doesNotMatch(setter, /new THREE\.|\.geometry\s*=|\.player\s*=|\.speed\s*=/);
});
