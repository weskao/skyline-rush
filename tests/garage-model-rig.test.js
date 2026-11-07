// Task 4 `?model=roadster`: the GLB Roadster follows the procedural car's animated parts and paint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, makeCar, poseWing } from '../src/car-model.js';
import { createGarageModel, garageModelId } from '../src/garage-model.ts';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createGaragePaintSweep } from '../src/garage-paint-shader.ts';
import { createGraceFade } from '../src/grace-fade.ts';

const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0)); };
const drawn = object => object.layers.test(new THREE.Camera().layers);
const WHEELS = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];

/** A stand-in GLB scene with the Roadster contract's rigged nodes and named materials. */
function roadsterGlb() {
  const scene = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ name: 'roadster_paint' });
  const light = new THREE.MeshStandardMaterial({ name: 'roadster_light' });
  const node = (name, parent = scene, material = paint) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  node('body');
  node('tail_light', scene, light);
  node('glass', scene, new THREE.MeshPhysicalMaterial({ name: 'roadster_glass', opacity: 0.5 })); // neither paint nor light
  for (const name of WHEELS) node(`${name}_spin`, node(name));
  const wing = node('wing'), blade = node('wing_blade', wing);
  node('wing_tip_l', blade);
  node('wing_tip_r', blade);
  node('wing_rams', wing);
  const fans = new THREE.Group(); // Task 4b: authored lift fans (pivot partner of the procedural `jets` group)
  fans.name = 'lift_fans';
  scene.add(fans);
  for (let i = 1; i <= 4; i++) node(`lift_fan_0${i}_disc`, node(`lift_fan_0${i}`, fans));
  return scene;
}

