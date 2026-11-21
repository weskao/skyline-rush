// Task 8c step 5: where the Sky Spiral kit stands (src/spiral-scenery-plan.ts). The plan is art only: it is checked
// against the shipped road frame (tests/sky-spiral-parity.test.js pins that frame), never the other way round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { skyFrame, skyPoint, skyTowerOrigin, SKY_JUMPS, SKY_LENGTH as L, SKY_SPIRAL } from '../src/sky-track.ts';
import { SPIRAL_CLOUD_SPREAD, SPIRAL_NODES, SPIRAL_NODE_RADIUS as RADIUS, SPIRAL_NODE_SPAN as SPAN, spiralSceneryPlan, spiralStrutStations } from '../src/spiral-scenery-plan.ts';

const of = (plan, node) => plan.filter(p => p.node === node);
const clouds = plan => plan.filter(p => p.node.startsWith('cloud'));
/** The road frame every 2 m of one run. */
const framesOf = (run = 0, endless = false) => Array.from({ length: L / 2 + 1 }, (_, i) => ({ s: run * L + i * 2, ...skyFrame(run * L + i * 2, endless) }));
const FINITE = framesOf(), RUNS = [[0, false, FINITE], [0, true, framesOf(0, true)], [1, true, framesOf(1, true)]];
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** The nearest station to a placement, with its level offset to the right and its height over the centre line.
 *  Nearest in space, not on the map: the helix passes 100 m over its own approach. */
function abeam(frames, p) {
  const far = f => Math.hypot(f.point.x - p.x, f.point.y - p.y, f.point.z - p.z);
  const frame = frames.reduce((best, f) => far(f) < far(best) ? f : best);
  const { point, forward } = frame, lateral = (-(p.x - point.x) * forward[2] + (p.z - point.z) * forward[0]) / Math.hypot(forward[0], forward[2]);
  return { frame, lateral, rise: p.y - point.y, local: frame.s % L };
}
/** Degrees between the driver's heading at `d` and a point, right positive (as `bearing` in tests/neon-scenery-plan.test.js). */
const bearing = (d, x, z) => {
  const { point, forward } = skyFrame(d), vx = x - point.x, vz = z - point.z;
  return Math.atan2(-vx * forward[2] + vz * forward[0], vx * forward[0] + vz * forward[2]) / Math.PI * 180;
};

test('the plan is fixed data: known nodes, finite numbers, counts inside the kit budget', () => {
  const plan = spiralSceneryPlan();
  assert.deepEqual(spiralSceneryPlan(), plan, 'same arguments, same list');
  assert.equal(spiralSceneryPlan.length, 0, 'it takes no car distance: a piece stands where the route puts it (rule item 28)');
  const counts = Object.fromEntries(SPIRAL_NODES.map(node => [node, of(plan, node).length]));
  assert.equal(Object.values(counts).reduce((a, b) => a + b), plan.length, 'every node is in SPIRAL_NODES');
  for (const p of plan) {
    for (const key of ['x', 'y', 'z', 'yaw', 'scale']) assert.ok(Number.isFinite(p[key]), `${p.node} ${key}`);
    assert.ok(p.scale >= .8 && p.scale <= 1.3, `${p.node} scale ${p.scale}`);
  }
  assert.deepEqual({ ...counts, cloud_a: 0, cloud_b: 0, cloud_c: 0 }, { strut: 16, platform_a: 12, platform_b: 12, station: 12, chevron_sign: 21, gap_marker: 12, cloud_a: 0, cloud_b: 0, cloud_c: 0, peak: 8 });
  for (const [run, endless] of RUNS) {
    const sea = clouds(spiralSceneryPlan(run, endless)).length;
    assert.ok(sea >= 60 && sea <= 90, `${sea} clouds on run ${run}`);
  }
  for (const node of ['cloud_a', 'cloud_b', 'cloud_c']) assert.ok(counts[node] >= 10, `${node} is part of the sea`);
});

