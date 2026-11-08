// Task 4 KTX2 textures: the world builds one KTX2Loader for the model cache; the transcoder ships under BASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createKtx2Provider } from '../src/garage-model.ts';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);

test('provider: transcoder path follows BASE_URL, support is detected on the existing renderer, built once', async () => {
  const detected = [];
  const renderer = { id: 'world-renderer' };
  class FakeKtx2 {
    setTranscoderPath(path) { this.path = path; return this; }
    detectSupport(r) { detected.push(r); return this; }
  }
  const provide = createKtx2Provider(renderer, '/skyline-rush/', async () => FakeKtx2);
  const [a, b] = await Promise.all([provide(), provide()]);
  assert.equal(a, b, 'one loader per world');
  assert.equal(a.path, '/skyline-rush/basis/');
  assert.deepEqual(detected, [renderer]);
});

test('public/basis transcoder is byte-identical to the installed three.js copy', () => {
  const dir = require.resolve('three/examples/jsm/libs/basis/basis_transcoder.js').replace(/basis_transcoder\.js$/, '');
  for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
    assert.ok(readFileSync(new URL(`public/basis/${file}`, root)).equals(readFileSync(dir + file)), file);
  }
});
