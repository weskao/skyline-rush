import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('mobile guide copy is a strictly typed UI catalog with bilingual key parity', async () => {
  const { MOBILE_GUIDE_COPY } = await import('../src/mobile-guide-copy.ts');
  assert.equal(existsSync(new URL('../src/mobile-guide-copy.js', import.meta.url)), false);
  assert.deepEqual(Object.keys(MOBILE_GUIDE_COPY.en).sort(), Object.keys(MOBILE_GUIDE_COPY['zh-TW']).sort());
  for (const locale of ['en', 'zh-TW']) {
    assert.match(MOBILE_GUIDE_COPY[locale]['guide.mobile.slide.body'], /.+/);
    assert.match(MOBILE_GUIDE_COPY[locale]['guide.mobile.nitro.body'], /.+/);
  }
});
