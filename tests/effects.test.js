import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Vector3 } from 'three';
import { createRace, MAGNET_RANGE } from '../src/game.js';
import { createEffects } from '../src/effects.js';

test('a nonpositive first frame cannot revive dormant particles with uninitialized data', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  effects.update(createRace(), -0.005, 0, true, false);
  const particles = scene.children.find(object => object.isPoints);
  assert.ok([...particles.geometry.attributes.alpha.array].every(value => value === 0));
  assert.ok([...particles.geometry.attributes.position.array].every(Number.isFinite));
});

function flight(t, altitude = 4, speed = 40) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const race = createRace();
  race.phase = 'racing';
  Object.assign(race.player, { x: 0, altitude, speed, thrusting: true });
  const points = scene.children.find(object => object.isPoints);
  return { effects, race, attributes: points.geometry.attributes };
}

function boostSparksAfterLanding(t, chain) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const race = createRace();
  race.phase = 'racing';
  effects.update(race, 0.016, 0, false, false);
  race.player.landing = { speed: 6, time: race.elapsed, distance: race.player.distance, x: 0, chain };
  effects.update(race, 0.016, 0, false, false);
  effects.update(race, 0.03, 0, false, false);
  const { alpha, color, position } = scene.children.find(object => object.isPoints).geometry.attributes;
  assert.ok([...position.array].every(Number.isFinite), 'no NaN particle positions');
  const blue = [0.15, 0.8, 2.5].map(Math.fround); // colour buffer is Float32
  return [...alpha.array].filter((value, i) => value > 0 &&
    blue.every((channel, c) => color.array[i * 3 + c] === channel)).length;
}

test('a chain landing bursts boost-blue sparks that an ordinary landing does not', t => {
  assert.equal(boostSparksAfterLanding(t, false), 0);
  assert.ok(boostSparksAfterLanding(t, true) > 0);
});

test('downwash descends and carries forward momentum after leaving a moving car', t => {
  const { effects, race, attributes } = flight(t);
  effects.update(race, 0.04, 0, false, false);
  const active = [...attributes.alpha.array].flatMap((alpha, i) => alpha > 0 ? [i] : []);
  assert.ok(active.length > 0);
  const before = attributes.position.array.slice();
  race.player.thrusting = false;
  effects.update(race, 0.04, 0, false, false);
  for (const i of active) {
    assert.ok(attributes.position.array[i * 3 + 1] < before[i * 3 + 1], 'air travels downward');
    assert.ok(attributes.position.array[i * 3 + 2] < before[i * 3 + 2] - 0.7, 'air retains vehicle momentum');
  }
});

test('downwash turns into an outward surface flow when it reaches the road', t => {
  const { effects, race, attributes } = flight(t, 0.05, 0);
  effects.update(race, 0.04, 0, false, false);
  race.player.thrusting = false;
  for (let i = 0; i < 8; i++) effects.update(race, 0.025, 0, false, false);
  const surface = [...attributes.alpha.array].flatMap((alpha, i) =>
    alpha > 0 && attributes.position.array[i * 3 + 1] < 0.3 ? [Math.abs(attributes.position.array[i * 3])] : []);
  assert.ok(surface.length > 0, 'surface wash remains briefly visible');
  assert.ok(Math.max(...surface) > 1.25, 'air spreads beyond the nozzle footprint');
});

test('reset clears visible vapor immediately and a paused frame leaves it empty', t => {
  const { effects, race, attributes } = flight(t);
  effects.update(race, 0.04, 0, false, false);
  assert.ok(attributes.alpha.array.some(alpha => alpha > 0));
  effects.reset();
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
  effects.update(race, 0, 0, false, false);
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
});

