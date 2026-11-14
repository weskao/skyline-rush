import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPickupCollectVfx, PICKUP_COLLECTION_STYLES } from '../src/pickup-collect-vfx.js';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { drawnMarkers } from '../src/marker-pool.js';

const tiers = ['cell', 'can', 'tank', 'overcharge'];

test('premium pickup collection has four increasingly expressive bounded tier designs', () => {
  assert.deepEqual(Object.keys(PICKUP_COLLECTION_STYLES), tiers);
  assert.deepEqual(tiers.map(t => PICKUP_COLLECTION_STYLES[t].rings), [2, 2, 2, 3]);
  assert.equal(new Set(tiers.map(t => PICKUP_COLLECTION_STYLES[t].motion)).size, 4, 'one choreography per tier');
  const lives = tiers.map(t => PICKUP_COLLECTION_STYLES[t].life);
  assert.deepEqual(lives, [...lives].sort((a, b) => a - b), 'rarer tiers play longer');
  assert.ok(lives.at(-1) <= 1.1, 'even the rarest effect is over in about a second');
  assert.deepEqual(tiers.map(t => PICKUP_COLLECTION_STYLES[t].particles), [18, 24, 30, 42]);
  assert.equal(PICKUP_COLLECTION_STYLES.overcharge.rainbow, true);
  assert.equal(PICKUP_COLLECTION_STYLES.tank.beam, false);
  assert.equal(PICKUP_COLLECTION_STYLES.overcharge.beam, true);
});

test('pool preallocates geometry, reuses capacity, animates and cleans up finite 3D VFX', () => {
  const scene = new THREE.Scene(), vfx = createPickupCollectVfx(scene);
  const group = scene.getObjectByName('Pickup collect VFX');
  assert.equal(vfx.activeCount(), 0);
  assert.deepEqual(tiers.map(tier => group.children.filter(slot => slot.userData.tier === tier).length), [2, 2, 3, 2],
    'three overlapping tanks, two slots for every other tier');
  const geometryIds = new Set();
  group.traverse(mesh => { if (mesh.geometry && !mesh.isSprite) geometryIds.add(mesh.geometry.uuid); });
  assert.ok(geometryIds.size <= 5, 'five reused geometries, including the gold halo strip');
  assert.ok(group.children.every(stage => stage.children.filter(mesh => mesh.isInstancedMesh).every(mesh => mesh.count >= 1)),
    'each instanced shader has a parked example for pre-race WebGL warmup');
  const particle = { x: 2.5, altitude: 0, distance: 250, tier: 'overcharge' };
  assert.equal(vfx.spawn('overcharge', particle), true);
  assert.equal(vfx.activeCount(), 1);
  const original = group.children.slice();
  const map = { distance: 20, center: 0, roadCenter: () => 0, quality: 'high' };
  vfx.update(.12, map);
  const active = group.children.find(s => s.visible);
  assert.equal(active.userData.tier, 'overcharge');
  assert.equal(active.position.z, -230, 'the effect moves in the same track-relative frame as the road');
  assert.ok(active.children.some(mesh => mesh.visible && mesh.isInstancedMesh && mesh.count > 0), 'shards are GPU instanced');
  assert.ok(active.children.some(mesh => mesh.visible && mesh.name.includes('beam')), 'rare reactor includes an energy beam');
  for (let i = 0; i < 10; i++) vfx.spawn('overcharge', { ...particle, distance: 251 + i });
  assert.equal(vfx.activeCount(), 2, 'active slot count is bounded even under repeated pickups');
  assert.deepEqual(group.children, original, 'no new render objects allocated on pickup');
  vfx.update(2, map);
  assert.equal(vfx.activeCount(), 0);
  vfx.reset();
  assert.ok(group.children.every(s => !s.visible));
  const resources = new Set(), releases = new Map();
  // Three.js Sprite's internal shared quad is owned by THREE, not by this VFX subsystem.
  group.traverse(obj => { if (obj.geometry && !obj.isSprite) resources.add(obj.geometry); if (obj.material) resources.add(obj.material); });
  for (const r of resources) r.addEventListener('dispose', () => releases.set(r, (releases.get(r) || 0) + 1));
  vfx.dispose();
  assert.equal(group.parent, null);
  assert.equal(releases.size, resources.size);
  assert.ok([...releases.values()].every(x => x === 1));
});

