// Coast boats (`?look=3d`, Medium+): sailboats and a motor boat out on the open water beside the road, from
// coast-boats.glb, one InstancedMesh per boat model. The plan is pure: 480 m slots keyed by absolute distance and the
// endless seed, like the far coast. Each boat sails a closed, elongated loop around its anchor (out along the coast,
// a slow turn, back), so its whole course is known up front and is checked in world space against the road, the close
// shore and every scan standing in the sea: lateral road offsets fold over inside a bend, so a band of offsets cannot
// promise open water. Only the instance matrices move per frame; nothing here compiles or allocates after attach.
import * as THREE from 'three';
import type { ClassicRoad } from './classic-road-routes.ts';
import { COAST_CHUNK_METRES, COAST_FAR_SLOT_METRES, PIECE_DEPTH, SEA, coastChunkPlan, coastFarPlan, coastFarWindow, type CoastPiece, type Placement } from './coast-scenery-glb.ts';
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';

export const COAST_BOAT_PIECES = ['sailboat_a', 'sailboat_b', 'motorboat'] as const;
export type BoatPiece = typeof COAST_BOAT_PIECES[number];
/** Upper bound of boats per slot; sizes the instance pools. */
export const BOATS_PER_SLOT: Readonly<Record<BoatPiece, number>> = { sailboat_a: 3, sailboat_b: 3, motorboat: 1 };

/** Loop half length `a` and half width `b` in metres, top speed in m/s, and `margin`: the hull (and the motor boat's
 *  wake, part of its mesh) beyond the boat's pivot. Offsets are metres from the road centre at the anchor. */
interface Kind { a: [number, number]; b: [number, number]; speed: [number, number]; scale: [number, number]; margin: number; offset(r: () => number): number }
const SAIL: Kind = { a: [30, 55], b: [8, 14], speed: [1.6, 2.6], scale: [1.2, 1.8], margin: 14, offset: r => r() < .6 ? 160 + r() * 110 : 300 + r() * 320 };
const MOTOR: Kind = { a: [60, 90], b: [46, 58], speed: [8, 11], scale: [1.1, 1.5], margin: 34, offset: r => 250 + r() * 280 };
/** Heave (m at scale 1), roll sway, steady heel under sail and pitch (rad). The motor boat's wake is a rigid part of
 *  its mesh, 0.18 m above the waterline and 9.8 m wide: that boat stays level and turns wide (MOTOR.b). */
const MOTION: Readonly<Record<BoatPiece, { heave: number; sway: number; heel: number; pitch: number }>> = {
  sailboat_a: { heave: .14, sway: .05, heel: .12, pitch: .03 }, sailboat_b: { heave: .15, sway: .06, heel: .14, pitch: .035 },
  motorboat: { heave: .05, sway: .012, heel: 0, pitch: 0 },
};
const TRIES = 8, ROAD_STEP = 20, ROAD_REACH = 1400;
const ROAD_CLEAR = 102; // the close cliffs, rocks and palm islets end 97 m from the centre line (coastChunkPlan)
/** Half length along a scan's own x at scale 1 (PIECE_DEPTH is its half depth); the rocks are round. */
const HALF_LENGTH: Partial<Record<CoastPiece, number>> = { cliff_a: 46, cliff_b: 20.5, sea_arch: 36.8 };

/** `x`, `z`: the anchor in route coordinates. `heading`: the loop's long axis, as a road heading. `a`, `b`: its half
 *  length and half width (negative `b`: sailed the other way round). `period`: seconds per lap. */
export interface Boat { piece: BoatPiece; x: number; z: number; heading: number; a: number; b: number; period: number; phase: number; scale: number }
export interface BoatPose { x: number; y: number; z: number; yaw: number; roll: number; pitch: number }

interface Obstacle { x: number; z: number; cos: number; sin: number; halfX: number; halfZ: number }
/** The sea arches near the slot and the far headlands and sea stacks around it, as boxes in route coordinates. */
function obstacles(slot: number, route: ClassicRoad, seed?: number): Obstacle[] {
  const out: Obstacle[] = [], start = slot * COAST_FAR_SLOT_METRES;
  const add = (p: Placement, distance: number): void => {
    const [x, z] = route.point(distance, p.offset), yaw = p.yaw - route.heading(distance);
    out.push({ x, z, cos: Math.cos(yaw), sin: Math.sin(yaw), halfX: (HALF_LENGTH[p.piece] ?? PIECE_DEPTH[p.piece]) * p.scale, halfZ: PIECE_DEPTH[p.piece] * p.scale });
  };
  for (let chunk = Math.floor((start - ROAD_REACH) / COAST_CHUNK_METRES); chunk * COAST_CHUNK_METRES < start + COAST_FAR_SLOT_METRES + ROAD_REACH; chunk++) {
    for (const p of coastChunkPlan(chunk, seed)) if (p.piece === 'sea_arch') add(p, chunk * COAST_CHUNK_METRES + p.along);
  }
  for (let far = slot - 3; far <= slot + 3; far++) for (const p of coastFarPlan(far, seed)) add(p, far * COAST_FAR_SLOT_METRES + p.along);
  return out;
}

