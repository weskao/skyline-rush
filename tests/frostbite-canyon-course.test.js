import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { advanceRouteProgress, createRouteProgress, recoveryNode } from '../src/course-progress.ts';
import {
  FROSTBITE_CANYON_GRAPH as graph, FROSTBITE_FLIGHT, FROSTBITE_LANDMARKS, FROSTBITE_SEED,
} from '../src/courses/frostbite-canyon.ts';

const edge = id => graph.edges.find(e => e.id === id);
const node = id => graph.nodes.find(n => n.id === id);
const groundLength = () => graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);
const heading = f => Math.atan2(f.forward[0], -f.forward[2]);
const turn = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));

/** Samples the safe ground route every `step` metres as [routeS, frame]. */
function groundSamples(step = 10) {
  const out = [];
  let base = 0;
  for (const id of graph.groundRoute) {
    const length = routeLength(graph, id);
    for (let s = 0; s < length; s += step) out.push([base + s, sampleRoute(graph, id, s)]);
    base += length;
  }
  return out;
}

test('Frostbite Canyon is a stable, valid point-to-point CourseGraph', () => {
  assert.equal(graph.id, 'frostbite-canyon');
  assert.equal(graph.version, 1);
  assert.doesNotThrow(() => validateCourseGraph(graph));
  assert.ok(Object.isFrozen(graph) && Object.isFrozen(graph.edges), 'authored data is immutable');
  assert.ok(!('laps' in graph), 'point-to-point course has no lap count');
  const start = node(graph.start).at, finish = node(graph.finish).at;
  assert.ok(Math.hypot(start[0] - finish[0], start[2] - finish[2]) > 2000, 'START and FINISH are far apart');
  assert.equal(typeof FROSTBITE_SEED, 'number');
});

test('safe all-ground route measures 13.8 km of real arc length (±0.5%)', () => {
  const metres = groundLength();
  assert.ok(Math.abs(metres - 13800) / 13800 <= 0.005, `ground route is ${metres.toFixed(0)} m`);
  assert.ok(graph.groundRoute.every(id => edge(id).mode === 'ground'));
});

test('three genuine split/merge decisions diverge physically in plan or height', () => {
  const splits = graph.nodes.filter(n => n.kind === 'split');
  assert.ok(splits.length >= 3, 'at least three split nodes');
  for (const split of splits) {
    const outs = graph.edges.filter(e => e.from === split.id);
    assert.ok(outs.length >= 2, `${split.id} offers a choice`);
    const [a, b] = outs;
    const mid = e => sampleRoute(graph, e.id, routeLength(graph, e.id) / 2).point;
    const pa = mid(a), pb = mid(b);
    const plan = Math.hypot(pa[0] - pb[0], pa[2] - pb[2]), rise = Math.abs(pa[1] - pb[1]);
    assert.ok(plan > 40 || rise > 15, `${split.id} branches are not a lane offset (${plan.toFixed(0)} m / ${rise.toFixed(0)} m)`);
    assert.equal(new Set(outs.map(e => e.to)).size, 1, `${split.id} branches rejoin one merge`);
    assert.equal(node(outs[0].to).kind, 'merge');
  }
});

test('at least two distinct hairpins reverse horizontal heading', () => {
  const samples = groundSamples(10), hairpins = [];
  for (let i = 0; i + 30 < samples.length; i++) {
    const [s, a] = samples[i];
    const reversed = samples.slice(i + 1, i + 31).some(([, b]) => turn(heading(a), heading(b)) > 2.7);
    if (reversed && (!hairpins.length || s - hairpins.at(-1) > 1500)) hairpins.push(s);
  }
  assert.ok(hairpins.length >= 2, `found hairpins at ${hairpins.map(s => s.toFixed(0)).join(', ')}`);
});