test('course-graph world point is used instead of a straight track offset', () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  const item = { x: -3, distance: 400, altitude: 4, tier: 'cell', edgeId: 'shortcut' };
  vfx.spawn('cell', item);
  const requests = [];
  vfx.update(.15, { distance: 300, center: 0, quality: 'medium',
    worldPoint: (...args) => { requests.push(args); return [9, 7, -33]; } });
  const stage = vfx.group.children.find(s => s.visible);
  assert.deepEqual(stage.position.toArray(), [9, 7, -33]);
  assert.equal(requests[0][4], item, 'preserve graph edge metadata for branching tracks');
  vfx.dispose();
});

test('low quality and reduced motion keep the item identity without particle spam', () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  const event = { distance: 100, x: 0, altitude: 0 };
  vfx.spawn('tank', event, { quality: 'low', reducedMotion: true });
  vfx.update(.05, { distance: 0, center: 0, roadCenter: () => 0, reducedMotion: true });
  const stage = vfx.group.children.find(s => s.visible);
  assert.equal(stage.userData.tier, 'tank');
  assert.ok(stage.children.filter(child => child.isInstancedMesh).every(mesh => mesh.count <= 2));
  assert.ok(stage.children.filter(child => child.name.includes('beam')).every(child => !child.visible));
  vfx.reset();
  assert.equal(vfx.activeCount(), 0);
  vfx.dispose();
});

test('3D pickup VFX only triggers on collected items; respawn and reset do not replay stale pickups', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene(), effects = createEffects(scene, () => 0);
    const race = createRace('coast');
    race.phase = 'racing'; race.player.speed = 40; race.player.distance = 0;
    race.rings = [];
    const item = { tier: 'cell', distance: 80, x: 0, altitude: 0, downUntil: 0 };
    race.pickups = [item];
    const tick = (dt = .05) => effects.update(race, dt, 0, false, false);
    tick();
    assert.equal(scene.getObjectByName('Pickup collect VFX').children.filter(c => c.visible).length, 0);
    item.taken = true; item.downUntil = 2.5; tick();
    const group = scene.getObjectByName('Pickup collect VFX');
    assert.equal(group.children.filter(c => c.visible).length, 1);
    tick();
    assert.equal(group.children.filter(c => c.visible).length, 1, 'same take does not spawn a duplicate');
    item.taken = false; race.elapsed = 3; tick(1);
    assert.equal(group.children.filter(c => c.visible).length, 0);
    item.taken = true; item.downUntil = 5.5; tick();
    assert.equal(group.children.filter(c => c.visible).length, 1, 'a new respawn take gets a new effect');
    effects.reset();
    assert.equal(group.children.filter(c => c.visible).length, 0);
    tick(0);
    assert.equal(group.children.filter(c => c.visible).length, 0);
    effects.dispose();
  } finally { delete globalThis.devicePixelRatio; }
});

// Ring and shard transforms of one running effect, in the effect's local space.
function choreography(tier, age) {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  vfx.spawn(tier, { distance: 100, x: 0, altitude: 0 });
  vfx.update(age, { distance: 0, center: 0, roadCenter: () => 0 });
  const stage = vfx.group.children.find(s => s.visible), shards = stage.children.find(mesh => mesh.isInstancedMesh);
  const rings = stage.children.filter(mesh => mesh.name.startsWith('energy shockwave') && mesh.visible);
  const matrix = new THREE.Matrix4(), shardPoints = [], values = [];
  for (let i = 0; i < shards.count; i++) {
    shards.getMatrixAt(i, matrix);
    values.push(...matrix.elements, matrix.determinant());
    shardPoints.push(new THREE.Vector3().setFromMatrixPosition(matrix));
  }
  for (const ring of rings) values.push(...ring.position.toArray(), ...ring.scale.toArray(), ring.material.opacity);
  const flash = stage.children.find(child => child.isSprite);
  values.push(flash.material.opacity, ...flash.scale.toArray(), ...flash.position.toArray());
  const result = { rings, shardPoints, values, flash, signature: rings.map(ring => [...ring.position.toArray(), ...ring.rotation.toArray().slice(0, 3)].map(v => v.toFixed(2)).join()).join('|') };
  vfx.dispose();
  return result;
}

