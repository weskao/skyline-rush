import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNE_TEMPEST_COURSE as course, DUNE_TEMPEST_GATES } from '../src/courses/dune-tempest.ts';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const edgeLength = edge => edge.controlPoints.slice(1).reduce((n, p, i) => n + distance(p, edge.controlPoints[i]), 0);
const byId = id => course.edges.find(edge => edge.id === id);
const outgoing = id => course.edges.filter(edge => edge.from === id);

const walk = (at, seen = new Set()) => {
  if (seen.has(at)) throw new Error('Directed cycle at ' + at);
  if (at === 'finish') return [['finish']];
  const paths = [];
  for (const edge of outgoing(at)) for (const path of walk(edge.to, new Set([...seen, at]))) {
    paths.push([at, ...path]);
  }
  return paths;
};

test('Dune Tempest has versioned, one-way, uniquely located START and FINISH', () => {
  assert.equal(course.id, 'dune-tempest');
  assert.equal(course.topologyVersion, 1);
  assert.equal(course.targetMainLengthMeters, 13500);
  assert.equal(course.nodes.start.kind, 'start');
  assert.equal(course.nodes.finish.kind, 'finish');
  assert.ok(distance(course.nodes.start.position, course.nodes.finish.position) > 1000);
  assert.deepEqual(course.checkpoints, ['cp1', 'cp2', 'cp3', 'cp4']);
});

test('three grounded forks rejoin and every legal path crosses ordered checkpoints', () => {
  const paths = walk('start');
  assert.equal(paths.length, 8, 'three independently selectable forks yield eight legal paths');
  for (const path of paths) {
    assert.deepEqual(path.filter(id => course.checkpoints.includes(id)), course.checkpoints);
    assert.equal(path.at(-1), 'finish');
  }
  assert.deepEqual(['split1', 'split2', 'split3'].map(id => outgoing(id).length), [2, 2, 2]);
  for (const id of ['split1','split2','split3']) {
    assert.ok(outgoing(id).every(e => e.controlPoints.length >= 3));
  }
});

test('all edge polylines coincide with graph nodes and the main greybox is near 13.5 km', () => {
  for (const edge of course.edges) {
    assert.deepEqual(edge.controlPoints[0], course.nodes[edge.from].position, edge.id + ' starts at node');
    assert.deepEqual(edge.controlPoints.at(-1), course.nodes[edge.to].position, edge.id + ' ends at node');
    assert.ok(edge.controlPoints.length >= 3 && edge.widthMeters >= 20);
    assert.ok(edge.controlPoints.flat().every(Number.isFinite));
    assert.ok(edgeLength(edge) > 150, edge.id + ': nontrivial drivable geometry');
  }
  const route = course.edges.filter(e => e.role === 'main');
  const length = route.reduce((n, e) => n + edgeLength(e), 0);
  assert.ok(Math.abs(length - 13500) < 120, 'main raw centreline is ' + Math.round(length) + ' m');
});

test('the canyon has four actual reversing hairpins with pre-turn visibility cues', () => {
  const canyon = byId('canyon-switchbacks');
  assert.ok(canyon);
  assert.equal(course.hairpins.length, 4);
  for (const hairpin of course.hairpins) {
    assert.equal(hairpin.edgeId, canyon.id);
    assert.ok(hairpin.signLeadMeters >= 110);
    const i = hairpin.apexControlIndex;
    const pts = canyon.controlPoints;
    assert.ok(i >= 2 && i + 2 < pts.length);
    const a = [pts[i][0] - pts[i - 2][0], pts[i][2] - pts[i - 2][2]];
    const b = [pts[i + 2][0] - pts[i][0], pts[i + 2][2] - pts[i][2]];
    const dot = (a[0]*b[0]+a[1]*b[1]) / Math.hypot(...a) / Math.hypot(...b);
    assert.ok(dot < -0.5, hairpin.id + ' must turn over 120 degrees');
  }
});

test('aerial fork has actual altitude, clear landing and quantified speed advantage', () => {
  const safe = byId('canyon-switchbacks'), flight = byId('canyon-air-crossing');
  assert.deepEqual([safe.from, safe.to], [flight.from, flight.to]);
  assert.ok(Math.max(...flight.controlPoints.map(p => p[1])) >= 80);
  assert.ok(flight.takeoff && flight.landing && flight.allowedModes.includes('flight'));
  assert.ok(flight.landing.clearLengthMeters >= 100);
  assert.ok(edgeLength(safe) - edgeLength(flight) >= 600, 'risky flight saves meaningful distance');
  assert.ok(flight.riskTier > safe.riskTier);
});

test('off-road is legal in wide bounded corridors with safe recovery', () => {
  assert.ok(course.offroadZones.length >= 3);
  for (const zone of course.offroadZones) {
    assert.ok(byId(zone.edgeId));
    assert.ok(zone.widthMeters >= 100 && zone.recoveryBufferMeters >= 25);
    assert.ok(zone.startFraction >= 0 && zone.endFraction <= 1 && zone.startFraction < zone.endFraction);
    assert.equal(zone.recovery, 'warn-and-return-to-safe-ground');
  }
});

