import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';
import { SKYFALL_ARCHIPELAGO_RACE } from '../src/courses/skyfall-archipelago-race.ts';

// Equivalence guard for the per-segment curvature memo in sampleRoute: every frame field, bit for bit, over a dense
// sweep of every edge of both graph courses. DIGEST was recorded on the pre-optimisation implementation.
const DIGEST = process.env.RECORD_ROUTE ? null : '945e637c0e0d9b1788b8dbc8b870ca2e2c44a4e1d3ace54fb490b7752347f8a01f87727c2a24989ede028459fc835c5c8a2fda34f764822661a6027d2ee7fd2c';
function digest(race) {
  const h = createHash('sha256');
  for (const edge of race.graph.edges) {
    const length = routeLength(race.graph, edge.id);
    for (let s = -1; s <= length + 1; s += 0.37) {
      const f = sampleRoute(race.graph, edge.id, s);
      h.update(Float64Array.from([f.localS, ...f.point, ...f.forward, ...f.right, ...f.up, f.width, f.curvature]));
    }
  }
  return h.digest('hex');
}
test('sampleRoute frames are bit-identical over every edge', () => {
  const got = digest(DUNE_TEMPEST_RACE) + digest(SKYFALL_ARCHIPELAGO_RACE);
  if (process.env.RECORD_ROUTE) { console.log('RECORDED', got); return; }
  assert.equal(got, DIGEST);
});
test('repeated samples at one distance return equal curvature', () => {
  const id = DUNE_TEMPEST_RACE.graph.groundRoute[0];
  const first = sampleRoute(DUNE_TEMPEST_RACE.graph, id, 50).curvature;
  for (let i = 0; i < 5; i++) assert.equal(sampleRoute(DUNE_TEMPEST_RACE.graph, id, 50).curvature, first);
});
