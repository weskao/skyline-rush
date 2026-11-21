import * as THREE from 'three';
import { PARKED, UP, type EffectFx, type FxFrame, type FxRival, type Rgb, type StatusEmit } from '../fx-shared.ts';

// Freeze around a hit car: ice crystals jut from the body (flash-freeze), cold vapor rolls off, and on thaw they
// shatter outward. One instanced mesh for all cars; crystals ride each car's pose.
// Low keeps a few crystals on the nearby player; reduced motion shrinks crystals in place and emits fewer particles.

const SHARDS = 10, LOW_PLAYER_SHARDS = 4; // crystals per car
const GROW = 0.22, STAGGER = 0.025, SHATTER = 0.65; // s
const FROST: Rgb = [0.75, 1.5, 2.6], ICE_WHITE: Rgb = [1.6, 1.9, 2.3], VAPOR: Rgb = [0.7, 0.85, 1];

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

export function createFreezeFx(capacity: number): EffectFx {
  const crystal = new THREE.OctahedronGeometry(1, 0).scale(0.17, 0.62, 0.17).translate(0, 0.42, 0); // base sunk in the body
  const shards = new THREE.InstancedMesh(crystal, new THREE.MeshStandardMaterial({
    color: '#d6f2ff', emissive: '#3ea6ff', emissiveIntensity: 0.55, roughness: 0.06, metalness: 0.25,
    flatShading: true, transparent: true, opacity: 0.85,
  }), capacity * SHARDS);
  shards.name = 'Rival freeze shards';
  shards.frustumCulled = false; shards.visible = false; // posed every frame
  for (let i = 0; i < shards.count; i++) shards.setMatrixAt(i, PARKED);

  const thawAt = new Float64Array(capacity).fill(-1e9), carry = new Float64Array(capacity);
  const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3();
  const spin = new THREE.Quaternion(), turn = new THREE.Quaternion(), center = new THREE.Vector3(), half = new THREE.Vector3();
  let time = 0, any = false;

  function emitAround(emit: StatusEmit, rival: FxRival, count: number, burst: boolean, thaw = false) {
    const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.7, forward = rival.pace ?? rival.speed ?? 0;
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), d = d0 + s * 2, x = x0 + c * 1;
      if (burst) { // frost crystals on the hit, ice chips on the thaw
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

  function poseShards(i: number, f: FxFrame): boolean {
    const thawed = time - thawAt[i]!, frozen = f.on;
    const count = f.low ? (f.isPlayer ? LOW_PLAYER_SHARDS : 0) : SHARDS;
    if (!count || !f.pose || (!frozen && thawed > SHATTER)) {
      for (let k = 0; k < SHARDS; k++) shards.setMatrixAt(i * SHARDS + k, PARKED);
      return false;
    }
    f.pose.updateWorldMatrix(true, false);
    f.fit(f.pose).decompose(center, spin, half);
    const size = Math.max(0.6, Math.min(half.x, half.z) / 1.3); // crystals scale with the car, any model
    for (let k = 0; k < SHARDS; k++) {
      if (k >= count) { shards.setMatrixAt(i * SHARDS + k, PARKED); continue; }
      const shard = layout[k]!;
      point.copy(shard.at).multiply(half).add(center);
      spin.copy(shard.lean);
      let grow: number;
      if (frozen) {
        const t = THREE.MathUtils.clamp((f.age - k * STAGGER) / GROW, 0, 1);
        grow = f.reducedMotion ? t : 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // ease-out-back: crystals snap into place
      } else {
        const t = thawed / SHATTER;
        grow = 1 - t;
        if (!f.reducedMotion) {
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

  return {
    objects: [shards],
    wave: FROST,
    begin(dt) { time += dt; any = false; },
    car(i, f) {
      if (f.began) carry[i] = 0;
      if (f.ended) thawAt[i] = time;
      if (f.emit && f.rival) {
        if (f.began) emitAround(f.emit, f.rival, Math.round(20 * f.thin), true);
        if (f.ended) emitAround(f.emit, f.rival, Math.round(24 * f.thin), true, true);
        if (f.on) { // the ice smokes gently
          carry[i] = carry[i]! + f.dt * 14 * f.thin;
          const count = Math.floor(carry[i]!);
          carry[i] = carry[i]! - count;
          if (count) emitAround(f.emit, f.rival, count, false);
        }
      }
      any = poseShards(i, f) || any;
    },
    end() { shards.visible = any; shards.instanceMatrix.needsUpdate = true; },
    reset() {
      thawAt.fill(-1e9); carry.fill(0);
      for (let i = 0; i < shards.count; i++) shards.setMatrixAt(i, PARKED);
      shards.visible = false;
      shards.instanceMatrix.needsUpdate = true;
    },
    dispose() { shards.geometry.dispose(); (shards.material as THREE.Material).dispose(); shards.dispose(); },
  };
}
