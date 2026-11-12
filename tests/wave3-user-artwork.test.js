import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hashes = Object.freeze({
  'mission-race': 'fee8decd17df4080cd097b80f4bfb24957054a1536e1292ae48f446028210a4b',
  'mission-time': '150a34542abed975fdbd0683a5301a30717be879fb8ac16aeacb057ef611f70d',
  'mission-drift': '0db731c9986cf169143a7046546730b052a443b5d352b3f7d1cf320730c93c6e',
  'mission-combo': '011b0ad79743531d1bf02db4c81430899d43e055951c3c953c31097390588d27',
  'trophy-bronze': 'd1d8fbefda0bcf306556749efed72dba86013ec949038f0db307af0355cbd3cf',
  'trophy-silver': '2dfd940f87e163d7d82a053e99088bc63cbdfa734bd5f45e28e3874d073d2115',
  'trophy-gold': '42a8db5d8f030f577ecb79dbba6b4fd67d6a41a27fa6227e21a154c484ae33d6',
  'trophy-platinum': '2482bac8518bf91b7154fc9e15038e5f651346fdfa49047afc7091207551eeb5',
  'wallet-coin': 'a0c42b13f31a377b094552e44c7865b2c3cf11e2d8d624933f63059debd74e2d',
  'wallet-diamond': '5e50dfff5309c4c7936090823497a1d8f632b8d312c67b2ae86a2fc52e6c5ba7',
});

test('the exact ten original 3D screenshot cutouts are committed, not placeholder illustrations', () => {
  assert.equal(Object.keys(hashes).length, 10);
  for (const [id, expectedHash] of Object.entries(hashes)) {
    const dir = id.startsWith('wallet-') ? 'wave3-demo' : 'garage-rewards-and-missions';
    const path = new URL(`../public/feature-assets/${dir}/raster/${id}@3x.webp`, import.meta.url);
    const file = readFileSync(path);
    assert.equal(file.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(file.toString('ascii', 8, 12), 'WEBP', id);
    assert.equal(file.toString('ascii', 12, 16), 'VP8X', id);
    const size = id.startsWith('wallet-') ? 144 : 288;
    assert.equal(file.readUIntLE(24, 3) + 1, size, id + ' width');
    assert.equal(file.readUIntLE(27, 3) + 1, size, id + ' height');
    assert.ok(file[20] & 0x10, id + ' must have transparency');
    assert.equal(createHash('sha256').update(file).digest('hex'), expectedHash,
      id + ' must be the transparent image cut from the approved uploaded 3D reference sheet');
  }
});

test('wallet, mission and trophies use their screenshot originals in actual Garage UI', () => {
  const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
  const wallet = read('Wave3CurrencyStrip.vue');
  const board = read('GarageMissionBoard.vue');
  const garage = read('GaragePanel.vue');
  const gallery = read('GarageSourceArtGallery.vue');
  const catalog = read('garage-wave3-preview-catalog.ts');
  for (const id of Object.keys(hashes)) {
    if (id.startsWith('wallet-')) assert.match(wallet, new RegExp(id + '@3x\\.webp'), id);
    else {
      assert.match(catalog, new RegExp(id), id + ' in Garage catalog');
      assert.match(board + gallery, /garage-rewards-and-missions\/raster/, id + ' dynamic source');
    }
  }
  assert.match(garage, /<Wave3CurrencyStrip/);
  assert.match(garage, /<GarageMissionBoard/);
  assert.match(garage, /category="garage-rewards-and-missions"/);
  assert.match(board, /:src="asset\(item.id\)"/);
});