// Never art over gameplay. The space the car can reach: the ribbon (12 m half-width) and 1.5 m of rail margin, from
// the deck to the top of the flight corridor, sampled every 2 m along, 1 m across and 2 m up (the thinnest piece is
// 2.4 m across). It covers the shortcut corridor and, on the helix, the deck that passes over the approach.
const LATERALS = Array.from({ length: 28 }, (_, i) => -13.5 + i), HEIGHTS = Array.from({ length: 16 }, (_, i) => 2 * i);
const inside = (p, x, y, z, pad = 0) => y >= p.y + SPAN[p.node][0] * p.scale - pad && y <= p.y + SPAN[p.node][1] * p.scale + pad && Math.hypot(p.x - x, p.z - z) <= RADIUS[p.node] * p.scale + pad;
const reachPoint = ({ point, right, up }, l, h) => [point.x + right[0] * l + up[0] * h, point.y + right[1] * l + up[1] * h, point.z + right[2] * l + up[2] * h];
function intrusions(plan, frames) {
  const hits = [];
  for (const p of plan) {
    if (p.node === 'strut' || p.node.startsWith('cloud')) continue; // their own checks below
    const near = frames.filter(f => flat(f.point, p) <= RADIUS[p.node] * p.scale + 14);
    const hit = near.find(f => LATERALS.some(l => HEIGHTS.some(h => inside(p, ...reachPoint(f, l, h)))));
    if (hit) hits.push(`${p.node} at ${hit.s}`);
  }
  return hits;
}
/** A strut is a 3 m wide beam from its pivot, 170 m along local +X, its top 0.5 m under the pivot. */
function strutIntrusions(plan, frames) {
  const hits = [];
  for (const p of of(plan, 'strut')) {
    const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw), top = p.y + SPAN.strut[1];
    const near = frames.filter(f => Math.hypot(f.point.x - p.x - ax * 85, f.point.z - p.z - az * 85) <= 110);
    for (let t = 0; t <= RADIUS.strut; t++) for (const w of [-1.5, 0, 1.5]) {
      const x = p.x + ax * t - az * w, z = p.z + az * t + ax * w;
      const hit = near.find(({ point, forward, right, up }) => {
        const v = [x - point.x, top - point.y, z - point.z], dot = axis => v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
        return Math.abs(dot(forward)) <= 1 && Math.abs(dot(right)) <= 13.5 && dot(up) > -.25 && dot(up) <= 30;
      });
      if (hit) { hits.push(`strut at ${hit.s}, ${t} m along`); t = Infinity; break; }
    }
  }
  return hits;
}
/** The smallest height of the road over the top of a cloud under it (any cloud may be 500 m across). */
const cloudGap = (plan, frames) => Math.min(...clouds(plan).map(p => {
  const top = p.y + SPAN[p.node][1] * p.scale;
  return Math.min(...frames.filter(f => flat(f.point, p) <= SPIRAL_CLOUD_SPREAD * p.scale).map(f => f.point.y - top));
}));

test('no piece stands in the road, the flight corridor or the shortcut, on a race and on both endless directions', () => {
  for (const [run, endless, frames] of RUNS) {
    const plan = spiralSceneryPlan(run, endless), where = `run ${run}${endless ? ' endless' : ''}`;
    assert.deepEqual(intrusions(plan, frames), [], where);
    assert.deepEqual(strutIntrusions(plan, frames), [], where);
    assert.ok(cloudGap(plan, frames) >= 25, `${where}: a cloud top ${cloudGap(plan, frames).toFixed(1)} m under the road`);
  }
  const plan = spiralSceneryPlan(), [shortcut] = RACE_TRACKS.spiral.sections.filter(s => s.type === 'shortcut');
  assert.deepEqual([shortcut.from, shortcut.to, shortcut.x, shortcut.altitude], [7220, 7720, -7.5, 6]);
  for (const f of FINITE) if (f.s >= shortcut.from && f.s <= shortcut.to) {
    const at = reachPoint(f, shortcut.x, shortcut.altitude);
    assert.ok(!plan.some(p => !p.node.startsWith('cloud') && inside(p, ...at, 3)), `a piece in the shortcut corridor at ${f.s}`);
  }
  // The checks see a piece that is in the way: a platform on the launch deck, a strut at rail height, a cloud lifted.
  const [platform] = of(plan, 'platform_a'), [strut] = of(plan, 'strut'), [cloud] = clouds(plan), deck = skyPoint(5000);
  assert.deepEqual(intrusions([{ ...platform, ...deck }], FINITE).length, 1);
  assert.deepEqual(strutIntrusions([{ ...strut, y: strut.y + 1 }], FINITE).length, 1);
  assert.ok(cloudGap([{ ...cloud, y: cloud.y + 30 }], FINITE) < 25);
});

