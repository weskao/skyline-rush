import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../public/feature-assets/road-pickups/animated/', import.meta.url);
const expected = Object.freeze({
  cell: ['24ef43f5233c23ab0f5742815b37f62574805e3a9926533c373268eeb68b3d05', '7d4a840c040a13fc1e96e4d36b1d84463abd1490fd70fef864125798fd3cc699'],
  can: ['fb4dae2d218dbdf5892746bc2443c983b316c4107c863136f39d8bf0f2410484', 'b7e7044a05c579f62c47036e563ae7f3b88bf783576d29157512ba6969470948'],
  tank: ['2b8961c152420d9e301d6f8f4a4985f292c8e77fb13f3f3b2fa706a048c3a9f5', '841cbcf48a0039757ef59a17d6cda9b20ccdd685aa5320b787b0c12ec095c74d'],
  overcharge: ['8f883d4207fad9297fd4de42fe8d335075e3e8895bbdfe31141ce2cc1ff79ebc', '13e1ace446101373af413768a004114ff27629b4fb42f9f2f6f2b5a7d56c0e29'],
});
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const path = (tier, poster = false) => new URL(tier + (poster ? '-poster' : '') + '.webp', base);

test('GPT sprite bundle is complete, not a partially uploaded or broken collection', t => {
  const tiers = Object.keys(expected);
  const missing = tiers.flatMap(tier => [path(tier), path(tier, true)].filter(url => !existsSync(url)).map(url => url.pathname));
  if (missing.length === 8) {
    t.skip('The original binary WebP bundle has not been uploaded yet; the game intentionally uses real-time 3D/SVG fallback.');
    return;
  }
  assert.deepEqual(missing, [], 'all eight WebP files must be installed as one coherent set');
  for (const tier of tiers) {
    for (const poster of [false, true]) {
      const buffer = readFileSync(path(tier, poster));
      assert.equal(buffer.subarray(0, 4).toString(), 'RIFF');
      assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
      assert.equal(sha(buffer), expected[tier][Number(poster)]);
      if (!poster) {
        assert.ok(buffer.includes(Buffer.from('ANIM')), tier + ' must use an animated WebP container');
        assert.equal(buffer.toString('latin1').match(/ANMF/g)?.length, 16, tier + ' needs 16 real animation frames');
      }
    }
  }
});
