import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RACE_TRACKS } from '../src/game.js';
import { trackPoint } from '../src/track-paths.ts';
import { routePolyline, routeMarker, routeSamples, routeElevationCues } from '../src/route-map.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { groundAt } from '../src/course-items.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { PLAYABLE_COURSE_GRAPH as monsoonGraph } from '../src/courses/monsoon-ruins-runtime-adapter.ts';
import { PLAYABLE_COURSE_GRAPH as volcanicGraph } from '../src/courses/volcanic-crown-runtime-adapter.ts';
import { PLAYABLE_COURSE_GRAPH as stormlineGraph } from '../src/courses/stormline-megacity-runtime-adapter.ts';
import { FROSTBITE_CANYON_GRAPH } from '../src/courses/frostbite-canyon.ts';

// The same graphs the races drive. A Coming Soon minimap that omits one is the wrong course.
const COMING_SOON_GRAPHS = {
  'dune-tempest': COURSE_RUNTIMES['dune-tempest'].spec.graph,
  'skyfall-archipelago': COURSE_RUNTIMES['skyfall-archipelago'].spec.graph,
  'monsoon-ruins': monsoonGraph,
  'volcanic-crown': volcanicGraph,
  'stormline-megacity': stormlineGraph,
  'frostbite-canyon': FROSTBITE_CANYON_GRAPH,
};

test('the public route preview is only a single sampled main centreline', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const points = routePolyline(id).split(' ');
    assert.equal(points.length, 128);
    assert.equal(routeSamples(id).length, 128);
    assert.ok(points.every(p => /^\d+\.\d+,\d+\.\d+$/.test(p)));
    assert.equal(routePolyline(id), routePolyline(id));
  }
});
test('markers interpolate the same path and clamp invalid progress', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    assert.deepEqual(routeMarker(id, -50), routeMarker(id, 0));
    assert.deepEqual(routeMarker(id, Infinity), routeMarker(id, 0));
    assert.deepEqual(routeMarker(id, RACE_TRACKS[id].length + 10), routeMarker(id, RACE_TRACKS[id].length));
    assert.notDeepEqual(routeMarker(id, 0), routeMarker(id, RACE_TRACKS[id].length));
  }
});

test('Alpine and Cosmic mark real uphill and downhill stretches on the cached route',()=>{
  for(const id of ['alpine','cosmic']){
    const cues=routeElevationCues(id);
    assert.strictEqual(routeElevationCues(id),cues,'height annotations are not regenerated every frame');
    assert.deepEqual(cues.map(c=>c.direction),['up','down']);
    for(const cue of cues){
      assert.deepEqual({x:cue.x,y:cue.y},routeMarker(id,cue.distance));
      const grade=trackPoint(id,cue.distance+50).y-trackPoint(id,cue.distance-50).y;
      assert.ok(cue.direction==='up'?grade>1.2:grade< -1.2,id+' cue must reflect the actual road elevation');
    }
  }
  for(const id of ['coast','neon','canyon','aurora','spiral','taipei','tokyo','coastal']){
    assert.deepEqual(routeElevationCues(id),[],id+' does not need an elevated mini-map overlay');
  }
});

// Minimal SVG DOM: createRouteMap only needs element creation, attributes and append.
class FakeNode {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.writes = 0; this.textContent = ''; }
  setAttribute(key, value) { this.attrs[key] = String(value); this.writes++; }
  getAttribute(key) { return key in this.attrs ? this.attrs[key] : null; }
  append(...nodes) { this.children.push(...nodes); }
  get firstChild() { return this.children[0] ?? null; }
  remove() {}
  find(cls) { return [...this.children, ...this.children.flatMap(c => c.find?.(cls) ?? [])].filter(n => (n.attrs.class ?? '').split(' ').includes(cls)); }
}
async function withFakeDom(run) {
  const original = globalThis.document;
  globalThis.document = { createElementNS: (_ns, tag) => new FakeNode(tag) };
  try { return await run(); } finally { globalThis.document = original; }
}

