import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, ROAD_LIMIT, TUNNEL_CEILING, CAR_HEIGHT } from '../src/game.js';
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

// Below the ceiling the tunnel changes nothing; thrust into the ceiling is covered by the solid-roof test.
test('Neon underpass preserves gravity, steering and landing below its ceiling across 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz;
    const inputs = Array.from({ length: 3 * hz }, () => ({ steer: -.2 }));
    const race = compareWithOpenRoad(r => {
      Object.assign(r.player, { distance: 700, altitude: 2.5, verticalSpeed: 0 });
    }, inputs, dt);
    assert.equal(race.player.altitude, 0, 'normal descent ends on the road');
    assert.ok(race.player.landing, 'normal touchdown event');
  }
});

const INSIDE_TOP = TUNNEL_CEILING - CAR_HEIGHT;

// The opening tunnel is solid from inside exactly like every other tunnel: same clamp, same barrier knock.
test('Neon underpass roof is solid from inside, matching an ordinary tunnel, at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz, neon = fresh(), aurora = createRace('aurora', { mode: 'custom', rivals: 0, traffic: 'off', items: false });
    aurora.phase = 'racing';
    Object.assign(aurora, { rings: [], pickups: [], traffic: [], rivals: [], hazards: [], props: [] });
    Object.assign(neon, { hazards: [], props: [] });
    Object.assign(neon.player, { distance: 740, x: 0, altitude: 1, speed: 20, fuel: 100 });
    Object.assign(aurora.player, { distance: 4100, x: 0, altitude: 1, speed: 20, fuel: 100 }); // Aurora's 4060–4440 m tunnel
    for (let i = 0; i < 2 * hz; i++) {
      for (const race of [neon, aurora]) stepRace(race, { fly: true, throttle: true }, dt);
      assert.ok(neon.player.altitude <= INSIDE_TOP, `car roof under the tunnel ceiling at ${hz} Hz`);
      assert.equal(neon.player.altitude, aurora.player.altitude, `same ceiling response at ${hz} Hz`);
    }
    assert.equal(neon.player.impact?.kind, 'barrier');
    assert.equal(neon.player.collisions, aurora.player.collisions);
    assert.ok(neon.player.fuel < 100, 'thrust still consumes fuel');
  }
});

// Between the tunnel ceiling and the rail bridge's railing (10.6 m) the portal is a wall: a frontal hit, then the car is inside.
test('flying into the Neon portal face below its railing is a wall hit at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) for (const altitude of [3.5, 5, 7, 8, 10]) {
    const dt = 1 / hz, race = fresh();
    Object.assign(race, { hazards: [], props: [] });
    Object.assign(race.player, { distance: 686, altitude, verticalSpeed: 0, speed: 50 });
    while (race.player.distance < 696) stepRace(race, {}, dt);
    assert.equal(race.player.collisions, 1, `one hit at ${altitude} m, ${hz} Hz`);
    assert.equal(race.player.impact?.kind, 'barrier');
    assert.ok(race.player.altitude <= INSIDE_TOP, `inside the tunnel at ${altitude} m, ${hz} Hz`);
    assert.ok(race.player.speed < 50, 'the hit costs speed');
  }
});

