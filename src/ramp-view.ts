import * as THREE from 'three';
import type { LaunchRamp } from './launch-ramps.ts';

const RAMP_POOL = 8; // matches Event Lab's ramp limit
type Locate = (distance: number, x: number, y: number) => readonly number[];

// Unit wedge: 1 wide, 1 long, rising from the near edge (+z) to a 1-high lip at -z, the direction of travel.
function wedge(): THREE.BufferGeometry {
  const [l, r, n, f] = [-.5, .5, .5, -.5];
  const v = (x: number, y: number, z: number) => [x, y, z];
  const quads = [
    [v(l, 0, n), v(r, 0, n), v(r, 1, f), v(l, 1, f)], // slope
    [v(l, 0, f), v(l, 1, f), v(r, 1, f), v(r, 0, f)], // lip face
    [v(l, 0, n), v(l, 0, f), v(r, 0, f), v(r, 0, n)], // underside
  ];
  const triangles = [[v(l, 0, n), v(l, 1, f), v(l, 0, f)], [v(r, 0, n), v(r, 0, f), v(r, 1, f)]]; // sides
  const points = [...quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]), ...triangles.flat()].flat();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Created once with the world so its material is compiled before any race starts. */
export function createRampPool(scene: THREE.Scene): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(wedge(), new THREE.MeshBasicMaterial({ color: '#ffd36b' }), RAMP_POOL);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.name = 'launch-ramps'; mesh.count = 0;
  scene.add(mesh);
  return mesh;
}

const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), upright = new THREE.Quaternion();
/** Places ramps near the camera; reuses module objects so the frame loop allocates nothing here. */
export function drawRamps(mesh: THREE.InstancedMesh, ramps: readonly LaunchRamp[] | undefined | null, distance: number, at: Locate): void {
  let visible = 0;
  if (ramps) for (const ramp of ramps) {
    if (ramp.distance < distance - 16 || ramp.distance > distance + 550) continue;
    if (visible >= mesh.instanceMatrix.count) break;
    const [x, y, z] = at(ramp.distance, ramp.x, 0);
    matrix.compose(position.set(x, y, z), upright, scale.set(ramp.halfWidth * 2, ramp.height, ramp.halfLength * 2));
    mesh.setMatrixAt(visible++, matrix);
  }
  mesh.count = visible;
  if (visible) mesh.instanceMatrix.needsUpdate = true;
}
