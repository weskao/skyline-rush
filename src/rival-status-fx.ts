import * as THREE from 'three';
import type { RivalStatus } from './rival-status-tint.ts';
import { PARKED, type FxFrame } from './debuff/fx-shared.ts';
import { createFreezeFx } from './debuff/freeze/freeze-fx.ts';
import { createEmpFx } from './debuff/emp/emp-fx.ts';

// The game-feel layer over the status shell (rival-status-tint.ts): a shockwave ring on every hit, shared by both
// statuses, then each status's own module (src/debuff/<effect>/<effect>-fx.ts) for what it adds around the car.
// One instanced ring mesh for all cars; reduced motion keeps the ring small.

const WAVE = 0.45; // s a shockwave ring lives
const KINDS = ['freeze', 'emp'] as const;

export function createRivalStatusFx(capacity: number) {
  const effects = { freeze: createFreezeFx(capacity), emp: createEmpFx(capacity) };
  const waves = new THREE.InstancedMesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), capacity);
  waves.name = 'Rival status shockwave';
  waves.frustumCulled = false; waves.visible = false; // posed every frame
  const color = new THREE.Color();
  for (let i = 0; i < waves.count; i++) { waves.setMatrixAt(i, PARKED); waves.setColorAt(i, color.setRGB(0, 0, 0)); }
  const group = new THREE.Group();
  group.name = 'Rival status fx';
  group.add(waves, ...effects.freeze.objects, ...effects.emp.objects);

  const held: RivalStatus[] = new Array(capacity).fill(null), waveOf: RivalStatus[] = new Array(capacity).fill(null);
  const hitAt = new Float64Array(capacity).fill(-1e9), worn = new Uint8Array(capacity); // worn: bit 1 Freeze, bit 2 EMP
  const matrix = new THREE.Matrix4(), local = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3();
  const spin = new THREE.Quaternion(), center = new THREE.Vector3(), half = new THREE.Vector3();
  let time = 0, anyWaves = false;

  function poseWave(i: number, f: FxFrame): boolean {
    const age = time - hitAt[i]!, kind = waveOf[i];
    if (!f.pose || !kind || age > WAVE) { waves.setMatrixAt(i, PARKED); waves.setColorAt(i, color.setRGB(0, 0, 0)); return false; }
    const t = age / WAVE;
    f.pose.updateWorldMatrix(true, false);
    f.fit(f.pose).decompose(center, spin, half);
    point.set(center.x, center.y - half.y * 0.7, center.z);
    const spread = f.reducedMotion ? 1.2 : kind === 'emp' && !f.isPlayer ? 5 : 3;
    scale.setScalar(Math.max(half.x, half.z) * (0.6 + t * spread));
    local.compose(point, spin.identity(), scale);
    waves.setMatrixAt(i, matrix.multiplyMatrices(f.pose.matrixWorld, local));
    const fade = (1 - t) ** 2 * (f.isPlayer ? 0.65 : 1);
    waves.setColorAt(i, color.setRGB(...effects[kind].wave).multiplyScalar(fade));
    return true;
  }

  return {
    group,
    begin(dt: number) { time += dt; anyWaves = false; for (const kind of KINDS) effects[kind].begin(dt); },
    /** One car's frame, filled by rival-status-tint.ts; `f.emit` is set only while the race runs. */
    rival(i: number, f: FxFrame) {
      const was = held[i], now = f.status, wore = worn[i]!;
      if (now && now !== was) { hitAt[i] = time; waveOf[i] = now; }
      f.thin = (f.low ? 0.5 : 1) * (f.reducedMotion ? 0.3 : f.isPlayer ? 0.75 : 1);
      for (const kind of KINDS) {
        const bit = kind === 'emp' ? 2 : 1;
        f.on = f.hits[kind]; f.began = f.on && !(wore & bit); f.ended = !!(wore & bit) && !f.on;
        effects[kind].car(i, f);
      }
      held[i] = now; worn[i] = (f.hits.freeze ? 1 : 0) | (f.hits.emp ? 2 : 0);
      anyWaves = poseWave(i, f) || anyWaves;
    },
    end() {
      for (const kind of KINDS) effects[kind].end();
      waves.visible = anyWaves;
      waves.instanceMatrix.needsUpdate = true;
      waves.instanceColor!.needsUpdate = true;
    },
    reset() {
      held.fill(null); hitAt.fill(-1e9); worn.fill(0);
      for (const kind of KINDS) effects[kind].reset();
      for (let i = 0; i < waves.count; i++) waves.setMatrixAt(i, PARKED);
      waves.visible = false;
      waves.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.removeFromParent();
      for (const kind of KINDS) effects[kind].dispose();
      waves.geometry.dispose(); (waves.material as THREE.Material).dispose(); waves.dispose();
    },
  };
}