test('each tier plays its own choreography on the shared pooled meshes', () => {
  const at = Object.fromEntries(tiers.map(tier => [tier, choreography(tier, .25)]));
  assert.equal(new Set(tiers.map(tier => at[tier].signature)).size, 4, 'no two tiers move their rings alike');
  const spread = (points, axis) => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]));
  assert.ok(at.cell.rings.every(ring => ring.scale.x < 2.7), 'cell: the rings contract onto the car');
  assert.ok(at.can.shardPoints.every(p => p.z > 1.3), 'can: every ember is thrown out behind the car');
  assert.ok(at.can.rings.every(ring => ring.position.z > 1.3), 'can: the heat rings trail behind the car');
  assert.ok(spread(at.tank.shardPoints, 'y') > 1 && spread(at.tank.shardPoints, 'x') < 3.2, 'tank: a tall narrow helix');
  assert.ok(new Set(at.overcharge.rings.map(ring => ring.rotation.x.toFixed(2))).size > 1, 'overcharge: rings spin on different axes');
  assert.ok(at.overcharge.shardPoints.every(p => p.y > 0), 'overcharge: nothing bursts down through the road');
});

test('every frame of every tier is finite and non-degenerate (one NaN pixel blacks out the bloom)', () => {
  for (const tier of tiers) for (let age = .01; age < PICKUP_COLLECTION_STYLES[tier].life; age += .04) {
    const { values, flash } = choreography(tier, age);
    assert.ok(values.every(Number.isFinite), `${tier} at ${age.toFixed(2)} s`);
    assert.ok(flash.material.opacity <= .9 && flash.scale.x <= 4, `${tier} flash stays bounded at ${age.toFixed(2)} s`);
  }
});

test("the player's effect rides the car; a rival's stays at the item", () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  const item = { distance: 100, x: 2, altitude: 0 }, car = { distance: 130, x: -1, altitude: 0 };
  const pose = new THREE.Object3D(), frame = { distance: 130, center: 0, roadCenter: () => 0, car, pose };
  pose.position.set(-1, .4, 0);
  pose.rotation.y = .5;
  pose.updateMatrixWorld();
  vfx.spawn('can', item, { follow: true });
  vfx.spawn('tank', item, { rival: true });
  vfx.update(.1, frame);
  const stage = tier => vfx.group.children.find(s => s.visible && s.userData.tier === tier);
  assert.deepEqual(stage('can').position.toArray(), pose.position.toArray(), 'anchored on the rendered car');
  assert.ok(stage('can').quaternion.angleTo(pose.quaternion) < 1e-6, 'and turned with it, so "behind" stays behind');
  assert.equal(stage('tank').position.z, 30, 'a rival cue is left where the item was');
  pose.position.x = 3;
  pose.updateMatrixWorld();
  vfx.update(.1, frame);
  assert.equal(stage('can').position.x, 3, 'it keeps following while it plays');
  vfx.update(.05, { ...frame, pose: undefined });
  assert.ok(stage('can').position.distanceTo(new THREE.Vector3(-1, .3, 0)) < 1e-9, 'without a rendered pose it follows the race state');
  vfx.dispose();
});

