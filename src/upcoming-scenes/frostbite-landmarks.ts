import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CourseGraph } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';

type Height = (x: number, z: number) => number;
const dummy = new THREE.Object3D();

/** World point at arc length `s`, `lateral` metres to the right of the route frame. */
export function routeOffset(graph: CourseGraph, edgeId: string, s: number, lateral: number, lift = 0): THREE.Vector3 {
  const f = sampleRoute(graph, edgeId, s);
  return new THREE.Vector3(f.point[0] + f.right[0] * lateral, f.point[1] + lift, f.point[2] + f.right[2] * lateral);
}

/** Hexagonal prism with a pointed tip: the faceted crystal silhouette from View 01. */
function crystalGeometry(): THREE.BufferGeometry {
  // Open hex prism + hex tip (base is sunk into the snow); analytic unit normals, no axis-degenerate faces.
  const prism = new THREE.CylinderGeometry(.92, 1, .72, 6, 1, true).translate(0, .36, 0);
  const tip = new THREE.ConeGeometry(.92, .28, 6, 1, true).translate(0, .86, 0);
  const geometry = mergeGeometries([prism, tip])!;
  prism.dispose(); tip.dispose();
  return geometry;
}

export function crystalMaterial(emissiveIntensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#45d4ff', emissive: '#0896cf', emissiveIntensity, roughness: .1, metalness: .05,
    transparent: true, opacity: .8, flatShading: true, envMapIntensity: 1.6,
  });
}

/** Crystal field along both shots: one instanced draw, seeded placement, sunk into real terrain. */
export function crystalField(graph: CourseGraph, height: Height, seed: () => number,
  sites: readonly { edgeId: string; from: number; to: number; side: number }[]): THREE.InstancedMesh {
  const perSite = 14, mesh = new THREE.InstancedMesh(crystalGeometry(), crystalMaterial(.55), sites.length * perSite);
  let n = 0;
  for (const site of sites) for (let i = 0; i < perSite; i++) {
    const s = site.from + (site.to - site.from) * seed();
    const p = routeOffset(graph, site.edgeId, s, site.side * (17 + seed() * 30));
    const h = 2 + seed() ** 2 * 13, w = h * (.16 + seed() * .1);
    dummy.position.set(p.x, height(p.x, p.z) - .6, p.z);
    dummy.rotation.set((seed() - .5) * .5, seed() * Math.PI, (seed() - .5) * .5);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    mesh.setMatrixAt(n++, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'cyan-crystals';
  return mesh;
}

/** The tall "cyan sentinels": separate meshes so they keep their own emissive cores and shadows. */
export function crystalSentinels(graph: CourseGraph, height: Height, edgeId: string, s: number): THREE.Group {
  const group = new THREE.Group(), geometry = crystalGeometry(), material = crystalMaterial(.9);
  group.name = 'crystal-sentinels';
  for (const [ds, lateral, h, lean] of [[0, -24, 26, .08], [14, -31, 19, -.12], [-12, -29, 15, .16], [28, -27, 12, -.05]]) {
    const p = routeOffset(graph, edgeId, s + ds, lateral);
    const spire = new THREE.Mesh(geometry, material);
    spire.position.set(p.x, height(p.x, p.z) - 1, p.z);
    spire.scale.set(h * .2, h, h * .2);
    spire.rotation.set(lean, ds * .1, -lean);
    group.add(spire);
  }
  return group;
}

/** Natural rock-and-ice arch beside the road; its legs stand on terrain, never on the driving line. */
export function iceArch(graph: CourseGraph, height: Height, edgeId: string, s: number, lateral: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ice-arch';
  const a = routeOffset(graph, edgeId, s, lateral), b = routeOffset(graph, edgeId, s + 75, lateral + 6);
  const span = a.distanceTo(b), center = a.clone().add(b).multiplyScalar(.5);
  const base = Math.min(height(a.x, a.z), height(b.x, b.z)) - 2;
  const arc = new THREE.TorusGeometry(span / 2, 8.5, 9, 30, Math.PI);
  const p = arc.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), bump = Math.sin(x * .21) * Math.cos(y * .17 + z) * 2.4;
    p.setXYZ(i, x + bump * .4, y + bump, z + bump * .6);
  }
  arc.computeVertexNormals();
  const rock = new THREE.Mesh(arc, new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: .92, flatShading: true }));
  // Pale ice crust: a shell a little fatter than the rock tube, lifted so the dark rock shows only on the underside.
  const crust = new THREE.Mesh(new THREE.TorusGeometry(span / 2 + 1.2, 9.6, 9, 30, Math.PI * .96),
    new THREE.MeshStandardMaterial({ color: '#c4ecff', emissive: '#2a86b8', emissiveIntensity: .3, roughness: .25, transparent: true, opacity: .9 }));
  crust.name = 'ice-crust';
  crust.rotation.z = Math.PI * .02;
  crust.position.y = 1.6;
  const snowCap = new THREE.Mesh(new THREE.TorusGeometry(span / 2 + 2, 4.2, 6, 28, Math.PI * .7),
    new THREE.MeshStandardMaterial({ color: '#f2f8ff', roughness: .85 }));
  snowCap.rotation.z = Math.PI * .15;
  snowCap.position.y = 6.5;
  group.add(rock, crust, snowCap);
  group.position.set(center.x, base, center.z);
  group.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
  group.scale.y = 1.15;
  return group;
}

