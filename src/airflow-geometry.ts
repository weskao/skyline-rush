import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SECTIONS = 24;
const CLEARANCE = .18;
type Section = { left: number; right: number; top: number };
type AirflowProfile = { bounds: THREE.Box3; sections: Section[] };
type Point = [x: number, y: number, z: number];

/** Sample the visible neutral-pose shell in car coordinates, once per model or LOD change. */
export function measureAirflowProfile(model: THREE.Object3D, vehicle = model): AirflowProfile {
  const bounds = new THREE.Box3();
  const surfaces: { points: THREE.Vector3[]; index: THREE.BufferAttribute | null }[] = [];
  // GLBs arrive detached with their own root transform. The procedural car may already be banked in world space.
  model.updateWorldMatrix(true, true);
  const toCar = model === vehicle ? vehicle.matrixWorld.clone().invert() : new THREE.Matrix4();
  function collect(object: THREE.Object3D): void {
    if (object !== model && (!object.visible || object.userData.followsBody)) return;
    const mesh = object as THREE.Mesh;
    const vertices = mesh.isMesh && mesh.geometry.getAttribute('position');
    if (vertices) {
      const transform = new THREE.Matrix4().multiplyMatrices(toCar, mesh.matrixWorld);
      const points = Array.from({ length: vertices.count }, (_, i) => {
        const point = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(transform);
        bounds.expandByPoint(point);
        return point;
      });
      surfaces.push({ points, index: mesh.geometry.index });
    }
    for (const child of object.children) collect(child);
  }
  collect(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.lengthSq()) || Math.min(size.x, size.z) < .01) {
    bounds.set(new THREE.Vector3(-1.22, 0, -2.5), new THREE.Vector3(1.22, 1.5, 2.5));
    surfaces.length = 0;
  }
  const { min, max } = bounds, step = (max.z - min.z) / SECTIONS;
  const sections = Array.from({ length: SECTIONS }, () => ({ left: Infinity, right: -Infinity, top: -Infinity }));
  const sectionAt = (z: number): number => THREE.MathUtils.clamp(Math.floor((z - min.z) / step), 0, SECTIONS - 1);
  function add(section: number, x: number, y: number): void {
    const span = sections[section]!;
    span.left = Math.min(span.left, x);
    span.right = Math.max(span.right, x);
    span.top = Math.max(span.top, y);
  }
  function edge(a: THREE.Vector3, b: THREE.Vector3): void {
    if (a.z > b.z) [a, b] = [b, a];
    const first = sectionAt(a.z), last = sectionAt(b.z);
    for (let i = first + 1; i <= last; i++) {
      const t = (min.z + i * step - a.z) / (b.z - a.z);
      const x = THREE.MathUtils.lerp(a.x, b.x, t), y = THREE.MathUtils.lerp(a.y, b.y, t);
      add(i - 1, x, y);
      add(i, x, y);
    }
  }
  for (const { points, index } of surfaces) {
    for (const point of points) add(sectionAt(point.z), point.x, point.y);
    const at = (i: number): THREE.Vector3 => points[index ? index.getX(i) : i]!;
    // Include where triangle edges cross a section boundary. Sparse meshes can span
    // the whole hood or roof with no vertex inside an intermediate section.
    for (let i = 0; i + 2 < (index?.count ?? points.length); i += 3) {
      const a = at(i), b = at(i + 1), c = at(i + 2);
      edge(a, b);
      edge(b, c);
      edge(c, a);
    }
  }
  return { bounds, sections };
}

/** A single draw for roof, flank, underbody and wake paths. Only positions depend on the model. */
export function streamGeometry({ bounds: { min, max }, sections }: AirflowProfile): THREE.BufferGeometry {
  const depth = max.z - min.z, width = max.x - min.x, center = (min.x + max.x) * .5;
  const z = (t: number): number => min.z + t * depth;
  const sample = (t: number): Section => {
    const i = Math.min(SECTIONS - 1, Math.floor(t * SECTIONS));
    const spans = sections.slice(Math.max(0, i - 1), i + 2);
    const left = Math.min(...spans.map(s => s.left)), right = Math.max(...spans.map(s => s.right));
    const top = Math.max(...spans.map(s => s.top));
    return Number.isFinite(top) ? { left, right, top } : { left: min.x, right: max.x, top: max.y };
  };
  const stations = Array.from({ length: SECTIONS + 1 }, (_, i) => ({ t: i / SECTIONS, ...sample(i / SECTIONS) }));
  const paths: { points: Point[]; type: number; side: number }[] = [];
  const add = (points: Point[], type: number, side = 0): void => { paths.push({ points, type, side }); };

  for (const lane of [-.68, -.34, 0, .34, .68]) {
    const roof = stations.map(({ t, left, right, top }): Point => [
      THREE.MathUtils.lerp(left, right, (lane + 1) * .5), top + CLEARANCE, z(t),
    ]);
    const [noseX, noseY] = roof[0]!, [tailX, tailY] = roof.at(-1)!;
    add([[noseX, noseY * .65, z(-.36)], ...roof, [tailX, tailY * .94, z(1.18)],
      [center + (tailX - center) * 1.25, tailY * .78, z(1.7)]], 0);
  }
  for (const side of [-1, 1]) {
    const outside = ({ left, right }: Pick<Section, 'left' | 'right'>): number => (side < 0 ? left : right) + side * CLEARANCE;
    const flank = (t: number, height: number): number => Math.max(.25, sample(t).top * height);
    for (const height of [.34, .6, .83]) {
      const points = stations.map(({ t, left, right, top }): Point => [outside({ left, right }), Math.max(.25, top * height), z(t)]);
      add([[center + side * width * .33, flank(0, height), z(-.32)], ...points,
        [outside(sample(1)) + side * width * .23, flank(1, height), z(1.74)]], 0, side);
    }
    for (const t of [.23, .79]) {
      const x = outside(sample(t));
      add([[x, flank(t, .38), z(t - .13)], [x + side * .06, flank(t, .75), z(t)],
        [x + side * .11, flank(t, .45), z(t + .14)], [x + side * width * .16, flank(t, .38), z(t + .5)]], 2, side);
    }
    for (const t of [.36, .5, .65]) {
      add([[center + side * width * .94, .12, z(t - .2)], [center + side * width * .53, .14, z(t - .1)],
        [center + side * width * .29, .17, z(t)], [center + side * width * .12, .2, z(t + .12)],
        [center + side * width * .12, .18, z(1.02)], [center + side * width * .18, .25, z(1.3)]], 1, side);
    }
    const tail = sample(.96), x = outside(tail), y = tail.top + CLEARANCE;
    add([[x, y, z(.9)], [x, y, z(1.03)], [x + side * width * .08, y * .94, z(1.2)],
      [x + side * width * .13, y * 1.1, z(1.4)], [x, y * .94, z(1.8)]], 2, side);
  }
  const pieces = paths.map(({ points, type, side }, index) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 64, type === 1 ? .014 : .011, 4, false);
    geo.setAttribute('flowType', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(type), 1));
    // Animated skin offsets lift roof lines, push flank lines outward and keep suction lines flat.
    const outward = new Float32Array(geo.attributes.position.count * 2);
    for (let i = 0; i < outward.length; i += 2) {
      outward[i] = side;
      outward[i + 1] = side === 0 ? 1 : 0;
    }
    geo.setAttribute('flowOutward', new THREE.BufferAttribute(outward, 2));
    geo.setAttribute('lane', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(index / paths.length), 1));
    return geo;
  });
  const geometry = mergeGeometries(pieces);
  pieces.forEach(geo => geo.dispose());
  return geometry;
}