test('struts hang from the helix deck and reach the tower; the tower and the struts stay in the driver\'s view', () => {
  const plan = spiralSceneryPlan(), struts = of(plan, 'strut'), stations = spiralStrutStations(), tower = skyTowerOrigin(0, false);
  assert.deepEqual(stations, Array.from({ length: 16 }, (_, k) => SKY_SPIRAL.start + 43.75 + 87.5 * k), '16 a turn, by absolute distance');
  struts.forEach((p, k) => {
    const { point, right } = skyFrame(stations[k]), edge = { x: point.x + right[0] * 13, y: point.y + right[1] * 13, z: point.z + right[2] * 13 };
    assert.ok(Math.hypot(p.x - edge.x, p.y - edge.y, p.z - edge.z) < .25, `strut ${k} hangs from the inner deck edge at ${stations[k]}`);
    const reach = flat(p, tower) - RADIUS.strut, aim = Math.hypot(p.x + Math.cos(p.yaw) * 170 - tower.x, p.z - Math.sin(p.yaw) * 170 - tower.z);
    assert.ok(reach > 37 && reach < 40 && Math.abs(aim - reach) < 1e-6, `strut ${k} ends ${reach.toFixed(1)} m from the axis, inside the 40 m core`);
  });
  // Rule item 19, with the limits of tests/neon-scenery-plan.test.js (*the clock tower on the square*): 20 degrees
  // on the approach, 45 alongside. Measured to the tower's near edge (axis at 16.0 / 29.9 / 46.2 degrees from 1,200 /
  // 1,500 / 1,650 m; near edge 12.7 / 24.4 / 38.5).
  const nearEdge = d => Math.abs(bearing(d, tower.x, tower.z)) - Math.asin(40 / flat(skyPoint(d), tower)) / Math.PI * 180;
  for (let d = 1200; d <= 1400; d += 50) assert.ok(nearEdge(d) <= 20, `from ${d} the tower is ${nearEdge(d).toFixed(1)} degrees off the heading`);
  for (let d = 1450; d <= 1650; d += 50) assert.ok(nearEdge(d) <= 45, `from ${d} the tower is ${nearEdge(d).toFixed(1)} degrees off the heading`);
  // On the helix the tower's axis stands 90 degrees off the heading for the whole turn: no placement can bring it
  // into view. The struts are the answer: the deck ends of the next ones are ahead of the car all the way round
  // (3 or 4 in view through 2,950 m, 2 at 3,050 m). In the last 100 m only the last strut is left ahead.
  const ahead = d => struts.filter((p, k) => stations[k] > d && Math.abs(bearing(d, p.x, p.z)) <= 45).length;
  for (let d = 1950; d <= 3050; d += 100) assert.ok(ahead(d) >= 2, `${ahead(d)} struts in view from ${d}`);
  assert.equal(ahead(3150), 1);
});

