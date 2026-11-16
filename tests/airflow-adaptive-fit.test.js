import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { CLEARANCE, SKIN_MOTION, measureAirflowProfile } from '../src/airflow-geometry.ts';
import { makeCar, CAR_STYLES } from '../src/car-model.js';
import { GARAGE_SKINS as SKINS } from '../src/garage-skin-catalog.ts';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';

const AIRFLOW_SKINS = SKINS.filter(skin => skin.category === 'airflow').map(skin => skin.id);

// A future GLB car at a display scale far from the Roadster's: low nose, tall cabin, long tail.
function scaledGlb() {
  const model = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.2, .7, 4.6));
  shell.position.y = .6;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, .6, 1.6));
  cabin.position.set(0, 1.25, .3);
  model.add(shell, cabin);
  model.scale.set(1.6, 1.8, 1.7); // like CARS[id].scale, applied in garage-model.ts dress() before fitAirflow
  return model;
}

function rig() {
  const scene = new THREE.Scene(), car = makeCar(CAR_STYLES.roadster);
  scene.add(car);
  return { scene, car, aero: createAeroVFX(scene, car) };
}

/** Worst-case skin motion envelope (shader in aero-vfx.js) for one vertex, in car units. */
function skinEnvelope(pattern, scale, wake, type) {
  const ripple = pattern > .5 ? (SKIN_MOTION.ripple[0] + pattern * SKIN_MOTION.ripple[1]) * (1 + wake) : 0;
  const sway = pattern > 1.5 && type !== 1 ? SKIN_MOTION.sway[0] + pattern * SKIN_MOTION.sway[1] : 0;
  return { ripple: [ripple * scale.x, ripple * scale.y], sway: [sway * scale.x, sway * scale.y] };
}

const shells = {
  'procedural Roadster': () => ({ model: undefined, profile: measureAirflowProfile(makeCar(CAR_STYLES.roadster)) }), // before the VFX rides on it
  'scaled GLB stand-in': () => {
    const model = scaledGlb();
    return { model, profile: measureAirflowProfile(model, new THREE.Group()) };
  },
};

const fits = {};
for (const [name, make] of Object.entries(shells)) {
  test(`${name}: default and every Garage airflow skin hug the measured shell`, () => {
    const parts = rig(), { aero } = parts;
    const { model, profile } = make(parts);
    aero.fitAirflow(model);
    const [flow] = aero.group.children;
    const { min, max } = profile.bounds;
    const size = profile.bounds.getSize(new THREE.Vector3());
    const step = size.z / profile.sections.length;
    const { position, flowOutward, flowType } = flow.geometry.attributes;
    const { wakeRange, rippleScale } = flow.material.uniforms;
    assert.ok([...wakeRange.value.toArray(), ...rippleScale.value.toArray()].every(Number.isFinite), 'no NaN motion');
    assert.ok(Math.abs(wakeRange.value.x - max.z) < 1e-6, 'wake starts at the measured tail');

    // Length / width / height follow the shell.
    const box = new THREE.Box3(), point = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) if (flowType.getX(i) !== 1) box.expandByPoint(point.fromBufferAttribute(position, i));
    assert.ok(box.min.z < min.z && box.max.z > max.z, 'streams run from ahead of the nose to behind the tail');
    assert.ok(box.max.x > max.x + CLEARANCE * .5 && box.max.x < max.x + CLEARANCE + size.x * .35, 'width follows the shell');
    assert.ok(box.max.y > max.y + CLEARANCE * .5 && box.max.y < max.y + CLEARANCE + .1, 'roof height follows the shell');

    assert.ok(AIRFLOW_SKINS.length >= 4, 'every equipped airflow style is covered');
    const ratios = [];
    for (const id of AIRFLOW_SKINS) {
      aero.setSkins({ airflow: id });
      const pattern = flow.material.uniforms.skinPattern.value;
      const scale = { x: rippleScale.value.x, y: rippleScale.value.y };
      const motion = skinEnvelope(pattern, scale, 0, 0);
      ratios.push([(motion.ripple[0] + motion.sway[0]) / size.x, (motion.ripple[1] + motion.sway[1]) / max.y]) // height above the road);
      for (let i = 0; i < position.count; i++) {
        const z = position.getZ(i), type = flowType.getX(i);
        if (type === 1 || z < min.z || z > max.z) continue; // underbody suction runs below the floor by design
        const section = profile.sections[THREE.MathUtils.clamp(Math.floor((z - min.z) / step), 0, profile.sections.length - 1)];
        const [ox, oy] = [flowOutward.getX(i), flowOutward.getY(i)];
        // Ripple only pushes outward; sway runs along the surface. The worst inward point is the rest pose.
        if (oy === 1) assert.ok(position.getY(i) > section.top + CLEARANCE * .5, `${id}: roof stream inside the body at z=${z.toFixed(2)}`);
        else {
          const edge = ox > 0 ? section.right : -section.left;
          assert.ok(position.getX(i) * ox > edge + CLEARANCE * .5, `${id}: flank stream inside the body at z=${z.toFixed(2)}`);
          const env = skinEnvelope(pattern, scale, 0, type);
          assert.ok(position.getY(i) - env.sway[1] > 0, `${id}: flank sway dips under the ground`);
        }
      }
    }
    // Skin motion stays a narrow band next to the body on any car.
    for (const [x, y] of ratios) assert.ok(x < .15 && y < .15, `skin motion band ${x.toFixed(3)}, ${y.toFixed(3)} of the shell`);
    fits[name] = ratios;
  });
}

test('skin motion scales with the shell, not with Roadster-sized constants', () => {
  const [a, b] = Object.values(fits);
  assert.ok(a && b, 'both shells measured');
  a.forEach(([x, y], i) => {
    if (x === 0 && b[i][0] === 0) return; // the standard style does not move
    assert.ok(Math.abs(b[i][0] / x - 1) < .03, `${AIRFLOW_SKINS[i]} sideways motion ratio ${x} vs ${b[i][0]}`);
    assert.ok(Math.abs(b[i][1] / y - 1) < .03, `${AIRFLOW_SKINS[i]} vertical motion ratio ${y} vs ${b[i][1]}`);
  });
});

for (const [name, make] of Object.entries(shells)) {
  test(`${name}: the dash ribbon and roll wake start behind the measured tail`, () => {
    const parts = rig(), { aero, car, scene } = parts;
    const { model, profile } = make(parts);
    aero.fitAirflow(model);
    const race = createRace();
    race.phase = 'racing';
    race.player.boosting = true;
    const settings = vfxSettings({ enabled: true, quality: 'high' });
    for (let i = 0; i < 8; i++) {
      car.position.z -= .5; // driving forward (-z)
      aero.update(race, 1 / 60, new THREE.Vector3(), settings, false);
    }
    const ribbon = scene.getObjectByName('Continuous dash ribbon');
    const { position, alpha } = ribbon.geometry.attributes;
    let live = 0;
    for (let i = 0; i < position.count; i++) {
      if (alpha.getX(i) <= 0) continue;
      live++;
      const localZ = position.getZ(i) - car.position.z;
      assert.ok(localZ >= profile.bounds.max.z - .01, `ribbon vertex inside the body: z ${localZ.toFixed(2)} < tail ${profile.bounds.max.z.toFixed(2)}`);
      assert.ok(Math.abs(position.getX(i)) <= profile.bounds.max.x, 'ribbon stays within the car width');
      assert.ok(position.getY(i) > 0 && position.getY(i) < profile.bounds.max.y, 'ribbon stays within the car height');
    }
    assert.ok(live > 0, 'the ribbon was emitted');
  });
}
