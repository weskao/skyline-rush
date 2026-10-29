import test from 'node:test';
import assert from 'node:assert/strict';
import { SKY_SPIRAL } from '../src/sky-track.ts';
import { routeSamples, routeMarker, spiralUpperRoutePolyline, spiralUpperDirectionChevron } from '../src/route-map.ts';

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

test('upper-ramp chevron is in bounds, points forward and cannot be generated for flat tracks', () => {
  const arrow = spiralUpperDirectionChevron('spiral').split(' ').map(point => point.split(',').map(Number));
  assert.equal(arrow.length, 3, 'one static chevron is enough for the overpass');
  assert.ok(arrow.flat().every(x => Number.isFinite(x) && x >= 0 && x <= 100));
  const tip = arrow[1];
  const before = routeMarker('spiral', SKY_SPIRAL.start + (SKY_SPIRAL.end - SKY_SPIRAL.start) * .72 - 20);
  const after = routeMarker('spiral', SKY_SPIRAL.start + (SKY_SPIRAL.end - SKY_SPIRAL.start) * .72 + 20);
  const dot = (tip[0] - (arrow[0][0] + arrow[2][0]) / 2) * (after.x - before.x)
    + (tip[1] - (arrow[0][1] + arrow[2][1]) / 2) * (after.y - before.y);
  assert.ok(dot > 0, 'tip indicates the real race direction, not a mirrored arrow');
  for (const track of ['coast', 'neon', 'canyon', 'aurora']) assert.equal(spiralUpperDirectionChevron(track), '');
});