test('ice bridge crosses over the lower canyon road with real vertical separation', () => {
  const bridge = edge('rift-ice-bridge'), canyon = edge('rift-lower-canyon');
  assert.equal(bridge.mode, 'ground');
  assert.equal(bridge.layer, 'bridge');
  assert.equal(bridge.surface, 'ice-deck');
  assert.ok(graph.groundRoute.includes(canyon.id) && !graph.groundRoute.includes(bridge.id));
  let crossing = null;
  // Skip the shared split/merge ends; the crossing must happen mid-span.
  for (let s = 80; s < routeLength(graph, bridge.id) - 80; s += 5) {
    const top = sampleRoute(graph, bridge.id, s).point;
    for (let t = 80; t < routeLength(graph, canyon.id) - 80; t += 5) {
      const low = sampleRoute(graph, canyon.id, t).point;
      if (Math.hypot(top[0] - low[0], top[2] - low[2]) < 8) crossing = { top, low };
    }
  }
  assert.ok(crossing, 'lower road passes under the bridge in plan view');
  assert.ok(crossing.top[1] - crossing.low[1] > 25, 'bridge deck is far above the lower road');
  assert.ok(routeLength(graph, bridge.id) < routeLength(graph, canyon.id), 'bridge is the shortcut');
});

test('flight alternative has an authored launch envelope and lands on a merge', () => {
  const flight = edge(FROSTBITE_FLIGHT.edgeId);
  assert.equal(flight.mode, 'flight');
  assert.equal(node(flight.to).kind, 'merge');
  const peak = Math.max(...Array.from({ length: 50 }, (_, i) =>
    sampleRoute(graph, flight.id, routeLength(graph, flight.id) * i / 49).point[1]));
  assert.ok(peak - node(flight.from).at[1] > 20, 'flight path clears the chasm');
  assert.ok(FROSTBITE_FLIGHT.minLaunchSpeed > 0 && FROSTBITE_FLIGHT.landingRadius >= flight.width / 2);
});

test('ground and flight alternatives must cross every ordered checkpoint', () => {
  const paths = [graph.groundRoute, graph.groundRoute.map(id =>
    id === 'rift-lower-canyon' ? FROSTBITE_FLIGHT.edgeId : id === 'glacier-valley' ? 'glacier-ridge' : id)];
  for (const path of paths) {
    let state = createRouteProgress(graph);
    for (const [i, id] of path.entries()) {
      // Only the first edge is fixed by createRouteProgress; branch choice is the next edge at a split.
      if (i === 0) assert.equal(state.currentEdgeId, id);
      const length = routeLength(graph, id);
      state = advanceRouteProgress(graph, state, {
        edgeId: id, fromS: length - 1, toS: length + 1, position: node(edge(id).to).at, nextEdgeId: path[i + 1],
      });
    }
    assert.ok(state.finished, 'path finishes');
    assert.equal(state.nextCheckpoint, graph.checkpoints.length);
  }
});

test('a car on the bridge cannot claim the lower canyon gate, and failed flight recovers to last checkpoint', () => {
  let state = createRouteProgress(graph);
  for (const id of graph.groundRoute.slice(0, graph.groundRoute.indexOf('rift-lower-canyon'))) {
    const length = routeLength(graph, id), next = graph.groundRoute[graph.groundRoute.indexOf(id) + 1];
    state = advanceRouteProgress(graph, state, { edgeId: id, fromS: length - 1, toS: length + 1, position: node(edge(id).to).at, nextEdgeId: next });
  }
  assert.equal(state.currentEdgeId, 'rift-lower-canyon');
  const bridgeLength = routeLength(graph, 'rift-ice-bridge');
  const above = sampleRoute(graph, 'rift-ice-bridge', bridgeLength / 2).point;
  const wrong = advanceRouteProgress(graph, state, { edgeId: 'rift-ice-bridge', fromS: bridgeLength - 1, toS: bridgeLength + 1, position: above });
  assert.equal(wrong, state, 'off-edge crossing is ignored');
  const canyonLength = routeLength(graph, 'rift-lower-canyon');
  const tooHigh = node('rift-merge').at.map((v, i) => i === 1 ? v + 40 : v);
  assert.equal(advanceRouteProgress(graph, state, { edgeId: 'rift-lower-canyon', fromS: canyonLength - 1, toS: canyonLength + 1, position: tooHigh, nextEdgeId: 'rift-to-observatory' }), state,
    'gate credit needs the merge altitude, not 2D proximity');
  const recovery = recoveryNode(graph, state);
  assert.equal(recovery.id, graph.checkpoints[state.nextCheckpoint - 1]);
  assert.equal(recoveryNode(graph, createRouteProgress(graph)).id, graph.start);
});