test('lift cores follow tilted nozzle transforms and fade completely on release/reset', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), pose = new Group();
  pose.position.set(2, 4, -3); pose.rotation.z = 0.3;
  scene.add(pose);
  const effects = createEffects(scene, () => 0), race = createRace();
  race.phase = 'racing'; race.player.thrusting = true;
  effects.update(race, 0.1, 0, false, false, [pose]);
  const cores = scene.getObjectByName('Lift gas cores');
  assert.ok(cores, 'continuous near-nozzle gas is visible');
  const jet = cores.children[0];
  assert.ok(jet.visible);
  const expected = pose.localToWorld(new Vector3(-0.79, 0.19, -1.3));
  assert.ok(jet.position.distanceTo(expected) < 0.001);
  assert.ok(jet.quaternion.angleTo(pose.quaternion) < 0.001);
  race.player.thrusting = false;
  for (let i = 0; i < 120; i++) effects.update(race, 1 / 60, 0, false, false, [pose]);
  assert.ok(cores.children.every(core => !core.visible));
  race.player.thrusting = true;
  effects.update(race, 0.1, 0, false, false, [pose]); effects.reset();
  assert.ok(cores.children.every(core => !core.visible));
});

function raceScene(t) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = createRace();
  race.phase = 'racing'; race.player.speed = 60;
  race.pickups = []; race.rings = [];
  const points = scene.children.find(object => object.isPoints);
  const update = (dt = 0.05, options = {}, reduced = false) => effects.update(race, dt, 0, false, reduced, undefined, options);
  return { scene, effects, race, attributes: points.geometry.attributes, update };
}

test('pickup tiers are visible at their seeded positions and taken pickups disappear', t => {
  const { scene, race, update } = raceScene(t);
  race.pickups = ['cell', 'can', 'tank', 'overcharge'].map((tier, i) => ({ tier, x: i, altitude: i, distance: 100 + i * 10 }));
  const before = structuredClone(race);
  update();
  const group = scene.getObjectByName('Nitro pickups');
  assert.ok(group, 'collectible models are attached to the real scene');
  const visible = group.children.filter(mesh => mesh.visible);
  assert.equal(visible.length, 4);
  assert.equal(new Set(visible.map(mesh => mesh.material.color.getHex())).size, 4);
  assert.equal(new Set(visible.map(mesh => mesh.scale.x)).size, 4);
  assert.ok(visible[0].material.color.b > visible[0].material.color.r * 3 && visible[0].material.color.b > visible[0].material.color.g * 2, 'cell is blue');
  assert.ok(visible[1].material.color.r > visible[1].material.color.g * 2, 'can is orange');
  assert.ok(visible[2].material.color.g > visible[1].material.color.g, 'tank is gold');
  assert.ok(visible[3].material.vertexColors && visible[3].geometry.attributes.color, 'overcharge is rainbow');
  assert.equal(visible[2].position.x, 2);
  assert.equal(visible[2].position.z, -120);
  assert.ok(visible[2].position.y >= 2);
  assert.deepEqual(race, before, 'rendering must not modify the sim');
  race.pickups[1].taken = true; update(0);
  assert.equal(group.children.filter(mesh => mesh.visible).length, 3);
});

test('rings use their collision radius and type color, including a rainbow mystery ring', t => {
  const { scene, race, update } = raceScene(t);
  race.rings = ['charge', 'nitro', 'slipstream', 'risk', 'mystery'].map((type, i) => ({ type, radius: type === 'risk' ? 2.4 : 4.8, x: 2.5, altitude: 8, distance: 100 + i * 30 }));
  update();
  const group = scene.getObjectByName('Race rings');
  assert.ok(group);
  const visible = group.children.filter(mesh => mesh.visible);
  assert.equal(visible.length, 5);
  assert.equal(visible[3].scale.x * visible[3].geometry.parameters.radius, 2.4);
  assert.equal(new Set(visible.map(mesh => mesh.material.color.getHex())).size, 5);
  assert.ok(visible[0].material.color.g > visible[0].material.color.r * 3 && visible[0].material.color.b > visible[0].material.color.r * 3, 'charge is cyan');
  assert.ok(visible[1].material.color.r > visible[1].material.color.b * 3 && visible[1].material.color.g > visible[1].material.color.b * 3, 'nitro is gold');
  assert.ok(visible[2].material.color.r > visible[2].material.color.g * 2 && visible[2].material.color.b > visible[2].material.color.g * 2, 'slipstream is purple');
  assert.ok(visible[3].material.color.r > visible[3].material.color.g * 3 && visible[3].material.color.r > visible[3].material.color.b * 3, 'risk is red');
  assert.ok(visible[4].material.vertexColors);
  const rainbow = visible[4].geometry.attributes.color.array;
  assert.ok(new Set(rainbow).size > 5, 'mystery is visibly multicolored around its circumference');
  race.player.distance = 130; update(0);
  assert.equal(group.children.filter(mesh => mesh.visible).length, 3);
});

