import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { measureAirflowProfile } from '../src/airflow-geometry.ts';
import { createFreezeFx } from '../src/debuff/freeze/freeze-fx.ts';
import { crystalLayout, SHARDS } from '../src/debuff/freeze/freeze-crystals.ts';

// Freeze around a hit car (user 2026-11-21): many small crystals in clusters that follow the measured body
// (sills, wheel arches, roof edges, rear wing, rear bumper) on any car, snow, ice shards and cold mist.
function carModel(width = 2, length = 4.6) {
  const car = new THREE.Group(), paint = new THREE.MeshBasicMaterial();
  const part = (w, h, l, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), paint); m.position.set(0, y, z); car.add(m); };
  part(width, 0.7, length, 0.35, 0); // body, nose at -z, tail at +z
  part(width * 0.72, 0.5, length * 0.42, 0.95, 0.2); // cabin
  part(width * 0.9, 0.08, 0.3, 1.05, length / 2 - 0.2); // rear wing
  car.updateMatrixWorld(true);
  return car;
}

function rig({ capacity = 2, width = 2 } = {}) {
  const fx = createFreezeFx(capacity), pose = carModel(width), profile = measureAirflowProfile(pose);
  const emitted = [];
  const f = {
    status: 'freeze', hits: { freeze: true, emp: false }, age: 0, isPlayer: false, pose, rival: { distance: 100, x: 0, speed: 50 },
    fit: () => new THREE.Matrix4(), profile: () => profile, dt: 0.05, low: false, reducedMotion: false,
    emit: (...args) => emitted.push(args), thin: 1, on: true, began: false, ended: false,
  };
  const mesh = fx.objects.find(o => o.name === 'Rival freeze shards');
  const step = (i, patch = {}, dt = 0.05) => { fx.begin(dt); Object.assign(f, { dt, ...patch }); fx.car(i, f); fx.end(); };
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const crystal = (i, k) => { mesh.getMatrixAt(i * SHARDS + k, m); m.decompose(p, q, s); return { at: p.clone(), size: p.y < -1000 ? 0 : s.y }; }; // parked = not grown
  const shown = i => Array.from({ length: SHARDS }, (_, k) => crystal(i, k)).filter(c => c.at.y > -1000).length;
  return { fx, f, mesh, profile, emitted, step, crystal, shown };
}

test('many small crystals sit in clusters on the measured sills, arches, roof edges, wing and bumper', () => {
  const { profile } = rig();
  const { min, max } = profile.bounds, length = max.z - min.z, height = max.y - min.y;
  const layout = crystalLayout(profile);
  assert.equal(layout.length, SHARDS);
  assert.ok(SHARDS >= 40, `many crystals (${SHARDS})`);
  const near = new THREE.Box3(min.clone().subScalar(0.15), max.clone().addScalar(0.15));
  for (const c of layout) {
    assert.ok(near.containsPoint(c.at), `rooted on the body ${c.at.toArray()}`);
    assert.ok(c.length < length * 0.1 && c.length > 0.05, `small crystal ${c.length}`);
  }
  const count = test => layout.filter(c => test(c.at)).length;
  assert.ok(count(p => p.y < min.y + height * 0.35 && Math.abs(p.x) > 0.8) >= 8, 'sills and arches, low on the flanks');
  assert.ok(count(p => p.x < -0.5) >= 15 && count(p => p.x > 0.5) >= 15, 'both sides');
  assert.ok(count(p => p.z > max.z - length * 0.12 && p.y > min.y + height * 0.75) >= 4, 'the rear wing');
  assert.ok(count(p => p.z > max.z - 0.15 && p.y < min.y + height * 0.6) >= 4, 'the rear bumper');
  assert.ok(count(p => p.y > max.y - 0.2 && p.z < max.z - length * 0.15) >= 4, 'the roof edges');
  assert.ok(layout.some(c => new THREE.Vector3(0, 1, 0).applyQuaternion(c.lean).y < -0.5), 'icicles hang down');

  const narrow = crystalLayout(rig({ width: 1.4 }).profile);
  assert.ok(Math.max(...narrow.map(c => Math.abs(c.at.x))) < Math.max(...layout.map(c => Math.abs(c.at.x))) - 0.2,
    'a narrower car wears its crystals closer in: the layout follows the mesh, not a fixed sphere');
});

test('the frost spreads from the sills up during the spread and every crystal is grown by the active phase', () => {
  const { step, shown, crystal } = rig();
  step(0, { began: true, age: 0 });
  assert.ok(shown(0) < SHARDS / 4, 'impact: crystals have only begun');
  for (let age = 0.05; age <= 0.7; age += 0.05) step(0, { began: false, age });
  assert.equal(shown(0), SHARDS, 'active: all grown');
  const settled = crystal(0, 0).size;
  step(0, { age: 1.5 });
  assert.ok(Math.abs(crystal(0, 0).size - settled) < 1e-6, 'held while active');
});

