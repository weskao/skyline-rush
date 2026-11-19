import * as THREE from 'three';
import type { RivalStatus } from './rival-status-tint.ts';
import { emp as EMP } from './effects-palette.ts';

// The game-feel layer over the status shell (rival-status-tint.ts), after the big-game read of each status:
// Freeze = ice crystals jut from the body (flash-freeze), cold vapor rolls off, and on thaw they shatter outward;
// EMP = a shockwave ring on the hit and sparks spitting from the body while it lasts.
// Two instanced meshes for all cars; crystals and waves ride each car's pose.
// Low keeps a few crystals on the nearby player; reduced motion shrinks crystals in place and emits fewer particles.

type Rgb = [number, number, number];
/** effects.js emit(), in road coordinates: race distance, lateral x, height above the road. */
export type StatusEmit = (distance: number, x: number, y: number, vx: number, vy: number, forward: number,
  size: number, life: number, color: Rgb, gravity: number, kind?: number, opacity?: number) => void;
export type FxRival = { distance?: number; x?: number; altitude?: number; pace?: number; speed?: number };
type FxFrame = { status: RivalStatus; age: number; pose: THREE.Object3D | undefined; fit: (pose: THREE.Object3D) => THREE.Matrix4; rival: FxRival | undefined; isPlayer: boolean };

const SHARDS = 10, LOW_PLAYER_SHARDS = 4; // crystals per car
const GROW = 0.22, STAGGER = 0.025, SHATTER = 0.65; // s
const WAVE = 0.45; // s a shockwave ring lives
const FROST: Rgb = [0.75, 1.5, 2.6], ICE_WHITE: Rgb = [1.6, 1.9, 2.3], VAPOR: Rgb = [0.7, 0.85, 1];
const SPARK_WHITE: Rgb = [2.6, 2.6, 2.2];
const UP = new THREE.Vector3(0, 1, 0);
const parked = new THREE.Matrix4().makeTranslation(0, -1e4, 0); // never scale 0: lit instances would light NaN

// One crystal layout, shared by every car (unit-sphere coordinates on the fitted shell): golden-angle around the
// body, from the sills to the roof, each leaning outward and up.
const layout = Array.from({ length: SHARDS }, (_, k) => {
  const y = -0.2 + 0.95 * ((k * 0.618034) % 1), r = Math.sqrt(1 - y * y), a = k * 2.39996;
  const at = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  const lean = new THREE.Quaternion().setFromUnitVectors(UP, at.clone().multiplyScalar(0.8).add(UP).normalize());
  const fly = at.clone().multiplyScalar(4 + (k % 3) * 1.6).add(new THREE.Vector3(0, 3 + (k % 4), 0)); // m/s on thaw
  const axis = new THREE.Vector3(Math.sin(k * 1.7), Math.cos(k * 2.3), Math.sin(k)).normalize();
  return { at: at.multiplyScalar(0.86), lean, fly, axis, size: 0.65 + 0.12 * (k % 5) };
});