for (const kind of ['pickup', 'ring']) test(`${kind} collection bursts once and never replays across pause, disabled VFX or restart`, t => {
  const { scene, effects, race, attributes, update } = raceScene(t);
  const item = { tier: 'cell', type: 'nitro', radius: 4.8, x: 0, altitude: 0, distance: 0 };
  race[kind === 'pickup' ? 'pickups' : 'rings'] = [item];
  update();
  item[kind === 'pickup' ? 'taken' : 'hit'] = true;
  update();
  assert.ok(attributes.alpha.array.some(alpha => alpha > 0), 'a collected item emits a burst');
  const geometry = scene.children.find(object => object.isPoints).geometry;
  for (let i = 0; i < 30; i++) update();
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0), 'the same item cannot emit every frame');
  assert.equal(scene.children.find(object => object.isPoints).geometry, geometry);
  effects.reset(); update(0);
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
  const second = { ...item, taken: false, hit: false };
  race[kind === 'pickup' ? 'pickups' : 'rings'].push(second);
  update(); second[kind === 'pickup' ? 'taken' : 'hit'] = true;
  race.phase = 'paused'; update(0);
  race.phase = 'racing'; update(0.05, { enabled: false }); update();
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0), 'events suppressed by pause do not replay');
});

test('drifting emits ground smoke and threshold-colored sparks while respecting motion/VFX limits', t => {
  const { race, effects, attributes, update } = raceScene(t);
  const counts = [];
  for (const time of [1, 2, 3]) {
    effects.reset();
    race.player.drift = { time, dir: 1 };
    update();
    const sparks = [...attributes.alpha.array].flatMap((a, i) => a > 0 && attributes.kind.array[i] === 0 ? [i] : []);
    assert.ok(sparks.length > 0, `sparks at ${time} seconds`);
    for (const i of sparks) {
      const [r, g, b] = attributes.color.array.slice(i * 3, i * 3 + 3);
      if (time === 1) assert.ok(b > r * 2 && b > g * 2, 'one-second sparks are blue');
      if (time === 2) assert.ok(r > g * 2 && g > b * 3, 'two-second sparks are orange');
      if (time === 3) assert.ok(r > g * 2 && b > g * 3, 'three-second sparks are purple');
    }
    assert.ok([...attributes.alpha.array].some((a, i) => a > 0 && attributes.kind.array[i] === 2), 'tire smoke');
    counts.push(sparks.length);
  }
  effects.reset(); update(0.05, { quality: 'low' });
  assert.ok(attributes.alpha.array.filter(a => a > 0).length < counts.at(-1) + 2);
  effects.reset(); update(0.05, {}, true);
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0), 'comfortable/reduced motion omits tire particles');
  effects.reset(); update(0.05, { enabled: false });
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
});

