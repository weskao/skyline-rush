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

test('the race canvas has no depth buffer: only the lens quad draws to it, every scene pass has its own target', () => {
  assert.match(source('webgl-renderer.ts'), /new WebGLRenderer\(\{[^}]*\bdepth: false\b[^}]*\}\)/);
  const world = source('world.js');
  // The lens is the last pass and is never disabled, so RenderPass (which would draw the scene to screen) never renders to null.
  assert.match(world, /composer\.addPass\(lens\);/);
  assert.doesNotMatch(world, /\b(renderPass|bloom|lens)\.enabled\s*=/);
  assert.doesNotMatch(world, /composer\.addPass\([^)]*\);[\s\S]*composer\.addPass\(lens\)[\s\S]*composer\.addPass\(/);
});
