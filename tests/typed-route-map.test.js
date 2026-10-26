import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RACE_TRACKS } from '../src/game.js';
import { routeSamples, routePolyline, routeMarker } from '../src/route-map.ts';

test('typed minimap samples remain identical for all routes and do not duplicate JS implementation', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    assert.equal(routeSamples(id).length, 128);
    assert.equal(routePolyline(id).split(' ').length, 128);
    assert.deepEqual(routeMarker(id, Number.NaN), routeMarker(id, 0));
    assert.deepEqual(routeMarker(id, Number.POSITIVE_INFINITY), routeMarker(id, 0));
  }
  assert.equal(existsSync(new URL('../src/route-map.js', import.meta.url)), false);
});