test('all solid hazards are visible on Low, with matching AI warning and collision radii', () => {
  assert.ok(course.hazards.length >= 8);
  assert.ok(course.hazards.some(h => h.kind === 'rockfall'));
  assert.ok(course.hazards.some(h => h.kind === 'sand-pit'));
  for (const hazard of course.hazards) {
    assert.ok(byId(hazard.edgeId));
    assert.ok(hazard.atFraction > 0 && hazard.atFraction < 1);
    assert.ok(hazard.aiPreviewMeters >= 80);
    assert.ok(hazard.visualRadiusMeters >= hazard.collisionRadiusMeters);
    assert.ok(hazard.visibleOn.includes('low'));
    assert.ok(hazard.lateralMeters !== 0 || hazard.safePassSide !== 'none', 'never make an unavoidable wall');
  }
});

test('localized sand weather remains deterministic, readable, and motion/quality bounded', () => {
  assert.ok(course.weatherZones.length >= 3);
  for (const zone of course.weatherZones) {
    assert.ok(byId(zone.edgeId));
    assert.ok(zone.minReadableDistanceMeters >= 180);
    assert.ok(zone.maxOpacity <= 0.58);
    assert.ok(zone.particleBudgets.low <= zone.particleBudgets.medium);
    assert.ok(zone.particleBudgets.medium <= zone.particleBudgets.high);
    assert.equal(zone.particleBudgets.reducedMotion, 0);
    assert.equal(typeof zone.seed, 'number');
  }
});

test('all three alternate paths are physically distinct shortcuts with explicit risk tradeoffs', () => {
  for (const [safeId, fastId] of [
    ['winding-wadi', 'dune-crest-cut'],
    ['canyon-switchbacks', 'canyon-air-crossing'],
    ['natural-arch-pass', 'dry-wash-cut'],
  ]) {
    const safe = byId(safeId), fast = byId(fastId);
    assert.deepEqual([safe.from, safe.to], [fast.from, fast.to]);
    assert.ok(safe.riskTier < fast.riskTier, fastId + ' must trade safety for time');
    assert.ok(edgeLength(safe) - edgeLength(fast) > 150, fastId + ' must save measurable travel');
    const mid = e => e.controlPoints[Math.floor(e.controlPoints.length / 2)];
    assert.ok(distance(mid(safe), mid(fast)) > 80, fastId + ' is a truly separate physical path');
  }
});

test('Dune directional gates bind every ordered checkpoint and finish to its real approach', () => {
  const ids = [...course.checkpoints, 'finish'];
  assert.deepEqual(DUNE_TEMPEST_GATES.map(g => g.id), ids);
  for (const [index, gate] of DUNE_TEMPEST_GATES.entries()) {
    assert.equal(gate.order, index + 1);
    assert.deepEqual(gate.center, course.nodes[gate.nodeId].position);
    const incoming = byId(gate.approachEdgeId);
    assert.equal(incoming.role, 'main');
    assert.equal(incoming.to, gate.nodeId);
    assert.ok(Math.abs(Math.hypot(...gate.forwardXZ) - 1) < 1e-10);
    assert.ok(gate.maxRelativeAltitudeMeters < 95, 'cannot count a high aerial bypass');
  }
});

test('merge2 ground branch meets the post-merge corridor without reversing direction', () => {
  const incoming = byId('canyon-switchbacks').controlPoints;
  const outgoing = byId('stone-ring-corridor').controlPoints;
  const tangent = (a, b) => [b[0] - a[0], b[2] - a[2]];
  const a = tangent(incoming.at(-2), incoming.at(-1));
  const b = tangent(outgoing[0], outgoing[1]);
  const dot = (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b);
  assert.ok(dot > Math.cos(35 * Math.PI / 180),
    'canyon exit must connect to the shared road without a 144° steering snap');
});

test('both ground and aerial canyon choices join merge2 within safe turning angles', () => {
  const following = byId('stone-ring-corridor').controlPoints;
  const exit = byId('canyon-switchbacks').controlPoints;
  const air = byId('canyon-air-crossing').controlPoints;
  const tangent = (p, q) => [q[0] - p[0], q[2] - p[2]];
  const outgoing = tangent(following[0], following[1]);
  const joinAngle = points => {
    const incoming = tangent(points.at(-2), points.at(-1));
    const dot = (incoming[0] * outgoing[0] + incoming[1] * outgoing[1])
      / Math.hypot(...incoming) / Math.hypot(...outgoing);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  };
  assert.ok(joinAngle(exit) < 40, 'main switchbacks must not snap at merge2');
  assert.ok(joinAngle(air) < 40, 'flight landing must join without a sideways steering snap');
  const last = air.at(-1), before = air.at(-2);
  const grade = Math.abs(last[1] - before[1]) / Math.hypot(last[0] - before[0], last[2] - before[2]);
  assert.ok(grade < 0.12, 'landing approach must not demand an unsafe vertical drop');
});