test('live minimap gives the player a heading pointer that no rival has', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    const { element } = createRouteMap('coast', { live: true });
    const markers = element.children.filter(n => 'data-racer' in n.attrs);
    assert.equal(markers.length, 8, 'the eight data-racer markers are unchanged');
    const [pointer, ...extra] = element.find('route-player-pointer');
    assert.ok(pointer && !extra.length, 'exactly one player pointer');
    assert.equal(pointer.tag, 'g');
    assert.equal(pointer.attrs['aria-hidden'], 'true');
    assert.ok(!('data-racer' in pointer.attrs), 'the pointer is not a racer marker');
    assert.equal(pointer.find('route-player-halo').length, 1);
    assert.equal(pointer.find('route-player-arrow').length, 1, 'the built-in fallback remains');
    const artwork = pointer.find('route-player-art');
    assert.equal(artwork.length, 1, 'exactly one WebP player marker');
    assert.equal(artwork[0].tag, 'image');
    assert.ok(artwork[0].attrs.href.endsWith('feature-assets/minimap-player-marker/player-marker@3x.webp'));
    assert.deepEqual(['x', 'y', 'width', 'height'].map(key => artwork[0].attrs[key]), ['-11', '-11', '22', '22']);
    assert.strictEqual(element.children.at(-1), pointer, 'drawn last so no rival covers the player');
    assert.equal(createRouteMap('coast').element.find('route-player-pointer').length, 0, 'static previews have no player');
  });
});

test('player pointer follows the YOU marker, points along the route and only writes on change', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  await withFakeDom(() => {
    const { element, updateDrivers } = createRouteMap('coast', { live: true });
    const pointer = element.find('route-player-pointer')[0];
    const you = element.children.find(n => n.attrs['data-racer'] === 'YOU');
    const drivers = [{ id: 'YOU', distance: 300, x: 0 }, { id: 'NOVA', distance: 320, x: 0 }];
    updateDrivers(drivers);
    const a = routeMarker('coast', 300), b = routeMarker('coast', 310);
    const heading = Math.round(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90);
    assert.equal(pointer.attrs.transform, `translate(${you.attrs.cx} ${you.attrs.cy}) rotate(${heading})`);
    assert.equal(pointer.attrs.visibility, 'visible');
    const writes = pointer.writes;
    updateDrivers(drivers);
    assert.equal(pointer.writes, writes, 'unchanged frames write no attributes');
    updateDrivers([{ id: 'NOVA', distance: 320, x: 0 }]);
    assert.equal(pointer.attrs.visibility, 'hidden', 'hidden with the YOU marker');
  });
});

test('Dune SVG uses each CourseGraph edge, and player marker follows its actual branch', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  const { COURSE_RUNTIMES } = await import('../src/course-runtimes.ts');
  const { createCourseRouteProjection } = await import('../src/course-route-map.ts');
  await withFakeDom(() => {
    const graph = COURSE_RUNTIMES['dune-tempest'].spec.graph;
    const map = createRouteMap('dune-tempest', { live: true });
    const paths = map.element.children.filter(node => node.attrs['data-edge']);
    assert.equal(paths.length, graph.edges.length, 'all graph edges visible');
    assert.ok(paths.some(node => (node.attrs.class || '').includes('route-flight-line')));
    const travel = { currentEdgeId: 'canyon-air-crossing', localS: 300 };
    const drivers = [{ id: 'YOU', distance: 5000, x: 0 }];
    map.updateDrivers(drivers, { cars: new Map([['YOU', { travel }]]) });
    const marker = map.element.children.find(node => node.attrs['data-racer'] === 'YOU');
    const expected = createCourseRouteProjection(graph, 64).marker(travel.currentEdgeId, travel.localS);
    assert.equal(marker.attrs.cx, (expected.x * 100).toFixed(2));
    assert.equal(marker.attrs.cy, (expected.y * 100).toFixed(2));
    const before = [marker.attrs.cx, marker.attrs.cy];
    travel.currentEdgeId = 'canyon-switchbacks';
    map.updateDrivers(drivers, { cars: new Map([['YOU', { travel }]]) });
    assert.notDeepEqual([marker.attrs.cx, marker.attrs.cy], before, 'branch determines position, not odometer');
  });
});

test('every Coming Soon minimap draws that course graph, including branches', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  const { createCourseRouteProjection } = await import('../src/course-route-map.ts');
  assert.deepEqual(Object.keys(COMING_SOON_GRAPHS).sort(), Object.keys(UPCOMING_TRACKS).sort());
  await withFakeDom(() => {
    for (const [id, graph] of Object.entries(COMING_SOON_GRAPHS)) {
      const projection = createCourseRouteProjection(graph, 64);
      const paths = createRouteMap(id, { live: true }).element.children.filter(node => node.attrs['data-edge']);
      assert.equal(paths.length, graph.edges.length, `${id} draws every edge`);
      for (const line of projection.lines) {
        const node = paths.find(item => item.attrs['data-edge'] === line.edgeId);
        assert.ok(node, `${id} missing ${line.edgeId}`);
        const start = line.points[0];
        assert.ok(node.attrs.points.startsWith(`${(start.x * 100).toFixed(2)},${(start.y * 100).toFixed(2)}`), `${id} ${line.edgeId} is the real road`);
        if (!line.ground) assert.match(node.attrs.class, /route-flight-line/, `${id} ${line.edgeId} stays a branch`);
      }
    }
  });
});