test('reduced motion keeps one still ring and a faint glow for every tier', () => {
  for (const tier of tiers) {
    const vfx = createPickupCollectVfx(new THREE.Scene());
    vfx.spawn(tier, { distance: 10, x: 0, altitude: 0 }, { reducedMotion: true, follow: true });
    const frame = { distance: 0, center: 0, roadCenter: () => 0, car: { distance: 0, x: 0, altitude: 0 } };
    vfx.update(.1, frame);
    const stage = vfx.group.children.find(s => s.visible), ring = () => stage.children.find(mesh => mesh.name === 'energy shockwave 0');
    const before = [...ring().scale.toArray(), ...ring().rotation.toArray().slice(0, 3)];
    vfx.update(.1, frame);
    assert.deepEqual([...ring().scale.toArray(), ...ring().rotation.toArray().slice(0, 3)], before, tier + ' ring does not move');
    assert.equal(stage.children.filter(mesh => mesh.name.startsWith('energy shockwave') && mesh.visible).length, 1, tier);
    assert.ok(stage.children.find(child => child.isSprite).material.opacity < .25, tier + ' glow stays faint');
    assert.equal(stage.children.find(mesh => mesh.isInstancedMesh).count, 0, tier + ' has no particles');
    vfx.dispose();
  }
});

test('a rival pickup on a branching course retains its original graph item for world-point placement', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene(), effects = createEffects(scene, () => 0);
    const race = createRace('coast');
    race.phase = 'racing'; race.player.speed = 40; race.player.distance = 0;
    race.rings = [];
    const item = { tier: 'can', distance: 80, x: 0, altitude: 0, edgeId: 'shortcut-branch' };
    race.pickups = [item];
    const accessed = [];
    const options = { worldPoint: (distance, x, y, origin, original) => {
      if (original) accessed.push(original);
      return [x, y, -(distance - origin)];
    } };
    effects.update(race, .05, 0, false, false, undefined, options);
    accessed.length = 0;
    race.elapsed = 1;
    item.downUntil = 3.5;
    race.rivals[0].lastTake = { time: race.elapsed, distance: item.distance,
      x: item.x, altitude: item.altitude, kind: item.tier };
    effects.update(race, .05, 0, false, false, undefined, options);
    assert.ok(scene.getObjectByName('Pickup collect VFX').children.some(stage => stage.visible));
    assert.ok(accessed.includes(item), 'use the authored pickup edge and branch metadata, not the generic rival cue');
    effects.dispose();
  } finally { delete globalThis.devicePixelRatio; }
});

test('a player collection leaves a short 3D pulse at the authored pickup while the other effect follows the car', () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  const item = { distance: 120, x: 2, altitude: 0, edgeId: 'banked-branch' };
  const pose = new THREE.Object3D();
  pose.position.set(9, 1, -6);
  const up = [0, Math.SQRT1_2, Math.SQRT1_2];
  const frame = {
    pose, distance: 124,
    worldPoint: (s, x, y, origin, source) => {
      assert.equal(source, item);
      return [x, y, origin - s];
    },
    worldFrame: () => ({ right: [1, 0, 0], up, forward: [0, Math.SQRT1_2, -Math.SQRT1_2] }),
  };
  vfx.spawn('tank', item, { follow: true });
  vfx.update(.08, frame);
  const stage = vfx.group.children.find(s => s.visible);
  const pulse = stage.getObjectByName('Pickup contact pulse');
  assert.ok(pulse?.visible, 'the collection point has its own effect');
  const position = () => pulse.getWorldPosition(new THREE.Vector3());
  assert.ok(position().distanceTo(new THREE.Vector3(2, .08, 4)) < 1e-6);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(pulse.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(normal.distanceTo(new THREE.Vector3(...up)) < 1e-6, 'pulse lies against the banked course');
  pose.position.set(-8, 2, -3);
  pose.rotation.y = .6;
  vfx.update(.08, { ...frame, distance: 130 });
  assert.ok(position().distanceTo(new THREE.Vector3(2, .08, 10)) < 1e-6, 'only the road origin moves the contact pulse');
  vfx.update(.3, { ...frame, distance: 130 });
  assert.ok(stage.visible && !pulse.visible, 'contact expires before the car choreography');
  vfx.dispose();
});