test('disposing marker pools releases every tier material, including types no longer drawn', t => {
  const { scene, effects, race, update } = raceScene(t);
  race.pickups = ['cell', 'can', 'tank', 'overcharge'].map((tier, i) => ({ tier, x: 0, altitude: 0, distance: 100 + i * 10 }));
  race.rings = ['charge', 'nitro', 'slipstream', 'risk', 'mystery'].map((type, i) => ({ type, radius: 4.8, x: 0, altitude: 8, distance: 100 + i * 20 }));
  update();
  const groups = [scene.getObjectByName('Nitro pickups'), scene.getObjectByName('Race rings')];
  const materials = new Set(groups.flatMap(group => group.children.filter(mesh => mesh.visible).map(mesh => mesh.material)));
  const geometries = new Set(groups.flatMap(group => group.children.map(mesh => mesh.geometry)));
  const disposed = new Map();
  for (const resource of [...materials, ...geometries]) resource.addEventListener('dispose', () => disposed.set(resource, (disposed.get(resource) || 0) + 1));
  // Replace every visible material: traversing bound meshes alone would now miss seven types.
  race.pickups = Array.from({ length: 40 }, (_, i) => ({ ...race.pickups[0], distance: 100 + i }));
  race.rings = Array.from({ length: 7 }, (_, i) => ({ ...race.rings[0], distance: 100 + i }));
  update();
  assert.ok(groups.every(group => new Set(group.children.map(mesh => mesh.material)).size === 1));
  effects.dispose?.();
  assert.equal(disposed.size, 11, 'all nine materials and both shared geometries are released');
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.ok(groups.every(group => group.parent === null), 'scene disposal will not dispose these resources twice');
});

test('ITEM-12: a shield-blocked hit flashes a blue ring, never the orange crash ring', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const race = createRace();
  race.phase = 'racing';
  effects.update(race, 0.016, 0, false, false);
  race.player.shieldBlock = { distance: race.player.distance, x: 0, altitude: 0, time: race.elapsed };
  effects.update(race, 0.016, 0, false, false);
  const visible = scene.children.filter(object => object.isMesh && object.geometry.type === 'RingGeometry' && object.visible);
  assert.equal(visible.length, 1);
  const { r, g, b } = visible[0].material.color;
  assert.ok(b > r && b > g, 'blue shield flash');
});

test('ITEM-12: a pickup beam marks rings that grant a held item, never Classic mystery rings', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const beams = scene.getObjectByName('Item beams');
  assert.ok(beams && beams.children.length > 0, 'pooled in the scene from load (shader warmup)');
  const shown = race => { effects.update(race, 0.016, 0, false, false); return beams.children.filter(beam => beam.visible); };
  const classic = createRace();
  classic.phase = 'racing';
  classic.rings = [{ type: 'mystery', distance: classic.player.distance + 200, x: 2, altitude: 0, radius: 3, hit: false }];
  assert.equal(shown(classic).length, 0, 'Classic mystery rings stay as they were');
  const custom = createRace('coast', { mode: 'custom', activeItems: true });
  custom.phase = 'racing';
  custom.rings = [{ type: 'mystery', distance: custom.player.distance + 200, x: 2, altitude: 0, radius: 3, hit: false },
    { type: 'charge', distance: custom.player.distance + 260, x: 0, altitude: 0, radius: 3, hit: false }];
  const [beam, ...others] = shown(custom);
  assert.deepEqual([others.length, beam?.position.x, beam?.position.z], [0, 2, -200]);
  custom.rings[0].hit = true;
  assert.equal(shown(custom).length, 0, 'gone once collected');
});

test('ITEM-03: a magnet shows its pickup radius around the car only while it runs', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const ring = scene.getObjectByName('magnet radius');
  assert.ok(ring && !ring.visible, 'in the scene from the start (shader warmup), hidden');
  const race = createRace();
  race.phase = 'racing';
  Object.assign(race.player, { x: 1.5, distance: 400 });
  effects.update(race, 0.016, 0, false, false);
  assert.equal(ring.visible, false, 'no magnet, no ring');
  race.player.effects.magnet = 4;
  effects.update(race, 0.016, 0, false, false);
  assert.equal(ring.visible, true);
  assert.deepEqual([ring.position.x, ring.position.z, ring.scale.x], [1.5, 0, MAGNET_RANGE]);
  assert.ok(ring.material.opacity > 0 && ring.material.opacity <= 0.5);
  effects.update(race, 0.016, 0, true, false);
  assert.equal(ring.visible, false, 'never on the home preview');
  race.player.effects.magnet = 0;
  effects.update(race, 0.016, 0, false, false);
  assert.equal(ring.visible, false, 'gone when the magnet ends');
});

