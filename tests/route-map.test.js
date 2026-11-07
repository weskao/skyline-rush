import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { trackPoint } from '../src/track-paths.ts';
import { routePolyline, routeMarker, routeSamples, routeElevationCues } from '../src/route-map.ts';

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