test('the body sweep tints every paint, including the near-white Stratosway R2', () => {
  const car = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4));
  car.userData.body = body;
  car.add(body);
  body.material.color.set('#e6e9e7'); // R2 default paint
  const vfx = createPickupCollectVfx(new THREE.Scene(), car);
  const shell = body.getObjectByName('Pickup body sweep'), { material } = shell;
  // Additive light on a light paint clips to white and the sweep vanishes; an alpha-blended tint shows on any paint.
  assert.equal(material.blending, THREE.NormalBlending);
  assert.equal(material.depthWrite, false);
  const paintLight = () => {
    vfx.reset();
    vfx.spawn('tank', { distance: 10, x: 0 }, { follow: true });
    vfx.update(.1, { pose: car });
    return material.uniforms.paintLight.value;
  };
  assert.ok(paintLight() > .95, 'a near-white paint gets the deep, stronger tint');
  body.material.color.set('#8c1010');
  assert.ok(paintLight() < .05, 'a dark paint (Crimson GT) keeps the plain tint');
  const dressed = new THREE.Mesh(body.geometry, new THREE.MeshStandardMaterial({ color: '#f4f4f4' }));
  dressed.add(shell); // the garage rig re-parents the shell onto the GLB body
  assert.ok(paintLight() > .95, 'the paint is read from whichever body carries the shell');
  vfx.dispose();
});

test('the sweep covers every painted part of a procedural car, not only its body mesh', () => {
  const car = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: '#e6e9e7' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), paint);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2, .1, .5), paint), glass = new THREE.Mesh(new THREE.BoxGeometry(1, .5, 1));
  wing.position.set(0, 1.1, 2);
  car.userData.body = body;
  car.add(body, wing, glass);
  const vfx = createPickupCollectVfx(new THREE.Scene(), car);
  const extra = wing.getObjectByName('Pickup paint sweep');
  assert.ok(extra, 'the painted wing (R2: most of the rear view) carries the sweep too');
  assert.equal(extra.material, body.getObjectByName('Pickup body sweep').material, 'one shared material, one program');
  assert.equal(extra.userData.followsBody, undefined, 'not a garage rider: a dressed GLB hides it with its procedural part');
  assert.equal(glass.children.length, 0, 'unpainted parts keep their own look');
  vfx.spawn('can', { distance: 10, x: 0 }, { follow: true });
  vfx.update(.1, { pose: car });
  assert.ok(extra.visible);
  vfx.reset();
  assert.equal(extra.visible, false);
  vfx.dispose();
  assert.equal(extra.parent, null);
});

test('a new car pickup paints its fitted shell; rival cues and reduced motion never paint the player', () => {
  const scene = new THREE.Scene();
  const car = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4));
  car.userData.body = body;
  car.add(body);
  scene.add(car);
  const vfx = createPickupCollectVfx(scene, car);
  const shell = body.getObjectByName('Pickup body sweep');
  assert.ok(shell?.userData.followsBody, 'the existing garage rig can bind this sweep to the dressed GLB body');
  const event = { distance: 80, x: 0, altitude: 0 };
  const frame = { distance: 80, pose: car };
  vfx.spawn('tank', event, { follow: true });
  vfx.update(.14, frame);
  assert.ok(shell.visible);
  assert.deepEqual(shell.material.uniforms.zRange.value.toArray(), [-2, 2]);
  const tankColor = shell.material.uniforms.primary.value.clone();
  vfx.spawn('overcharge', event, { rival: true });
  vfx.update(.03, frame);
  assert.ok(shell.material.uniforms.primary.value.equals(tankColor));
  assert.equal(vfx.group.children.find(s => s.userData.tier === 'overcharge').getObjectByName('Pickup contact pulse').visible, false);
  vfx.spawn('cell', event, { follow: true, reducedMotion: true });
  vfx.update(.03, { ...frame, reducedMotion: true });
  assert.equal(shell.visible, false);
  assert.equal(vfx.group.children.find(s => s.userData.tier === 'cell').getObjectByName('Pickup contact pulse').visible, false);

  shell.geometry = new THREE.BoxGeometry(1, 2, 8); // the garage rig swaps the shell's reference on dress
  vfx.spawn('can', event, { follow: true });
  vfx.update(.12, frame);
  assert.ok(shell.visible);
  assert.deepEqual(shell.material.uniforms.zRange.value.toArray(), [-4, 4]);
  vfx.update(.02, { ...frame, enabled: false });
  assert.equal(shell.visible, false);
  vfx.reset();
  assert.equal(vfx.activeCount(), 0);
  vfx.dispose();
  assert.equal(shell.parent, null);
});

