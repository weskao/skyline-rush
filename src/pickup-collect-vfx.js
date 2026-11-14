// Shared GPU-pooled pickup collection effects: one home for every current and future track. Each tier plays its
// own choreography (MOTIONS) on the same pooled meshes, with quality-aware shader and draw budgets.
import * as THREE from 'three';
import { animatePickup, PICKUP_GROUND_LIFT } from './pickup-art.js';
import { CONTACT_FRAGMENT, CONTACT_VERTEX } from './pickup-collect-shaders.js';
import { createPickupVehicleFit } from './pickup-vehicle-fit.js';
import { flash, MOTIONS, scratch } from './pickup-collect-motion.js';
import { createPickupHoop, createTankHoop, createTankHaloGeometry, paintPickupHoop } from './pickup-collect-hoops.js';
import { createPickupStreaks } from './pickup-collect-streaks.js';

// `rings` and `particles` are the High-quality budgets; `motion` names the tier's choreography in MOTIONS.
export const PICKUP_COLLECTION_STYLES = Object.freeze({
  cell: Object.freeze({ color: 0x40d9ff, rings: 2, particles: 18, beam: false, rainbow: false, life: .60, motion: 'arcSnap' }),
  can: Object.freeze({ color: 0xff9b3b, rings: 2, particles: 24, beam: false, rainbow: false, life: .80, motion: 'afterburn' }),
  tank: Object.freeze({ color: 0xffd34e, rings: 2, particles: 30, beam: false, rainbow: false, life: .95, motion: 'surge' }),
  overcharge: Object.freeze({ color: 0xef81ff, rings: 3, particles: 42, beam: true, rainbow: true, life: 1.08, motion: 'prismNova' }),
});
// Rival cues omit CourseGraph edge identifiers; retain the original authored item if present.
export const pickupCueSource = (cue, pickups) =>
  pickups.find(item => item.tier === cue.item && item.distance === cue.distance && item.x === cue.x) ?? cue;

const TIERS = Object.keys(PICKUP_COLLECTION_STYLES);
const CONTACT_SPANS = [.22, .29, .36, .43], CONTACT_RADII = [1.8, 2.25, 2.75, 3.4];
const SECONDARY = [0xbbf9ff, 0xffd076, 0xfff1a0, 0x79ecff];
const ABSORB_SPANS = [.145, .17, .205, .23];
const MAX_PARTICLES = 42;
const PRISM = [0x6ceaff, 0xf88aff, 0xffd35c, 0x91a5ff, 0x7cffcb, 0xff7398];
const FLAT = -Math.PI / 2;
const CONTACT_PLANE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), FLAT);
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

function energyMaterial(vertexShader, fragmentShader) {
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { primary: { value: new THREE.Color() }, secondary: { value: new THREE.Color() },
      progress: { value: 0 }, strength: { value: 0 }, tier: { value: 0 } },
  });
}

