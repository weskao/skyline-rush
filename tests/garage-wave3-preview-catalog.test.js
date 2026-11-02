import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAVE3_PREVIEW_CATALOG, filterWave3PreviewItems } from '../src/garage-wave3-preview-catalog.ts';

test('read-only Wave 3 catalog preserves original 3x imagery and paired locales', () => {
  const expected={ 'garage-rewards-and-missions': [8,96,288], 'garage-store-readiness':[6,72,216] };
  for(const [category,[count,css,native]] of Object.entries(expected)){
    const cfg=WAVE3_PREVIEW_CATALOG[category];
    assert.equal(cfg.items.length,count);
    assert.equal(cfg.cssSize,css); assert.equal(cfg.sourcePx,native);
    assert.equal(new Set(cfg.items.map(x=>x.id)).size,count);
    assert.equal(filterWave3PreviewItems(category,'all').length,count);
    for(const item of cfg.items){
      assert.ok(item.name.en && item.name['zh-TW']);
      assert.ok(item.description.en && item.description['zh-TW']);
      assert.ok(!/purchase|buy now|claim|real price|reward granted/i.test(item.description.en));
      assert.ok(item.id.startsWith(category==='garage-store-readiness'?'store-':'mission-') || item.id.startsWith('trophy-'));
    }
  }
  assert.equal(filterWave3PreviewItems('garage-rewards-and-missions','mission').length,4);
  assert.equal(filterWave3PreviewItems('garage-rewards-and-missions','trophy').length,4);
  assert.equal(filterWave3PreviewItems('garage-store-readiness','store').length,4);
  assert.equal(filterWave3PreviewItems('garage-store-readiness','collection').length,2);
});