test('enabling reduced motion during a pickup immediately leaves one faint ring', () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  vfx.spawn('overcharge', { distance: 10, x: 0 }, { follow: true });
  vfx.update(.18);
  const stage = vfx.group.children.find(s => s.visible);
  const rings = () => stage.children.filter(child => child.name.startsWith('energy shockwave') && child.visible);
  assert.equal(rings().length, 3);
  vfx.update(.02, { reducedMotion: true });
  assert.equal(rings().length, 1, 'previously active rings must hide immediately');
  assert.equal(stage.getObjectByName('Pickup contact pulse').visible, false);
  assert.equal(stage.getObjectByName('energy shards').visible, false);
  vfx.dispose();
});

test('vehicle pickup effects fit a wide, long, offset model and refit after a car swap', () => {
  const scene = new THREE.Scene(), car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4));
  body.position.y = .5;
  car.userData.body = body;
  car.add(body);
  scene.add(car);
  const vfx = createPickupCollectVfx(scene, car);
  const event = { distance: 12, x: -5 };
  const show = tier => {
    vfx.reset();
    vfx.spawn(tier, event, { follow: true });
    vfx.update(.12, { pose: car, distance: 12 });
    return vfx.group.children.find(stage => stage.visible);
  };

  car.userData.visualBounds = new THREE.Box3(new THREE.Vector3(-1, 0, -4), new THREE.Vector3(3, 2, 6));
  const wide = show('can');
  const ring = wide.getObjectByName('energy shockwave 0');
  const at = new THREE.Vector3();
  ring.getWorldPosition(at);
  assert.ok(at.z > 6, 'heat ring leaves the actual tail of a longer vehicle');
  assert.ok(Math.abs(at.x - 1) < 1e-6, 'heat ring is centered across the displayed vehicle');
  const shards = wide.getObjectByName('energy shards'), instance = new THREE.Matrix4();
  shards.getMatrixAt(0, instance);
  const firstEmber = new THREE.Vector3().setFromMatrixPosition(instance);
  shards.localToWorld(firstEmber);
  assert.ok(firstEmber.z > 6 && firstEmber.x < 1, 'the ember starts behind the same tail');
  const contact = wide.getObjectByName('Pickup contact pulse');
  assert.ok(contact.getWorldPosition(at).distanceTo(new THREE.Vector3(-5, .08, 0)) < 1e-6, 'pickup point remains in course coordinates');

  car.userData.visualBounds = new THREE.Box3(new THREE.Vector3(-3, 0, -2), new THREE.Vector3(-1, 1, 2));
  const compact = show('can');
  compact.getObjectByName('energy shockwave 0').getWorldPosition(at);
  assert.ok(at.z > 2 && at.z < 3, 'replacement body uses its own tail');
  assert.ok(Math.abs(at.x + 2) < 1e-6, 'replacement body uses its own center');

  vfx.reset();
  vfx.spawn('can', event, { rival: true });
  vfx.update(.12, { pose: car, distance: 12 });
  vfx.group.children.find(stage => stage.visible).getObjectByName('energy shockwave 0').getWorldPosition(at);
  assert.ok(Math.abs(at.x + 5) < 1e-6, 'rival effect is independent of the player body');
  vfx.dispose();
});

