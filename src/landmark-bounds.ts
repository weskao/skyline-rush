import { Box3, type Object3D, type Vector3 } from 'three';

// Bounds of the visible landmark nearest the look target; null when none is shown.
const apexBox = new Box3();
export function landmarkBounds(landmarks: Iterable<Object3D>, look: Vector3): Box3 | null {
  let best: Object3D | null = null, bestDistance = Infinity;
  for(const hero of landmarks) {
    if(!hero.visible) continue;
    apexBox.setFromObject(hero);
    if(apexBox.isEmpty()) continue;
    const d = apexBox.distanceToPoint(look);
    if(d < bestDistance) { bestDistance = d; best = hero; }
  }
  if(!best) return null;
  return apexBox.setFromObject(best);
}
