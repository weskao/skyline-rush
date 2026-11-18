import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHEEL_Z = [-1.35, 1.42];
const ARCH_RADIUS = 0.48;

// Loft a bevelled shoulder, a pulled-in sill and open wheel reliefs over the
// original nose, cabin and tail stations. The crown leaves space for the canopy.
export function rivalShell(sections, bevel = 0.13) {
  const front = sections[0][0], rear = sections.at(-1)[0];
  const stations = new Set(sections.map(([z]) => z));
  for (const axle of WHEEL_Z) for (let i = -5; i <= 5; i++) stations.add(axle + i * ARCH_RADIUS / 5);
  const vertices = [], faces = [];
  let segment = 0;
  for (const z of [...stations].filter(z => z >= front && z <= rear).sort((a, b) => a - b)) {
    while (z > sections[segment + 1][0]) segment++;
    const [a, b] = [sections[segment], sections[segment + 1]];
    const t = (z - a[0]) / (b[0] - a[0]);
    const [, width, floor, deck] = a.map((value, i) => THREE.MathUtils.lerp(value, b[i], t));
    const axleDistance = Math.min(...WHEEL_Z.map(axle => Math.abs(axle - z)));
    const arch = Math.sqrt(Math.max(0, ARCH_RADIUS ** 2 - axleDistance ** 2));
    const sill = Math.min(deck - 0.075, Math.max(floor, 0.46 + arch));
    const shoulder = deck - bevel;
    const base = vertices.length / 3;
    vertices.push(
      -width * 0.79, floor, z, width * 0.79, floor, z,
      width * 0.92, sill, z, width, Math.max(sill, shoulder), z,
      width * 0.84, deck, z, width * 0.55, deck + 0.018, z,
      -width * 0.55, deck + 0.018, z, -width * 0.84, deck, z,
      -width, Math.max(sill, shoulder), z, -width * 0.92, sill, z,
    );
    if (base > 0) for (let i = 0; i < 10; i++) {
      const c = base + i, d = base + (i + 1) % 10;
      faces.push(c - 10, d - 10, c, d - 10, d, c);
    }
  }
  const last = vertices.length / 3 - 10;
  for (let i = 1; i < 9; i++) faces.push(0, i + 1, i, last, last + i, last + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

// From the chase view each car reads through a different dark diffuser outline
// and a narrow colour break. Coordinates are in metres, +Z towards the tail.
const AERO = [
  { rear: 2.56, span: 0.79, fins: [-.57, -.28, .28, .57], shoulder: [0.80, 0.95, 1.80, 0.92, 0.06, 0.73, .07] }, // NOVA long-tail
  { rear: 2.15, span: 0.85, fins: [-.61, .61], shoulder: [0.79, 0.99, 1.60, 0.69, 0.05, 0.43, -.08] }, // ORBIT rounded GT
  { rear: 2.17, span: 0.94, fins: [-.75, -.50, 0, .50, .75], shoulder: [0.98, 0.95, 1.37, 0.20, 0.05, 0.53, -.20] }, // APEX track special
  { rear: 2.34, span: 0.93, fins: [-.65, -.47, .47, .65], shoulder: [0.97, 1.01, 1.45, 0.23, 0.08, 0.44, -.23] }, // VEGA widebody
  { rear: 1.98, span: 0.87, fins: [-.69, .69], shoulder: [0.81, 0.92, 1.69, 0.35, 0.04, 0.52, .20] }, // PULSE compact EV
  { rear: 2.13, span: 0.70, fins: [-.47, 0, .47], shoulder: [0.72, 0.94, 1.35, 0.28, 0.05, 0.69, .19] }, // COMET prototype
  { rear: 2.31, span: 0.88, fins: [-.77, -.28, .28, .77], shoulder: [0.85, 0.95, 1.70, 0.49, 0.06, 0.43, -.27] }, // RIFT wedge
];

const rivalTire = new THREE.CylinderGeometry(0.44, 0.44, 0.27, 24);
const spokeCounts = [5, 4, 6, 5, 4, 7, 6];

function fitRivalWheels(car, chassis) {
  const count = spokeCounts[chassis];
  const parts = [new THREE.CylinderGeometry(0.076, 0.076, 0.285, 12)];
  for (const side of [-1, 1]) {
    parts.push(new THREE.RingGeometry(0.263, 0.299, 24)
      .rotateX(-side * Math.PI / 2).translate(0, 0.143 * side, 0));
    for (let i = 0; i < count; i++) {
      parts.push(new THREE.BoxGeometry(0.042, 0.021, 0.215)
        .rotateY(0.15 * side).translate(0, 0.132 * side, 0.164).rotateY(i * Math.PI * 2 / count));
    }
  }
  // One indexed mesh per rim preserves the original number of wheel draws.
  const rim = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const [tireMesh, rimMesh] = car.userData.wheels[0].children;
  const low = [tireMesh.geometry, rimMesh.geometry];
  car.userData.rivalWheels = { low, detail: [rivalTire, rim] };
}

export function setRivalDetails(car, detailed) {
  const { rivalWheels, rivalDetails, wheels } = car.userData;
  const [tire, rim] = detailed ? rivalWheels.detail : rivalWheels.low;
  for (const wheel of wheels) {
    wheel.children[0].geometry = tire;
    wheel.children[1].geometry = rim;
  }
  rivalDetails.visible = detailed;
}

// One geometry per finish. Keep the dark undertray as part of the silhouette
// at Low, and hide the accent draw along with the small diffuser strakes.
export function addRivalAero(car, chassis) {
  const { rear, span, fins, shoulder } = AERO[chassis];
  fitRivalWheels(car, chassis);
  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(span * 2, 0.11, 0.36),
    new THREE.MeshStandardMaterial({ color: '#18212b', roughness: 0.58, metalness: 0.34 }),
  );
  diffuser.position.set(0, 0.46, rear - 0.08);
  diffuser.name = 'Rival carbon diffuser';
  car.add(diffuser);

  const strakes = fins.map(x => new THREE.BoxGeometry(0.045, 0.17, 0.36)
    .rotateY(x * 0.13).translate(x, 0.42, rear - 0.08));
  const [x, y, z, w, h, depth, angle] = shoulder;
  const pieces = [-1, 1].flatMap(side => [
    new THREE.BoxGeometry(w, h, depth).rotateX(angle).rotateY(side * 0.13).translate(side * x, y, z),
    new THREE.BoxGeometry(span * 0.68, 0.028, 0.06).rotateZ(side * 0.11).translate(side * span * 0.53, 0.52, rear + 0.09),
  ]);
  const accent = new THREE.Mesh(
    mergeGeometries(pieces),
    new THREE.MeshStandardMaterial({ color: '#aebbc1', roughness: 0.4, metalness: 0.3 }),
  );
  for (const geometry of pieces) geometry.dispose();
  const vanes = new THREE.Mesh(mergeGeometries(strakes), diffuser.material);
  for (const geometry of strakes) geometry.dispose();
  const details = new THREE.Group();
  details.name = 'Rival aero accents';
  details.add(vanes, accent);
  car.add(details);
  Object.assign(car.userData, { rivalAccent: accent.material, rivalDetails: details });
}