// Over the portal's railing the car lands on the roof; above it the ordinary 12 m maximum is the only limit.
test('clearing the Neon portal railing lands on the roof and FLY still reaches 12 m', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz, race = fresh();
    Object.assign(race, { hazards: [], props: [] });
    Object.assign(race.player, { distance: 686, altitude: 12, verticalSpeed: 0, speed: 40, fuel: 100 });
    for (let i = 0; i < 2 * hz; i++) stepRace(race, {}, dt);
    assert.ok(race.player.distance > 690 && race.player.distance < 910);
    assert.equal(race.player.altitude, NEON_ROOF_HEIGHT, `on the roof at ${hz} Hz`);
    for (let i = 0; i < 2 * hz; i++) stepRace(race, { fly: true }, dt);
    assert.ok(race.player.distance < 894);
    assert.equal(race.player.altitude, 12, `full flight envelope over the tunnel at ${hz} Hz`);
    assert.equal(race.player.collisions, 0);
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
  for (const altitude of [0, 2.5]) { // 2.5 m: over the traffic box, under the solid ceiling
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
test('Neon roof supports a stopped car, driving and taking off', () => {
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
    assert.equal(race.player.collisions, 0);
  }
});

// The exit rail bridge (girder face 894.2 m, railing top 10.6 m) closes the roof: driving into it is a
// frontal hit that stops the car at the face, never a lift over it. FLY over the railing is the way out.
const EXIT_FACE = 894.2, RAILING_TOP = 10.6, PORTAL_DECK = 9.24;
test('driving the Neon roof into the exit rail bridge stops at its face without lifting the car', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz, race = fresh();
    Object.assign(race, { hazards: [], props: [] });
    Object.assign(race.player, { distance: 880, altitude: NEON_ROOF_HEIGHT, verticalSpeed: 0, speed: 40, fuel: 100 });
    for (let i = 0; i < 2 * hz; i++) {
      stepRace(race, { throttle: true }, dt);
      assert.ok(race.player.distance < EXIT_FACE, `held at the face at ${hz} Hz`);
      assert.equal(race.player.altitude, NEON_ROOF_HEIGHT, `stays on the roof at ${hz} Hz`);
    }
    assert.equal(race.player.collisions, 1, 'one hit; resting against the face is not another');
    assert.equal(race.player.impact?.kind, 'barrier');
    assert.ok(race.player.speed <= 18, 'no speed builds up against the wall');
    race.player.fuel = 100;
    for (let i = 0; i < 2 * hz && race.player.distance < EXIT_FACE; i++) {
      stepRace(race, { fly: true, throttle: true }, dt);
      if (race.player.distance >= EXIT_FACE) assert.ok(race.player.altitude >= RAILING_TOP, 'crosses only above the railing');
    }
    assert.ok(race.player.distance >= EXIT_FACE, `FLY clears the bridge at ${hz} Hz`);
    assert.equal(race.player.collisions, 1);
  }
});

test('the Neon rail bridge deck carries a car that lands on it, and its railing holds it in', () => {
  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz, race = fresh();
    Object.assign(race, { hazards: [], props: [] });
    Object.assign(race.player, { distance: 896, altitude: 10, verticalSpeed: -2, speed: 3 });
    for (let i = 0; i < hz; i++) stepRace(race, {}, dt);
    assert.equal(race.player.altitude, PORTAL_DECK, `on the bridge deck at ${hz} Hz`);
    for (let i = 0; i < 4 * hz; i++) stepRace(race, { throttle: true }, dt);
    assert.ok(race.player.distance < 910, 'railing at the far edge');
    assert.equal(race.player.altitude, PORTAL_DECK);
    assert.equal(race.player.collisions, 1);
  }
});

// Owner, 2026-11-27: the roof is solid from below too; FLY inside no longer passes through it.
test('Neon underpass no longer lets a car ascend through the roof from inside', () => {
  const race = fresh();
  Object.assign(race, { hazards: [], props: [] });
  Object.assign(race.player, { distance: 740, altitude: 2, speed: 20, fuel: 100 });
  for (let i = 0; i < 120; i++) stepRace(race, { fly: true, throttle: true }, 1 / 60);
  assert.ok(race.player.altitude <= INSIDE_TOP);
  assert.equal(race.player.impact?.kind, 'barrier');
});

test('a car inside the tunnel is drawn at its true altitude on fallback and detailed surfaces', () => {
  for (const fallback of [true, false]) for (const distance of [690, 700, 800, 905]) for (const altitude of [0, 1.5, INSIDE_TOP]) {
    assert.equal(neonRoofVisualAltitude(distance, altitude, fallback), altitude, `${distance} m, ${altitude} m, fallback ${fallback}`);
  }
});


// The detailed meshes match physics (roof 7.2 m, bridge deck 9.24 m), so the car is never drawn lifted over a portal.
test('roof contact renders on original fallback and detailed surfaces without changing flight maximum', () => {
  assert.equal(neonRoofVisualAltitude(800, NEON_ROOF_HEIGHT, true), 4.5);
  assert.equal(neonRoofVisualAltitude(800, NEON_ROOF_HEIGHT, false), 7.2);
  for (const distance of [692, 698, 893, 900, 906]) for (const altitude of [NEON_ROOF_HEIGHT, PORTAL_DECK, 10]) {
    assert.equal(neonRoofVisualAltitude(distance, altitude, false), altitude, `detailed at ${distance} m, ${altitude} m`);
  }
  for (const fallback of [true, false]) for (const distance of [690, 800, 909, 920]) {
    assert.equal(neonRoofVisualAltitude(distance, 0, fallback), 0);
    assert.equal(neonRoofVisualAltitude(distance, 12, fallback), 12);
  }
});