function setup() {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene(), keep = new THREE.Group();
  car.add(keep);
  scene.add(car);
  const original = roadsterGlb();
  const cache = { async load(id) { return { kind: 'model', id, instance: () => original.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'roadster2', cache, dataset: {}, compile: async () => {} });
  const host = { name: 'studio', car, keep, scene };
  return { car, model, host, original };
}

async function dressed() {
  const ctx = setup();
  ctx.model.sync(true, 'high', ctx.host);
  await settle();
  ctx.model.sync(true, 'high', ctx.host);
  return { ...ctx, glb: name => ctx.car.getObjectByName(name) };
}

test('garageModelId: ?model=roadster opts in to the roadster2 GLB', () => {
  assert.equal(garageModelId('?model=roadster'), 'roadster2');
  assert.equal(garageModelId('?model=Roadster'), null);
});

test('each GLB wheel follows the procedural wheel at the same corner', async () => {
  const { car, model, host, glb } = await dressed();
  const [fl, rl, fr, rr] = car.userData.wheels; // makeCar order: x -1.05 then 1.05, each z front then rear
  const pairs = { wheel_fl: fl, wheel_fr: fr, wheel_rl: rl, wheel_rr: rr };
  for (const [i, wheel] of car.userData.wheels.entries()) { wheel.rotation.x = 0.3 + i; wheel.position.y = 0.7 + i * 0.01; }
  model.sync(true, 'high', host);
  for (const [name, wheel] of Object.entries(pairs)) {
    assert.deepEqual(glb(name).position.toArray(), wheel.position.toArray(), name);
    assert.ok(glb(name).quaternion.equals(wheel.quaternion), name);
  }
});

test('each GLB wheel spin node follows the procedural wheel spin node', async () => {
  const { car, model, host, glb } = await dressed();
  const spins = car.userData.wheels.map(w => w.getObjectByName('Roadster wheel spin'));
  spins.forEach((spin, i) => { spin.rotation.x = 1.1 + i; });
  model.sync(true, 'high', host);
  const [fl, rl, fr, rr] = spins;
  for (const [name, spin] of Object.entries({ wheel_fl: fl, wheel_fr: fr, wheel_rl: rl, wheel_rr: rr })) {
    assert.ok(glb(`${name}_spin`).quaternion.equals(spin.quaternion), name);
  }
});

test('the GLB wing, blade, tips and rams follow the procedural active wing', async () => {
  const { car, model, host, glb } = await dressed();
  const wing = car.userData.wing;
  poseWing(wing, 1, 1);
  model.sync(true, 'high', host);
  const { blade, rams } = wing.userData;
  const tips = blade.children.filter(c => c.userData.fold);
  const left = tips.find(t => t.position.x < 0), right = tips.find(t => t.position.x > 0);
  for (const [name, proc] of [['wing', wing], ['wing_blade', blade], ['wing_tip_l', left], ['wing_tip_r', right], ['wing_rams', rams]]) {
    assert.deepEqual(glb(name).position.toArray(), proc.position.toArray(), name);
    assert.ok(glb(name).quaternion.equals(proc.quaternion), name);
    assert.deepEqual(glb(name).scale.toArray(), proc.scale.toArray(), name);
  }
});

test('paint and light colours follow the procedural car without touching the cached original', async () => {
  const { car, model, host, glb, original } = await dressed();
  car.userData.body.material.color.set('#ff2200');
  car.userData.body.material.metalness = 0.42;
  car.userData.body.material.roughness = 0.33;
  car.userData.brakeLight.color.setRGB(0.1, 2, 0.3);
  model.sync(true, 'high', host);
  const paint = glb('body').material, light = glb('tail_light').material;
  assert.equal(paint.color.getHexString(), 'ff2200');
  assert.equal(paint.metalness, 0.42);
  assert.equal(paint.roughness, 0.33);
  assert.deepEqual(light.emissive.toArray(), [0.1, 2, 0.3]);
  assert.notEqual(paint, original.getObjectByName('body').material, 'per-instance paint material');
  assert.equal(original.getObjectByName('body').material.color.getHexString(), 'ffffff');
});

test('authored GLB lift fans replace the procedural flight fans and follow their visibility', async () => {
  const { car, model, host, glb } = await dressed();
  const jets = car.userData.jets;
  car.userData.jets.traverse(o => assert.equal(drawn(o), false, 'procedural fans hidden'));
  assert.equal(drawn(car.userData.body), false);
  assert.equal(drawn(car.userData.wheels[0].children[0]), false);
  for (const thrusting of [true, false, true]) {
    jets.visible = thrusting;
    model.sync(true, 'high', host);
    assert.equal(glb('lift_fans').visible, thrusting, `GLB fans follow jets.visible=${thrusting}`);
  }
});

test('lift fans are compiled while still visible, then hidden until the car thrusts', async () => {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene(), keep = new THREE.Group();
  car.add(keep);
  scene.add(car);
  const original = roadsterGlb();
  const seen = [];
  const cache = { async load(id) { return { kind: 'model', id, instance: () => original.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'roadster2', cache, dataset: {}, compile: async object => { seen.push(object.getObjectByName('lift_fans').visible); } });
  model.sync(true, 'high', { name: 'studio', car, keep, scene });
  await settle();
  assert.deepEqual(seen, [true], 'compileAsync only builds visible objects');
  assert.equal(car.getObjectByName('lift_fans').visible, false, 'hidden once attached: the car is not thrusting');
});

test('a GLB without lift fans (the probe) keeps the procedural flight fans drawn', async () => {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene(), keep = new THREE.Group();
  car.add(keep);
  scene.add(car);
  const probe = new THREE.Group();
  probe.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()), { name: 'body' }));
  const cache = { async load(id) { return { kind: 'model', id, instance: () => probe.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'pipeline-probe', cache, dataset: {}, compile: async () => {} });
  model.sync(true, 'high', { name: 'studio', car, keep, scene });
  await settle();
  car.userData.jets.traverse(o => assert.equal(drawn(o), true, 'jets keep rendering'));
  assert.equal(drawn(car.userData.body), false);
});

