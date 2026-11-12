// Shared GPU-pooled pickup collection effects: one home for every current and future track. Each tier plays its
// own choreography (MOTIONS) on the same pooled meshes, so four distinct effects cost no extra shader or draw call.
import * as THREE from 'three';
import { PICKUP_GROUND_LIFT } from './pickup-art.js';

// `rings` and `particles` are the High-quality budgets; `motion` names the tier's choreography in MOTIONS.
export const PICKUP_COLLECTION_STYLES = Object.freeze({
  cell: Object.freeze({ color: 0x40d9ff, rings: 2, particles: 18, beam: false, rainbow: false, life: .5, motion: 'arcSnap' }),
  can: Object.freeze({ color: 0xff9b3b, rings: 2, particles: 24, beam: false, rainbow: false, life: .65, motion: 'afterburn' }),
  tank: Object.freeze({ color: 0xffd34e, rings: 3, particles: 30, beam: true, rainbow: false, life: .78, motion: 'surge' }),
  overcharge: Object.freeze({ color: 0xef81ff, rings: 3, particles: 42, beam: true, rainbow: true, life: .9, motion: 'prismNova' }),
});
// Rival cues omit CourseGraph edge identifiers; retain the original authored item if present.
export const pickupCueSource = (cue, pickups) =>
  pickups.find(item => item.tier === cue.item && item.distance === cue.distance && item.x === cue.x) ?? cue;

const TIERS = Object.keys(PICKUP_COLLECTION_STYLES);
const SLOTS_PER_TIER = 2, MAX_PARTICLES = 42, MAX_RINGS = 3;
const PRISM = [0x6ceaff, 0xf88aff, 0xffd35c, 0x91a5ff, 0x7cffcb, 0xff7398];
const FLAT = -Math.PI / 2, GOLDEN = 2.39996323;
const scratch = new THREE.Object3D();
const easeOut = t => 1 - (1 - t) * (1 - t);
const bump = (t, at, width) => Math.exp(-(((t - at) / width) ** 2));

// One tiny radial-alpha texture for every flash and halo. GPU uploads occur at scene construction, not on collection.
export function glowTexture() {
  const side = 32, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = (x + .5 - side / 2) / (side / 2);
    const v = (y + .5 - side / 2) / (side / 2);
    const d2 = u * u + v * v, at = (y * side + x) * 4;
    pixels[at] = pixels[at + 1] = pixels[at + 2] = 255;
    pixels[at + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - d2), 3));
  }
  const texture = new THREE.DataTexture(pixels, side, side, THREE.RGBAFormat);
  texture.magFilter = texture.minFilter = THREE.LinearFilter; // DataTexture defaults to nearest: 32 px blocks on a halo
  texture.needsUpdate = true;
  return texture;
}

