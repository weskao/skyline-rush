import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, ROAD_LIMIT } from '../src/game.js';
import { hazardPose } from '../src/hazard-race.ts';

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
      Object.assign(r.player, { distance: 700, altitude: 5, verticalSpeed: 0, fuel: 10 });
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