test('dressing leaves the procedural car pose, collision parts and VFX ports untouched', async () => {
  const ctx = setup();
  const { car, model, host } = ctx;
  car.position.set(3, 1.5, -40);
  car.quaternion.setFromEuler(new THREE.Euler(0.05, 0.4, -0.02));
  car.updateMatrixWorld(true);
  const snapshot = () => { car.updateMatrixWorld(true); const out = []; car.traverse(o => { if (o.userData.garageModel || o.parent?.userData.garageModel) return; out.push(o.matrixWorld.toArray().map(v => v.toFixed(6)).join()); }); return out; };
  const before = snapshot();
  model.sync(true, 'high', host);
  await settle();
  model.sync(true, 'high', host);
  const instance = car.children.find(c => c.userData.garageModel);
  assert.ok(instance, 'dressed');
  assert.deepEqual(instance.position.toArray(), [0, 0, 0]);
  assert.deepEqual(instance.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(instance.scale.toArray(), [1, 1, 1]);
  const after = snapshot();
  assert.deepEqual(after.slice(0, before.length), before, 'procedural car and its children keep their world transforms');
});

test('close restores the procedural car and disposes the per-instance materials', async () => {
  const { car, model, glb } = await dressed();
  const paint = glb('body').material;
  let disposed = 0;
  paint.addEventListener('dispose', () => disposed++);
  model.sync(false, 'high', null);
  assert.equal(car.getObjectByName('wheel_fl'), undefined);
  assert.equal(drawn(car.userData.body), true);
  assert.equal(disposed, 1);
});

// Task 4c: car equipment that rides on the procedural body (premium launch flare glow, Studio paint sweep) moves to the GLB.
const glbBody = car => car.children.find(c => c.userData.garageModel).getObjectByName('body');

test('the launch flare body glow wraps the GLB body while dressed, across a re-dress, and returns on close', async () => {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene();
  scene.add(car);
  const aero = createAeroVFX(scene, car);
  const glow = car.getObjectByName('Launch flare body glow'), procedural = glow.geometry;
  const original = roadsterGlb();
  original.getObjectByName('body').position.set(0, 0.65, -0.055); // roadster2: quantized body, positions in [-1, 1]
  original.getObjectByName('body').scale.setScalar(2.425);
  const cache = { async load(id) { return { kind: 'model', id, instance: () => original.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'roadster2', cache, dataset: {}, compile: async () => {} });
  const host = { name: 'home', car, keep: aero.group, scene };
  const frame = glow.material.uniforms.bodyFrame.value;
  // bodyFrame maps a GLB body vertex to the point it occupies in procedural body space
  const mapped = v => { car.updateMatrixWorld(true); const world = glbBody(car).localToWorld(v.clone()); return car.userData.body.worldToLocal(world); };
  for (const quality of ['high', 'low']) { // a quality change swaps in a new instance: the old rig lets go after the new one binds
    model.sync(true, quality, host);
    await settle();
    model.sync(true, quality, host);
    assert.ok(glow.parent === glbBody(car), `${quality}: glow rides on the GLB body`); // identity: a failing equal would print the whole scene
    assert.ok(glow.geometry === glbBody(car).geometry, `${quality}: glow wraps the GLB silhouette`);
    assert.equal(drawn(glow), true, `${quality}: glow is drawn`);
    const v = new THREE.Vector3(0.4, -0.3, 0.9), expected = mapped(v);
    const shader = v.clone().multiplyScalar(frame.w).add(new THREE.Vector3(frame.x, frame.y, frame.z));
    assert.ok(shader.distanceTo(expected) < 1e-6, `${quality}: bodyFrame ${frame.toArray()} maps into the procedural body frame`);
  }
  model.sync(false, 'high', null);
  assert.ok(glow.parent === car.userData.body, 'glow back on the procedural body');
  assert.ok(glow.geometry === procedural, 'procedural geometry restored');
  assert.deepEqual(frame.toArray(), [0, 0, 0, 1], 'identity frame restored');
  assert.equal(drawn(glow), true);
});

test('a GLB without a body mesh (the probe) leaves the launch flare glow hidden with the procedural body', async () => {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene();
  scene.add(car);
  const aero = createAeroVFX(scene, car);
  const glow = car.getObjectByName('Launch flare body glow');
  const probe = new THREE.Group();
  probe.add(Object.assign(new THREE.Group(), { name: 'body' })); // not a mesh: nothing to wrap
  const cache = { async load(id) { return { kind: 'model', id, instance: () => probe.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'pipeline-probe', cache, dataset: {}, compile: async () => {} });
  model.sync(true, 'high', { name: 'studio', car, keep: aero.group, scene });
  await settle();
  assert.ok(glow.parent === car.userData.body, 'glow stays on the procedural body');
  assert.equal(drawn(glow), false, 'masked with the procedural car');
});

test('the Studio paint sweep shader hook carries over to the GLB paint, and only where the procedural paint has it', async () => {
  const plain = await dressed();
  assert.ok(glbBody(plain.car).material.onBeforeCompile === THREE.Material.prototype.onBeforeCompile, 'Home/race paint: no sweep');
  const ctx = setup();
  const finish = new THREE.MeshPhysicalMaterial();
  ctx.car.userData.body.material = finish;
  createGaragePaintSweep(finish);
  ctx.model.sync(true, 'high', ctx.host);
  await settle();
  const paint = glbBody(ctx.car).material;
  assert.ok(paint.onBeforeCompile === finish.onBeforeCompile, 'sweep hook carried over');
  assert.equal(paint.customProgramCacheKey(), 'garage-paint-sweep-v1');
});

test('a GLB wheel without its _spin pivot (pre-rig contract, e.g. the probe) keeps its own transform', async () => {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene(), keep = new THREE.Group();
  car.add(keep);
  scene.add(car);
  const probe = new THREE.Group();
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'probe_tire' }));
  wheel.name = 'wheel_fl';
  wheel.position.set(-0.85, 0.35, -1.2);
  probe.add(wheel);
  const cache = { async load(id) { return { kind: 'model', id, instance: () => probe.clone(true), release() {} }; } };
  const model = createGarageModel({ id: 'pipeline-probe', cache, dataset: {}, compile: async () => {} });
  const host = { name: 'studio', car, keep, scene };
  model.sync(true, 'high', host);
  await settle();
  car.userData.wheels[0].rotation.z = 1;
  model.sync(true, 'high', host);
  const dressedWheel = car.getObjectByName('wheel_fl');
  assert.deepEqual(dressedWheel.position.toArray(), [-0.85, 0.35, -1.2]);
  assert.deepEqual(dressedWheel.quaternion.toArray(), [0, 0, 0, 1]);
});

