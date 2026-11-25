import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, ROAD_LIMIT } from '../src/game.js';
import { hazardPose } from '../src/hazard-race.ts';
import { neonRoofVisualAltitude, NEON_ROOF_HEIGHT } from '../src/neon-roof.ts';

function fresh(options = {}) {
  const race = createRace('neon', { mode: 'custom', rivals: 0, traffic: 'off', items: false, ...options });
  race.phase = 'racing';
  Object.assign(race, { rings: [], pickups: [], traffic: [], rivals: [] });
  Object.assign(race.player, { distance: 800, x: 0, speed: 50 });
  return race;
}

// Use the same track, curve and starting state; remove only the tunnel from
// the reference race. Both use the real stepRace, not a mocked physics model.
function compareWithOpenRoad(setup, inputs, dt) {
  const tunnel = fresh(), open = fresh();
  open.sections = open.sections.filter(s => s.type !== 'tunnel');
  for (const race of [tunnel, open]) setup(race);
  for (const input of inputs) {
    for (const race of [tunnel, open]) stepRace(race, input, dt);
    const { section: tunnelSection, ...tunnelPhysics } = tunnel.player;
    const { section: openSection, ...openPhysics } = open.player;
    assert.deepEqual(tunnelPhysics, openPhysics, `normal physics at ${tunnel.player.distance} m`);
  }
  return tunnel;
}

test('Neon underpass preserves thrust, gravity, fuel, steering and landing across 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz;
    const inputs = [
      ...Array.from({ length: hz }, () => ({ fly: true, throttle: true, steer: -.2 })),
      ...Array.from({ length: 3 * hz }, () => ({ steer: -.2 })),
    ];
    const race = compareWithOpenRoad(r => {
      Object.assign(r.player, { distance: 700, altitude: 1, verticalSpeed: 0, fuel: 10 });
    }, inputs, dt);
    assert.equal(race.player.altitude, 0, 'normal descent ends on the road');
    assert.ok(race.player.landing, 'normal touchdown event');
    assert.ok(race.player.fuelOuts > 0, 'thrust still consumes and exhausts fuel');
  }
});

test('Neon underpass retains the existing rail collision and lateral road limit', () => {
  const race = compareWithOpenRoad(r => {
    Object.assign(r.player, { x: -ROAD_LIMIT, steering: -1, speed: 75 });
  }, [{ throttle: true, steer: -1 }], 1 / 60);
  assert.equal(race.player.impact?.kind, 'barrier');
  assert.equal(race.player.collisions, 1);
  assert.ok(Math.abs(race.player.x) <= ROAD_LIMIT);
});

test('Neon underpass retains same-height vehicle contact and clearance above traffic', () => {
  for (const altitude of [0, 6]) {
    const race = compareWithOpenRoad(r => {
      Object.assign(r.player, { altitude });
      r.traffic = [{ x: 0, homeX: 0, distance: 803, speed: 20, cruise: 20, altitude: 0, color: 0 }];
    }, [{}], 1 / 60);
    assert.equal(race.player.collisions, altitude === 0 ? 1 : 0);
    if (altitude === 0) assert.equal(race.player.impact?.kind, 'vehicle');
  }
});

test('the real Neon roadworks barrier at 980 m still blocks ground cars but permits flight above it', () => {
  for (const altitude of [0, 8]) {
    const race = fresh({ themes: true }), dt = 1 / 60;
    const obstacle = race.hazards.find(h => h.id === 'neon-works-1');
    assert.ok(obstacle);
    assert.equal(obstacle.distance, 980);
    const pose = hazardPose(obstacle, race.elapsed + dt);
    Object.assign(race.player, { distance: 979.5, x: pose.x, altitude, speed: 60 });
    stepRace(race, {}, dt);
    assert.equal(race.player.collisions, altitude === 0 ? 1 : 0);
    assert.equal(obstacle.hit, altitude === 0);
    if (altitude === 0) assert.equal(race.player.impact?.kind, 'barrier');
  }
});

// The original roof must support a car without FLY, without an altitude clamp from below.
test('Neon roof supports a stopped car, driving, taking off and driving off the edge', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz, race = fresh();
    Object.assign(race.player, { distance: 760, altitude: 10, verticalSpeed: -3, speed: 0, fuel: 30 });
    for (let i = 0; i < 2 * hz; i++) stepRace(race, {}, dt);
    assert.equal(race.player.altitude, 7.2);
    assert.equal(race.player.verticalSpeed, 0);
    assert.ok(race.player.landing);
    const landing = race.player.landing;
    for (let i = 0; i < hz; i++) stepRace(race, {}, dt);
    assert.equal(race.player.altitude, 7.2);
    assert.equal(race.player.landing, landing, 'no repeated touchdown');
    assert.ok(race.player.fuel > 30, 'ordinary grounded fuel recovery');
    for (let i = 0; i < hz; i++) stepRace(race, { throttle: true }, dt);
    assert.ok(race.player.distance > 760);
    assert.equal(race.player.altitude, 7.2);
    Object.assign(race.player, { speed: 40, fuel: 100 });
    stepRace(race, { fly: true }, dt);
    assert.ok(race.player.altitude > 7.2, 'takeoff from roof');
    Object.assign(race.player, { distance: 909.9, altitude: 7.2, verticalSpeed: 0, speed: 40 });
    stepRace(race, { throttle: true }, dt);
    stepRace(race, { throttle: true }, dt);
    assert.ok(race.player.distance > 910);
    assert.ok(race.player.altitude < 7.2, 'gravity after leaving roof');
    assert.equal(race.player.collisions, 0);
  }
});

test('Neon underpass can still ascend through the opening roof and fly to 12 m', () => {
  const race = fresh();
  Object.assign(race.player, { distance: 740, altitude: 2, speed: 20, fuel: 100 });
  for (let i = 0; i < 120; i++) stepRace(race, { fly: true, throttle: true }, 1 / 60);
  assert.equal(race.player.altitude, 12);
  assert.equal(race.player.collisions, 0);
});


test('roof contact renders on original fallback and detailed surfaces without changing flight maximum', () => {
  assert.equal(neonRoofVisualAltitude(800, NEON_ROOF_HEIGHT, true), 4.5);
  assert.equal(neonRoofVisualAltitude(800, NEON_ROOF_HEIGHT, false), 7.2);
  assert.equal(neonRoofVisualAltitude(698, NEON_ROOF_HEIGHT, false), 9.24);
  for (const fallback of [true, false]) for (const distance of [690, 800, 909, 920]) {
    assert.equal(neonRoofVisualAltitude(distance, 0, fallback), 0);
    assert.equal(neonRoofVisualAltitude(distance, 12, fallback), 12);
  }
});
