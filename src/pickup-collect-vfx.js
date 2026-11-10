// Shared GPU-pooled roadside pickup collection effects: one home for every current and future track.
import * as THREE from 'three';
import { PICKUP_GROUND_LIFT } from './pickup-art.js';

export const PICKUP_COLLECTION_STYLES = Object.freeze({
  cell: Object.freeze({ color: 0x40d9ff, rings: 1, particles: 18, beam: false, rainbow: false, life: .58 }),
  can: Object.freeze({ color: 0xff9b3b, rings: 2, particles: 24, beam: false, rainbow: false, life: .64 }),
  tank: Object.freeze({ color: 0xffd34e, rings: 2, particles: 30, beam: true, rainbow: false, life: .72 }),
  overcharge: Object.freeze({ color: 0xef81ff, rings: 3, particles: 42, beam: true, rainbow: true, life: .84 }),
});
// Rival cues omit CourseGraph edge identifiers; retain the original authored item if present.
export const pickupCueSource = (cue, pickups) =>
  pickups.find(item => item.tier === cue.item && item.distance === cue.distance && item.x === cue.x) ?? cue;

const TIERS = Object.keys(PICKUP_COLLECTION_STYLES);
const SLOTS_PER_TIER = 2, MAX_PARTICLES = 42, MAX_RINGS = 3;
const PRISM = [0x6ceaff, 0xf88aff, 0xffd35c, 0x91a5ff, 0x7cffcb, 0xff7398];
const scratch = new THREE.Object3D();

// One tiny radial-alpha texture for every flash. GPU uploads occur at scene construction, not on collection.
function glowTexture() {
  const side = 32, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = (x + .5 - side / 2) / (side / 2);
    const v = (y + .5 - side / 2) / (side / 2);
    const d2 = u * u + v * v, at = (y * side + x) * 4;
    pixels[at] = pixels[at + 1] = pixels[at + 2] = 255;
    pixels[at + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - d2), 3));
  }
  const texture = new THREE.DataTexture(pixels, side, side, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

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
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({
        color: style.color, map: texture, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      flash.name = 'energy flash';
      flash.position.y = .15;
      group.add(flash);
      materials.add(flash.material);
      const rings = [];
      for (let i = 0; i < MAX_RINGS; i++) {
        const tint = style.rainbow ? PRISM[i * 2] : style.color;
        const ring = new THREE.Mesh(geometries[0], makeMaterial(tint));
        ring.name = 'energy shockwave ' + i;
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -.24 + i * .20;
        group.add(ring); rings.push(ring);
      }
      const beam = new THREE.Mesh(geometries[2], makeMaterial(style.color));
      beam.name = 'energy beam';
      beam.position.y = 1.3;
      group.add(beam);
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
        tier, style, group, flash, rings, beam, shards,
        age: Infinity, event: null, particles: 0, ringCount: 0, reducedMotion: false, strength: 1,
      });
    }
  }

  function spawn(tier, event, { quality = 'high', reducedMotion = false, rival = false } = {}) {
    if (!slots[tier] || !event || !Number.isFinite(event.distance) || !Number.isFinite(event.x)) return false;
    const slot = slots[tier][next[tier]++ % SLOTS_PER_TIER];
    slot.event = event;
    slot.age = 0;
    slot.reducedMotion = reducedMotion;
    slot.strength = rival ? .65 : 1;
    const density = reducedMotion ? 0 : quality === 'low' ? .26 : quality === 'medium' ? .65 : 1;
    slot.particles = Math.min(MAX_PARTICLES, Math.round(slot.style.particles * density * (rival ? .5 : 1)));
    slot.ringCount = reducedMotion || quality === 'low' ? 1 : quality === 'medium' ? Math.min(2, slot.style.rings) : slot.style.rings;
    slot.group.visible = true;
    return true;
  }

  function update(dt, { distance = 0, center = 0, roadCenter = () => 0, worldPoint, enabled = true } = {}) {
    for (const tier of TIERS) for (const slot of slots[tier]) {
      if (!Number.isFinite(slot.age) || slot.age >= slot.style.life) continue;
      slot.age += Math.max(0, dt);
      const progress = Math.min(1, slot.age / slot.style.life);
      if (progress >= 1) { slot.age = Infinity; slot.group.visible = false; continue; }
      const { event, group, style, strength, reducedMotion } = slot;
      group.visible = enabled;
      const baseY = (event.altitude ?? 0) + .85 +
        ((event.altitude ?? 0) < .5 ? PICKUP_GROUND_LIFT[tier] : 0);
      if (worldPoint) group.position.fromArray(worldPoint(event.distance, event.x, baseY, distance, event));
      else group.position.set(roadCenter(event.distance) + event.x - center, baseY, -(event.distance - distance));
      const flashFade = Math.max(0, 1 - slot.age / .23);
      slot.flash.visible = true;
      slot.flash.material.opacity = (reducedMotion ? .22 : .92) * flashFade * strength;
      slot.flash.scale.setScalar((reducedMotion ? 1.2 : 1.2 + slot.age * 12) * strength);
      for (let i = 0; i < MAX_RINGS; i++) {
        const ring = slot.rings[i], phase = Math.max(0, slot.age - i * .075);
        ring.visible = i < slot.ringCount && (reducedMotion || phase > 0);
        if (!ring.visible) continue;
        const fade = Math.max(0, 1 - phase / (style.life - i * .04));
        ring.material.opacity = (reducedMotion ? .16 : .78 * fade * fade) * strength;
        ring.scale.setScalar(reducedMotion ? 1.2 : (.35 + phase * (tier === 'overcharge' ? 7.5 : 6)) * strength);
        ring.rotation.z = reducedMotion ? 0 : (i % 2 ? -1 : 1) * phase * 1.8;
      }
      slot.beam.visible = style.beam && !reducedMotion && slot.age < .38;
      if (slot.beam.visible) {
        slot.beam.material.opacity = .32 * Math.sin(Math.PI * slot.age / .38) * strength;
        slot.beam.scale.set(.9 * strength, 1 + slot.age * 4, .9 * strength);
      }
      const shards = slot.shards;
      shards.count = slot.particles;
      shards.visible = slot.particles > 0;
      shards.material.opacity = .85 * Math.pow(1 - progress, 1.25) * strength;
      for (let i = 0; i < slot.particles; i++) {
        const a = i * 2.39996323, speed = (2.2 + i % 5 * .45) * strength;
        scratch.position.set(Math.cos(a) * speed * slot.age, .15 + (i % 4) * .11 + slot.age * (1.4 + (i % 3)),
          Math.sin(a) * speed * slot.age);
        scratch.rotation.set(slot.age * (i % 3 + 1) * 4, a, slot.age * (i % 4 + 1) * 3);
        scratch.scale.setScalar(Math.max(.001, (1 - progress) * (i % 6 === 0 ? 1.8 : 1)));
        scratch.updateMatrix();
        shards.setMatrixAt(i, scratch.matrix);
      }
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
