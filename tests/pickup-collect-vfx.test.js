import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPickupCollectVfx, PICKUP_COLLECTION_STYLES } from '../src/pickup-collect-vfx.js';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';

const tiers = ['cell', 'can', 'tank', 'overcharge'];

test('premium pickup collection has four increasingly expressive bounded tier designs', () => {
  assert.deepEqual(Object.keys(PICKUP_COLLECTION_STYLES), tiers);
  assert.deepEqual(tiers.map(t => PICKUP_COLLECTION_STYLES[t].rings), [1, 2, 2, 3]);
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
  group.traverse(mesh => { if (mesh.geometry) geometryIds.add(mesh.geometry.uuid); });
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
  group.traverse(obj => { if (obj.geometry) resources.add(obj.geometry); if (obj.material) resources.add(obj.material); });
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
    const scene = new THREE.Scene(), effects = createEffects(scene, () => 0, { pickup3D: true });
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

test('legacy pickup mode does not allocate premium VFX objects', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene(), effects = createEffects(scene, () => 0, { pickup3D: false });
    assert.equal(scene.getObjectByName('Pickup collect VFX'), undefined);
    effects.dispose();
  } finally { delete globalThis.devicePixelRatio; }
});
