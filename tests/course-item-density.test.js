import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { RACE_TRACKS, COURSE_TRACKS } from '../src/race-tracks.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { placeCourseCar } from '../src/course-race.ts';
import { progressGap } from '../src/course-race-step.ts';
import { courseItemPoint, groundOffset, projectCourseItems } from '../src/course-items.ts';
import { spawnCatchUp } from '../src/catch-up-items.ts';

// User, 2026-11-09: new long-form courses keep the classic per-km ring/pickup density and have Classic traffic.
const perKm = (race, list) => race[list].length / (race.length / 1000);
const median = values => { const s = [...values].sort((a, b) => a - b); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
// The extra shortcut mix is outside that cap: rings are group -4, cells sit 12 m after each 25 m ring.
// The 60 m line (inset 30, step 60) is not on the cell lattice, so those cells stay in the count.
const burstCell = (race, item) => {
  if (item.tier !== 'cell') return false;
  const graph = COURSE_RUNTIMES[race.trackId]?.spec.graph;
  if (graph && item.edgeId && !graph.groundRoute.includes(item.edgeId)) {
    const end = routeLength(graph, item.edgeId) - 30;
    return item.localS >= 42 && item.localS < end && Math.abs((item.localS - 42) % 25) < 1e-6;
  }
  return (COURSE_TRACKS[race.trackId]?.sections ?? []).some(section => section.type === 'shortcut'
    && item.x === section.x && item.altitude === section.altitude
    && item.distance >= section.from + 42 && item.distance < section.to
    && Math.abs((item.distance - (section.from + 42)) % 50) < 1e-6);
};
const classic = Object.keys(RACE_TRACKS).map(id => createRace(id, { mode: 'classic' }));
const graphIds = Object.keys(COURSE_RUNTIMES);

for (const id of Object.keys(COURSE_TRACKS)) {
  test(`${id}: Classic ring and pickup density is near the classic median and inside the classic range per km`, () => {
    const race = createRace(id, { mode: 'classic' });
    for (const list of ['rings', 'pickups']) {
      // Shared road layout plus the 60 m shortcut line. The dense mix on the shortcut is extra.
      const items = list === 'rings' ? race.rings.filter(item => item.group !== -4) : race.pickups.filter(item => !burstCell(race, item));
      const ref = classic.map(r => perKm(r, list)), want = median(ref), got = items.length / (race.length / 1000);
      assert.ok(got >= 0.8 * want && got <= Math.max(...ref), `${list}: ${got.toFixed(1)}/km vs classic median ${want.toFixed(1)}/km`);
    }
  });
  test(`${id}: Classic has road traffic in the classic density range`, () => {
    const densities = Object.values(RACE_TRACKS).map(t => t.trafficDensity), track = COURSE_TRACKS[id];
    assert.ok(track.trafficDensity >= Math.min(...densities) && track.trafficDensity <= Math.max(...densities), `trafficDensity ${track.trafficDensity}`);
    assert.equal(createRace(id, { mode: 'classic' }).traffic.length, Math.round(36 * track.trafficDensity));
  });
}

test('classic tracks keep their item counts (the length scale applies to course topologies; classic uses itemDensity)', () => {
  const counts = Object.fromEntries(classic.map(r => [r.trackId, [r.rings.length, r.pickups.length]]));
  assert.deepEqual(counts, {
    coast: [121, 152], neon: [69, 163], canyon: [77, 139], aurora: [64, 143], spiral: [92, 157], // first five: itemDensity 1.4 (user, 2026-11-13)
    taipei: [70, 101], tokyo: [49, 108], alpine: [43, 110], coastal: [55, 103], cosmic: [66, 106],
  });
});

for (const id of graphIds) {
  const graph = COURSE_RUNTIMES[id].spec.graph;
  const branches = graph.edges.filter(e => !graph.groundRoute.includes(e.id));

  test(`${id}: every ring and pickup sits on a real edge, in collector distance order`, () => {
    const race = createRace(id, { mode: 'classic' });
    for (const list of ['rings', 'pickups']) {
      assert.ok(race[list].length > 0, list);
      for (const item of race[list]) {
        assert.ok(graph.edges.some(e => e.id === item.edgeId), `${list} edge ${item.edgeId}`);
        assert.ok(item.localS >= 0 && item.localS <= routeLength(graph, item.edgeId), `${list} localS ${item.localS}`);
      }
    }
    // projectCourseItems rewrites distance into the player's odometer and re-sorts. The collector stops at the first item ahead.
    for (const list of ['rings', 'pickups']) for (let i = 1; i < race[list].length; i++) {
      assert.ok(race[list][i].distance >= race[list][i - 1].distance - 1e-9, `${list} distance order at ${i}`);
    }
  });

  test(`${id}: each alternate branch carries a reward line (cells every 60 m and a tank halfway)`, () => {
    const race = createRace(id, { mode: 'classic' });
    for (const edge of branches) {
      const line = race.pickups.filter(p => p.edgeId === edge.id), length = routeLength(graph, edge.id);
      const sparse = [], dense = [];
      for (let s = 30; s < length - 30; s += 60) sparse.push(s);
      for (let s = 42; s < length - 30; s += 25) dense.push(s);
      assert.equal(line.filter(p => p.tier === 'tank').length, 1, edge.id);
      for (const s of sparse) assert.ok(line.some(p => p.tier === 'cell' && p.localS === s), `${edge.id} 60 m cell @${s}`);
      assert.equal(line.filter(p => p.tier === 'cell').length, sparse.length + dense.length, edge.id);
      for (const p of line) assert.equal(p.altitude, edge.mode === 'flight' ? 6 : 0);
    }
  });

  test(`${id}: items project into the player's odometer only on edges it can still reach`, () => {
    const race = createRace(id, { mode: 'classic' }), rt = race.course, edge = branches[0];
    const parallel = graph.edges.filter(e => graph.groundRoute.includes(e.id) && e.from === edge.from);
    placeCourseCar(rt, 'YOU', edge.id, 10, { distance: 5000, x: 0, altitude: 8 });
    race.player.distance = 5000;
    projectCourseItems(race);
    const start = rt.cars.get('YOU').edgeStart;
    for (const item of [...race.rings, ...race.pickups]) {
      if (item.edgeId === edge.id) assert.equal(item.distance, start + item.localS);
      if (parallel.some(e => e.id === item.edgeId)) assert.equal(item.distance, -Infinity);
    }
  });

  test(`${id}: the renderer places an item on its own edge frame`, () => {
    const race = createRace(id, { mode: 'classic' }), item = race.rings[3], origin = [10, -4, 2];
    const f = sampleRoute(graph, item.edgeId, item.localS), p = courseItemPoint(race.course, item, item.x, item.altitude, origin);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(p[i] - (f.point[i] + f.right[i] * item.x + f.up[i] * item.altitude - origin[i])) < 1e-9);
  });

  test(`${id}: the player collects a ring it drives through on the graph`, () => {
    const race = createRace(id, { mode: 'classic' }), rt = race.course;
    race.phase = 'racing';
    const ring = race.rings.find(r => r.localS > 300 && graph.groundRoute.includes(r.edgeId) && graph.groundRoute.indexOf(r.edgeId) > 0);
    const odometer = groundOffset(graph, ring.edgeId, ring.localS) - 4;
    Object.assign(race.player, { distance: odometer, x: ring.x, altitude: ring.altitude, speed: 60 });
    placeCourseCar(rt, 'YOU', ring.edgeId, ring.localS - 4, race.player);
    projectCourseItems(race);
    for (let i = 0; i < 12 && !ring.hit; i++) stepRace(race, { throttle: true }, 1 / 60);
    assert.ok(ring.hit, `ring at ${ring.edgeId}+${ring.localS} not collected`);
    assert.ok(race.player.rings >= 1);
  });

  test(`${id}: a rival takes a NITRO pickup on its line`, () => {
    const race = createRace(id, { mode: 'classic' }), rt = race.course, rival = race.rivals[0];
    race.phase = 'racing';
    const pickup = race.pickups.find(p => p.tier === 'cell' && p.altitude === 0 && p.localS > 300 && graph.groundRoute.indexOf(p.edgeId) > 0);
    const odometer = groundOffset(graph, pickup.edgeId, pickup.localS) - 3;
    Object.assign(rival, { distance: odometer, x: pickup.x, homeX: pickup.x, altitude: 0, speed: 60 });
    placeCourseCar(rt, rival.id, pickup.edgeId, pickup.localS - 3, rival);
    for (let i = 0; i < 12 && !rival.itemTakes; i++) stepRace(race, { throttle: true }, 1 / 60);
    assert.ok(rival.itemTakes >= 1, 'rival took nothing');
    assert.ok(pickup.downUntil > race.elapsed - 1, 'the take is shared: the pickup is down for everyone');
  });

  test(`${id}: traffic runs on the ground route as course cars, outside the standings, and recycles ahead`, () => {
    const race = createRace(id, { mode: 'classic' }), rt = race.course;
    race.phase = 'racing';
    assert.ok(race.traffic.length > 0);
    for (const car of race.traffic) {
      assert.ok(rt.cars.has(car.id), `traffic ${car.id} has a course travel`);
      assert.ok(graph.groundRoute.includes(rt.cars.get(car.id).travel.currentEdgeId));
    }
    stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(rt.standings.length, race.rivals.length + 1, 'traffic is not ranked');
    const car = race.traffic[0], t = rt.cars.get(car.id).travel, ahead = groundOffset(graph, t.currentEdgeId, t.localS) + 300;
    let edgeId = graph.groundRoute[0], localS = ahead;
    for (const id2 of graph.groundRoute) { const len = routeLength(graph, id2); if (localS <= len) { edgeId = id2; break; } localS -= len; }
    Object.assign(race.player, { distance: ahead, x: car.x + 5, altitude: 0, speed: 0 });
    placeCourseCar(rt, 'YOU', edgeId, localS, race.player);
    stepRace(race, {}, 1 / 60);
    assert.ok(progressGap(race, race.player, car) > 1000, `recycled ${progressGap(race, race.player, car)} m ahead`);
  });

  test(`${id}: catch-up items stay off graph courses (they have no edge to sit on)`, () => {
    const race = createRace(id, { mode: 'classic' }), before = race.rings.length;
    race.phase = 'racing';
    for (const rival of race.rivals) rival.distance = race.player.distance + 2000;
    for (let i = 0; i < 50; i++) { race.elapsed += 1; spawnCatchUp(race); }
    assert.equal(race.rings.length, before);
  });
}
