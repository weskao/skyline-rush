import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKYFALL_COURSE, SKYFALL_GROUND_PATH, SKYFALL_OBSTACLES,
  SKYFALL_WEATHER, sampleSkyfallRoad, hasSkyfallRoadContact,
  getSkyfallEdgeLength,
} from '../src/courses/skyfall-archipelago.ts';
const magnitude = v => Math.hypot(...v);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);

test('Skyfall is a distinct, point-to-point course with three legal split/merge choices', () => {
  assert.equal(SKYFALL_COURSE.id, 'skyfall-archipelago');
  const nodes = new Map(SKYFALL_COURSE.nodes.map(n => [n.id, n]));
  assert.equal(nodes.get('start').kind, 'start');
  assert.equal(nodes.get('finish').kind, 'finish');
  assert.ok(distance(nodes.get('start').position, nodes.get('finish').position) > 500);
  const split = SKYFALL_COURSE.nodes.filter(n => n.kind === 'split');
  const merge = SKYFALL_COURSE.nodes.filter(n => n.kind === 'merge');
  assert.ok(split.length >= 3 && merge.length >= 3);
  for (const node of split) assert.ok(SKYFALL_COURSE.edges.filter(e => e.from === node.id).length >= 2);
  for (const node of merge) assert.ok(SKYFALL_COURSE.edges.filter(e => e.to === node.id).length >= 2);
  const checkpoints = SKYFALL_COURSE.checkpoints;
  assert.deepEqual(checkpoints, ['a-merge', 'b-merge', 'c-merge', 'finish']);
});

test('safe ground-only route traverses all mandatory checkpoint merges and has near-16 km length', () => {
  const edges = new Map(SKYFALL_COURSE.edges.map(e => [e.id, e]));
  assert.ok(SKYFALL_GROUND_PATH.length >= 7);
  let node = 'start', length = 0;
  const visited = new Set();
  for (const id of SKYFALL_GROUND_PATH) {
    const edge = edges.get(id);
    assert.ok(edge, id);
    assert.equal(edge.from, node);
    assert.equal(edge.mode, 'ground');
    assert.equal(edge.gaps.length, 0, 'ground path must not require flight');
    visited.add(edge.to);
    node = edge.to;
    length += getSkyfallEdgeLength(id);
  }
  assert.equal(node, 'finish');
  assert.ok(length >= 14500 && length <= 18000, `main route actual sampled length: ${length}`);
  for (const checkpoint of SKYFALL_COURSE.checkpoints) assert.ok(visited.has(checkpoint));
});

test('every shortcut begins and ends on the corresponding ground split and merge', () => {
  const edges = SKYFALL_COURSE.edges;
  for (const tag of ['a','b','c']) {
    const ground = edges.find(e => e.id === `${tag}-ground`);
    const air = edges.find(e => e.id === `${tag}-air`);
    assert.equal(air.from, ground.from);
    assert.equal(air.to, ground.to);
    assert.equal(air.mode, 'air');
    assert.ok(getSkyfallEdgeLength(air.id) < getSkyfallEdgeLength(ground.id));
    assert.ok(air.gaps.length > 0, 'actual takeoff/landing gap must be exported for collision');
    const gap = air.gaps[0];
    const length = getSkyfallEdgeLength(air.id);
    assert.equal(hasSkyfallRoadContact(air.id, 0), true);
    assert.equal(hasSkyfallRoadContact(air.id, (gap.from+gap.to)/2), false);
    assert.equal(hasSkyfallRoadContact(air.id, length), true);
  }
});

test('road samples are arc-length indexed, finite orthonormal and continuous through authored joins', () => {
  for (const e of SKYFALL_COURSE.edges) {
    const length = getSkyfallEdgeLength(e.id);
    assert.ok(length > 350, `${e.id}: not a substantial segment`);
    const a = sampleSkyfallRoad(e.id, 0);
    const b = sampleSkyfallRoad(e.id, length);
    for (const [s, frame] of [[0,a],[length*.25,sampleSkyfallRoad(e.id,length*.25)],[length*.5,sampleSkyfallRoad(e.id,length*.5)],[length,b]]) {
      for (const v of [frame.forward,frame.right,frame.up]) {
        assert.ok(v.every(Number.isFinite), `${e.id} @ ${s} nonfinite frame`);
        assert.ok(Math.abs(magnitude(v)-1)<1e-5);
      }
      assert.ok(Math.abs(dot(frame.forward,frame.right))<1e-5);
      assert.ok(Math.abs(dot(frame.forward,frame.up))<1e-5);
      assert.ok(Math.abs(dot(frame.right,frame.up))<1e-5);
      assert.ok(Number.isFinite(frame.point.x) && Number.isFinite(frame.point.y) && Number.isFinite(frame.point.z));
      assert.ok(frame.width >= 12);
    }
    const from = SKYFALL_COURSE.nodes.find(n=>n.id===e.from);
    const to = SKYFALL_COURSE.nodes.find(n=>n.id===e.to);
    assert.ok(distance(a.point,from.position)<1e-5);
    assert.ok(distance(b.point,to.position)<1e-5);
  }
  assert.throws(() => sampleSkyfallRoad('not-an-edge', 0), /edge/i);
});