export function coastBoatPlan(slot: number, route: ClassicRoad, seed?: number): Boat[] {
  const r = seededRng(seed ?? 0, 'coast-boats-v1:' + slot), start = slot * COAST_FAR_SLOT_METRES, out: Boat[] = [];
  const blocked = obstacles(slot, route, seed), between = ([low, high]: [number, number]): number => low + r() * (high - low);
  const launch = (piece: BoatPiece, kind: Kind): void => {
    attempt: for (let i = 0; i < TRIES; i++) { // every attempt draws the same count of numbers: a rejection never reshuffles the rest
      const along = start + r() * COAST_FAR_SLOT_METRES, offset = (r() < .5 ? -1 : 1) * kind.offset(r);
      const a = between(kind.a), b = between(kind.b) * (r() < .5 ? -1 : 1), speed = between(kind.speed);
      const boat: Boat = { piece, x: 0, z: 0, heading: route.heading(along) + (r() - .5) * .5, a, b, period: 2 * Math.PI * a / speed, phase: r() * Math.PI * 2, scale: between(kind.scale) };
      [boat.x, boat.z] = route.point(along, offset);
      const reach = a + kind.margin;
      for (let d = along - ROAD_REACH; d <= along + ROAD_REACH; d += ROAD_STEP) {
        const [x, z] = route.point(d);
        if (Math.hypot(boat.x - x, boat.z - z) < ROAD_CLEAR + reach) continue attempt;
      }
      for (const o of blocked) {
        const dx = boat.x - o.x, dz = boat.z - o.z;
        if (Math.abs(dx * o.cos - dz * o.sin) < o.halfX + reach && Math.abs(dx * o.sin + dz * o.cos) < o.halfZ + reach) continue attempt;
      }
      for (const other of out) if (Math.hypot(boat.x - other.x, boat.z - other.z) < reach + other.a + SAIL.margin) continue attempt;
      out.push(boat);
      return;
    }
  };
  const motor = r() < .5;
  for (let i = 0; i < 3; i++) launch(r() < .55 ? 'sailboat_a' : 'sailboat_b', SAIL);
  if (motor) launch('motorboat', MOTOR);
  return out;
}

const scratch: BoatPose = { x: 0, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0 };
/** Where the boat is `time` seconds in: on its loop, bow along its course, bobbing on the sea plane. The models point
 *  their bow along +x. Returns `out` (one shared object by default: copy what must outlive the next call). */
export function boatPose(boat: Boat, time: number, out: BoatPose = scratch): BoatPose {
  const angle = boat.phase + time * 2 * Math.PI / boat.period, sin = Math.sin(angle), cos = Math.cos(angle);
  const along = boat.a * sin, across = boat.b * cos, forward = boat.a * cos, sideways = -boat.b * sin; // position, velocity
  const hs = Math.sin(boat.heading), hc = Math.cos(boat.heading), motion = MOTION[boat.piece];
  out.x = boat.x + along * hs + across * hc;
  out.z = boat.z - along * hc + across * hs;
  out.y = SEA + boat.scale * motion.heave * Math.sin(time * 1.1 + boat.phase * 7);
  out.yaw = Math.atan2(forward * hc - sideways * hs, forward * hs + sideways * hc);
  out.roll = motion.heel * cos * cos + motion.sway * Math.sin(time * .9 + boat.phase * 3); // heels to its sails' side (+roll), upright through a turn
  out.pitch = motion.pitch * Math.sin(time * 1.3 + boat.phase * 5);
  return out;
}

/** One pool per boat model, sized for the High window. The model cache handle owns geometry and material. */
export function createCoastBoatLayer(source: THREE.Object3D) {
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert(), slots = coastFarWindow(0, 'high')!.count;
  const parts = Object.fromEntries(COAST_BOAT_PIECES.map(piece => {
    const node = source.getObjectByName(piece) as THREE.Mesh | undefined;
    if (!node?.isMesh) throw new Error(`coast-boats: missing mesh ${piece}`);
    const mesh = new THREE.InstancedMesh(node.geometry, node.material, BOATS_PER_SLOT[piece] * slots);
    mesh.name = piece; mesh.count = 0;
    mesh.frustumCulled = false; // the fleet spans the whole window; the pool's bounds would be stale
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return [piece, { mesh, local: rootInverse.clone().multiply(node.matrixWorld) }];
  })) as Record<BoatPiece, { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }>;
  const meshes = COAST_BOAT_PIECES.map(piece => parts[piece].mesh), fleet: Boat[] = [];
  const transform = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), euler = new THREE.Euler();
  let planned = '', drawn = '', previousRoute: ClassicRoad | undefined;
  return {
    meshes,
    /** Per frame: re-plans only when the slot window, route or seed changed, then rewrites the fleet's matrices
     *  (28 at most) unless nothing moved. `origin` is the scenery group's floating origin, `time` the sea's clock. */
    update(route: ClassicRoad, distance: number, quality: VfxQuality, origin: number, seed: number | undefined, time: number): void {
      const window = coastFarWindow(distance, quality);
      for (const mesh of meshes) mesh.visible = !!window;
      if (!window) return;
      const key = `${window.first}|${window.count}|${seed}`;
      if (key !== planned || route !== previousRoute) {
        planned = key; previousRoute = route; drawn = ''; fleet.length = 0;
        for (let slot = window.first; slot < window.first + window.count; slot++) fleet.push(...coastBoatPlan(slot, route, seed));
      }
      const frame = `${time}|${origin}`;
      if (frame === drawn) return;
      drawn = frame;
      for (const mesh of meshes) mesh.count = 0;
      for (const boat of fleet) {
        const pose = boatPose(boat, time), { mesh, local } = parts[boat.piece];
        p.set(pose.x, pose.y, pose.z + origin);
        q.setFromEuler(euler.set(pose.roll, pose.yaw, pose.pitch, 'YXZ'));
        mesh.setMatrixAt(mesh.count++, transform.compose(p, q, s.setScalar(boat.scale)).multiply(local));
      }
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    },
    /** Frees the instance buffers only; geometry and material belong to the model cache handle. */
    dispose(): void { for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); } },
  };
}
export type CoastBoatLayer = ReturnType<typeof createCoastBoatLayer>;
