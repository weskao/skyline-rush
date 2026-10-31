import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const stage = readFileSync(new URL('../src/garage-stage.ts', import.meta.url), 'utf8');
test('studio teardown does not dispose shared car geometry', () => {
  const teardown = stage.slice(stage.indexOf('function dispose()'));
  assert.doesNotMatch(teardown, /scene\.traverse\([\s\S]*?object\.geometry\.dispose\(\)/);
  assert.match(teardown, /for \(const mesh of stageMeshes\)/);
});
test('stage material disposal handles both single and multi-material Three.js meshes', () => {
  assert.match(stage, /Array\.isArray\(mesh\.material\)/);
});