test('ITEM-12: reduced motion holds the item beam and magnet pulses steady instead of throbbing', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const pulses = reducedMotion => {
    const scene = new Scene();
    const effects = createEffects(scene, () => 0);
    const race = createRace('coast', { mode: 'custom', activeItems: true });
    race.phase = 'racing';
    race.rings = [{ type: 'mystery', distance: race.player.distance + 200, x: 2, altitude: 0, radius: 3, hit: false }];
    race.player.effects.magnet = 4;
    const beam = scene.getObjectByName('Item beams').children[0], ring = scene.getObjectByName('magnet radius');
    const seen = { beam: new Set(), magnet: new Set() };
    for (let frame = 0; frame < 40; frame++) {
      effects.update(race, 0.016, 0, false, reducedMotion);
      assert.ok(beam.visible && ring.visible);
      seen.beam.add(beam.material.opacity.toFixed(3));
      seen.magnet.add(ring.material.opacity.toFixed(3));
    }
    return { beam: seen.beam.size, magnet: seen.magnet.size };
  };
  assert.deepEqual(pulses(true), { beam: 1, magnet: 1 }, 'one steady opacity each');
  const moving = pulses(false);
  assert.ok(moving.beam > 1 && moving.magnet > 1, 'the full-motion pulse still plays');
});

test('11B: a Sky Spiral hoop sits on the helix road frame and swivels ±0.6 rad on race time, held still by reduced motion', async t => {
  const { trackLocalPosition, trackFrame } = await import('../src/track-paths.ts');
  const { scene, race, update } = raceScene(t);
  const spiral = createRace('spiral', { mode: 'custom', rivals: 0, traffic: 'off', themes: true });
  const hoop = spiral.rings.find(r => r.spin && r.distance > 1100 && r.distance < 2200);
  race.rings = [hoop]; race.player.distance = hoop.distance - 50;
  const options = { worldPoint: (s, x, y, o) => trackLocalPosition('spiral', s, x, y, o), worldFrame: s => trackFrame('spiral', s) };
  const frame = trackFrame('spiral', hoop.distance), up = new Vector3(...frame.up), forward = new Vector3(...frame.forward);
  const pose = (elapsed, reduced = false) => {
    race.elapsed = elapsed; update(0.016, options, reduced);
    const mesh = scene.getObjectByName('Race rings').children.find(m => m.visible);
    const facing = new Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
    return { mesh, swivel: Math.atan2(facing.clone().cross(forward).dot(up), facing.dot(forward)), tilt: new Vector3(0, 1, 0).applyQuaternion(mesh.quaternion).dot(up) };
  };
  const a = pose(0.3), expected = new Vector3(...trackLocalPosition('spiral', hoop.distance, hoop.x, hoop.altitude, race.player.distance));
  assert.ok(a.mesh.position.distanceTo(expected) < 1e-6, `drawn ${a.mesh.position.toArray()} vs road ${expected.toArray()}`);
  assert.ok(a.tilt > 0.999999, 'the swivel turns about the road up axis, never tipping the hoop');
  for (const elapsed of [0.3, 1.1, 2.6]) {
    const { swivel } = pose(elapsed);
    assert.ok(Math.abs(Math.abs(swivel) - Math.abs(0.6 * Math.sin(hoop.spin * elapsed + hoop.spinPhase))) < 1e-6, `swivel @${elapsed}s = ${swivel}`);
  }
  assert.ok(Math.abs(pose(1.1).swivel - pose(2.6).swivel) > 0.05, 'it moves with race time');
  assert.ok(Math.abs(pose(1.1, true).swivel) < 1e-9, 'reduced motion holds the hoop square to the road');
});
