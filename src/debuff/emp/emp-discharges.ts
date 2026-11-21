import * as THREE from 'three';
import { PARKED, UP, type FxFrame } from '../fx-shared.ts';
import { bolt, random } from './emp-arcs.ts';

// Local discharges: short bright arcs that jump off a hit car's body (sills, roof edge, bumpers) or crawl along it
// for a split second.
// One instanced mesh for every car; each car has PER slots, each anchored on the car's measured silhouette
// (`f.profile`) so it sits on any model. Medium and up: RIVAL per rival, PER on the player (the shell's arcs hide
// under its body from the chase camera, so these carry them); Low: none on rivals, LOW_PLAYER on the player; reduced
// motion: none (nothing jumps).

export const PER = 8, RIVAL = 5, LOW_PLAYER = 2; // slots per car; rivals use RIVAL of them
const LIFE = 0.14, START = 0.1; // s a discharge lives; none before the impact pulse ends
const REST = [0.35, 0.9]; // s between discharges of one slot: under three per second per slot

/** A jagged bolt lofted into two crossed ribbons along +y (0 to 1), white along its core and black at its edges:
 *  additive, so the edges fade into the scene. */
function dischargeGeometry(): THREE.BufferGeometry {
  const line = bolt([0, 0], [0, 1], random(5), 4, 0.32), positions: number[] = [], colors: number[] = [], index: number[] = [];
  for (const [ax, az] of [[1, 0], [0, 1]] as const) {
    const base = positions.length / 3;
    line.forEach(([x, y], k) => {
      const w = 0.06 * (1 - 0.7 * k / (line.length - 1)); // tapers to the tip
      for (const side of [-1, 0, 1]) {
        positions.push(x * ax + side * w * ax, y, x * az + side * w * az);
        colors.push(...(side ? [0.35, 0.22, 0.02] : [1, 0.94, 0.78]));
      }
      if (k) for (const s of [0, 1]) {
        const a = base + (k - 1) * 3 + s, b = base + k * 3 + s;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  return geometry;
}

export function createEmpDischarges(capacity: number) {
  const mesh = new THREE.InstancedMesh(dischargeGeometry(), new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), capacity * PER);
  mesh.name = 'EMP discharges';
  mesh.frustumCulled = false; mesh.visible = false; // posed every frame
  const black = new THREE.Color(0, 0, 0), color = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) { mesh.setMatrixAt(i, PARKED); mesh.setColorAt(i, black); } // colour attribute exists before warm-up
  const born = new Float64Array(mesh.count).fill(-1e9), next = new Float64Array(mesh.count);
  const local = new Float32Array(mesh.count * 8); // per slot: anchor xyz, outward xyz, length, twist
  const matrix = new THREE.Matrix4(), part = new THREE.Matrix4(), point = new THREE.Vector3(), out = new THREE.Vector3();
  const spin = new THREE.Quaternion(), twist = new THREE.Quaternion(), scale = new THREE.Vector3(), size = new THREE.Vector3();
  const rand = random(97);
  let time = 0, any = false;

  /** Picks a spot on the car's silhouette (a side, the roof edge or a bumper) and the way out of the body there. */
  function anchor(slot: number, f: FxFrame): boolean {
    const { bounds, sections } = f.profile(f.pose!), j = Math.floor(rand() * 24), s = sections[j]!;
    if (!Number.isFinite(s.top)) return false; // nothing drawn in that slice
    bounds.getSize(size);
    const z = bounds.min.z + (j + 0.5) / 24 * size.z, pick = rand(), side = rand() < 0.5 ? -1 : 1;
    if (pick < 0.3) { // a crawler: an arc running along the sill or roof edge, just proud of the paint
      const roof = rand() < 0.4;
      point.set((side < 0 ? s.left : s.right) + side * 0.03 * size.x, roof ? s.top : bounds.min.y + 0.35 * (s.top - bounds.min.y), z);
      out.set(side * 0.2, roof ? 0.25 : 0.1, j < 12 ? 1 : -1).normalize();
      local.set([point.x, point.y, point.z, out.x, out.y, out.z, (0.3 + 0.25 * rand()) * size.z, rand() * Math.PI], slot * 8);
      return true;
    }
    if (pick < 0.6) point.set(side < 0 ? s.left : s.right, bounds.min.y + (0.15 + 0.6 * rand()) * (s.top - bounds.min.y), z), out.set(side, 0.35, 0);
    else if (pick < 0.87) point.set(s.left + (s.right - s.left) * rand(), s.top, z), out.set(side * 0.4, 1, 0);
    else point.set((s.left + s.right) / 2, bounds.min.y + 0.4 * (s.top - bounds.min.y), j < 12 ? bounds.min.z : bounds.max.z), out.set(side * 0.3, 0.3, j < 12 ? -1 : 1);
    out.normalize();
    local.set([point.x, point.y, point.z, out.x, out.y, out.z, (0.25 + 0.4 * rand()) * Math.max(0.6, size.x / 2), rand() * Math.PI], slot * 8);
    return true;
  }

  function pose(slot: number, f: FxFrame) {
    const age = time - born[slot]!, o = slot * 8;
    if (age < 0 || age > LIFE) { mesh.setMatrixAt(slot, PARKED); mesh.setColorAt(slot, black); return false; }
    spin.setFromUnitVectors(UP, out.set(local[o + 3]!, local[o + 4]!, local[o + 5]!)).multiply(twist.setFromAxisAngle(UP, local[o + 7]!));
    const grow = Math.min(1, age / 0.04); // it leaps out, then fades
    part.compose(point.set(local[o]!, local[o + 1]!, local[o + 2]!), spin, scale.setScalar(local[o + 6]! * (0.4 + 0.6 * grow)));
    mesh.setMatrixAt(slot, matrix.multiplyMatrices(f.pose!.matrixWorld, part));
    mesh.setColorAt(slot, color.setRGB(3, 2.6, 1.8).multiplyScalar(1 - age / LIFE));
    return true;
  }

  return {
    mesh,
    begin(dt: number) { time += dt; any = false; },
    car(i: number, f: FxFrame) {
      const count = !f.pose || f.reducedMotion ? 0 : f.low ? (f.isPlayer ? LOW_PLAYER : 0) : f.isPlayer ? PER : RIVAL;
      if (count && f.pose) f.pose.updateWorldMatrix(true, false);
      for (let k = 0; k < PER; k++) {
        const slot = i * PER + k;
        if (f.began) next[slot] = time + START + k * 0.03; // the impact replays: every slot fires right after it
        if (k < count && f.on && time >= next[slot]!) {
          if (anchor(slot, f)) born[slot] = time;
          next[slot] = time + LIFE + (REST[0]! + rand() * (REST[1]! - REST[0]!)) * (f.isPlayer ? 0.6 : 1); // the player's own car crackles most
        }
        if (k >= count) born[slot] = -1e9;
        any = pose(slot, f) || any;
      }
    },
    end() { mesh.visible = any; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true; },
    reset() {
      born.fill(-1e9); next.fill(0);
      for (let i = 0; i < mesh.count; i++) { mesh.setMatrixAt(i, PARKED); mesh.setColorAt(i, black); }
      mesh.visible = false; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true;
    },
    dispose() { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); },
  };
}
