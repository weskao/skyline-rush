// Task 5b step 1b (owner decision N7): Neon Downtown is one clockwise lap of a closed loop. Step 11 (N7 amended,
// 2026-11-15: 4000 m was a 36 s lap) makes it 10 km and eight sectors, still one lap: boulevard, underpass, market,
// expressway, harbour, canal, old town, plaza. The 4000 m schematic in concept-art/neon-downtown is out of date.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classicCornerPush, classicRoadRoute, legacyClassicRoad } from '../src/classic-road-routes.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { trackOverview } from '../src/track-paths.ts';
import { updateSkyline } from '../src/skyline-scenery.ts';

const road = classicRoadRoute('neon'), LAP = 10000, TURN = Math.PI * 2;
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);

test('the Neon lap closes on its start line after one clockwise turn', () => {
  assert.equal(RACE_TRACKS.neon.length, LAP, 'one 10 km lap, never two');
  assert.equal(road.lap, LAP);
  const [x, z] = road.point(LAP);
  near(x, 0, 1e-9, 'finish x'); near(z, 0, 1e-9, 'finish z');
  near(road.heading(LAP), TURN, 1e-9, 'one full right-hand turn');
  for (let d = 4; d <= LAP; d += 4) {
    const [ax, az] = road.point(d - 4), [bx, bz] = road.point(d);
    near(Math.hypot(bx - ax, bz - az), 4, .02, `road metres at ${d}`);
  }
});

test('the sectors follow the lap plan: boulevard north, market east, harbour south, canal west, old town north, plaza west', () => {
  const bearing = d => road.heading(d) * 180 / Math.PI;
  near(bearing(300), 0, 1e-9, 'Neon Boulevard');
  near(bearing(1000), 90, 1e-9, 'out of the rail underpass');
  near(bearing(2500), 90, 1e-9, 'the market straight after the S-bends');
  near(bearing(3601), 135, 1, 'halfway round the expressway sweep');
  near(bearing(6500), 270, 1e-9, 'canal arch bridge');
  near(bearing(8300), 360, 1e-9, 'out of the old town S-bends');
  near(bearing(9000), 270, 1e-9, 'Violet Plaza');
  near(bearing(9950), 360, 1e-9, 'back on the boulevard');
  const [marketX, marketZ] = road.point(2500), [plazaX, plazaZ] = road.point(9000), [harbourX] = road.point(5000);
  const [, canalZ] = road.point(6500), [oldX, oldZ] = road.point(7800);
  assert.ok(marketX > 800 && marketZ < plazaZ - 300, 'the market runs along the north side, east of the start');
  assert.ok(plazaX > 0 && plazaZ > 0, 'the plaza straight is south of the start line');
  assert.ok(harbourX > marketX + 800 && canalZ > plazaZ + 800, 'the harbour is the east side, the canal the south side');
  assert.ok(oldX > plazaX && oldX < harbourX - 800 && oldZ > plazaZ && oldZ < canalZ, 'the old town climbs from the canal to the plaza');
});

test('the harbour is a real straight of 800 m or more, and the old town is linked S-bends', () => {
  const bearing = d => road.heading(d) * 180 / Math.PI;
  let from = Infinity, to = -Infinity;
  for (let d = 4351; d <= 5988; d += 1) if (Math.abs(bearing(d) - 180) < 1e-9) { from = Math.min(from, d); to = Math.max(to, d); }
  assert.ok(to - from >= 800, `harbour straight ${from}-${to}`);
  for (let d = from; d <= to; d += 1) near(bearing(d), 180, 1e-9, `dead straight at ${d}`);
  const swings = [];
  for (let d = 7338; d <= 8288; d += 1) { // each time the road crosses north it has swung to the other side
    const side = Math.sign(Math.round((bearing(d) - 360) * 1e6));
    if (side && side !== swings.at(-1)) swings.push(side);
  }
  assert.deepEqual(swings, [-1, 1, -1], 'left, right, left: three linked bends');
  const peaks = Array.from({ length: 951 }, (_, i) => bearing(7338 + i) - 360);
  assert.ok(Math.min(...peaks) < -45 && Math.max(...peaks) > 45, 'each swing is 45 degrees or more off north');
});

test('no Neon corner is tighter than the old route and the lap never crosses itself', () => {
  let tightest = 0;
  for (let d = 2; d < LAP; d += 2) tightest = Math.max(tightest, Math.abs(road.heading(d + 2) - road.heading(d - 2)) / 4);
  assert.ok(tightest <= .00846, `tightest ${tightest} rad/m`); // the 279 m right-handers of layout 7; nothing new is tighter
  const points = Array.from({ length: LAP / 20 }, (_, i) => road.point(i * 20));
  for (let i = 0; i < points.length; i++) for (let j = i + 10; j < points.length; j++) {
    if (points.length - j + i < 10) continue; // neighbours across the start line
    assert.ok(Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) > 100, `${i * 20} m meets ${j * 20} m`);
  }
});

test('a second lap repeats the first, so Endless keeps streaming and the corner push stays bounded', () => {
  for (const d of [0, 37, 690, 5222.5, 9999]) {
    const [x, z] = road.point(d, 5), [x2, z2] = road.point(d + LAP, 5);
    near(x2, x, 1e-9, `x at ${d}`); near(z2, z, 1e-9, `z at ${d}`);
    near(road.heading(d + LAP), road.heading(d) + TURN, 1e-9, `heading at ${d}`);
  }
  assert.deepEqual([...road.point(-30, 2.5)], [2.5, 30], 'the grid extends straight back');
  for (let d = LAP - 20; d <= LAP + 20; d += 1) assert.ok(Math.abs(classicCornerPush('neon', d, 90)) < .1, `straight over the line at ${d}`);
});

