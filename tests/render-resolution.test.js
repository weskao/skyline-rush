import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPixelRatioForQuality } from '../src/render-resolution.ts';

test('adaptive ratio obeys quality caps without touching vehicle or scene geometry', () => {
  assert.equal(renderPixelRatioForQuality('high', 3, 1), 1.5);
  assert.equal(renderPixelRatioForQuality('medium', 3, 1), 1.25);
  assert.equal(renderPixelRatioForQuality('low', 3, 1), 1);
  assert.equal(renderPixelRatioForQuality('high', 3, 0.85), 1.275);
  assert.equal(renderPixelRatioForQuality('low', 3, 0.85), 0.85);
  assert.equal(renderPixelRatioForQuality('high', 3, Infinity), 1.5);
  assert.equal(renderPixelRatioForQuality('high', 3, 0), 1.125);
});
