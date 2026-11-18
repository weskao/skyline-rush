import { Box3, type Object3D, type Vector3 } from 'three';

// Find the visible landmark nearest to the look target when there is no authored landmark.
const apexBox = new Box3();
export function nearestLandmark(landmarks: Iterable<Object3D>, look: Vector3): Object3D | null {
  let best: Object3D | null = null, bestDistance = Infinity;
  for(const hero of landmarks) {
    if(!hero.visible) continue;
    apexBox.setFromObject(hero);
    if(apexBox.isEmpty()) continue;
    const d = apexBox.distanceToPoint(look);
    if(d < bestDistance) { bestDistance = d; best = hero; }
  }
  return best;
}
