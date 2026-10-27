import test from 'node:test';
import assert from 'node:assert/strict';
import { SKY_SPIRAL } from '../src/sky-track.ts';
import { routeSamples, routeMarker, spiralUpperRoutePolyline } from '../src/route-map.ts';

test('elevated Sky Spiral overlay is extracted from the canonical cached centreline', () => {
  const points = routeSamples('spiral');
  const overlay = spiralUpperRoutePolyline('spiral').split(' ');
  assert.ok(overlay.length >= 10);
  const rendered = new Set(points.map(p => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`));
  for (const xy of overlay.slice(1, -1)) assert.ok(rendered.has(xy), 'overlay cannot invent geometry');
  const final = routeMarker('spiral', SKY_SPIRAL.end);
  assert.equal(overlay.at(-1), `${final.x.toFixed(2)},${final.y.toFixed(2)}`);
  assert.equal(spiralUpperRoutePolyline('coast'), '');
  assert.equal(spiralUpperRoutePolyline('neon'), '');
});
