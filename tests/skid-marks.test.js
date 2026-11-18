import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, PlaneGeometry, Scene, Vector3 } from 'three';
import { SKID_CAPACITY, createSkidMarks } from '../src/skid-marks.js';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { createEffects } from '../src/effects.js';
import { createRace } from '../src/game.js';

const drift = time => ({ time, dir: 1, nitro: 0, grace: 0 });
const quads = marks => marks.mesh.geometry.drawRange.count / 6;

// Drives the car `metres` down -z (scene space) in 0.25 m frames while the world origin follows it, as world.js does.
function drive(marks, car, origin, metres, state, z = { at: 0 }) {
  for (let i = 0; i < metres * 4; i++) {
    z.at -= 0.25;
    origin.z = z.at; car.position.z = 0; // floating origin: the car stays at the scene origin
    car.updateMatrixWorld(true);
    marks.update(state, origin);
  }
  return z;
}

// Absolute (origin-free) position of every written vertex.
function absolute(marks, origin) {
  const { position } = marks.mesh.geometry.attributes, out = [];
  for (let i = 0; i < quads(marks) * 4; i++) out.push(new Vector3().fromBufferAttribute(position, i).add(marks.mesh.position).add(origin));
  return out;
}

test('a drift leaves marks under both rear tyres that stay after it ends, until the race resets', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  scene.add(car);
  const marks = createSkidMarks(scene, car);
  assert.equal(quads(marks), 0);
  const z = drive(marks, car, origin, 20, drift(1));
  const made = quads(marks);
  assert.ok(made >= 50, `about two quads per tyre per 0.6 m, got ${made}`);
  const xs = absolute(marks, origin).map(v => v.x);
  assert.ok(xs.some(x => x < -0.8) && xs.some(x => x > 0.8), 'one trail per rear tyre');
  drive(marks, car, origin, 40, null, z);
  assert.equal(quads(marks), made, 'no new marks without a drift, and the old ones stay');
  marks.reset();
  assert.equal(quads(marks), 0);
});

test('marks stay where they were laid while the floating origin moves on', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  const z = drive(marks, car, origin, 10, drift(1));
  const laid = absolute(marks, origin).map(v => v.toArray());
  drive(marks, car, origin, 300, null, z);
  absolute(marks, origin).forEach((v, i) => laid[i].forEach((c, k) => assert.ok(Math.abs(v.getComponent(k) - c) < 1e-3)));
  assert.ok(laid.every(([, , z]) => z <= 1.5 && z >= -9), 'laid behind the car along the 10 m driven (rear wheels sit at z +1.42)');
});

test('marks follow the car\'s own rear wheels, scaled with the model', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  car.scale.setScalar(1.5);
  const marks = createSkidMarks(scene, car);
  drive(marks, car, origin, 5, drift(1));
  const rear = car.userData.wheels.filter(w => w.position.z > 0).map(w => w.position.x * 1.5);
  const xs = absolute(marks, origin).map(v => v.x);
  for (const x of rear) assert.ok(xs.some(v => Math.abs(v - x) < 0.25), `a trail at x=${x}`);
});

test('a trail fades in where the drift starts and out where it ends', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  const z = drive(marks, car, origin, 6, drift(0));
  drive(marks, car, origin, 1, null, z);
  const alpha = marks.mesh.geometry.attributes.color;
  const n = quads(marks);
  assert.equal(alpha.getW(0), 0, 'first edge transparent');
  assert.equal(alpha.getW((n - 1) * 4 + 3), 0, 'last edge transparent');
  assert.ok(alpha.getW(Math.floor(n / 2) * 4) > 0);
});

test('past capacity the oldest marks are recycled, never more than SKID_CAPACITY quads', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  drive(marks, car, origin, SKID_CAPACITY / 2 * 0.75 + 200, drift(1)); // 0.25 m frames lay a quad every 0.75 m
  assert.equal(quads(marks), SKID_CAPACITY);
});