test('each endless run is dressed where it is driven: odd runs mirrored, sides flipped, no gap markers', () => {
  const even = spiralSceneryPlan(0, true), odd = spiralSceneryPlan(1, true), end = skyPoint(L, true), oddFrames = RUNS[2][2];
  assert.deepEqual(spiralStrutStations(1), spiralStrutStations(0).map(d => 2 * L - d).sort((a, b) => a - b), 'a strut at d stands at L - d of an odd run');
  assert.deepEqual([of(spiralSceneryPlan(), 'gap_marker').length, of(even, 'gap_marker').length, of(odd, 'gap_marker').length], [12, 0, 0]);
  // One strut, from the road frame of the odd run itself: the deck edge and the tower are on the left there.
  const d = spiralStrutStations(0)[5], s = 2 * L - d, { point, right } = skyFrame(s, true), strut = of(odd, 'strut')[5], tower = skyTowerOrigin(s, true);
  assert.ok(Math.hypot(strut.x - point.x + right[0] * 13, strut.y - point.y + right[1] * 13, strut.z - point.z + right[2] * 13) < .25, 'on the left deck edge at L - d');
  assert.ok((tower.x - point.x) * right[0] + (tower.z - point.z) * right[2] < -200, 'the odd run turns round a tower on its left');
  assert.ok(Math.abs(flat(strut, tower) - RADIUS.strut - 39.2) < .5, 'and its strut reaches that tower');
  // Every roadside piece of the odd run is the even run's, turned half a circle about the point where the runs meet.
  for (const node of ['station', 'platform_a', 'platform_b', 'chevron_sign']) of(even, node).forEach((p, i) => {
    const q = of(odd, node)[i], a = abeam(RUNS[1][2], p), b = abeam(oddFrames, q);
    assert.ok(Math.abs(q.x - (2 * end.x - p.x)) < 1e-6 && Math.abs(q.z - (2 * end.z - p.z)) < 1e-6, `${node} ${i} is mirrored`);
    assert.ok(Math.abs(a.lateral + b.lateral) < .5 && Math.abs(a.rise - b.rise) < .5 && Math.abs(a.local + b.local - L) <= 2, `${node} ${i}: ${a.local} m, ${a.lateral.toFixed(0)} m right becomes ${b.local} m, ${b.lateral.toFixed(0)} m`);
  });
});

