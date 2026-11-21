import { Mesh, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import type { ScreenBounds } from './car-bounds.ts';

interface FramingOptions {
  eye: Vector3;
  look: Vector3;
  axis: Vector3;
  right: Vector3;
  landmark: Object3D | null;
  probe: PerspectiveCamera;
  corner: Vector3;
  carBounds: (eye: Vector3, look: Vector3, measure: boolean) => ScreenBounds;
  spin: (point: Vector3, angle: number) => Vector3;
  turns: readonly number[];
  backs: readonly number[];
}

const LOOK_DOWN = [0, .25, .5, .75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];
const PORTRAIT_PITCH = [0, -.75, -1.5, -2.5, -4, ...LOOK_DOWN.slice(1)];
const PORTRAIT_AIM = [0, 1, -1, 2, -2, 3, -3, 4, -4];

// A world-aligned box has corners outside tapered silhouettes, especially Alpine's peaks.
function landmarkVertices(landmark: Object3D | null): Vector3[] {
  const vertices: Vector3[] = [];
  if (!landmark) return vertices;
  landmark.updateWorldMatrix(true, true);
  landmark.traverseVisible(object => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld));
    }
  });
  return vertices;
}

function landmarkMiss(vertices: Vector3[], camera: PerspectiveCamera, corner: Vector3, leftEdge: number): number {
  let miss = -Infinity;
  for (const vertex of vertices) {
    corner.copy(vertex).project(camera);
    if (corner.z >= 1 || corner.z < -1) return Infinity;
    miss = Math.max(miss, leftEdge - corner.x, corner.x - .96, corner.y - .97, -.97 - corner.y);
  }
  return miss;
}

/** Keep the whole car framed first. Fit its landmark with the smallest viable camera adjustment. */
export function chooseShowcaseFraming(options: FramingOptions): { back: number; down: number; side: number } {
  const { eye, look, axis, right, landmark, probe, corner, carBounds, spin, turns, backs } = options;
  const leftEdge = probe.aspect > 1 ? .05 : -.96;
  const vertices = landmarkVertices(landmark);
  const narrowLandmark = vertices.length > 0 && probe.aspect < .8;
  const sides = narrowLandmark ? PORTRAIT_AIM : [0];
  const pitches = narrowLandmark ? PORTRAIT_PITCH : LOOK_DOWN;
  const candidateLook = look.clone();
  let best = { back: 0, down: 0, side: 0 };
  let bestMiss = Infinity;
  let bestFitsCar = false;
  for (const back of backs) {
    const candidateEye = eye.clone().addScaledVector(axis, back);
    for (const down of pitches) {
      for (const side of sides) {
        candidateLook.copy(look).addScaledVector(right, side).y -= down;
        const carMiss = Math.max(...turns.map(turn => {
          const b = carBounds(spin(candidateEye, turn), spin(candidateLook, turn), false);
          return Math.max(-.92 - b.minX, b.maxX - .92, -.88 - b.minY, b.maxY - .88);
        }));
        const fitsCar = carMiss < 0;
        if (!fitsCar && bestFitsCar) continue;
        const miss = fitsCar ? landmarkMiss(vertices, probe, corner, leftEdge) : carMiss;
        if (fitsCar && miss < 0) return { back, down, side };
        if ((fitsCar && !bestFitsCar) || miss < bestMiss) {
          best = { back, down, side };
          bestFitsCar = fitsCar;
          bestMiss = miss;
        }
      }
    }
  }
  return best;
}
