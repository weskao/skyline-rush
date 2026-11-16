// Rival NITRO/BOOST cues seen from the player's car: a tail-light gain (BOOST: plus an ignition flash) on every
// tier, one additive flame sprite from Medium (BOOST: smaller, dimmer, near the player), one short additive trail from High (NITRO). A cheap echo of the player's sprint plume
// (src/sprint-plume.ts): no particles, no shader, shared texture/materials, per frame writes only.
import * as THREE from 'three';
import { glowTexture } from './pickup-collect-vfx.js';
import type { VfxQuality } from './vfx-settings.ts';
import { RIVAL_CUE_RANGE } from './rival-cues.ts';

/** `boosting`/`since` carry the BOOST rising edge between frames. */
export type DriveCue = { light: number; flame: number; trail: number; boosting?: boolean; since?: number };
type DriveState = { nitroTime?: number; boosting?: boolean; distance?: number };
type DriveVisual = { enabled: boolean; quality: VfxQuality };

const NITRO_LIGHT = 1.8, BOOST_LIGHT = 1.3; // braking is 2.3 (world.js); BOOST stays mild, it fires often
const BOOST_FLAME = 0.65; // a held BOOST drives the player's plume at power ~0.65 (sprint-plume.ts)
const IGNITION = { gain: 1.4, time: 0.3 }; // one decaying tail-light pulse when a BOOST starts: the surge has a cause
const FLAME = { width: 0.95, height: 0.62 }, TRAIL = { width: 0.55, length: 3.4 };

/** What a rival's drive state shows this frame; `gap` = metres to the player. Writes `out` (no allocation). */
export function rivalDriveCue(car: DriveState, quality: VfxQuality, enabled: boolean, reducedMotion: boolean,
  time: number, phase: number, out: DriveCue, gap: number): DriveCue {
  const nitro = (car.nitroTime ?? 0) > 0, boost = !nitro && !!car.boosting;
  if (car.boosting && !out.boosting) out.since = time;
  out.boosting = !!car.boosting;
  const ignition = boost ? 1 - (time - (out.since ?? -Infinity)) / IGNITION.time : 0; // a single pulse, never a strobe
  const flicker = (nitro || boost) && !reducedMotion ? Math.sin(time * 31 + phase) * 0.5 + Math.sin(time * 13.7 + phase * 2.3) * 0.5 : 0;
  out.light = nitro ? NITRO_LIGHT + flicker * 0.2 : boost ? BOOST_LIGHT + IGNITION.gain * Math.max(0, ignition) : 1;
  const flame = enabled && quality !== 'low' && (nitro || gap <= RIVAL_CUE_RANGE);
  out.flame = flame && (nitro || boost) ? (nitro ? 1 : BOOST_FLAME) * (1 + flicker * 0.18) : 0;
  out.trail = nitro && enabled && quality === 'high' ? 1 + flicker * 0.08 : 0;
  return out;
}

let shared: { flame: THREE.SpriteMaterial; boostFlame: THREE.SpriteMaterial; trail: THREE.MeshBasicMaterial; plane: THREE.PlaneGeometry } | null = null;
function materials() {
  if (shared) return shared;
  const map = glowTexture();
  const glow = { map, transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending };
  shared = {
    flame: new THREE.SpriteMaterial({ ...glow, color: new THREE.Color(0.62, 0.84, 1), opacity: 0.9 }), // the plume's blue-white core
    boostFlame: new THREE.SpriteMaterial({ ...glow, color: new THREE.Color(0.62, 0.84, 1), opacity: 0.9 * BOOST_FLAME }), // same program
    trail: new THREE.MeshBasicMaterial({ ...glow, color: new THREE.Color(0.55, 0.42, 1), opacity: 0.55, side: THREE.DoubleSide }),
    plane: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), // flat on the car's floor plane
  };
  return shared;
}

/** Hangs the cue parts on a rival car (hidden, so warmupShaders compiles them) at its own rear bound. */
export function attachRivalDriveVfx(car: THREE.Object3D): void {
  const { flame: flameMaterial, boostFlame, trail: trailMaterial, plane } = materials();
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
    /** Returns the tail-light gain for world.js updateCar; `playerDistance` gates the BOOST flame. */
    update(state: DriveState, visual: DriveVisual, reducedMotion: boolean, time: number, playerDistance: number): number {
      rivalDriveCue(state, visual.quality, visual.enabled, reducedMotion, time, phase, cue, Math.abs((state.distance ?? Infinity) - playerDistance));
      flame.visible = cue.flame > 0;
      flame.material = (state.nitroTime ?? 0) > 0 ? flameMaterial : boostFlame; // one sprite, a swap: no extra draw call
      if (flame.visible) flame.scale.set(FLAME.width * cue.flame, FLAME.height * cue.flame, 1);
      trail.visible = cue.trail > 0;
      if (trail.visible) trail.scale.set(TRAIL.width, 1, TRAIL.length * cue.trail);
      return cue.light;
    },
  };
}
