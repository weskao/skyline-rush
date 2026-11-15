// Road traffic as one instanced pool (marker-pool.js). A traffic car never moves a part (no steering, brake light,
// wing or lift fans), so each style's makeCar() model is baked into one geometry per material and every car of that
// style is an instance: at most 3 styles x 7 materials = 21 draw calls whatever the car count, where each car's own
// group cost 15. The wet-road mirror pass (wet-reflection.ts) draws the two unlit lamp materials per style.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TRAFFIC_CAR_STYLES, makeCar } from './car-model.js';
import { createMarkerPool } from './marker-pool.js';

export const TRAFFIC_COLORS = ['#6e879c', '#ded6c9', '#a15b60', '#8c99a4', '#48545e'];
const SCALE = 0.96, PAINT = 'paint';
type Shapes = Record<string, THREE.BufferGeometry>;
type Materials = Record<string, THREE.Material>;

/** One geometry per material of a style, keyed `<prefix><material>`; the hidden lift fans are left out. */
function bakeStyle(style: unknown, prefix: string, shapes: Shapes, materials: Materials): void {
  const car = makeCar(style, '#ffffff'); // white paint: each instance brings its own colour
  const paint = car.userData.body.material, parts = new Map<string, THREE.BufferGeometry[]>();
  car.updateMatrixWorld(true);
  car.traverseVisible(object => {
    const { isMesh, geometry, material: m } = object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    if (!isMesh) return;
    // makeCar clones a material per merged part: parts that look the same share one instanced mesh.
    const key = prefix + (m === paint ? PAINT : [m.type, m.color.toArray(), m.metalness, m.roughness].join());
    const baked = geometry.clone().applyMatrix4(object.matrixWorld);
    baked.deleteAttribute('uv'); // unused by these untextured materials; merging needs matching attributes
    materials[key] ??= m;
    parts.set(key, [...(parts.get(key) ?? []), baked]);
  });
  for (const [key, list] of parts) shapes[key] = mergeGeometries(list);
}

/**
 * `count` traffic cars under `parent`. `cars` are poses only and never join the scene: world.js places them like any
 * other car (updateCar: road frame, visibility window, render interpolation) and `sync()` uploads the visible ones.
 * Culling stays on: marker-pool.js rebuilds each mesh's bound from this frame's cars, and an idle mesh is hidden.
 */
export function createTrafficFleet(parent: THREE.Object3D, count: number) {
  const shapes: Shapes = {}, materials: Materials = {}, styles = TRAFFIC_CAR_STYLES.length;
  TRAFFIC_CAR_STYLES.forEach((style: unknown, s: number) => bakeStyle(style, `${s}:`, shapes, materials));
  const pool = createMarkerPool('Traffic', shapes, materials, Math.ceil(count / styles));
  const keys = TRAFFIC_CAR_STYLES.map((_: unknown, s: number) => Object.keys(shapes).filter(key => key.startsWith(`${s}:`)));
  const paints = TRAFFIC_CAR_STYLES.map((_: unknown, s: number) => pool.group.getObjectByName(`${s}:${PAINT}`) as THREE.InstancedMesh);
  const colors = TRAFFIC_COLORS.map(color => new THREE.Color(color));
  // The parked instance carries a colour so the instanced-colour program is warmed before racing (pickup-aura.js).
  for (const paint of paints) paint.setColorAt(0, colors[0]!);
  const cars = Array.from({ length: count }, () => { const car = new THREE.Object3D(); car.scale.setScalar(SCALE); return car; });
  const drawn: number[] = pool.group.userData.drawn; // [mesh, slot, ...] of this frame
  parent.add(pool.group);
  return {
    group: pool.group, cars,
    /** Draw the cars world.js left visible this frame; style and paint follow the car's index, as the old pool did. */
    sync(): void {
      pool.begin();
      for (let i = 0; i < count; i++) {
        const car = cars[i]!, style = i % styles, paint = paints[style]!;
        if (!car.visible) continue;
        car.updateMatrix();
        for (const key of keys[style]!) pool.add(key, car.matrix);
        paint.setColorAt(drawn[drawn.length - 1], colors[i % colors.length]!); // the slot the pool just gave this car, the same in every mesh of its style
      }
      pool.end();
      for (const paint of paints) paint.instanceColor!.needsUpdate = paint.visible;
    },
  };
}
