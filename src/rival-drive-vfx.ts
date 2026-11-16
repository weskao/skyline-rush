// Rival NITRO/BOOST cues seen from the player's car: a tail-light gain on every tier, one additive flame
// sprite from Medium, one short additive trail from High. A cheap echo of the player's sprint plume
// (src/sprint-plume.ts): no particles, no shader, shared texture/materials, per frame writes only.
import * as THREE from 'three';
import { glowTexture } from './pickup-collect-vfx.js';
import type { VfxQuality } from './vfx-settings.ts';

export type DriveCue = { light: number; flame: number; trail: number };
type DriveState = { nitroTime?: number; boosting?: boolean };
type DriveVisual = { enabled: boolean; quality: VfxQuality };

const NITRO_LIGHT = 1.8, BOOST_LIGHT = 1.3; // braking is 2.3 (world.js); BOOST stays mild, it fires often
const FLAME = { width: 0.95, height: 0.62 }, TRAIL = { width: 0.55, length: 3.4 };

/** What a rival's drive state shows this frame. Pure; writes `out` (no allocation). */
export function rivalDriveCue(car: DriveState, quality: VfxQuality, enabled: boolean, reducedMotion: boolean,
  time: number, phase: number, out: DriveCue): DriveCue {
  const nitro = (car.nitroTime ?? 0) > 0, boost = !nitro && !!car.boosting;
  const flicker = nitro && !reducedMotion ? Math.sin(time * 31 + phase) * 0.5 + Math.sin(time * 13.7 + phase * 2.3) * 0.5 : 0;
  out.light = nitro ? NITRO_LIGHT + flicker * 0.2 : boost ? BOOST_LIGHT : 1;
  out.flame = nitro && enabled && quality !== 'low' ? 1 + flicker * 0.18 : 0;
  out.trail = nitro && enabled && quality === 'high' ? 1 + flicker * 0.08 : 0;
  return out;
}

let shared: { flame: THREE.SpriteMaterial; trail: THREE.MeshBasicMaterial; plane: THREE.PlaneGeometry } | null = null;
function materials() {
  if (shared) return shared;
  const map = glowTexture();
  const glow = { map, transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending };
  shared = {
    flame: new THREE.SpriteMaterial({ ...glow, color: new THREE.Color(0.62, 0.84, 1), opacity: 0.9 }), // the plume's blue-white core
    trail: new THREE.MeshBasicMaterial({ ...glow, color: new THREE.Color(0.55, 0.42, 1), opacity: 0.55, side: THREE.DoubleSide }),
    plane: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), // flat on the car's floor plane
  };
  return shared;
}

/** Hangs the cue parts on a rival car (hidden, so warmupShaders compiles them) at its own rear bound. */
export function attachRivalDriveVfx(car: THREE.Object3D): void {
  const { flame: flameMaterial, trail: trailMaterial, plane } = materials();
  const box = new THREE.Box3().setFromObject(car); // the car sits at the origin, unrotated, when built
  const rear = box.max.z, height = THREE.MathUtils.lerp(box.min.y, box.max.y, 0.38);
  const flame = new THREE.Sprite(flameMaterial);
  flame.name = 'Rival NITRO flame';
  flame.position.set((box.min.x + box.max.x) / 2, height, rear + 0.2);
  const trail = new THREE.Mesh(plane, trailMaterial);
  trail.name = 'Rival NITRO trail';
  trail.position.set(flame.position.x, height - 0.1, rear + TRAIL.length * 0.42);
  flame.visible = trail.visible = false;
  car.add(flame, trail);
  const phase = car.id * 1.7, cue: DriveCue = { light: 1, flame: 0, trail: 0 };
  car.userData.driveCue = {
    flame, trail,
    /** Returns the tail-light gain for world.js updateCar. */
    update(state: DriveState, visual: DriveVisual, reducedMotion: boolean, time: number): number {
      rivalDriveCue(state, visual.quality, visual.enabled, reducedMotion, time, phase, cue);
      flame.visible = cue.flame > 0;
      if (flame.visible) flame.scale.set(FLAME.width * cue.flame, FLAME.height * cue.flame, 1);
      trail.visible = cue.trail > 0;
      if (trail.visible) trail.scale.set(TRAIL.width, 1, TRAIL.length * cue.trail);
      return cue.light;
    },
  };
}
