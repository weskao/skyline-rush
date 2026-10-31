import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFoldableLayout, placeInVisibleSegment } from '../src/foldable-layout.ts';

const viewport = { width: 844, height: 390 };
const panels = [
  { left: 0, top: 0, width: 410, height: 390 },
  { left: 434, top: 0, width: 410, height: 390 },
];

test('no Viewport Segments API, corrupt segments and phone fallback are safe', () => {
  assert.equal(resolveFoldableLayout(viewport, null), null);
  assert.equal(resolveFoldableLayout(viewport, []), null);
  assert.equal(resolveFoldableLayout(viewport, [{ ...panels[0], width: NaN }, panels[1]]), null);
  assert.equal(resolveFoldableLayout(viewport, [panels[0], panels[0]]), null);
});

test('dual portrait panes yield a vertical hinge independent of device make', () => {
  const layout = resolveFoldableLayout(viewport, panels);
  assert.equal(layout.axis, 'vertical');
  assert.deepEqual(layout.hinge, { left: 410, top: 0, width: 24, height: 390 });
  for (const x of [411, 422, 433]) {
    const p = placeInVisibleSegment({ x, y: 320 }, { width: 64, height: 70 }, layout);
    assert.ok(p.x + 32 <= 410 || p.x - 32 >= 434, 'center crosses hinge');
  }
});

test('horizontal hinge moves controls vertically and respects button hit bounds', () => {
  const layout = resolveFoldableLayout({ width: 600, height: 900 }, [
    { left: 0, top: 0, width: 600, height: 430 },
    { left: 0, top: 460, width: 600, height: 440 },
  ]);
  assert.equal(layout.axis, 'horizontal');
  assert.deepEqual(layout.hinge, { left: 0, top: 430, width: 600, height: 30 });
  const p = placeInVisibleSegment({ x: 300, y: 450 }, { width: 44, height: 50 }, layout);
  assert.ok(p.y + 25 <= 430 || p.y - 25 >= 460);
});

test('unfolding with saved full-viewport ratios changes placement, not persisted coordinates', () => {
  const ratio = Object.freeze({ x: 0.5, y: 0.85 });
  const folded = placeInVisibleSegment({ x: ratio.x * viewport.width, y: ratio.y * viewport.height }, { width: 54, height: 54 }, resolveFoldableLayout(viewport, panels));
  assert.notEqual(folded.x, ratio.x * viewport.width);
  assert.deepEqual(ratio, { x: 0.5, y: 0.85 });
  assert.equal(resolveFoldableLayout({ width: 390, height: 844 }, undefined), null);
});
