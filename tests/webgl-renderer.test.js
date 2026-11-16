import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('only a plain production build skips the synchronous shader error check', async () => {
  const { checksShaderErrors } = await import('../src/webgl-renderer.ts');
  assert.equal(checksShaderErrors({ PROD: true }), false, 'production: no per-program getProgramInfoLog stall');
  assert.equal(checksShaderErrors({ PROD: false }), true, 'dev server keeps shader errors in the console');
  assert.equal(checksShaderErrors({ PROD: true, VITE_DIAG: '1' }), true, 'diagnostic builds keep them too');
});

test('the race renderer is made through the shared factory, not a bare WebGLRenderer', () => {
  const world = source('world.js');
  assert.match(world, /const renderer = createRenderer\(canvas\);/);
  assert.doesNotMatch(world, /new THREE\.WebGLRenderer\(/);
  assert.match(source('webgl-renderer.ts'), /renderer\.debug\.checkShaderErrors = checksShaderErrors\(import\.meta\.env\)/);
});
