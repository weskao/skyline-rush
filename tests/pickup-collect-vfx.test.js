import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPickupCollectVfx, PICKUP_COLLECTION_STYLES } from '../src/pickup-collect-vfx.js';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';

const tiers = ['cell', 'can', 'tank', 'overcharge'];

test('premium pickup collection has four increasingly expressive bounded tier designs', () => {
  assert.deepEqual(Object.keys(PICKUP_COLLECTION_STYLES), tiers);
  assert.deepEqual(tiers.map(t => PICKUP_COLLECTION_STYLES[t].rings), [2, 2, 3, 3]);
  assert.equal(new Set(tiers.map(t => PICKUP_COLLECTION_STYLES[t].motion)).size, 4, 'one choreography per tier');
  const lives = tiers.map(t => PICKUP_COLLECTION_STYLES[t].life);
  assert.deepEqual(lives, [...lives].sort((a, b) => a - b), 'rarer tiers play longer');
  assert.ok(lives.at(-1) <= 1, 'even the rarest effect is over within a second');
  assert.deepEqual(tiers.map(t => PICKUP_COLLECTION_STYLES[t].particles), [18, 24, 30, 42]);
  assert.equal(PICKUP_COLLECTION_STYLES.overcharge.rainbow, true);
  assert.ok(PICKUP_COLLECTION_STYLES.tank.beam && PICKUP_COLLECTION_STYLES.overcharge.beam);
});

test('pool preallocates geometry, reuses capacity, animates and cleans up finite 3D VFX', () => {
  const scene = new THREE.Scene(), vfx = createPickupCollectVfx(scene);
  const group = scene.getObjectByName('Pickup collect VFX');
  assert.equal(vfx.activeCount(), 0);
  assert.equal(group.children.length, 8, 'two concurrent effect slots for each tier');
  const geometryIds = new Set();
  group.traverse(mesh => { if (mesh.geometry && !mesh.isSprite) geometryIds.add(mesh.geometry.uuid); });
  assert.ok(geometryIds.size <= 4, 'four reused 3D geometry types, not one per animation');
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