test('the body sweep travels in vehicle coordinates even for a rotated nested body mesh', () => {
  const scene = new THREE.Scene(), car = new THREE.Group(), mount = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 2));
  mount.position.set(1, 3, 5);
  mount.rotation.y = Math.PI / 2;
  mount.scale.set(2, 1, .5);
  mount.add(body);
  car.add(mount);
  car.position.set(21, 7, 43);
  car.rotation.y = -.6;
  car.userData.body = body;
  scene.add(car);
  const vfx = createPickupCollectVfx(scene, car);
  vfx.spawn('cell', { distance: 10, x: 0 }, { follow: true });
  vfx.update(.1, { pose: car });
  const shell = body.getObjectByName('Pickup body sweep');
  const { vehicleInverse, zRange, yRange } = shell.material.uniforms;
  assert.ok(vehicleInverse, 'shader maps each drawn mesh (modelMatrix) into the vehicle frame');
  const nose = new THREE.Vector3(3, 1, 0).applyMatrix4(shell.matrixWorld).applyMatrix4(vehicleInverse.value);
  assert.ok(nose.distanceTo(new THREE.Vector3(1, 4, -1)) < 1e-6);
  assert.ok(zRange.value.distanceTo(new THREE.Vector2(-1, 11)) < 1e-6);
  assert.ok(yRange.value.distanceTo(new THREE.Vector2(2, 4)) < 1e-6);
  vfx.dispose();
});

test('tank gold hoops rise together with the road normal even when the fitted car pitches and rolls', () => {
  const scene = new THREE.Scene(), car = new THREE.Object3D();
  car.userData.visualBounds = new THREE.Box3(new THREE.Vector3(-2, .1, -3), new THREE.Vector3(2, 1.6, 4));
  car.rotation.set(.34, .41, -.47);
  scene.add(car);
  const vfx = createPickupCollectVfx(scene, car);
  const roadNormal = new THREE.Vector3(.18, 1, .1).normalize();
  vfx.spawn('tank', { distance: 10, x: 0 }, { follow: true });
  vfx.update(.27, { pose: car, roadNormal });
  const stage = vfx.group.children.find(group => group.visible);
  const rings = stage.children.filter(mesh => mesh.name.startsWith('energy shockwave') && mesh.visible);
  assert.equal(rings.length, 2, 'two staggered gold hoops');
  for (const ring of rings) {
    ring.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(ring.matrixWorld);
    assert.ok(Math.abs(normal.dot(roadNormal)) > .99999, 'the hoop is parallel to the road');
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion).projectOnPlane(roadNormal).normalize();
    const longAxis = new THREE.Vector3(0, 1, 0).transformDirection(ring.matrixWorld);
    assert.ok(Math.abs(longAxis.dot(back)) > .99999, 'the oval is aligned to the car heading');
    assert.ok(new THREE.Vector3().setFromMatrixColumn(ring.matrixWorld, 1).length() > 3, 'the hoop fits the long car');
  }
  const firstHeight = rings[0].getWorldPosition(new THREE.Vector3()).dot(roadNormal);
  vfx.update(.14, { pose: car, roadNormal });
  assert.ok(rings[0].getWorldPosition(new THREE.Vector3()).dot(roadNormal) > firstHeight);
  vfx.dispose();
});

test('the race draws each collected pickup model shrinking toward the car and retires it before respawn', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene(), pose = new THREE.Object3D();
    scene.add(pose);
    const effects = createEffects(scene, () => 0);
    const race = createRace('coast');
    race.phase = 'racing'; race.rings = []; race.traffic = [];
    race.player.distance = 20;
    race.pickups = tiers.map(tier => ({ tier, distance: 24, x: 1.4, altitude: 0 }));
    const tick = dt => effects.update(race, dt, 0, false, false, [pose]);
    const shown = () => drawnMarkers(scene.getObjectByName('Nitro pickups'));
    tick(.01);
    const idle = shown();
    for (const pickup of race.pickups) { pickup.taken = true; pickup.downUntil = 3; }
    tick(.08);
    const absorbing = shown();
    assert.equal(absorbing.length, 4, 'all four models have their own collection transition');
    absorbing.forEach((model, i) => {
      assert.ok(model.scale.x < idle[i].scale.x);
      assert.ok(model.position.distanceTo(pose.position) < idle[i].position.distanceTo(pose.position));
    });
    tick(.25);
    assert.equal(shown().length, 0, 'collected models are gone once the transfer completes');
    effects.dispose();
  } finally { delete globalThis.devicePixelRatio; }
});

