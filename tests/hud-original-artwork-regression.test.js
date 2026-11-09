import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ART_DIR = new URL('../public/feature-assets/mobile-controls-hud/raster/', import.meta.url);
const DISCARDED_REDESIGN = {
  'button-back': '37e5e119d1e5f01f944012c556488e9d364b2e6d',
  'button-coming-soon': 'a14401aac41d32ecb28612f97a69443012bbd39b',
  'button-garage': '1b16dd3df6e551d15013d7df3e1de388b4675b10',
  'button-nitro': 'c4defa68381f649a14207eb7510c0de6adfa6dab',
  'button-play': '582deac7c3e085502cca6489ef98163d31737750',
  'button-retry': 'f8966eab2fe2a24b45f5f3a956a8055bd9ee4500',
  'hud-brake': '9a13f60fcfbc9230e7a2b9fb3e8bce1aad32ca92',
  'hud-combo': 'f5ac21ce06ba0fa86be934319658ecdcf5e3ea47',
  'hud-drift': '50e2c019a7c9d9dbae105e4f2fc2ef30c7c3b69e',
  'hud-nitro': 'f775e7eb6a364a9b3cd1198520d99a612af8b9c6',
  'hud-pause': '7eadda5188d3422420f5df586b7f7acc4316b933',
  'hud-speed': '1221212cf08b7abfbc0b864b3b26d88161819fde',
  'ui-arrow-left': '365bc847dd7c6638b19afb7f4be9bffc364ee785',
  'ui-arrow-right': '6f9321664abafc4b10fb7c38c3f8a6dddc81a3e2',
  'ui-close': 'b680cd6721fed9f8811641dfd6a59a4313e2c828',
  'ui-info': '144bdbd41249d175344d59b1206812094a6425af',
  'ui-settings': 'b3eab33a220fd74a6b040c2228df74be8b00c3ab',
  'ui-tooltip': 'c6d7d1afb9812111e3383c18142223c1bba57462',
};

function webpDimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const type = bytes.toString('ascii', 12, 16);
  if (type === 'VP8X') {
    return [
      1 + bytes.readUIntLE(24, 3),
      1 + bytes.readUIntLE(27, 3),
    ];
  }
  if (type === 'VP8L') {
    assert.equal(bytes[20], 0x2f);
    return [
      1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10),
    ];
  }
  assert.fail('Unexpected WebP compression format: ' + type);
}

test('18 HUD assets keep the original 3x canvases, not the rejected redesign', () => {
  assert.equal(Object.keys(DISCARDED_REDESIGN).length, 18);
  for (const [name, rejectedBlob] of Object.entries(DISCARDED_REDESIGN)) {
    const file = new URL(name + '@3x.webp', ART_DIR);
    const bytes = readFileSync(file);
    const blobSha = createHash('sha1')
      .update('blob ' + bytes.length + '\0')
      .update(bytes)
      .digest('hex');
    assert.notEqual(blobSha, rejectedBlob, name + ': rejected vector redesign was reintroduced');
    assert.deepEqual(
      webpDimensions(bytes),
      name.startsWith('button-') ? [432, 156] : [216, 216],
      name + ': original 3x raster size changed',
    );
  }
});
