import * as THREE from 'three';
import type { AirflowProfile } from '../../airflow-geometry.ts';
import { PARKED, UP, type EffectFx, type FxFrame, type FxRival, type Rgb, type StatusEmit } from '../fx-shared.ts';
import { crystalLayout, LOW_STRIDE, SHARDS, type Crystal } from './freeze-crystals.ts';
import { crystalGeometry, crystalMaterial } from './freeze-crystal-material.ts';

// Freeze around a hit car: clusters of small ice crystals grow over its real body (freeze-crystals.ts), snow falls on
// it, cold mist trails from the tail and vapor rolls off the ice; on thaw the crystals shatter outward into chips.
// One instanced mesh for all cars, crystals ride each car's pose. Low: a few crystals on the player only and vapor;
// reduced motion: crystals appear without the snap, shrink in place on thaw, no snow and fewer particles.

const GROW = 0.15, SHATTER = 0.65; // s
const FROST: Rgb = [0.75, 1.5, 2.6], ICE_WHITE: Rgb = [1.6, 1.9, 2.3], VAPOR: Rgb = [0.7, 0.85, 1], SNOW: Rgb = [1.5, 1.6, 1.75];
/** Particles per second per car at a budget of 1: vapor and sparkles, snowflakes, exhaust mist. */
const RATES = [14, 10, 8] as const;

const easeOutBack = (t: number): number => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // the crystal snaps into place

function burst(emit: StatusEmit, rival: FxRival, count: number, thaw: boolean) {
  const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.7, forward = rival.pace ?? rival.speed ?? 0;
  for (let n = 0; n < count; n++) { // frost crystals on the hit, ice chips on the thaw
    const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), v = thaw ? 5 + Math.random() * 7 : 2 + Math.random() * 4;
    emit(d0 + s * 2, x0 + c, y0 + Math.random() * 0.6, c * v, 2 + Math.random() * (thaw ? 6 : 3), forward + s * v,
      0.08 + Math.random() * 0.12, 0.45 + Math.random() * 0.5, n % 2 ? ICE_WHITE : FROST, thaw ? 14 : 4, 0, 0.95);
  }
}

/** One particle of a stream: 0 vapor or a sparkle on the crust, 1 a snowflake, 2 cold mist from the tail. */
function drizzle(emit: StatusEmit, rival: FxRival, stream: number, n: number, tail: number) {
  const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.7, forward = rival.pace ?? rival.speed ?? 0;
  const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  if (stream === 1) emit(d0 + (Math.random() - 0.5) * 5, x0 + (Math.random() - 0.5) * 3, y0 + 1.1 + Math.random() * 0.8,
    (Math.random() - 0.5) * 0.6, -0.5 - Math.random() * 0.4, forward, 0.05 + Math.random() * 0.04, 1.1, SNOW, 0.6, 0, 0.95);
  else if (stream === 2) emit(d0 - tail, x0 + (n % 2 ? 0.45 : -0.45), y0 - 0.35, n % 2 ? 0.4 : -0.4, 0.25, forward * 0.88,
    0.45, 1, VAPOR, -0.2, 2, 0.32);
  else if (n % 2) emit(d0 + s * 2, x0 + c, y0 - 0.3, c * 0.6, 0.5 + Math.random() * 0.5, forward, 0.8, 0.8, VAPOR, -0.4, 2, 0.28);
  else emit(d0 + s * 2, x0 + c, y0 + Math.random() * 0.6, 0, 0.4, forward, 0.06, 0.4, ICE_WHITE, 0, 0, 1);
}