// develop 51e25a03: post-hit grace pulses the player car translucent (grace-fade.ts); a GLB-dressed player car pulses too.
test('post-hit grace fades every GLB material with the procedural car, leaving the cached original alone', async () => {
  const ctx = setup();
  const fade = createGraceFade(ctx.car); // world.js: when the player car is built, before any GLB dresses it
  ctx.model.sync(true, 'high', ctx.host);
  await settle();
  ctx.model.sync(true, 'high', ctx.host);
  const materials = [], base = new Map();
  glbBody(ctx.car).parent.traverse(o => { if (o.isMesh) { materials.push(o.material); base.set(o.material, o.material.opacity); } });
  assert.ok(materials.every(m => m.transparent), 'blending from dress time, so the first hit compiles nothing');
  for (const opacity of [0.4, 0.7, 1]) {
    fade(opacity);
    ctx.model.sync(true, 'high', ctx.host);
    for (const m of materials) assert.ok(Math.abs(m.opacity - base.get(m) * opacity) < 1e-9, `${m.name} at ${opacity}: ${m.opacity}`);
  }
  ctx.original.traverse(o => { if (o.isMesh) assert.ok(!o.material.transparent && o.material.opacity === (o.name === 'glass' ? 0.5 : 1), o.name); });
});

test('a car that never fades (Garage Studio, showcase) keeps the GLB opaque', async () => {
  const { glb } = await dressed();
  for (const name of ['body', 'tail_light', 'glass']) assert.equal(glb(name).material.transparent, false, name);
});
