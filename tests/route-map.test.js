import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { routePolyline, routeMarker, routeSamples } from '../src/route-map.js';

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