test('all eight Coming Soon racers move along the drawn course', async () => {
  const { createRouteMap } = await import('../src/route-map.ts');
  const { createCourseRouteProjection } = await import('../src/course-route-map.ts');
  await withFakeDom(() => {
    for (const [id, graph] of Object.entries(COMING_SOON_GRAPHS)) {
      const projection = createCourseRouteProjection(graph, 64);
      const map = createRouteMap(id, { live: true });
      const place = (distance) => {
        const at = groundAt(graph, distance);
        const point = projection.marker(at.edgeId, at.localS);
        return { cx: (point.x * 100).toFixed(2), cy: (point.y * 100).toFixed(2) };
      };
      const drivers = RACE_DRIVER_IDS.map((driverId, index) => ({ id: driverId, distance: 400 + index * 700, x: 0 }));
      map.updateDrivers(drivers);
      const markers = drivers.map(driver => map.element.children.find(node => node.attrs['data-racer'] === driver.id));
      assert.equal(markers.length, 8, `${id} has eight racers`);
      drivers.forEach((driver, index) => {
        const expected = place(driver.distance);
        assert.equal(markers[index].attrs.visibility, 'visible', `${id} ${driver.id}`);
        assert.equal(markers[index].attrs.cx, expected.cx, `${id} ${driver.id} x`);
        assert.equal(markers[index].attrs.cy, expected.cy, `${id} ${driver.id} y`);
      });
      map.updateDrivers([{ id: 'YOU', distance: drivers[0].distance, x: 4 }]);
      assert.notEqual(markers[0].attrs.cx + markers[0].attrs.cy, place(drivers[0].distance).cx + place(drivers[0].distance).cy, `${id} YOU shifts with its lane`);
      map.updateDrivers(drivers);
      const before = markers.map(marker => `${marker.attrs.cx},${marker.attrs.cy}`);
      for (const driver of drivers) driver.distance += 1800;
      map.updateDrivers(drivers);
      drivers.forEach((driver, index) => {
        const expected = place(driver.distance);
        assert.equal(markers[index].attrs.cx, expected.cx, `${id} ${driver.id} follows the move`);
        assert.equal(markers[index].attrs.cy, expected.cy, `${id} ${driver.id} follows the move`);
        assert.notEqual(`${markers[index].attrs.cx},${markers[index].attrs.cy}`, before[index], `${id} ${driver.id} actually moves`);
      });
      const branch = graph.edges.find(edge => edge.mode === 'flight');
      if (!branch) continue;
      const localS = routeLength(graph, branch.id) / 2;
      map.updateDrivers([{ id: 'NOVA', distance: 0, x: 0 }], { cars: new Map([['NOVA', { travel: { currentEdgeId: branch.id, localS } }]]) });
      const nova = map.element.children.find(node => node.attrs['data-racer'] === 'NOVA');
      const onBranch = projection.marker(branch.id, localS);
      assert.equal(nova.attrs.cx, (onBranch.x * 100).toFixed(2), `${id} NOVA follows its branch`);
      assert.equal(nova.attrs.cy, (onBranch.y * 100).toFixed(2), `${id} NOVA follows its branch`);
    }
  });
});

test('every Coming Soon race map has a stroke colour so the course is visible', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  for (const id of Object.keys(UPCOMING_TRACKS)) {
    const theme = css.match(new RegExp(`data-theme="${id}"[^{]*\\{([^}]*)\\}`));
    assert.ok(theme, `${id} map theme`);
    assert.match(theme[1], /--map-line:\s*#[0-9a-fA-F]{6}/, `${id} course stroke`);
    assert.match(theme[1], /--map-bg:\s*#[0-9a-fA-F]{6}/, `${id} map background`);
    assert.match(theme[1], /--map-player:\s*#[0-9a-fA-F]{6}/, `${id} player colour`);
  }
});