test('offset measures metres from the centre line on every part of the lap', () => {
  for (const d of [100, 800, 1700, 3500, 5000, 6500, 7700, 9000, 9750]) for (const lane of [-7.5, 0, 7.5, 11]) {
    near(road.offset(...road.point(d, lane)), Math.abs(lane), .5, `${d} m lane ${lane}`);
  }
  assert.ok(road.offset(-300, 0, 64) > 64, 'west of the boulevard');
  assert.ok(road.offset(600, -300, 64) > 64, 'inside the loop');
  // Open roads keep the horizontal measure the particles used before.
  const coast = classicRoadRoute('coast'), [x, z] = coast.point(1000);
  near(coast.offset(x + 9, z), 9, 1e-9, 'coast');
  near(legacyClassicRoad.offset(legacyClassicRoad.point(500)[0] - 4, -500), 4, 1e-9, 'legacy');
});

test('Neon sections: one rail underpass in the first right-hander, the market shortcut, the harbour wind, the old town cut', () => {
  assert.deepEqual(RACE_TRACKS.neon.sections, [
    { from: 690, to: 910, type: 'tunnel' }, { from: 2200, to: 2700, type: 'shortcut', x: 7.5, altitude: 6 },
    { from: 4500, to: 5300, type: 'crosswind', dir: 1 }, { from: 8290, to: 8750, type: 'shortcut', x: -7.5, altitude: 6 },
  ]);
  near(road.heading(690) * 180 / Math.PI, 0, 5, 'the underpass starts as the road begins to turn');
  near(road.heading(910) * 180 / Math.PI, 90, 5, 'and ends as it straightens');
  for (const d of [2200, 2700]) near(road.heading(d) * 180 / Math.PI, 90, 1e-9, 'the market corridor is on the straight');
  for (const d of [4500, 5300]) near(road.heading(d) * 180 / Math.PI, 180, 1e-9, 'the wind blows across the harbour straight');
  // The old town corridor cuts the inside of the left-hander into the plaza: it lets out 123 m down the plaza straight.
  assert.ok(road.heading(8290) > road.heading(8500) && road.heading(8500) > road.heading(8750), 'a left-hander');
  near(road.heading(8750) * 180 / Math.PI, 270, 1e-9, 'out on the plaza straight');
});

test('the home map draws a closed route', () => {
  const map = trackOverview('neon'), first = map[0], last = map.at(-1);
  near(last.x, first.x, 1e-9, 'map x'); near(last.y, first.y, 1e-9, 'map y');
});

function skyline(route, distance) {
  const placed = { buildings: [], windows: [] }, mesh = name => ({ name, instanceMatrix: {} });
  const buildings = mesh('buildings'), windows = mesh('windows');
  const data = Array.from({ length: 160 }, () => ({ x: 0, d: 0, w: 10, h: 10 }));
  const city = { position: { x: 0, z: 0, set(x, _, z) { this.x = x; this.z = z; } } };
  const put = (target, index, x, y, z, width, height, depth) => { placed[target.name][index] = { x, y, z, width, height, depth }; };
  const [centerX] = route.point(distance);
  updateSkyline(city, buildings, windows, data, put, distance, centerX, undefined, route);
  // Back to route coordinates: the group is rebased on the car.
  const [, carZ] = route.point(distance), world = p => [p.x, p.z + city.position.z + carZ];
  return { ...placed, world };
}

test('on the Neon lap every skyline building stands clear of the whole road and lights the face a driver meets', () => {
  for (const distance of [0, 1000, 2400, 4000, 5000, 6500, 7700, 9000, 9900]) {
    const { buildings, windows, world } = skyline(road, distance);
    const standing = buildings.filter(b => b.y > -500);
    assert.ok(standing.length > 120, `${standing.length} of 160 buildings stand at ${distance} m`);
    for (const b of standing) assert.ok(road.offset(...world(b), 64) >= 64, `a building ${road.offset(...world(b), 64)} m from the road at ${distance} m`);
    buildings.forEach((b, i) => { if (b.y < -500) assert.ok(windows[i * 18].y < -500, 'a parked building parks its windows'); });
  }
  // Driving east through the night market, the windows are on the buildings' west faces. Plot i stands at i * 15 m
  // and the 160 plots wrap: 2400 m is plot 160, drawn in slot 0.
  const { buildings, windows } = skyline(road, 2400), lit = buildings.findIndex((b, i) => i <= 4 && b.y > -500);
  assert.ok(lit >= 0, 'a building stands beside the market');
  assert.ok(windows[lit * 18].x < buildings[lit].x - buildings[lit].width / 2, 'west face');
  assert.ok(windows[lit * 18].depth > windows[lit * 18].width, 'the pane lies along the face');
});

test('an open road keeps its skyline plots where they were', () => {
  const coast = classicRoadRoute('coast'), { buildings, windows } = skyline(coast, 1200);
  buildings.forEach((b, i) => {
    assert.ok(b.y > -500, 'nothing is parked');
    near(windows[i * 18].z, b.z + 8.05, 1e-9, 'windows face the start');
    near(windows[i * 18].depth, .05, 1e-9, 'pane depth');
  });
  // Plots keep their world-x offset from the centre line (110 to 660 m), not a lateral one.
  const slot = Math.floor(1200 / 15) - 12, index = ((slot % 160) + 160) % 160;
  const [px] = coast.point(slot * 15), reach = Math.abs(buildings[index].x - px);
  assert.ok(reach >= 110 && reach <= 660, `reach ${reach}`);
});