export function createPickupCollectVfx(scene, player, camera) {
  const root = new THREE.Group();
  root.name = 'Pickup collect VFX';
  scene.add(root);
  const geometries = [
    new THREE.TorusGeometry(1, .045, 8, 64),
    new THREE.OctahedronGeometry(.14, 0),
    new THREE.CylinderGeometry(.17, .55, 1, 12, 1, true),
    new THREE.PlaneGeometry(2, 2),
  ];
  const tankHaloGeometry = createTankHaloGeometry();
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

  const vehicleFit = createPickupVehicleFit(player);
  let bodySlot = null;
  const inverse = new THREE.Matrix4(), roadRotation = new THREE.Quaternion();
  const contactScale = new THREE.Vector3();
  const target = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), basis = new THREE.Matrix4();

  for (const [tierIndex, tier] of TIERS.entries()) {
    const style = PICKUP_COLLECTION_STYLES[tier];
    for (let index = 0; index < (tier === 'tank' ? 3 : 2); index++) {
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
      const contactMaterial = energyMaterial(CONTACT_VERTEX, CONTACT_FRAGMENT);
      contactMaterial.side = THREE.DoubleSide;
      contactMaterial.forceSinglePass = true;
      contactMaterial.uniforms.primary.value.set(style.color);
      contactMaterial.uniforms.secondary.value.set(SECONDARY[tierIndex]);
      contactMaterial.uniforms.tier.value = tierIndex;
      const contact = new THREE.Mesh(geometries[3], contactMaterial);
      contact.name = 'Pickup contact pulse';
      contact.renderOrder = 10;
      contact.visible = false;
      contact.matrixAutoUpdate = false;
      materials.add(contactMaterial);
      group.add(contact);
      materials.add(flashSprite.material);
      const rings = [];
      for (let i = 0; i < style.rings; i++) {
        const ring = tier === 'tank' ? createTankHoop(geometries[0], tankHaloGeometry, i, materials)
          : style.beam ? createPickupHoop(geometries[0], tier, i, materials)
          : new THREE.Mesh(geometries[0], makeMaterial(style.color));
        ring.name = 'energy shockwave ' + i;
        group.add(ring); rings.push(ring);
      }
      const pillar = new THREE.Mesh(geometries[2], makeMaterial(style.color));
      pillar.name = 'energy beam';
      pillar.position.y = 1.3;
      group.add(pillar);
      const tankGlow = tier === 'tank' && new THREE.Mesh(geometries[3], makeMaterial(0xffc134, { map: texture }));
      if (tankGlow) {
        tankGlow.name = 'Pickup tank ground glow';
        tankGlow.visible = false;
        group.add(tankGlow);
      }
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
        tier, tierIndex, style, group, contact, flash: flashSprite, rings, beam: pillar, tankGlow, shards,
        streaks: camera && (tier === 'cell' || tier === 'can') ? createPickupStreaks(group, tier) : null,
        age: Infinity, event: null, follow: false, particles: 0, ringCount: 0, reducedMotion: false, strength: 1,
      });
    }
  }

  /** `follow`: the effect rides the player's car instead of staying at the item the car has already passed. */
  function spawn(tier, event, { quality = 'high', reducedMotion = false, rival = false, follow = false, markerTime } = {}) {
    if (!slots[tier] || !event || !Number.isFinite(event.distance) || !Number.isFinite(event.x)) return false;
    const slot = slots[tier][next[tier]++ % slots[tier].length];
    if (follow && !rival) {
      if (bodySlot && bodySlot !== slot) bodySlot.releaseAt ??= bodySlot.age;
      bodySlot = slot;
    }
    else if (bodySlot === slot) bodySlot = null;
    slot.event = event;
    slot.contact.visible = false;
    slot.contactEnabled = follow && !rival && quality !== 'low';
    slot.quality = quality;
    slot.follow = follow;
    slot.age = 0;
    slot.markerTime = follow && !rival ? markerTime : undefined;
    slot.releaseAt = undefined;
    slot.visualWeight = 1;
    slot.reducedMotion = reducedMotion;
    slot.strength = rival ? .65 : 1;
    const density = reducedMotion ? 0 : quality === 'low' ? .26 : quality === 'medium' ? .65 : 1;
    slot.particles = Math.min(MAX_PARTICLES, Math.round(slot.style.particles * density * (rival ? .5 : 1)));
    slot.ringCount = reducedMotion || (quality === 'low' && tier !== 'tank') ? 1 : quality === 'medium' ? Math.min(2, slot.style.rings) : slot.style.rings;
    slot.group.visible = true;
    return true;
  }

  // `car` is the player's race state and `pose` its rendered Object3D; either lets a followed effect track it.
  function place(slot, { distance = 0, center = 0, roadCenter = () => 0, worldPoint, car, pose, roadNormal }) {
    const { group, event, tier } = slot, follow = slot.follow && (pose || car);
    if (follow && pose) {
      vehicleFit.place(group, pose, tier === 'tank' ? roadNormal ?? THREE.Object3D.DEFAULT_UP : null);
      return;
    }
    group.scale.setScalar(1);
    const at = follow ? car : event, altitude = at.altitude ?? 0;
    const baseY = follow ? altitude + .3 : altitude + .85 + (altitude < .5 ? PICKUP_GROUND_LIFT[tier] : 0);
    if (worldPoint) group.position.fromArray(worldPoint(at.distance, at.x, baseY, distance, follow ? undefined : event));
    else group.position.set(roadCenter(at.distance) + at.x - center, baseY, -(at.distance - distance));
    group.quaternion.identity();
  }

  function placeContact(slot, { distance = 0, center = 0, roadCenter = () => 0, worldPoint, worldFrame }) {
    const { event, contact, group } = slot;
    const altitude = event.altitude ?? 0, height = altitude < .5 ? altitude + .08 : altitude + .85;
    if (worldPoint) contact.position.fromArray(worldPoint(event.distance, event.x, height, distance, event));
    else contact.position.set(roadCenter(event.distance) + event.x - center, height, distance - event.distance);
    const road = worldFrame?.(event.distance, event);
    roadRotation.identity();
    if (road) roadRotation.setFromRotationMatrix(basis.makeBasis(
      right.fromArray(road.right), up.fromArray(road.up), back.fromArray(road.forward).negate()));
    group.updateMatrix();
    inverse.copy(group.matrix).invert();
    contact.matrix.compose(contact.position, roadRotation.multiply(CONTACT_PLANE), contactScale.setScalar(CONTACT_RADII[slot.tierIndex]));
    contact.matrix.premultiply(inverse);
    contact.matrixWorldNeedsUpdate = true;
    contact.material.uniforms.progress.value = slot.age / CONTACT_SPANS[slot.tierIndex];
    contact.material.uniforms.strength.value = slot.quality === 'medium' ? .72 : 1;
  }

  function update(dt, frame = {}) {
    for (const tier of TIERS) for (const slot of slots[tier]) {
      if (!Number.isFinite(slot.age) || slot.age >= slot.style.life) continue;
      slot.age += Math.max(0, dt);
      const progress = Math.min(1, slot.age / slot.style.life);
      if (progress >= 1) { slot.age = Infinity; slot.group.visible = slot.contact.visible = false; continue; }
      const { group, contact, shards, strength, streaks } = slot;
      const reducedMotion = slot.reducedMotion || frame.reducedMotion;
      group.visible = frame.enabled !== false;
      place(slot, frame);
      slot.visualWeight = strength * (slot.releaseAt === undefined ? 1
        : 1 - .94 * THREE.MathUtils.smoothstep(slot.age - slot.releaseAt, 0, .16));
      if (streaks) streaks.mesh.visible = false;
      contact.visible = group.visible && slot.contactEnabled && !reducedMotion && slot.age < CONTACT_SPANS[slot.tierIndex];
      if (contact.visible) placeContact(slot, frame);
      slot.beam.visible = false;
      if (slot.tankGlow) slot.tankGlow.visible = false;
      const ringCount = reducedMotion ? 1 : slot.ringCount;
      slot.rings.forEach((ring, i) => { ring.visible = i < ringCount; });
      shards.count = reducedMotion ? 0 : slot.particles;
      shards.visible = shards.count > 0;
      if (reducedMotion) { // one still ring and a soft glow keep the tier's identity without movement
        flash(slot, .22 * (1 - progress), 1.2, 0, .5, 0);
        slot.rings[0].position.set(0, .2, 0);
        slot.rings[0].rotation.set(FLAT, 0, 0);
        slot.rings[0].scale.setScalar(1.2 * strength);
        paintPickupHoop(slot.rings[0], 0, .16 * strength, .045, false);
        continue;
      }
      shards.material.opacity = .9 * Math.pow(1 - progress, 1.25) * strength;
      MOTIONS[slot.style.motion](slot, slot.age, progress);
      if (shards.count) shards.instanceMatrix.needsUpdate = true;
      if (streaks) {
        streaks.update(slot, camera, vehicleFit.sections(frame.pose));
        if (streaks.mesh.visible) for (const ring of slot.rings) ring.visible = false;
      }
    }
    vehicleFit.updateBody(bodySlot, frame, bodySlot ? SECONDARY[bodySlot.tierIndex] : 0);
  }

  function drawAbsorbing(marker, pool, { distance, center, roadCenter, worldPoint, pose, reducedMotion, enabled }, dt) {
    if (!enabled || reducedMotion || !pose) return;
    for (const tier of TIERS) for (const slot of slots[tier]) {
      const { event, markerTime, tierIndex } = slot;
      const age = slot.age + Math.max(0, dt);
      const span = ABSORB_SPANS[tierIndex];
      if (markerTime === undefined || slot.reducedMotion || age >= span) continue;
      if (worldPoint) marker.position.fromArray(worldPoint(event.distance, event.x, (event.altitude ?? 0) + .85, distance, event));
      else marker.position.set(roadCenter(event.distance) + event.x - center, (event.altitude ?? 0) + .85, distance - event.distance);
      animatePickup(marker, event, markerTime, false);
      vehicleFit.absorbTarget(pose, target);
      const q = age / span, pull = q * q * (2.3 - 1.3 * q);
      marker.position.lerp(target, pull);
      marker.position.y += Math.sin(Math.PI * pull) * .22;
      marker.scale.multiplyScalar(Math.max(.04, 1 - pull * .98));
      marker.rotation.y += q * q * (tier === 'overcharge' ? 6.2 : 4.5);
      marker.updateMatrix();
      pool.add(tier, marker.matrix);
    }
  }

  return {
    group: root, spawn, update, drawAbsorbing,
    activeCount: () => TIERS.reduce((sum, tier) =>
      sum + slots[tier].filter(slot => slot.age < slot.style.life).length, 0),
    reset() {
      bodySlot = null;
      vehicleFit.reset();
      for (const tier of TIERS) for (const slot of slots[tier]) {
        slot.age = Infinity; slot.event = null; slot.group.visible = slot.contact.visible = false; slot.shards.count = 0;
      }
    },
    dispose() {
      root.removeFromParent();
      vehicleFit.dispose();
      for (const tier of TIERS) for (const slot of slots[tier]) slot.streaks?.dispose();
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      tankHaloGeometry.dispose();
      texture.dispose();
    },
  };
}