test('roadside pieces stand where the brief puts them; chevrons face the oncoming driver on the outside of each bend', () => {
  for (const [run, endless, frames] of RUNS) {
    const plan = spiralSceneryPlan(run, endless), local = a => run % 2 ? L - a.local : a.local;
    const signs = of(plan, 'chevron_sign').map(p => ({ p, ...abeam(frames, p) }));
    for (const { p, frame, lateral } of signs) {
      const [fx, , fz] = frame.forward, before = skyFrame(frame.s - 20, endless).forward, after = skyFrame(frame.s + 20, endless).forward;
      assert.ok((Math.sin(p.yaw) * fx + Math.cos(p.yaw) * fz) / Math.hypot(fx, fz) < -.9, `the sign at ${frame.s} faces the driver`);
      assert.ok(Math.abs(lateral) >= 15 && Math.abs(lateral) <= 17, `the sign at ${frame.s} stands ${lateral.toFixed(1)} m out`);
      assert.equal(Math.sign(lateral), -Math.sign(before[0] * after[2] - before[2] * after[0]), `the sign at ${frame.s} is on the outside of its bend`);
    }
    assert.ok(signs.every(a => local(a) >= 6800 && local(a) <= 9000) && new Set(signs.map(a => Math.sign(a.lateral))).size === 2, 'both bends of the slalom');
    const blocks = of(plan, 'station').map(p => abeam(frames, p)), decks = [...of(plan, 'platform_a'), ...of(plan, 'platform_b')].map(p => abeam(frames, p));
    for (const a of blocks) assert.ok(local(a) <= 1850 && Math.abs(a.lateral) >= 30 && Math.abs(a.lateral) <= 60.5 && a.rise <= -3 && a.rise >= -6.5, `station at ${a.local}: ${a.lateral.toFixed(0)} m out, ${a.rise.toFixed(1)} m`);
    for (const a of decks) assert.ok(local(a) >= 4650 && local(a) <= 9000 && Math.abs(a.lateral) >= 50 && Math.abs(a.lateral) <= 160.5, `platform at ${a.local}: ${a.lateral.toFixed(0)} m out`);
    for (const list of [blocks, decks]) assert.equal(new Set(list.map(a => Math.sign(a.lateral))).size, 2, 'both sides');
    assert.ok(decks.some(a => a.rise > 5) && decks.some(a => a.rise < -5), 'platforms above the road and below it');
    for (const p of of(plan, 'peak')) {
      const gap = Math.min(...frames.map(f => flat(f.point, p))), a = abeam(frames, p);
      // Against the road nearest to it (the road climbs 178 m): its foot under the far edge of the cloud sea, its summit over the driver.
      const summit = a.rise + SPAN.peak[1] * p.scale;
      assert.ok(gap >= 1400 && gap <= 2200 && a.rise <= -140 && summit >= 90,`a peak ${gap.toFixed(0)} m from the road, base ${a.rise.toFixed(0)} m, summit ${summit.toFixed(0)} m`);
    }
  }
  const markers = of(spiralSceneryPlan(), 'gap_marker').map(p => abeam(FINITE, p));
  const edges = SKY_JUMPS.flatMap(j => [[j.gapFrom, -1], [j.gapFrom, 1], [j.gapTo, -1], [j.gapTo, 1]]);
  assert.equal(markers.length, edges.length);
  // The frames are 2 m apart, so a marker on an odd metre reads 1 m off.
  markers.forEach((a, i) => assert.ok(Math.abs(a.local - edges[i][0]) <= 1 && Math.sign(a.lateral) === edges[i][1], `marker ${i} at ${a.local}, ${a.lateral.toFixed(1)} m`));
  for (const a of markers) assert.ok(Math.abs(Math.abs(a.lateral) - 14.8) < .1 && Math.abs(a.rise) < .5, `marker at ${a.local}: ${a.lateral.toFixed(2)} m out, ${a.rise.toFixed(2)} m up (the launch ramp climbs within the 1 m)`);
});

test('the cloud sea closes the view under the dome skirt from the driver\'s seat', () => {
  // The dome ends 11.5 degrees under the horizon (src/coast-sky.ts). Rays from 4 m over the car, 40 degrees either
  // side of the heading, 12 to 34 degrees down, must end on a cloud top, the road or the tower within 1.5 km.
  const plan = spiralSceneryPlan(), tower = skyTowerOrigin(0, false), road = FINITE.filter(f => f.s % 10 === 0).map(f => f.point);
  const sea = clouds(plan).map(p => ({ x: p.x, z: p.z, top: p.y + SPAN[p.node][1] * p.scale, r2: (RADIUS[p.node] * p.scale) ** 2 }));
  const closed = (x, y, z) => Math.hypot(x - tower.x, z - tower.z) <= 40 || sea.some(c => y <= c.top && (x - c.x) ** 2 + (z - c.z) ** 2 <= c.r2) || road.some(q => y <= q.y && (x - q.x) ** 2 + (z - q.z) ** 2 <= 169);
  let rays = 0, open = 0;
  for (let d = 0; d <= L; d += 100) for (let az = -40; az <= 40; az += 10) for (const down of [12, 18, 26, 34]) {
    const { point, forward } = skyFrame(d), heading = Math.atan2(forward[0], -forward[2]) + az * Math.PI / 180, fall = Math.tan(down * Math.PI / 180);
    let hit = false;
    for (let range = 15; range <= 1500 && !hit; range += 15) hit = closed(point.x + Math.sin(heading) * range, point.y + 4 - fall * range, point.z - Math.cos(heading) * range);
    rays++; open += hit ? 0 : 1;
  }
  assert.ok(open / rays <= .01, `${open} of ${rays} rays see under the sea`);
});
