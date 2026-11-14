import * as THREE from 'three';
import { animatePrismHoop, animateTankHoop } from './pickup-collect-hoops.js';

const FLAT = -Math.PI / 2, GOLDEN = 2.39996323;
export const scratch = new THREE.Object3D();
const easeOut = t => 1 - (1 - t) * (1 - t);
const bump = (t, at, width) => Math.exp(-(((t - at) / width) ** 2));

export function flash(slot, opacity, scale, x, y, z) {
  slot.flash.material.opacity = Math.max(0, Math.min(.9, opacity)) * slot.visualWeight;
  slot.flash.scale.setScalar(scale * slot.strength);
  slot.flash.position.set(x, y, z);
}
// Writes the pose already set on `scratch` as shard `i`; a zero scale would make a degenerate matrix.
function shard(slot, i, x, y = x, z = x) {
  scratch.scale.set(Math.max(.001, x), Math.max(.001, y), Math.max(.001, z));
  scratch.updateMatrix();
  slot.shards.setMatrixAt(i, scratch.matrix);
}
function beam(slot, age, span, level, rise) {
  slot.beam.visible = age < span;
  if (!slot.beam.visible) return;
  slot.beam.material.opacity = level * Math.sin(Math.PI * age / span) * slot.strength;
  slot.beam.scale.set(.9 * slot.strength, 1 + age * rise, .9 * slot.strength);
}

// Local space follows the car (or sits at the item for a rival): +Y up, +Z behind. Rings beyond the slot's
// quality budget are already hidden; a motion hides more by clearing `visible`.
export const MOTIONS = {
  // Energy cell: a static snap. Two rings contract onto the car while jagged needles discharge into it.
  arcSnap(slot, age, p) {
    const k = slot.visualWeight, pull = easeOut(p);
    slot.rings.forEach((ring, i) => {
      ring.position.set(0, .15 + i * .55, 0);
      ring.rotation.set(FLAT, 0, age * (i ? -9 : 9));
      ring.scale.setScalar((2.7 - 2.1 * pull) * k);
      ring.material.opacity = .85 * Math.sin(Math.PI * p) * k;
    });
    flash(slot, Math.max(1 - age / .12, bump(p, .8, .12)), 1.5, 0, .5, 0);
    for (let i = 0; i < slot.particles; i++) {
      const a = i * GOLDEN, q = Math.min(1, p * 1.25 + (i % 5) * .04), r = 2.6 * (1 - easeOut(q)) + .25;
      const jag = Math.sin(q * 26 + i * 1.7) * .22 * (1 - q);
      scratch.position.set(Math.cos(a) * r - Math.sin(a) * jag, .25 + (i % 4) * .28 + jag, Math.sin(a) * r + Math.cos(a) * jag);
      scratch.rotation.set(0, -a, 0); // long axis along the radius
      shard(slot, i, 2.4 * (1 - q) + .3, .3, .3);
    }
  },
  // Energy can: a pressurised vent. Heat rings and two ember jets blow out behind the car.
  afterburn(slot, age, p) {
    const k = slot.visualWeight;
    slot.rings.forEach((ring, i) => {
      const phase = age - i * .09;
      ring.visible &&= phase > 0;
      ring.position.set(0, .45, 2.45 + Math.max(0, phase) * 6);
      ring.rotation.set(0, 0, phase * 3); // upright, facing back along the road
      ring.scale.setScalar((.45 + Math.max(0, phase) * 2.6) * k);
      ring.material.opacity = .8 * Math.max(0, 1 - phase / (slot.style.life - i * .09)) ** 2 * k;
    });
    flash(slot, 1 - age / .2, 1.45, 0, .45, 2.3);
    for (let i = 0; i < slot.particles; i++) {
      const side = i % 2 ? 1 : -1, spread = (i * 7 % 11) / 11 - .5, lift = .6 + (i % 3) * .9;
      scratch.position.set(side * (.7 + (.25 + spread * 1.6) * age), Math.max(.05, .35 + lift * age - 1.6 * age * age),
        2.25 + (4 + (i % 5) * 1.2) * age);
      scratch.rotation.set(0, 0, 0);
      shard(slot, i, .6 * (1 - p), .6 * (1 - p), 2.6 * (1 - p));
    }
  },
  // Gold tubes rise through the fitted car above a soft light at the chassis.
  surge(slot, age, p) {
    const k = slot.visualWeight, strand = Math.max(1, slot.particles >> 1);
    slot.rings.forEach((ring, i) => animateTankHoop(ring, age, i, k, true));
    flash(slot, .6 * (1 - age / .3), 2.4, 0, .1, 0);
    const glow = slot.tankGlow;
    glow.visible = age < .49;
    glow.material.opacity = .47 * k * Math.min(1, age / .07) * bump(age, .10, .134);
    glow.position.set(0, .065, .10);
    glow.rotation.x = FLAT;
    glow.scale.set(1.98, 3.53, 1);
    for (let i = 0; i < slot.particles; i++) {
      const n = i >> 1, q = Math.min(1, Math.max(0, p * 1.7 - n / strand * .45));
      const a = (i & 1) * Math.PI + n * .55 + age * 6, r = (1.55 - .5 * q) * k;
      scratch.position.set(Math.cos(a) * r, q * 2.5, Math.sin(a) * r);
      scratch.rotation.set(age * 5, a, 0);
      shard(slot, i, Math.sin(Math.PI * q) * .53);
    }
  },
  // Overcharge core: a prism nova. Three gyro rings on different axes, a 3D starburst and a tall prismatic beam.
  prismNova(slot, age, p) {
    const k = slot.visualWeight;
    slot.rings.forEach((ring, i) => animatePrismHoop(ring, age, i, k, slot.quality === 'high'));
    flash(slot, Math.max(1 - age / .25, .6 * bump(p, .42, .1)), Math.min(4, 1.4 + age * 9), 0, .55, 0);
    beam(slot, age, .45, .3, 6);
    for (let i = 0; i < slot.particles; i++) {
      // Fibonacci directions biased to the upper hemisphere: nothing bursts down through the road.
      const up = 1 - (i + .5) / slot.particles * 1.2, around = Math.sqrt(1 - up * up), a = i * GOLDEN;
      const reach = (4.2 + (i % 5) * .7) * easeOut(p) * k;
      scratch.position.set(Math.cos(a) * around * reach, .55 + up * reach * .8, Math.sin(a) * around * reach);
      scratch.rotation.set(age * 6 + i, a, age * 4);
      shard(slot, i, (1 - p) * (1 + .5 * Math.sin(age * 34 + i * 2.1)) * (i % 6 ? 1.1 : 1.9));
    }
  },
};