test('effects lay marks only while racing, and keep them through the finish', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), race = createRace();
  scene.add(car);
  const effects = createEffects(scene, () => 0, { player: car });
  const mesh = scene.getObjectByName('Skid marks');
  Object.assign(race, { pickups: [], rings: [] });
  race.player.speed = 40; race.player.drift = drift(1);
  const run = (phase, frames) => {
    race.phase = phase;
    for (let i = 0; i < frames; i++) { race.player.distance += 0.5; effects.update(race, 1 / 60, 0, false, false, [car]); }
  };
  run('ready', 20);
  assert.equal(mesh.geometry.drawRange.count, 0, 'nothing before GO');
  run('racing', 20);
  const laid = mesh.geometry.drawRange.count;
  assert.ok(laid > 0, 'marks while drifting');
  run('finished', 20);
  assert.equal(mesh.geometry.drawRange.count, laid, 'kept after the finish');
  effects.reset();
  assert.equal(mesh.geometry.drawRange.count, 0, 'cleared for the next race');
});

test('marks lie on the road under a rolled car: projected onto the ground-shadow plane, not the body frame', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const ground = new Mesh(new PlaneGeometry(4, 6)); // world.js places the car's shadow on the road at +0.03
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.03;
  scene.add(car, ground);
  car.rotation.z = 0.08; // a drift's body roll dips one rear wheel ~8 cm
  const marks = createSkidMarks(scene, car, ground);
  drive(marks, car, origin, 6, drift(1));
  const ys = absolute(marks, origin).map(v => v.y);
  assert.ok(ys.length > 0 && ys.every(y => Math.abs(y - 0.025) < 1e-3), `all at 0.025, got ${Math.min(...ys)}..${Math.max(...ys)}`);
});


test('an equipped drift trail adds a bounded, raised effect to both tyres and leaves the original rubber behind', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  assert.equal(scene.getObjectByName('Drift trail')?.visible, false, 'the classic skin has no decorative overlay');
  marks.setSkin('drift-trail-flame');
  const z = drive(marks, car, origin, 12, drift(1));
  const effect = scene.getObjectByName('Drift trail');
  assert.ok(effect.visible && effect.geometry.drawRange.count > 0);
  const { position } = effect.geometry.attributes;
  assert.ok(Array.from(position.array).some((v, i) => i % 3 === 1 && v > 0.16), 'ribbon rises above the rubber');
  assert.ok(position.getX(0) < 0 && position.getX(6) > 0, 'the same layer draws both rear tyres');
  const rubber = quads(marks);
  marks.update(null, origin, 0);
  assert.ok(effect.visible, 'pause does not age the trail');
  marks.update(null, origin, 2.5);
  assert.equal(effect.visible, false, 'the decorative effect expires');
  assert.equal(quads(marks), rubber, 'original tyre marks persist');
  drive(marks, car, origin, 5, drift(1), z);
  marks.reset();
  assert.equal(effect.visible, false, 'reset drops the prior run');
});

test('race effects render only the equipped style and honour comfort mode, airborne state and global VFX visibility', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), race = createRace();
  scene.add(car);
  const effects = createEffects(scene, () => 0, { player: car });
  assert.equal(typeof effects.setDriftTrail, 'function');
  const trail = scene.getObjectByName('Drift trail');
  race.phase = 'racing'; race.pickups = []; race.rings = [];
  race.player.speed = 40; race.player.drift = drift(1);
  const run = (reducedMotion, options = {}) => {
    for (let i = 0; i < 24; i++) {
      race.player.distance += 0.75;
      effects.update(race, 1 / 60, 0, false, reducedMotion, [car], options);
    }
  };
  run(false);
  assert.equal(trail.visible, false, 'default remains rubber only');
  for (const [index, name] of ['flame', 'rainbow', 'ice', 'arc', 'stardust'].entries()) {
    effects.setDriftTrail(`drift-trail-${name}`);
    run(true, { quality: 'low' });
    assert.ok(trail.visible);
    assert.equal(trail.material.uniforms.style.value, index + 1);
    assert.equal(trail.material.uniforms.motion.value, 0);
    assert.equal(trail.material.uniforms.detail.value, 0);
  }
  effects.reset();
  race.player.altitude = 1;
  run(false);
  assert.equal(trail.visible, false, 'no emissions above the road');
  race.player.altitude = 0;
  run(false);
  assert.ok(trail.visible);
  run(false, { enabled: false });
  assert.equal(trail.visible, false, 'global VFX switch hides the overlay');
  effects.setDriftTrail('nitro-trail-cyan');
  run(false);
  assert.equal(trail.visible, false, 'other categories cannot replace drift');
});

