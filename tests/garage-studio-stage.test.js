import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('studio uses an independent Three.js scene and preserves the single renderer', () => {
  const stage = source('garage-stage.ts');
  assert.match(stage, /new THREE\.Scene\(\)/);
  assert.match(stage, /makeCar\(CAR_STYLES\.roadster\)/);
  assert.doesNotMatch(stage, /new THREE\.WebGLRenderer|document\.createElement\(['"]canvas/);
  const world = source('world.js');
  assert.match(world, /renderPass\.scene = garageStage\.scene/);
  assert.match(world, /renderPass\.scene = scene/);
});
test('studio has bounded full-silhouette inspection and disposes stage-owned resources', () => {
  const stage = source('garage-stage.ts');
  assert.match(stage, /inspectBounds/);
  assert.match(stage, /setFromObject\(car\)/);
  assert.match(stage, /camera\.aspect/);
  assert.match(stage, /geometry\.dispose\(\)/);
});
