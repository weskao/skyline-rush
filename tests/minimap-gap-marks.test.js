import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { createCourseRouteProjection } from '../src/course-route-map.ts';
import { routeMarker } from '../src/route-map.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

// Minimal SVG DOM: createRouteMap only needs element creation, attributes and append.
class FakeNode {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.textContent = ''; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return key in this.attrs ? this.attrs[key] : null; }
  append(...nodes) { this.children.push(...nodes); }
  get firstChild() { return this.children[0] ?? null; }
  remove() {}
  find(cls) { return this.children.filter(n => (n.attrs.class ?? '').split(' ').includes(cls)); }
}
async function withFakeDom(run) {
  const original = globalThis.document;
  globalThis.document = { createElementNS: (_ns, tag) => new FakeNode(tag) };
  try { return await run(); } finally { globalThis.document = original; }
}
const subpaths = d => d.split('M').slice(1).map(part => part.trim().split(/ L ?/).map(p => p.trim().split(',').map(Number)));
const near = (actual, expected, label) => {
  assert.ok(Math.abs(actual[0] - expected.x) < .011 && Math.abs(actual[1] - expected.y) < .011,
    `${label}: ${actual} vs ${expected.x.toFixed(2)},${expected.y.toFixed(2)}`);
};

// The physics' own gap data: classic `type: 'gap'` sections (Sky Spiral's come from SKY_JUMPS)
// and each course runtime's `noRoad` spans. Never a second table.
const classicGaps = id => RACE_TRACKS[id].sections.filter(s => s.type === 'gap').map(s => [s.from, s.to]);
const courseGaps = id => Object.entries(COURSE_RUNTIMES[id].spec.noRoad).flatMap(([edge, spans]) => spans.map(([from, to]) => ({ edge, from, to })));
const MAP_IDS = [...Object.keys(RACE_TRACKS), ...Object.keys(UPCOMING_TRACKS)];
const gapCount = id => RACE_TRACKS[id] ? classicGaps(id).length : COURSE_RUNTIMES[id] ? courseGaps(id).length : 0;

test('inventory: Canyon, Sky Spiral, Skyfall and Dune are the tracks whose road has a gap', () => {
  assert.deepEqual(Object.fromEntries(MAP_IDS.filter(gapCount).map(id => [id, gapCount(id)])),
    { canyon: 1, spiral: 3, 'dune-tempest': 1, 'skyfall-archipelago': 3 });
});

test('every gap the physics drops the car into is a break with end caps on the minimap', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    for (const id of MAP_IDS) {
      for (const live of [false, true]) {
        const { element } = createRouteMap(id, { live });
        const [cut, ...extraCut] = element.find('route-gap-cut');
        const [dots] = element.find('route-gap-dots');
        const [caps] = element.find('route-gap-caps');
        if (!gapCount(id)) {
          assert.ok(!cut && !dots && !caps, `${id} has no gap and draws exactly as before`);
          continue;
        }
        assert.ok(cut && dots && caps && !extraCut.length, `${id} draws one cut, one dotted jump and one cap path`);
        assert.equal(dots.attrs.d, cut.attrs.d, `${id} dotted jump follows the cut`);
        const spans = subpaths(cut.attrs.d);
        assert.equal(spans.length, gapCount(id), `${id} marks every gap`);
        assert.equal(subpaths(caps.attrs.d).length, 2 * gapCount(id), `${id} caps both ends of every gap`);
        // Under every driver marker, above the road it breaks.
        const index = node => element.children.indexOf(node);
        const firstRacer = element.children.findIndex(n => 'data-racer' in n.attrs);
        if (live) assert.ok(index(caps) < firstRacer, `${id} drivers stay above the gap marks`);
        const lastRoad = Math.max(...element.children.map((n, i) => (n.attrs.class ?? '').includes('route-overview-line') ? i : -1));
        assert.ok(index(cut) > lastRoad && index(cut) < index(dots) && index(dots) < index(caps), `${id} layer order`);
      }
    }
  });
});

test('classic gap marks sit at the exact gap distances on the drawn route', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    for (const id of ['canyon', 'spiral']) {
      const spans = subpaths(createRouteMap(id).element.find('route-gap-cut')[0].attrs.d);
      classicGaps(id).forEach(([from, to], i) => {
        near(spans[i][0], routeMarker(id, from), `${id} gap ${i} start`);
        near(spans[i].at(-1), routeMarker(id, to), `${id} gap ${i} end`);
      });
    }
  });
});

test('course gap marks sit on the noRoad span of their own graph edge', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    for (const id of ['dune-tempest', 'skyfall-archipelago']) {
      const projection = createCourseRouteProjection(COURSE_RUNTIMES[id].spec.graph, 64);
      const at = (edge, s) => { const p = projection.marker(edge, s); return { x: p.x * 100, y: p.y * 100 }; };
      const spans = subpaths(createRouteMap(id).element.find('route-gap-cut')[0].attrs.d);
      courseGaps(id).forEach(({ edge, from, to }, i) => {
        near(spans[i][0], at(edge, from), `${id} ${edge} start`);
        near(spans[i].at(-1), at(edge, to), `${id} ${edge} end`);
      });
    }
  });
});

test('Endless and Elimination streaming maps have no gap, so draw no gap marks', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    for (const id of ['canyon', 'spiral']) {
      const { element } = createRouteMap(id, { live: true, streaming: true });
      assert.equal(element.find('route-gap-cut').length + element.find('route-gap-caps').length, 0, id);
    }
  });
});

test('gap geometry is computed once per track, not per map or frame', async () => {
  const { routeGapPaths } = await import('../src/route-map.ts');
  assert.strictEqual(routeGapPaths('canyon'), routeGapPaths('canyon'));
  assert.strictEqual(routeGapPaths('coast'), null);
});