export function createFreezeFx(capacity: number): EffectFx {
  const material = crystalMaterial();
  const shards = new THREE.InstancedMesh(crystalGeometry(), material, capacity * SHARDS);
  shards.name = 'Rival freeze shards';
  shards.frustumCulled = false; shards.visible = false; // posed every frame
  for (let i = 0; i < shards.count; i++) shards.setMatrixAt(i, PARKED);

  const thawAt = new Float64Array(capacity).fill(-1e9), beganAt = new Float64Array(capacity).fill(-1e9), carry = new Float64Array(capacity * RATES.length);
  const layouts = new WeakMap<AirflowProfile, Crystal[]>();
  const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3();
  const spin = new THREE.Quaternion(), turn = new THREE.Quaternion();
  let time = 0, any = false, still = false;

  function layoutOf(profile: AirflowProfile): Crystal[] {
    let layout = layouts.get(profile);
    if (!layout) { layout = crystalLayout(profile); layouts.set(profile, layout); }
    return layout;
  }

  const park = (i: number, k: number) => shards.setMatrixAt(i * SHARDS + k, PARKED);

  function poseShards(i: number, f: FxFrame): boolean {
    const thawed = time - thawAt[i]!, frozen = f.on, age = time - beganAt[i]!; // its own clock: an EMP over it never restarts the growth
    if (!f.pose || (f.low && !f.isPlayer) || (!frozen && thawed > SHATTER)) {
      for (let k = 0; k < SHARDS; k++) park(i, k);
      return false;
    }
    f.pose.updateWorldMatrix(true, false);
    const layout = layoutOf(f.profile(f.pose));
    let shown = false;
    for (let k = 0; k < SHARDS; k++) {
      const crystal = layout[k]!;
      point.copy(crystal.at); spin.copy(crystal.lean);
      let grow: number;
      if (frozen) {
        const t = THREE.MathUtils.clamp((age - crystal.delay) / GROW, 0, 1);
        grow = f.reducedMotion ? t * t * (3 - 2 * t) : easeOutBack(t);
      } else {
        grow = 1 - thawed / SHATTER;
        if (!f.reducedMotion) {
          point.addScaledVector(crystal.fly, thawed).addScaledVector(UP, -4.9 * thawed * thawed);
          spin.premultiply(turn.setFromAxisAngle(crystal.axis, thawed * 14));
        }
      }
      if (grow <= 1e-3 || (f.low && k % LOW_STRIDE)) { park(i, k); continue; } // grows from nothing; never scale 0
      scale.set(crystal.radius * grow, crystal.length * grow, crystal.radius * grow);
      shards.setMatrixAt(i * SHARDS + k, matrix.multiplyMatrices(f.pose.matrixWorld, local.compose(point, spin, scale)));
      shown = true;
    }
    return shown;
  }

  function particles(i: number, f: FxFrame, emit: StatusEmit, rival: FxRival) {
    if (f.began) burst(emit, rival, Math.round(20 * f.thin), false);
    if (f.ended) burst(emit, rival, Math.round(24 * f.thin), true);
    if (!f.on) return;
    const bounds = f.pose && f.profile(f.pose).bounds, tail = bounds ? (bounds.max.z - bounds.min.z) / 2 + 0.1 : 2.4;
    for (let stream = 0; stream < RATES.length; stream++) {
      if (stream > 0 && f.low) break; // Low: the soft vapor only
      if (stream === 1 && f.reducedMotion) continue; // no drifting snow
      const c = i * RATES.length + stream;
      carry[c] = carry[c]! + f.dt * RATES[stream]! * f.thin;
      const count = Math.floor(carry[c]!);
      carry[c] = carry[c]! - count;
      for (let n = 0; n < count; n++) drizzle(emit, rival, stream, n, tail);
    }
  }

  return {
    objects: [shards],
    wave: FROST,
    begin(dt) { time += dt; any = false; },
    car(i, f) {
      if (f.began) { beganAt[i] = time; carry.fill(0, i * RATES.length, (i + 1) * RATES.length); }
      if (f.ended) thawAt[i] = time;
      if (f.emit && f.rival) particles(i, f, f.emit, f.rival);
      still = f.reducedMotion;
      any = poseShards(i, f) || any;
    },
    end() {
      if (any || shards.visible) shards.instanceMatrix.needsUpdate = true;
      shards.visible = any;
      material.uniforms.time!.value = still ? 0 : time; // reduced motion: the ice holds still
    },
    reset() {
      thawAt.fill(-1e9); beganAt.fill(-1e9); carry.fill(0);
      for (let i = 0; i < shards.count; i++) shards.setMatrixAt(i, PARKED);
      shards.visible = false;
      shards.instanceMatrix.needsUpdate = true;
    },
    dispose() { shards.geometry.dispose(); material.dispose(); shards.dispose(); },
  };
}
