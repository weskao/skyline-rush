import * as THREE from 'three';
import type { AirflowProfile } from '../airflow-geometry.ts';
import type { RivalStatus } from '../rival-status-tint.ts';

// What Freeze and EMP share on a hit car. rival-status-tint.ts draws the shell and fills one FxFrame per car;
// rival-status-fx.ts fires the shockwave and hands the frame to each effect's own module (src/debuff/<effect>/).

export type Rgb = [number, number, number];
/** effects.js emit(), in road coordinates: race distance, lateral x, height above the road. */
export type StatusEmit = (distance: number, x: number, y: number, vx: number, vy: number, forward: number,
  size: number, life: number, color: Rgb, gravity: number, kind?: number, opacity?: number) => void;
export type FxRival = { distance?: number; x?: number; altitude?: number; pace?: number; speed?: number };

/** One car's frame. A single object is reused for every car and frame: read it, never keep it. */
export type FxFrame = {
  status: RivalStatus; age: number; isPlayer: boolean;
  pose: THREE.Object3D | undefined; rival: FxRival | undefined;
  /** The car's box in pose coordinates: centre, and half extents x 1.2 as the scale. Cached per displayed model. */
  fit: (pose: THREE.Object3D) => THREE.Matrix4;
  /** The car's measured silhouette in pose coordinates (24 slices along z: left, right, top). Cached per model. */
  profile: (pose: THREE.Object3D) => AirflowProfile;
  dt: number; low: boolean; reducedMotion: boolean;
  /** Set only while the race runs. */
  emit: StatusEmit | null;
  /** Particle budget: 1 on a rival at Medium and up, less on Low, on the player and under reduced motion. */
  thin: number;
  // Set per effect by rival-status-fx.ts just before that effect's car():
  on: boolean; began: boolean; ended: boolean;
};

/** What one effect adds around a hit car, beyond the shared shell and shockwave. */
export type EffectFx = {
  /** Scene objects it owns; rival-status-fx.ts adds them to the scene before the race (shader warm-up). */
  objects: THREE.Object3D[];
  /** Shockwave colour on the hit. */
  wave: Rgb;
  begin(dt: number): void;
  car(i: number, f: FxFrame): void;
  end(): void;
  reset(): void;
  dispose(): void;
};

export const UP = new THREE.Vector3(0, 1, 0);
/** Unused instances wait below the scene, never at scale 0: lit instances would light NaN. */
export const PARKED = new THREE.Matrix4().makeTranslation(0, -1e4, 0);