export function createRivalStatusFx(capacity: number) {
  const crystal = new THREE.OctahedronGeometry(1, 0).scale(0.17, 0.62, 0.17).translate(0, 0.42, 0); // base sunk in the body
  const shards = new THREE.InstancedMesh(crystal, new THREE.MeshStandardMaterial({
    color: '#d6f2ff', emissive: '#3ea6ff', emissiveIntensity: 0.55, roughness: 0.06, metalness: 0.25,
    flatShading: true, transparent: true, opacity: 0.85,
  }), capacity * SHARDS);
  shards.name = 'Rival freeze shards';
  const waves = new THREE.InstancedMesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), capacity);
  waves.name = 'Rival status shockwave';
  const color = new THREE.Color();
  for (const mesh of [shards, waves]) {
    mesh.frustumCulled = false; mesh.visible = false; // posed every frame
    for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, parked);
  }
  for (let i = 0; i < waves.count; i++) waves.setColorAt(i, color.setRGB(0, 0, 0));
  const group = new THREE.Group();
  group.name = 'Rival status fx';
  group.add(shards, waves);

  const held: RivalStatus[] = new Array(capacity).fill(null);
  const waveEmp = new Uint8Array(capacity), hitAt = new Float64Array(capacity).fill(-1e9), thawAt = new Float64Array(capacity).fill(-1e9), carry = new Float64Array(capacity);
  const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3();
  const spin = new THREE.Quaternion(), turn = new THREE.Quaternion(), center = new THREE.Vector3(), half = new THREE.Vector3();
  let time = 0, anyShards = false, anyWaves = false;

  function emitAround(emit: StatusEmit, rival: FxRival, count: number, burst: boolean, kind: RivalStatus, thaw = false) {
    const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.7, forward = rival.pace ?? rival.speed ?? 0;
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), d = d0 + s * 2, x = x0 + c * 1;
      if (kind === 'emp') { // streaked sparks (particle kind 1) fanning out of the body
        const v = burst ? 7 + Math.random() * 8 : 3 + Math.random() * 6;
        emit(d, x, y0 + Math.random() * 0.5, c * v, 1.5 + Math.random() * 4, forward + s * v, 0.06 + Math.random() * 0.06,
          0.2 + Math.random() * 0.3, n % 3 ? EMP : SPARK_WHITE, 10, 1, 1);
      } else if (burst) { // frost crystals on the hit, ice chips on the thaw
        const v = thaw ? 5 + Math.random() * 7 : 2 + Math.random() * 4;
        emit(d, x, y0 + Math.random() * 0.6, c * v, 2 + Math.random() * (thaw ? 6 : 3), forward + s * v, 0.08 + Math.random() * 0.12,
          0.45 + Math.random() * 0.5, n % 2 ? ICE_WHITE : FROST, thaw ? 14 : 4, 0, 0.95);
      } else if (n % 2) { // cold vapor rolling off the ice
        emit(d, x, y0 - 0.3, c * 0.6, 0.5 + Math.random() * 0.5, forward, 0.8, 0.8, VAPOR, -0.4, 2, 0.28);
      } else { // a twinkle on the crust
        emit(d, x, y0 + Math.random() * 0.6, 0, 0.4, forward, 0.06, 0.4, ICE_WHITE, 0, 0, 1);
      }
    }
  }

  function poseShards(i: number, f: FxFrame, low: boolean, reducedMotion: boolean): boolean {
    const thawed = time - thawAt[i]!, frozen = f.status === 'freeze';
    const count = low ? (f.isPlayer ? LOW_PLAYER_SHARDS : 0) : SHARDS;
    if (!count || !f.pose || (!frozen && thawed > SHATTER)) {
      for (let k = 0; k < SHARDS; k++) shards.setMatrixAt(i * SHARDS + k, parked);
      return false;
    }
    f.pose.updateWorldMatrix(true, false);
    f.fit(f.pose).decompose(center, spin, half);
    const size = Math.max(0.6, Math.min(half.x, half.z) / 1.3); // crystals scale with the car, any model
    for (let k = 0; k < SHARDS; k++) {
      if (k >= count) { shards.setMatrixAt(i * SHARDS + k, parked); continue; }
      const shard = layout[k]!;
      point.copy(shard.at).multiply(half).add(center);
      spin.copy(shard.lean);
      let grow: number;
      if (frozen) {
        const t = THREE.MathUtils.clamp((f.age - k * STAGGER) / GROW, 0, 1);
        grow = reducedMotion ? t : 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // ease-out-back: crystals snap into place
      } else {
        const t = thawed / SHATTER;
        grow = 1 - t;
        if (!reducedMotion) {
          point.addScaledVector(shard.fly, thawed).addScaledVector(UP, -4.9 * thawed * thawed);
          spin.premultiply(turn.setFromAxisAngle(shard.axis, thawed * 14));
        }
      }
      scale.setScalar(Math.max(0.02, grow * shard.size * size));
      local.compose(point, spin, scale);
      shards.setMatrixAt(i * SHARDS + k, matrix.multiplyMatrices(f.pose.matrixWorld, local));
    }
    return true;
  }

  function poseWave(i: number, f: FxFrame, reducedMotion: boolean): boolean {
    const age = time - hitAt[i]!;
    if (!f.pose || age > WAVE) { waves.setMatrixAt(i, parked); waves.setColorAt(i, color.setRGB(0, 0, 0)); return false; }
    const t = age / WAVE, emp = waveEmp[i] === 1;
    f.pose.updateWorldMatrix(true, false);
    f.fit(f.pose).decompose(center, spin, half);
    point.set(center.x, center.y - half.y * 0.7, center.z);
    const spread = reducedMotion ? 1.2 : emp && !f.isPlayer ? 5 : 3;
    scale.setScalar(Math.max(half.x, half.z) * (0.6 + t * spread));
    local.compose(point, spin.identity(), scale);
    waves.setMatrixAt(i, matrix.multiplyMatrices(f.pose.matrixWorld, local));
    const fade = (1 - t) ** 2 * (f.isPlayer ? 0.65 : 1);
    waves.setColorAt(i, color.setRGB(...(emp ? EMP : FROST)).multiplyScalar(fade));
    return true;
  }

  return {
    group,
    begin(dt: number) { time += dt; anyShards = anyWaves = false; },
    /** One rival's frame; `emit` is set only while the race runs, `quality`/`reducedMotion` as effects.js reads them. */
    rival(i: number, f: FxFrame, dt: number, emit: StatusEmit | null, low: boolean, reducedMotion: boolean) {
      const was = held[i], now = f.status;
      if (now && now !== was) { hitAt[i] = time; carry[i] = 0; waveEmp[i] = Number(now === 'emp'); }
      if (was === 'freeze' && now !== 'freeze') thawAt[i] = time;
      if (emit && f.rival) {
        const thin = (low ? 0.5 : 1) * (reducedMotion ? 0.3 : f.isPlayer ? 0.75 : 1);
        if (now && now !== was) emitAround(emit, f.rival, Math.round((now === 'emp' ? 26 : 20) * thin), true, now);
        if (was === 'freeze' && now !== 'freeze') emitAround(emit, f.rival, Math.round(24 * thin), true, 'freeze', true);
        if (now) { // steady emission: sparks crackle hard, the ice smokes gently
          carry[i] = carry[i]! + dt * (now === 'emp' ? 38 : 14) * thin;
          const count = Math.floor(carry[i]!);
          carry[i] = carry[i]! - count;
          if (count) emitAround(emit, f.rival, count, false, now);
        }
      }
      held[i] = now;
      anyShards = poseShards(i, f, low, reducedMotion) || anyShards;
      anyWaves = poseWave(i, f, reducedMotion) || anyWaves;
    },
    end() {
      shards.visible = anyShards; waves.visible = anyWaves;
      shards.instanceMatrix.needsUpdate = waves.instanceMatrix.needsUpdate = true;
      waves.instanceColor!.needsUpdate = true;
    },
    reset() {
      held.fill(null); hitAt.fill(-1e9); thawAt.fill(-1e9); carry.fill(0);
      for (let i = 0; i < shards.count; i++) shards.setMatrixAt(i, parked);
      for (let i = 0; i < waves.count; i++) waves.setMatrixAt(i, parked);
      shards.visible = waves.visible = false;
      shards.instanceMatrix.needsUpdate = waves.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.removeFromParent();
      for (const mesh of [shards, waves]) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }
    },
  };
}
