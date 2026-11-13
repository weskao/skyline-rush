// Every player car shows at the procedural Roadster's size on Home, race, Garage and Coming Soon, whatever size its
// GLB was authored at, so a new car or a re-export needs no per-car constant (tests/car-display-size.test.js).
import { Group, type Box3, type Object3D } from 'three';
import { CAR_STYLES, makeCar } from './car-model.js';
import { measureAirflowProfile } from './airflow-geometry.ts';

let reference: Box3 | null = null; // the procedural Roadster never changes shape: measured once per page

/** Scale a freshly cloned GLB instance (never the cached original) to the Roadster's width, roof and length.
 *  x matches the width; y and z share one factor, the balance of roof and length, so wheel spin stays round. */
export function fitToRoadsterSize(instance: Object3D): void {
  reference ??= measureAirflowProfile(makeCar(CAR_STYLES.roadster)).bounds;
  const shown = measureAirflowProfile(instance, new Group()).bounds; // includes the instance's own transform
  const ratio = (want: number, got: number): number => (got > 1e-3 && Number.isFinite(want / got) ? want / got : 1);
  const x = ratio(reference.max.x - reference.min.x, shown.max.x - shown.min.x);
  const yz = Math.sqrt(ratio(reference.max.y, shown.max.y) * ratio(reference.max.z - reference.min.z, shown.max.z - shown.min.z));
  instance.scale.set(instance.scale.x * x, instance.scale.y * yz, instance.scale.z * yz);
}