test('each decorative skid adds distance-spaced, world-anchored detail from both tyres', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  const accents = scene.getObjectByName('Drift trail accents');
  assert.ok(accents?.geometry.isInstancedBufferGeometry, 'all secondary detail has one bounded draw call');
  drive(marks, car, origin, 8, drift(1));
  assert.equal(accents.visible, false, 'no emission on classic rubber');

  for (const [index, name] of ['flame', 'rainbow', 'ice', 'arc', 'stardust'].entries()) {
    marks.setSkin(`drift-trail-${name}`);
    marks.reset();
    drive(marks, car, origin, 18, drift(1));
    assert.equal(accents.material.uniforms.style.value, index + 1);
    assert.ok(accents.geometry.instanceCount >= 12 && accents.geometry.instanceCount <= 36);
    const data = accents.geometry.getAttribute('contact');
    const centres = Array.from({ length: accents.geometry.instanceCount }, (_, i) => data.getX(i));
    assert.ok(centres.some(x => x < -.8) && centres.some(x => x > .8));
    assert.ok(accents.position.equals(marks.mesh.position), 'accent positions use the same floating-origin shift');
    const before = accents.material.uniforms.time.value;
    marks.update(null, origin, 0);
    assert.equal(accents.material.uniforms.time.value, before);
    marks.update(null, origin, 2.5);
    assert.equal(accents.visible, false);
    assert.equal(accents.geometry.instanceCount, 0);
  }
});

test('high-speed touchdown sampling preserves tracks across slow frames without bridging a teleport', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  marks.setSkin('drift-trail-flame');
  marks.update(drift(1), origin, 1 / 20);
  origin.z -= 5;
  marks.update(drift(1), origin, 1 / 20);
  assert.equal(quads(marks), 2, 'a 5 m frame at 100 m/s adds one segment per tyre');
  origin.z -= 15;
  marks.update(drift(1), origin, 1 / 20);
  assert.equal(quads(marks), 2, 'a discontinuity ends the trail');
});

test('accent pool stays bounded and is cleared for low quality or reduced motion', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  marks.setSkin('drift-trail-stardust');
  const accents = scene.getObjectByName('Drift trail accents');
  assert.ok(accents);
  drive(marks, car, origin, 420, drift(1));
  assert.equal(accents.geometry.instanceCount, 256);
  marks.update(drift(1), origin, 1 / 60, false, true);
  assert.equal(accents.geometry.instanceCount, 0);
  assert.equal(accents.visible, false);
  origin.z -= .9;
  marks.update(drift(1), origin, 1 / 60, true);
  assert.equal(accents.visible, false);
  assert.equal(scene.getObjectByName('Drift trail').visible, true, 'the restrained ribbon still draws');
  marks.dispose();
  assert.equal(scene.getObjectByName('Drift trail accents'), undefined);
});

test('flames and ice use depth-bearing geometry in the shared accent pool', () => {
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), origin = new Vector3();
  const marks = createSkidMarks(scene, car);
  const { geometry, material } = scene.getObjectByName('Drift trail accents');
  for (const skin of ['flame', 'ice']) {
    marks.setSkin(`drift-trail-${skin}`);
    drive(marks, car, origin, 8, drift(1));
    const { start, count } = geometry.drawRange;
    assert.ok(Number.isFinite(count) && count >= 12, 'several faces draw in 3D');
    const depths = Array.from({ length: count }, (_, i) => geometry.attributes.position.getZ(geometry.index.getX(start + i)));
    assert.ok(Math.min(...depths) < -.3 && Math.max(...depths) > .3, `${skin} has visible front and back depth`);
    assert.equal(material.forceSinglePass, true);
  }
  marks.setSkin('drift-trail-rainbow');
  assert.equal(geometry.drawRange.count, 6, 'spectral flakes still use the budgeted planar shape');
});