function flash(slot, opacity, scale, x, y, z) {
  slot.flash.material.opacity = Math.min(.9, opacity) * slot.strength;
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
const MOTIONS = {
  // Energy cell: a static snap. Two rings contract onto the car while jagged needles discharge into it.
  arcSnap(slot, age, p) {
    const k = slot.strength, pull = easeOut(p);
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
    const k = slot.strength;
    slot.rings.forEach((ring, i) => {
      const phase = age - i * .09;
      ring.visible &&= phase > 0;
      ring.position.set(0, .45, 1.3 + phase * 7);
      ring.rotation.set(0, 0, phase * 3); // upright, facing back along the road
      ring.scale.setScalar((.45 + phase * 2.6) * k);
      ring.material.opacity = .8 * Math.max(0, 1 - phase / (slot.style.life - i * .09)) ** 2 * k;
    });
    flash(slot, 1 - age / .2, 1.7, 0, .45, 1.3);
    for (let i = 0; i < slot.particles; i++) {
      const side = i % 2 ? 1 : -1, spread = (i * 7 % 11) / 11 - .5, lift = .6 + (i % 3) * .9;
      scratch.position.set(side * (.7 + (.25 + spread * 1.6) * age), Math.max(.05, .35 + lift * age - 1.6 * age * age),
        1.3 + (6 + (i % 5) * 1.3) * age);
      scratch.rotation.set(0, 0, 0);
      shard(slot, i, .6 * (1 - p), .6 * (1 - p), 2.6 * (1 - p));
    }
  },
  // High-capacity tank: a reservoir filling. Scan rings climb the car inside a soft pillar; a double helix winds up.
  surge(slot, age, p) {
    const k = slot.strength, strand = Math.max(1, slot.particles >> 1);
    slot.rings.forEach((ring, i) => {
      const phase = (age - i * .13) / (slot.style.life * .7);
      ring.visible &&= phase > 0 && phase < 1;
      ring.position.set(0, -.1 + phase * 2.3, 0);
      ring.rotation.set(FLAT, 0, 0);
      ring.scale.setScalar((1.9 - .45 * phase) * k);
      ring.material.opacity = .8 * Math.sin(Math.PI * Math.min(1, Math.max(0, phase))) * k;
    });
    flash(slot, .6 * (1 - age / .3), 2.4, 0, .1, 0);
    beam(slot, age, .5, .24, 3.2);
    for (let i = 0; i < slot.particles; i++) {
      const n = i >> 1, q = Math.min(1, Math.max(0, p * 1.7 - n / strand * .45));
      const a = (i & 1) * Math.PI + n * .55 + age * 6, r = (1.55 - .5 * q) * k;
      scratch.position.set(Math.cos(a) * r, q * 2.5, Math.sin(a) * r);
      scratch.rotation.set(age * 5, a, 0);
      shard(slot, i, Math.sin(Math.PI * q) * 1.3);
    }
  },
  // Overcharge core: a prism nova. Three gyro rings on different axes, a 3D starburst and a tall prismatic beam.
  prismNova(slot, age, p) {
    const k = slot.strength;
    slot.rings.forEach((ring, i) => {
      const phase = age - i * .07;
      ring.visible &&= phase > 0;
      ring.position.set(0, .55, 0);
      ring.rotation.set((i ? .5 : FLAT) + phase * (1.6 + i), i * 1.05 + phase * 2.2 * i, phase * 2.4 * (i % 2 ? -1 : 1));
      ring.scale.setScalar((.6 + phase * 5.2) * k);
      ring.material.opacity = .8 * Math.max(0, 1 - phase / (slot.style.life - i * .07)) ** 2 * k;
    });
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

export function createPickupCollectVfx(scene) {
  const root = new THREE.Group();
  root.name = 'Pickup collect VFX';
  scene.add(root);
  const geometries = [
    new THREE.TorusGeometry(1, .045, 6, 40),
    new THREE.OctahedronGeometry(.14, 0),
    new THREE.CylinderGeometry(.17, .55, 1, 12, 1, true),
  ];
  const texture = glowTexture(), materials = new Set();
  const makeMaterial = (color, extra = {}) => {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, ...extra,
    });
    materials.add(material);
    return material;
  };
  const slots = Object.fromEntries(TIERS.map(tier => [tier, []]));
  const next = Object.fromEntries(TIERS.map(tier => [tier, 0]));

  for (const tier of TIERS) {
    const style = PICKUP_COLLECTION_STYLES[tier];
    for (let index = 0; index < SLOTS_PER_TIER; index++) {
      const group = new THREE.Group();
      group.name = 'Pickup collect ' + tier + ' ' + index;
      group.userData.tier = tier;
      group.visible = false;
      const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        color: style.color, map: texture, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      flashSprite.name = 'energy flash';
      group.add(flashSprite);
      materials.add(flashSprite.material);
      const rings = [];
      for (let i = 0; i < MAX_RINGS; i++) {
        const ring = new THREE.Mesh(geometries[0], makeMaterial(style.rainbow ? PRISM[i * 2] : style.color));
        ring.name = 'energy shockwave ' + i;
        group.add(ring); rings.push(ring);
      }
      const pillar = new THREE.Mesh(geometries[2], makeMaterial(style.color));
      pillar.name = 'energy beam';
      pillar.position.y = 1.3;
      group.add(pillar);
      const shards = new THREE.InstancedMesh(geometries[1], makeMaterial(style.color), MAX_PARTICLES);
      shards.name = 'energy shards';
      shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Rainbow instance colors are authored once; every pickup only updates matrix transforms.
      if (style.rainbow) for (let i = 0; i < MAX_PARTICLES; i++)
        shards.setColorAt(i, new THREE.Color(PRISM[i % PRISM.length]));
      // Pre-warm both the plain and per-instance rainbow shader variant before the first collection.
      scratch.position.set(0, -10000, 0);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.setScalar(1);
      scratch.updateMatrix();
      shards.setMatrixAt(0, scratch.matrix);
      shards.count = 1;
      shards.frustumCulled = false;
      group.add(shards);
      root.add(group);
      slots[tier].push({
        tier, style, group, flash: flashSprite, rings, beam: pillar, shards,
        age: Infinity, event: null, follow: false, particles: 0, ringCount: 0, reducedMotion: false, strength: 1,
      });
    }
  }

  /** `follow`: the effect rides the player's car instead of staying at the item the car has already passed. */
  function spawn(tier, event, { quality = 'high', reducedMotion = false, rival = false, follow = false } = {}) {
    if (!slots[tier] || !event || !Number.isFinite(event.distance) || !Number.isFinite(event.x)) return false;
    const slot = slots[tier][next[tier]++ % SLOTS_PER_TIER];
    slot.event = event;
    slot.follow = follow;
    slot.age = 0;
    slot.reducedMotion = reducedMotion;
    slot.strength = rival ? .65 : 1;
    const density = reducedMotion ? 0 : quality === 'low' ? .26 : quality === 'medium' ? .65 : 1;
    slot.particles = Math.min(MAX_PARTICLES, Math.round(slot.style.particles * density * (rival ? .5 : 1)));
    slot.ringCount = reducedMotion || quality === 'low' ? 1 : quality === 'medium' ? Math.min(2, slot.style.rings) : slot.style.rings;
    slot.group.visible = true;
    return true;
  }

  // `car` is the player's race state and `pose` its rendered Object3D; either lets a followed effect track it.
  function place(slot, { distance = 0, center = 0, roadCenter = () => 0, worldPoint, car, pose }) {
    const { group, event, tier } = slot, follow = slot.follow && (pose || car);
    if (follow && pose) {
      pose.getWorldPosition(group.position);
      pose.getWorldQuaternion(group.quaternion);
      return;
    }
    const at = follow ? car : event, altitude = at.altitude ?? 0;
    const baseY = follow ? altitude + .3 : altitude + .85 + (altitude < .5 ? PICKUP_GROUND_LIFT[tier] : 0);
    if (worldPoint) group.position.fromArray(worldPoint(at.distance, at.x, baseY, distance, follow ? undefined : event));
    else group.position.set(roadCenter(at.distance) + at.x - center, baseY, -(at.distance - distance));
    group.quaternion.identity();
  }

  function update(dt, frame = {}) {
    for (const tier of TIERS) for (const slot of slots[tier]) {
      if (!Number.isFinite(slot.age) || slot.age >= slot.style.life) continue;
      slot.age += Math.max(0, dt);
      const progress = Math.min(1, slot.age / slot.style.life);
      if (progress >= 1) { slot.age = Infinity; slot.group.visible = false; continue; }
      const { group, shards, strength, reducedMotion } = slot;
      group.visible = frame.enabled !== false;
      place(slot, frame);
      slot.beam.visible = false;
      slot.rings.forEach((ring, i) => { ring.visible = i < slot.ringCount; });
      shards.count = slot.particles;
      shards.visible = slot.particles > 0;
      if (reducedMotion) { // one still ring and a soft glow keep the tier's identity without movement
        flash(slot, .22 * (1 - progress), 1.2, 0, .5, 0);
        slot.rings[0].position.set(0, .2, 0);
        slot.rings[0].rotation.set(FLAT, 0, 0);
        slot.rings[0].scale.setScalar(1.2 * strength);
        slot.rings[0].material.opacity = .16 * strength;
        continue;
      }
      shards.material.opacity = .9 * Math.pow(1 - progress, 1.25) * strength;
      MOTIONS[slot.style.motion](slot, slot.age, progress);
      if (shards.count) shards.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    group: root, spawn, update,
    activeCount: () => TIERS.reduce((sum, tier) =>
      sum + slots[tier].filter(slot => slot.age < slot.style.life).length, 0),
    reset() {
      for (const tier of TIERS) for (const slot of slots[tier]) {
        slot.age = Infinity; slot.event = null; slot.group.visible = false; slot.shards.count = 0;
      }
    },
    dispose() {
      root.removeFromParent();
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      texture.dispose();
    },
  };
}