test('crystals snap in with an overshoot, but appear without it under reduced motion', () => {
  for (const reducedMotion of [false, true]) {
    const { step, crystal } = rig(), peaks = new Array(SHARDS).fill(0);
    for (let age = 0; age <= 1; age += 0.01) {
      step(0, { began: age === 0, age, reducedMotion }, 0.01);
      for (let k = 0; k < SHARDS; k++) peaks[k] = Math.max(peaks[k], crystal(0, k).size);
    }
    const over = peaks.filter((peak, k) => peak > crystal(0, k).size * 1.05).length;
    if (reducedMotion) assert.equal(over, 0, 'no snap');
    else assert.ok(over > SHARDS / 2, `snap (${over})`);
  }
});

test('a repeated hit replays the growth, and a paused race clock holds it', () => {
  const { step, crystal } = rig();
  step(0, { began: true, age: 0 });
  for (let age = 0.05; age <= 1; age += 0.05) step(0, { began: false, age });
  const grown = crystal(0, 5).size;
  step(0, { began: true, age: 0 }); // hit again: the impact replays
  assert.ok(crystal(0, 5).size < grown * 0.3, 'regrows from the body');
  step(0, { began: false, age: 0.3 });
  const mid = crystal(0, 5).size;
  for (let i = 0; i < 5; i++) step(0, { age: 0.3 }, 0); // paused
  assert.equal(crystal(0, 5).size, mid);
});

test('on thaw the crystals shatter outward with ice chips and clear; reduced motion shrinks them in place', () => {
  for (const reducedMotion of [false, true]) {
    const { step, crystal, shown, emitted } = rig();
    step(0, { began: true, age: 0, reducedMotion });
    for (let age = 0.05; age <= 1; age += 0.05) step(0, { began: false, age, reducedMotion });
    const before = crystal(0, 3).at;
    emitted.length = 0;
    step(0, { on: false, ended: true, hits: { freeze: false, emp: false }, status: null, reducedMotion });
    for (let i = 0; i < 4; i++) step(0, { ended: false, reducedMotion });
    const moved = crystal(0, 3).at.distanceTo(before);
    if (reducedMotion) assert.ok(moved < 0.05, `stays in place (${moved})`);
    else assert.ok(moved > 0.3, `flies off (${moved})`);
    assert.ok(emitted.length >= (reducedMotion ? 4 : 12), `ice chips (${emitted.length})`);
    for (let i = 0; i < 20; i++) step(0);
    assert.equal(shown(0), 0, 'the shatter clears');
  }
});

test('High dresses every car, Low only a few crystals on the player', () => {
  const { step, shown, f } = rig();
  for (const [i, isPlayer] of [[0, false], [1, true]]) {
    for (let age = 0; age <= 1; age += 0.05) step(i, { began: age === 0, age, isPlayer, low: true });
  }
  assert.equal(shown(0), 0, 'Low: no crystals on a rival');
  const few = shown(1);
  assert.ok(few >= 4 && few <= 10, `Low: a few on the player (${few})`);
  f.low = false;
  step(0, { age: 1, isPlayer: false });
  assert.equal(shown(0), SHARDS);
});

test('while frozen it snows on the car and cold mist trails from the tail; Low and reduced motion keep it light', () => {
  const kinds = ({ low = false, reducedMotion = false } = {}) => {
    const { step, emitted, f } = rig();
    step(0, { began: true, age: 0, low, reducedMotion });
    emitted.length = 0;
    for (let age = 0.05; age <= 2; age += 0.05) step(0, { began: false, age, low, reducedMotion, thin: (low ? 0.5 : 1) * (reducedMotion ? 0.3 : 1) });
    const d = f.rival.distance;
    return {
      total: emitted.length,
      exhaust: emitted.filter(([distance, , y, , , , , , , , kind]) => distance < d - 1.5 && y < 1 && kind === 2).length,
      snow: emitted.filter(([, , , , vy, , size, , , gravity]) => vy < 0 && size < 0.1 && gravity > 0).length,
    };
  };
  const high = kinds();
  assert.ok(high.exhaust >= 8, `cold mist from the tail (${high.exhaust})`);
  assert.ok(high.snow >= 8, `snow falls (${high.snow})`);
  const low = kinds({ low: true });
  assert.equal(low.snow + low.exhaust, 0, 'Low keeps only the soft vapor');
  assert.ok(low.total < high.total / 2);
  assert.equal(kinds({ reducedMotion: true }).snow, 0, 'reduced motion: no drifting snow');
});

test('dispose frees what the freeze owns', () => {
  const { fx, mesh } = rig();
  let freed = 0;
  mesh.geometry.addEventListener('dispose', () => freed++);
  mesh.material.addEventListener('dispose', () => freed++);
  fx.dispose();
  assert.equal(freed, 2);
});
