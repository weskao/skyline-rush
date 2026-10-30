import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const stage = readFileSync(new URL('../src/garage-stage.ts', import.meta.url), 'utf8');
test('studio teardown must not dispose shared car-model geometry', () => {
  // makeCar uses shared global box, lamp, spoke, cabin and style.body geometry.
  const dispose = stage.slice(stage.indexOf('function dispose()'));
  assert.doesNotMatch(dispose, /scene\.traverse\([\s\S]*?object\.geometry\.dispose\(\)/,
    'disposing geometry through the whole scene invalidates shared meshes in the race');
  assert.match(dispose, /stageMeshes/);
});