/** Vertical strip following an edge at a lateral offset (rails, deck fascia). */
export function ribbonWall(graph: CourseGraph, edgeId: string, lateral: number, top: number, bottom: number, step = 6): THREE.BufferGeometry {
  const length = routeLength(graph, edgeId), count = Math.ceil(length / step), positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= count; i++) {
    const p = routeOffset(graph, edgeId, length * i / count, lateral);
    positions.push(p.x, p.y + top, p.z, p.x, p.y + bottom, p.z);
    if (i < count) { const k = i * 2; index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Bridge rails, fascia, warm safety posts, tapering ice piers and hanging icicles. */
export function bridgeStructure(graph: CourseGraph, height: Height, edgeId: string): { rails: THREE.Group; supports: THREE.Group } {
  const width = graph.edges.find(e => e.id === edgeId)!.width, length = routeLength(graph, edgeId);
  const rails = new THREE.Group();
  rails.name = 'bridge-rails';
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#cfe9ff', roughness: .3, metalness: .2, transparent: true, opacity: .75, side: THREE.DoubleSide });
  const fascia = new THREE.MeshStandardMaterial({ color: '#30496f', roughness: .7, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    rails.add(new THREE.Mesh(ribbonWall(graph, edgeId, side * width / 2, 1.15, .05), railMaterial));
    rails.add(new THREE.Mesh(ribbonWall(graph, edgeId, side * (width / 2 + .4), .1, -2.6), fascia));
  }
  const posts = Math.floor(length / 9) * 2;
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(.35, 1.5, .35), new THREE.MeshStandardMaterial({ color: '#1b2233', roughness: .6 }), posts);
  const markers = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .28, .4),
    new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff6a10', emissiveIntensity: 1.4 }), posts);
  for (let i = 0; i < posts; i++) {
    const p = routeOffset(graph, edgeId, 4 + Math.floor(i / 2) * 9, (i % 2 ? 1 : -1) * (width / 2 + .1));
    dummy.position.set(p.x, p.y + .75, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    post.setMatrixAt(i, dummy.matrix);
    dummy.position.y = p.y + 1.62; dummy.updateMatrix();
    markers.setMatrixAt(i, dummy.matrix);
  }
  rails.add(post, markers);

  const supports = new THREE.Group();
  supports.name = 'bridge-supports';
  const pierMaterial = new THREE.MeshStandardMaterial({ color: '#7fb9e0', emissive: '#0f3d66', emissiveIntensity: .3, roughness: .35, flatShading: true });
  const pier = new THREE.CylinderGeometry(3.2, 7.5, 1, 7);
  for (const s of [length * .3, length * .5, length * .7]) {
    const p = routeOffset(graph, edgeId, s, 0), ground = height(p.x, p.z), h = p.y - 2.6 - ground;
    if (h < 6) continue;
    const column = new THREE.Mesh(pier, pierMaterial);
    column.scale.y = h;
    column.position.set(p.x, ground + h / 2, p.z);
    supports.add(column);
  }
  const icicleCount = Math.floor(length / 7);
  const icicles = new THREE.InstancedMesh(new THREE.ConeGeometry(.5, 1, 5), pierMaterial, icicleCount);
  for (let i = 0; i < icicleCount; i++) {
    const p = routeOffset(graph, edgeId, 3 + i * 7, ((i * 7919) % 13 / 13 - .5) * width);
    const len = 2 + (i * 37 % 11) * .7;
    dummy.position.set(p.x, p.y - 2.6 - len / 2, p.z); dummy.rotation.set(Math.PI, 0, 0); dummy.scale.set(1, len, 1); dummy.updateMatrix();
    icicles.setMatrixAt(i, dummy.matrix);
  }
  supports.add(icicles);
  return { rails, supports };
}

/** Low cyan delineators along road edges: night readability without lane paint. */
/** `halfWidth` overrides the graph width where a race draws its own (narrower) drivable road. */
export function edgeReflectors(graph: CourseGraph, slices: readonly { id: string; from: number; to: number }[], halfWidth?: number, spacing = 16): THREE.InstancedMesh {
  const spots: THREE.Vector3[] = [];
  for (const slice of slices) {
    const half = halfWidth ?? graph.edges.find(e => e.id === slice.id)!.width / 2;
    for (let s = slice.from; s < slice.to; s += spacing) for (const side of [-1, 1]) spots.push(routeOffset(graph, slice.id, s, side * (half + 1.2), .45));
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, .9, .25),
    new THREE.MeshStandardMaterial({ color: '#d8f6ff', emissive: '#3fd8ff', emissiveIntensity: 1.1 }), spots.length);
  spots.forEach((p, i) => { dummy.position.copy(p); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  mesh.name = 'edge-reflectors';
  return mesh;
}

/** Optional flight line over the rift and the chevrons that mark its safe merge landing. */
export function flightGuide(graph: CourseGraph, flightId: string, landingEdgeId: string): { arc: THREE.Mesh; landing: THREE.InstancedMesh } {
  const length = routeLength(graph, flightId), points: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) points.push(routeOffset(graph, flightId, length * i / 40, 0, 1.2));
  const cyan = new THREE.MeshBasicMaterial({ color: '#50fcff', transparent: true, opacity: .4, depthWrite: false });
  const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, .14, 5, false), cyan);
  arc.name = 'flight-arc';
  const landing = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, .06, 4.2), cyan, 6);
  for (let i = 0; i < 6; i++) {
    const p = routeOffset(graph, landingEdgeId, 8 + Math.floor(i / 3) * 12, (i % 3 - 1) * 4.5, .07);
    const f = sampleRoute(graph, landingEdgeId, 8 + Math.floor(i / 3) * 12);
    dummy.position.copy(p); dummy.rotation.set(0, Math.atan2(-f.forward[0], -f.forward[2]), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    landing.setMatrixAt(i, dummy.matrix);
  }
  landing.name = 'landing-merge';
  return { arc, landing };
}

