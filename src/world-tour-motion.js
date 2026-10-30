import * as THREE from 'three';
import { RACE_TRACKS } from './game.js';
import { BEACON, SPRAY, skylinePulse } from './world-tour-details.js';

// One moving background piece per World Tour road (11C): far from the road, posed by
// time alone, never batched or collided with. Models come from the shared scenery kit.
export const MOTION_KINDS = Object.freeze({
  taipei: 'drone', tokyo: 'train', alpine: 'train', coastal: 'ship', cosmic: 'drone',
});
const wrap = (value, span) => ((value % span) + span) % span;

// Trains run past the player on a parallel line, ships drift offshore, drones loop beside
// one kerb (anything over the road would have to be solid). Only `distance` and the
// model-local bob/yaw change with time, so placement can step along the road frame.
// `out` lets the frame loop reuse one object instead of allocating a pose per frame.
export function motionPose(trackId, distance, time, out = {}, endless = false) {
  const kind = MOTION_KINDS[trackId], length = RACE_TRACKS[trackId].length;
  const train = kind === 'train', ship = kind === 'ship';
  const along = train ? 300 - wrap(time * 32, 700) : ship ? 320 + Math.sin(time * .05) * 90 : 90 + Math.sin(time * .35) * 45;
  out.kind = kind; out.distance = Math.max(0,endless?distance+along:Math.min(length,distance+along));
  out.side = ship || (!train && trackId === 'cosmic') ? 1 : -1;
  out.offset = train ? 80 : ship ? 170 : 40;
  out.altitude = train || ship ? 0 : 8 + Math.sin(time * 1.3);
  out.yaw = train ? Math.PI / 2 : ship ? 0 : time * .35;
  return out;
}

const STEP = 12;
export function createWorldTourMotion(kit, parent, sceneryLayer) {
  // Shares the scenery layer's offset without counting as one of its streamed chunks.
  const layer = new THREE.Group(); layer.name = 'World Tour moving background'; parent.add(layer);
  const pieces = new Map(), next = new THREE.Vector3(), pose = {}, glow = {};
  // The detail kit's shared beacon/spray glows: one colour write each per frame animates every copy.
  const glows = [['beacon', BEACON], ['spray', SPRAY]].map(([name, hex]) => {
    const material = kit.material(hex, true); material.userData.pulse = name;
    return { name, material, base: new THREE.Color(hex) };
  });
  // Built once per kind and reused; userData.dynamic keeps the static batcher away.
  function piece(kind) {
    if (!pieces.has(kind)) {
      const root = new THREE.Group(); root.name = 'motion:' + kind;
      const model = kit.build('', kind); model.traverse(o => { o.userData.dynamic = true; });
      root.add(model); layer.add(root);
      pieces.set(kind, { kind, root, model, id: '', step: -1, base: new THREE.Vector3(), dir: new THREE.Vector3() });
    }
    return pieces.get(kind);
  }
  return {
    update(id, distance, quality, time, reducedMotion, endless = false) {
      if (reducedMotion) glow.beacon = glow.spray = 1; else skylinePulse(time, glow);
      for (const g of glows) g.material.color.copy(g.base).multiplyScalar(glow[g.name]);
      const kind = quality === 'low' ? null : MOTION_KINDS[id];
      for (const p of pieces.values()) p.root.visible = p.kind === kind;
      if (!kind) return;
      layer.position.copy(sceneryLayer.position);
      motionPose(id, distance, reducedMotion ? 0 : time, pose, endless); const p = piece(kind);
      // Sample the road frame only when the piece crosses a 12 m step (no trig per frame).
      const step = Math.floor(pose.distance / STEP) * STEP;
      if (p.id !== id || p.step !== step) {
        kit.place(p.root, id, step + STEP, pose.side * pose.offset, 0); next.copy(p.root.position);
        kit.place(p.root, id, step, pose.side * pose.offset, 0);
        p.base.copy(p.root.position); p.dir.subVectors(next, p.base).divideScalar(STEP); p.id = id; p.step = step;
      }
      p.root.position.copy(p.base).addScaledVector(p.dir, pose.distance - step);
      p.model.position.y = pose.altitude; p.model.rotation.y = pose.yaw;
    },
  };
}
