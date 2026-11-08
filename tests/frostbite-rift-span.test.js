import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_CANYON_GRAPH as graph } from '../src/courses/frostbite-canyon.ts';
import { FROSTBITE_ID, FROSTBITE_TRACK, frostbiteFrame, frostbiteLeg } from '../src/courses/frostbite-race.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { trackLocalPosition, trackPoint } from '../src/track-paths.ts';
import { createRace, stepRace, SHORTCUT_TOLERANCE } from '../src/game.js';

// Rift Spine: the engine's corridor over the lower canyon is raced on the graph's high ice bridge.
const rift = FROSTBITE_TRACK.sections.find(s => s.span);
const split = rift && rift.from - 30, L = routeLength(graph, 'rift-lower-canyon'), B = routeLength(graph, 'rift-ice-bridge');
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const lane = (f, x) => ({ x: f.point.x + f.right[0] * x, y: f.point.y + f.right[1] * x, z: f.point.z + f.right[2] * x });

test('the Rift corridor is flagged as the span over the lower canyon', () => {
  assert.ok(rift, 'a span section');
  assert.equal(frostbiteLeg(rift.from).edgeId, 'rift-lower-canyon');
  assert.equal(frostbiteLeg(split).edgeId, 'rift-lower-canyon');
  assert.equal(FROSTBITE_TRACK.sections.filter(s => s.span).length, 1);
});

test('the span frame puts the corridor centre on the graph ice bridge, eased onto the corridor at both ends', () => {
  for (const d of [rift.from + 120, (rift.from + rift.to) / 2, rift.to - 120]) {
    const deck = sampleRoute(graph, 'rift-ice-bridge', (d - split) * B / L).point;
    assert.ok(gap(lane(frostbiteFrame(d, true), rift.x), { x: deck[0], y: deck[1], z: deck[2] }) < 0.5, `bridge centre @${d}`);
  }
  const mid = (rift.from + rift.to) / 2;
  assert.ok(frostbiteFrame(mid, true).point.y - frostbiteFrame(mid).point.y > 20, 'high over the lower road');
  for (const d of [rift.from, rift.to]) assert.ok(gap(frostbiteFrame(d, true).point, frostbiteFrame(d).point) < 1e-6, `continuous @${d}`);
  for (let d = rift.from; d < rift.to; d += 1) {
    const a = frostbiteFrame(d, true), b = frostbiteFrame(d + 1, true);
    assert.ok(gap(a.point, b.point) < 2.5, `no jump @${d}`);
    assert.ok(Math.abs(Math.hypot(...a.forward) - 1) < 1e-9 && Math.abs(Math.hypot(...a.right) - 1) < 1e-9);
  }
  assert.ok(gap(frostbiteFrame(3000, true).point, frostbiteFrame(3000).point) < 1e-9, 'off the span the frame is the ground frame');
});

function onSpan() {
  const race = createRace(FROSTBITE_ID);
  race.phase = 'racing'; race.traffic = []; race.pickups = []; race.rings = [];
  Object.assign(race.player, { distance: rift.from + 10, x: rift.x, altitude: rift.altitude, speed: 60, fuel: 100 });
  stepRace(race, { throttle: true, fly: true }, 1 / 60);
  return race;
}

test('a car in the Rift corridor is on the span and lands on the merge after holding it', () => {
  const race = onSpan(), car = race.player;
  assert.equal(car.span, true);
  while (car.distance < rift.to + 20) stepRace(race, { throttle: true, fly: car.altitude < rift.altitude }, 1 / 60);
  assert.equal(car.falls, 0);
  assert.equal(car.span, false);
});

test('a failed jump (sinking out of the span) recovers to the corridor start on the lower road, never ahead', () => {
  const race = onSpan(), car = race.player;
  for (let i = 0; i < 120; i++) stepRace(race, { throttle: true, fly: car.altitude < rift.altitude }, 1 / 60);
  let furthest = car.distance, before = car.speed;
  for (let i = 0; i < 600 && !car.falls; i++) { before = car.speed; stepRace(race, { throttle: true }, 1 / 60); if (!car.falls) furthest = car.distance; }
  assert.equal(car.falls, 1);
  assert.ok(furthest - rift.from > 100, 'it fell mid-span');
  assert.equal(car.distance, rift.from);
  assert.equal(frostbiteLeg(car.distance).edgeId, 'rift-lower-canyon');
  assert.deepEqual([car.span, car.altitude, car.verticalSpeed], [false, 0, 0]);
  assert.ok(car.speed <= before * 0.41 && car.cooldown > 0, `speed ${car.speed} cooldown ${car.cooldown}`);
  assert.deepEqual(car.fall, { from: rift.from, distance: rift.from, time: race.elapsed });
});

test('steering off the side of the span is a fall too; flying above it is not', () => {
  const race = onSpan(), car = race.player;
  for (let i = 0; i < 90; i++) stepRace(race, { throttle: true, fly: true }, 1 / 60);
  assert.ok(car.altitude > rift.altitude + SHORTCUT_TOLERANCE && car.span && !car.falls, 'above the deck stays on the span');
  for (let i = 0; i < 240 && !car.falls; i++) stepRace(race, { throttle: true, fly: true, steer: -1 }, 1 / 60);
  assert.equal(car.falls, 1);
  assert.equal(car.distance, rift.from);
});

test('objects in the Rift corridor are drawn on the span; ground objects and rivals stay on the lower road', () => {
  const mid = (rift.from + rift.to) / 2, origin = trackPoint(FROSTBITE_ID, mid);
  const at = (x, y) => { const [px, py, pz] = trackLocalPosition(FROSTBITE_ID, mid, x, y, mid); return { x: px + origin.x, y: py + origin.y, z: pz + origin.z }; };
  const f = frostbiteFrame(mid, true), cell = at(rift.x, rift.altitude);
  const c = lane(f, rift.x), a = rift.altitude;
  assert.ok(gap(cell, { x: c.x + f.up[0] * a, y: c.y + f.up[1] * a, z: c.z + f.up[2] * a }) < 1e-6, 'reward cell on the span');
  assert.ok(Math.abs(at(0, 0).y - frostbiteFrame(mid).point.y) < 1e-6, 'road object on the lower road');
  const race = createRace(FROSTBITE_ID);
  race.phase = 'racing';
  for (let i = 0; i < 60 * 30; i++) stepRace(race, { throttle: true }, 1 / 60);
  assert.ok(race.rivals.every(r => !r.span));
});

test('the last eased stretch is a landing ramp: sinking there rests on the deck and rolls off at the merge', async () => {
  const { SPAN_LANDING } = await import('../src/road-falls.ts');
  const race = onSpan(), car = race.player;
  while (car.distance < rift.to - SPAN_LANDING + 5) stepRace(race, { throttle: true, fly: car.altitude < rift.altitude }, 1 / 60);
  while (car.distance < rift.to + 40) {
    stepRace(race, { throttle: true }, 1 / 60);
    if (car.distance < rift.to) assert.ok(car.span && car.altitude >= rift.altitude - SHORTCUT_TOLERANCE - 1e-9, `on the ramp @${car.distance}`);
  }
  assert.equal(car.falls, 0);
  assert.equal(car.span, false);
});

test('the scripted bot holds the span and finishes without a fall loop', async () => {
  const { measureEconomy } = await import('../scripts/pickup-economy.mjs');
  const run = measureEconomy(FROSTBITE_ID);
  assert.equal(run.phase, 'finished');
  assert.ok(run.falls <= 1, `${run.falls} falls`);
});