test('graph samples stay finite and roads never intersect on the same layer', () => {
  const ground = graph.edges.filter(e => e.mode === 'ground');
  const points = ground.map(e => {
    const length = routeLength(graph, e.id), out = [];
    for (let s = 0; s <= length; s += 20) out.push(sampleRoute(graph, e.id, s).point);
    return { e, out };
  });
  for (const { out } of points) for (const p of out) assert.ok(p.every(Number.isFinite));
  const touches = (a, b) => a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const a = points[i], b = points[j];
    if (touches(a.e, b.e)) continue;
    for (const p of a.out) for (const q of b.out) {
      const plan = Math.hypot(p[0] - q[0], p[2] - q[2]);
      if (plan < (a.e.width + b.e.width) / 2 + 6)
        assert.ok(Math.abs(p[1] - q[1]) > 12, `${a.e.id} and ${b.e.id} overlap at the same height`);
    }
  }
});

test('landmarks place arch, crystals, bridge and finish pillars beside real route frames', () => {
  for (const id of ['glacier-gate-arch', 'cyan-sentinels', 'rift-ice-bridge', 'aurora-crown', 'finish-pillars'])
    assert.ok(FROSTBITE_LANDMARKS.some(l => l.id === id), `missing landmark ${id}`);
  for (const l of FROSTBITE_LANDMARKS) {
    const frame = sampleRoute(graph, l.edgeId, l.localS);
    assert.ok(frame.point.every(Number.isFinite), l.id);
    assert.ok(Math.abs(l.lateral) >= frame.width / 2 || l.id === 'rift-ice-bridge', `${l.id} must not sit on the road`);
  }
});

test('every ground junction is drivable: heading changes at most 30° across split/merge nodes', () => {
  const kinks = [];
  for (const a of graph.edges.filter(e => e.mode === 'ground'))
    for (const b of graph.edges.filter(e => e.from === a.to && e.mode === 'ground')) {
      const deg = turn(heading(sampleRoute(graph, a.id, routeLength(graph, a.id))), heading(sampleRoute(graph, b.id, 0))) * 180 / Math.PI;
      if (deg > 30) kinks.push(`${a.id}->${b.id} ${deg.toFixed(0)}°`);
    }
  assert.deepEqual(kinks, []);
});

test('visible road mesh and physical route contact agree at straights, hairpin, bridge, split, merge and landing', async () => {
  const THREE = await import('three');
  const { courseRoadGeometry } = await import('../src/course-road-geometry.ts');
  const stations = [['frozen-basin', 500], ['ice-wall-hairpin', 730], ['rift-ice-bridge', 255], ['glacier-valley', 1],
    ['glacier-ridge', 200], ['rift-lower-canyon', 280], ['rift-to-observatory', 2], ['aurora-span', 300]];
  for (const [id, s] of stations) {
    const mesh = new THREE.Mesh(courseRoadGeometry(graph, id), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const f = sampleRoute(graph, id, s);
    for (const side of [-1, 0, 1]) {
      const lateral = side * (f.width / 2 - 0.6);
      const origin = new THREE.Vector3(f.point[0] + f.right[0] * lateral, f.point[1] + 6, f.point[2] + f.right[2] * lateral);
      const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0), 0, 12).intersectObject(mesh)[0];
      assert.ok(hit, `${id}@${s} lateral ${lateral.toFixed(1)}: no road under the wheel`);
      assert.ok(hit.face.normal.y > 0.9, `${id}@${s}: road faces up`);
      assert.ok(Math.abs(hit.point.y - f.point[1]) < 0.08, `${id}@${s}: mesh ${hit.point.y.toFixed(2)} vs contact ${f.point[1].toFixed(2)}`);
    }
    const outside = f.width / 2 + 1.5;
    const off = new THREE.Vector3(f.point[0] + f.right[0] * outside, f.point[1] + 6, f.point[2] + f.right[2] * outside);
    assert.equal(new THREE.Raycaster(off, new THREE.Vector3(0, -1, 0), 0, 12).intersectObject(mesh).length, 0,
      `${id}@${s}: road must not extend past its physical width`);
    mesh.geometry.dispose();
  }
});
