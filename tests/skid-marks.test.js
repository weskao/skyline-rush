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