test('rapid repeated tank takes keep a separate fading pair for all three pickups', () => {
  const vfx = createPickupCollectVfx(new THREE.Scene());
  const spawn = distance => vfx.spawn('tank', { distance, x: 0 }, { follow: true });
  spawn(1);
  vfx.update(.3);
  spawn(2);
  vfx.update(.3);
  spawn(3);
  vfx.update(.09);
  assert.equal(vfx.activeCount(), 3);
  vfx.update(.3);
  assert.equal(vfx.activeCount(), 2, 'the oldest tank expires without cutting the newer ones');
  vfx.dispose();
});

test('the player cell and can add distinct body streaks and overcharge uses iridescent gyro tubes', () => {
  const scene = new THREE.Scene(), car = new THREE.Object3D(), camera = new THREE.PerspectiveCamera();
  scene.add(car);
  camera.position.set(4, 6, 9);
  const vfx = createPickupCollectVfx(scene, car, camera);
  for (const tier of ['cell', 'can', 'overcharge']) vfx.spawn(tier, { distance: 10, x: 0 }, { follow: true });
  vfx.update(.20, { pose: car });
  const stage = tier => vfx.group.children.find(group => group.visible && group.userData.tier === tier);
  for (const tier of ['cell', 'can']) {
    const streak = stage(tier).getObjectByName('Pickup body streaks');
    assert.ok(streak?.visible, tier + ' uses its own ribbons');
    const z = streak.geometry.attributes.position.array.filter((_, index) => index % 3 === 2);
    if (tier === 'cell') assert.ok(Math.max(...z) < 2.5 && Math.min(...z) < 0, 'blue current travels over the body');
    else assert.ok(Math.min(...z) > 2.2 && Math.max(...z) > 5, 'two jets start at the fitted tail and trail away');
  }
  const ring = stage('overcharge').getObjectByName('energy shockwave 0');
  assert.ok(ring.material.uniforms?.prism.value > .5, 'gyro tubes have a traveling prism highlight');
  assert.ok(Math.abs(ring.rotation.x - (-Math.PI / 2 + .2 * 1.6)) < 1e-8, 'the original pitch direction is preserved');
  assert.ok(Math.abs(ring.rotation.z - .2 * 2.4) < 1e-8, 'the original roll direction is preserved');
  vfx.dispose();
});

test('tank renders the approved gold tube and soft halo on both hoops instead of a solid column', () => {
  for (const quality of ['high', 'medium', 'low']) {
    const scene = new THREE.Scene(), car = new THREE.Group();
    car.userData.visualBounds = new THREE.Box3(new THREE.Vector3(-2, 0, -3), new THREE.Vector3(2, 1.6, 4));
    scene.add(car);
    const vfx = createPickupCollectVfx(scene, car);
    vfx.spawn('tank', { distance: 10, x: 0 }, { follow: true, quality });
    vfx.update(.25, { pose: car });
    const stage = vfx.group.children.find(slot => slot.visible);
    assert.equal(stage.getObjectByName('energy beam').visible, false, 'the old solid gold column must not compete with the hoops');
    const glow = stage.getObjectByName('Pickup tank ground glow');
    assert.ok(glow?.visible && glow.material.opacity > 0, 'a soft glow lights the underside');
    const rings = stage.children.filter(mesh => mesh.name.startsWith('energy shockwave') && mesh.visible);
    assert.equal(rings.length, 2, quality + ' keeps both signature hoops');
    for (const ring of rings) {
      assert.ok(ring.material.uniforms.tubeWidth.value > .065, 'world-unit tube thickness is independent of vehicle dimensions');
      assert.ok(ring.getObjectByName('Pickup tank halo')?.visible, 'a separate soft ribbon gives the core a feathered edge');
    }
    vfx.update(.3, { pose: car });
    assert.equal(glow.visible, false, 'the soft base fades before the last hoop');
    vfx.dispose();
  }
});