test('hairpins, level changes and traversable 30/60/120 Hz path samples remain stable', () => {
  let hairpins = 0;
  for (const id of SKYFALL_GROUND_PATH) {
    const length = getSkyfallEdgeLength(id);
    const frames = Array.from({length:Math.ceil(length/20)+1},(_,i)=>sampleSkyfallRoad(id,Math.min(length,i*20)));
    let turning = 0;
    for (let i=1;i<frames.length;i++) {
      const prev = frames[i-1], current = frames[i];
      const cos = Math.max(-1,Math.min(1,dot(prev.forward,current.forward)));
      turning += Math.acos(cos);
      const separation=distance(prev.point,current.point);
      assert.ok(separation<24, `${id} broken mesh continuity`);
      assert.ok(Math.abs(current.point.y-prev.point.y)<7, `${id} slope discontinuity`);
    }
    if (turning>Math.PI*.9) hairpins++;
  }
  assert.ok(hairpins>=2, `expected two or more sustained multi-turn hairpins; got ${hairpins}`);
  for (const fps of [30,60,120]) {
    const id='b-ground',length=getSkyfallEdgeLength(id);
    for(let t=0;t<4;t+=1/fps) {
      const frame=sampleSkyfallRoad(id,Math.min(length,t*180));
      assert.ok(frame.point && magnitude(frame.up)>0.999);
    }
  }
});

test('obstacles are deterministic, within actual edges, and warnings are predictable', () => {
  assert.ok(SKYFALL_OBSTACLES.length >= 8);
  const ids = new Set();
  for (const o of SKYFALL_OBSTACLES) {
    assert.ok(!ids.has(o.id));ids.add(o.id);
    assert.ok(o.distance>0 && o.distance<getSkyfallEdgeLength(o.edgeId));
    assert.ok(o.radius>0 && o.radius<12);
    assert.ok(o.telegraphSeconds>=2, `${o.id} lacks deterministic warning`);
    assert.ok(['stone','column','crumbling-platform','floating-boulder','broken-parapet'].includes(o.kind));
  }
  assert.deepEqual(SKYFALL_OBSTACLES,structuredClone(SKYFALL_OBSTACLES));
});

test('wind and clouds use authored deterministic cues, not random forced impulses', () => {
  assert.ok(SKYFALL_WEATHER.length>=3);
  for (const w of SKYFALL_WEATHER) {
    assert.ok(getSkyfallEdgeLength(w.edgeId)>w.from && w.to>w.from);
    assert.ok(w.warnBeforeSeconds>=3);
    assert.ok(Math.abs(w.windStrength)<=1);
    assert.ok(w.seed>0);
  }
});

test('Skyfall contact rejects out-of-edge and non-finite distances', () => {
  for (const edge of SKYFALL_COURSE.edges) {
    const length = getSkyfallEdgeLength(edge.id);
    assert.equal(hasSkyfallRoadContact(edge.id, 0), true, edge.id);
    assert.equal(hasSkyfallRoadContact(edge.id, length), true, edge.id);
    for (const distance of [-0.001, length + 0.001, NaN, Infinity, -Infinity]) {
      assert.equal(hasSkyfallRoadContact(edge.id, distance), false,
        `${edge.id} must not invent contact at ${String(distance)}`);
    }
  }
});

test('Skyfall ground and air junction tangents meet without a sharp landing snap', () => {
  // Each split and merge is a real physical road/landing connection; position alone
  // is insufficient if the next edge starts with an unrelated heading.
  for (const incoming of SKYFALL_COURSE.edges) {
    for (const outgoing of SKYFALL_COURSE.edges.filter(edge => edge.from === incoming.to)) {
      const before = sampleSkyfallRoad(incoming.id, getSkyfallEdgeLength(incoming.id));
      const after = sampleSkyfallRoad(outgoing.id, 0);
      const cosine = dot(before.forward, after.forward);
      assert.ok(cosine > Math.cos(48 * Math.PI / 180),
        `${incoming.id} -> ${outgoing.id} snaps by ${(Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI).toFixed(1)} degrees`);
    }
  }
});
