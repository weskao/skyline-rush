import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECTION_SIGN_LABELS } from '../src/section-signs.ts';

test('section sign materials are built outside world.js, one painted canvas per sign type', async () => {
  const painted = [];
  const context = new Proxy({}, { get: (target, key) => key === 'measureText' ? () => ({ width: 10 }) : (...args) => { painted.push(String(key)); return args; }, set: () => true });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try {
    const { createSectionSignMaterials } = await import('../src/section-sign-materials.ts');
    const { signs, signTextures, signPaints } = createSectionSignMaterials();
    const types = Object.keys(SECTION_SIGN_LABELS);
    assert.deepEqual(Object.keys(signs), types);
    assert.equal(signTextures.length, types.length);
    assert.equal(signPaints.length, types.length);
    assert.equal(signs.gap.side, 2, 'DoubleSide');
    assert.equal(signs.gap.map, signTextures[types.indexOf('gap')]);
    for (const texture of signTextures) assert.equal(texture.colorSpace, 'srgb');
  } finally { delete globalThis.document; }
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /sign\.width = 512/);
  assert.match(world, /createSectionSignMaterials\(\)/);
});
