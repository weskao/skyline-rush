import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { refreshFoldableViewport, updateFoldableProjection } from '../src/foldable-viewport.ts';
import { resolveFoldableLayout, placeInVisibleSegment, viewportFoldableLayout } from '../src/foldable-layout.ts';

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

test('uses current split viewport segments ahead of an older browser API', () => {
  const current = { width: 600, height: 900 };
  const stacked = [
    { left: 0, top: 0, width: 600, height: 430 }, { left: 0, top: 460, width: 600, height: 440 },
  ];
  const layout = viewportFoldableLayout({
    innerWidth: current.width, innerHeight: current.height, viewport: { segments: stacked },
    getWindowSegments: () => panels,
  });
  assert.equal(layout?.axis, 'horizontal');
  assert.deepEqual(layout?.segments, stacked);
});

test('the cover screen and a continuous inner screen use native single-segment geometry', () => {
  assert.equal(viewportFoldableLayout({
    innerWidth: 844, innerHeight: 390, viewport: { segments: [{ left: 0, top: 0, ...viewport }] },
    getWindowSegments: () => panels,
  }), null);
});

test('compatibility sources still work with absent or unavailable current API', () => {
  const screen = { innerWidth: 844, innerHeight: 390 };
  assert.equal(viewportFoldableLayout(screen), null);
  assert.equal(viewportFoldableLayout({ ...screen, visualViewport: { segments: panels } })?.axis, 'vertical');
  const source = { ...screen, get viewport() { throw new Error('transition'); }, getWindowSegments() { return panels; } };
  assert.equal(viewportFoldableLayout(source)?.axis, 'vertical');
});

test('the world camera frames the road clear of either hinge and recentres when unfolded', () => {
  const camera = new PerspectiveCamera(60, 2, 0.1, 100);
  const axisPoint = new Vector3(0, 0, -5);
  const book = resolveFoldableLayout(viewport, panels);
  const tabletop = resolveFoldableLayout({ width: 600, height: 900 }, [
    { left: 0, top: 0, width: 600, height: 430 }, { left: 0, top: 460, width: 600, height: 440 },
  ]);
  updateFoldableProjection(camera, book, false);
  assert.ok(axisPoint.clone().project(camera).x > 0.2);
  assert.equal(camera.aspect, 2);
  updateFoldableProjection(camera, book, true);
  assert.equal(axisPoint.clone().project(camera).x, 0, 'the landscape showcase already frames the car on the right');
  updateFoldableProjection(camera, tabletop, true);
  assert.ok(axisPoint.clone().project(camera).y > 0.2);
  updateFoldableProjection(camera, null, false);
  assert.equal(axisPoint.clone().project(camera).y, 0);
  assert.equal(camera.aspect, 2);
});

test('returning to a single segment restores normal body layout selectors', () => {
  const body = { dataset: {}, style: { setProperty() {}, removeProperty() {} } };
  const window = { innerWidth: viewport.width, innerHeight: viewport.height, viewport: { segments: panels } };
  Object.assign(globalThis, { window, document: { body } });
  try {
    assert.equal(refreshFoldableViewport(), true);
    assert.equal(body.dataset.foldAxis, 'vertical');
    window.viewport.segments = [{ left: 0, top: 0, ...viewport }];
    assert.equal(refreshFoldableViewport(), true);
    assert.ok(!Object.hasOwn(body.dataset, 'foldAxis'));
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});