/** Low mist sheets drifting in a chasm: soft-edged (vertex alpha), unlit by depth, sides of a road, never over it. */
export function chasmMist(spots: readonly { point: readonly number[]; right: readonly number[]; lift: number }[], lateral = 34, size = 46): THREE.Group {
  const group = new THREE.Group();
  group.name = 'chasm-mist';
  const sheet = new THREE.PlaneGeometry(size, size * .6, 8, 5).rotateX(-Math.PI / 2), p = sheet.getAttribute('position'), rgba: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const edge = Math.max(Math.abs(p.getX(i)) / (size / 2), Math.abs(p.getZ(i)) / (size * .3));
    rgba.push(.82, .9, 1, Math.max(0, 1 - edge) ** 1.5 * .55);
  }
  sheet.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  spots.forEach(({ point, right, lift }, i) => {
    const side = i % 2 ? 1 : -1, mesh = new THREE.Mesh(sheet, material);
    mesh.position.set(point[0] + right[0] * lateral * side, point[1] + lift, point[2] + right[2] * lateral * side);
    mesh.rotation.y = Math.atan2(right[0], right[2]);
    mesh.userData.base = mesh.position.clone();
    mesh.renderOrder = 1;
    group.add(mesh);
  });
  return group;
}
/** Time-driven drift along the chasm (t = 0 holds still for Reduced Motion); no allocation. */
export function driftMist(group: THREE.Group, t: number): void {
  group.children.forEach((sheet, i) => {
    const base = sheet.userData.base as THREE.Vector3;
    sheet.position.set(base.x + Math.sin(t * .05 + i * 1.9) * 5, base.y + Math.sin(t * .11 + i) * .6, base.z + Math.cos(t * .04 + i * 1.3) * 5);
  });
}
