import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRearLight } from './rear-light.ts';
import { addReferenceFront, addReferenceRear } from './roadster-reference-fascias.js';
import { addRoadsterRearNozzles } from './roadster-rear-nozzles.js';

// Visual-only Roadster 2 interpretation: negative Z is the nose, positive Z the tail.
// Keep dimensions inside the shared arcade collision envelope; no physics data changes.
const BODY_STATIONS = [
  // Blunt nose cap, then fender towers rising well above a flat, lower hood (photos 05/15).
  [-2.50, .90, .34, .61, .80],
  [-2.33, 1.00, .34, .64, .90],
  [-1.91, 1.10, .35, .69, .97],
  [-1.41, 1.19, .81, .74, 1.03],
  [-.72, 1.16, .36, .76, 1.04],
  [.44, 1.15, .36, .77, 1.04],
  [1.27, 1.19, .83, .78, 1.08],
  // Flat rear deck just under the shoulders, so the stowed wing reads as its lid.
  [1.79, 1.18, .39, .96, 1.08],
  [2.21, 1.1, .42, .99, 1.05],
  [2.37, 1.04, .43, .98, 1.02],
];

function loft(rings, close = true) {
  // Separate longitudinal strips preserve the deliberate folded shoulder/roof normals.
  // Stations still blend along Z instead of showing a hard edge at every cross-section.
  const vertices = [], faces = [];
  const count = rings[0].length / 3;
  for (let j = 0; j < (close ? count : count - 1); j++) {
    const next = (j + 1) % count, offset = vertices.length / 3;
    for (const ring of rings) {
      vertices.push(...ring.slice(j * 3, j * 3 + 3), ...ring.slice(next * 3, next * 3 + 3));
    }
    for (let i = 0; i < rings.length - 1; i++) {
      const a = offset + i * 2, b = a + 1, c = a + 2, d = a + 3;
      faces.push(a, c, b, b, c, d);
    }
  }
  if (close) {
    // Real closed front/rear surfaces, not a hollow tube visible through the headlamps.
    const front = vertices.length / 3;
    vertices.push(...rings[0]);
    const rear = vertices.length / 3;
    vertices.push(...rings[rings.length - 1]);
    for (let j = 1; j < count - 1; j++) {
      faces.push(front, front + j, front + j + 1);
      faces.push(rear, rear + j + 1, rear + j);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(faces);
  geo.computeVertexNormals();
  return geo;
}

export function roadsterBody() {
  const rings = BODY_STATIONS.map(([z, w, bottom, deck, shoulder]) => {
    const lowerFloor = Math.min(bottom, .39);
    const sideRise = Math.min(.12, (shoulder - bottom) * .26);
    const cornerDrop = Math.min(.16, (shoulder - bottom) * .26);
    return [
    -.83*w, lowerFloor, z, -w, bottom+sideRise, z,
    -w, shoulder-cornerDrop, z, -.88*w, shoulder, z,
    -.57*w, deck, z, .57*w, deck, z,
    .88*w, shoulder, z, w, shoulder-cornerDrop, z,
    w, bottom+sideRise, z, .83*w, lowerFloor, z,
    ];
  });
  return loft(rings);
}

export function roadsterCanopy() {
  // One continuous tapering glasshouse: raked windscreen, short roof, long fastback.
  const stations = [
    [-1.16, .84, 1.04, .62, 1.055],
    [-.72, .96, 1.07, .72, 1.35],
    [.08, .98, 1.075, .72, 1.48],
    [.65, .96, 1.075, .70, 1.46],
    [1.24, .91, 1.075, .75, 1.30],
    [1.84, .83, 1.07, .77, 1.11],
    [2.02, .70, .995, .62, 1.015],
  ];
  const rings = stations.map(([z, base, baseY, roof, roofY]) => [
    -base, baseY, z, -roof, roofY, z, roof, roofY, z, base, baseY, z,
  ]);
  return loft(rings, false);
}

const graphite = new THREE.MeshStandardMaterial({ color: '#0a1116', metalness: .35, roughness: .3 });
const satinCarbon = new THREE.MeshStandardMaterial({ color: '#222b31', metalness: .2, roughness: .37 });
const bronze = new THREE.MeshStandardMaterial({ color: '#8d8578', metalness: .92, roughness: .24 });
const wheelSpokeShape = (() => {
  const verts = [], indices = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5 + .15;
    const point = (radius, offset) => {
      const angle = a + offset;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    };
    const corners = [point(.065,-.39),point(.31,-.15),point(.31,.21),point(.065,.45)];
    const index = verts.length / 3;
    corners.forEach(([y,z]) => verts.push(0,y,z));
    indices.push(index,index+1,index+2,index,index+2,index+3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
})();
const wheelInset = new THREE.CylinderGeometry(.327, .327, .017, 40);
const wheelHub = new THREE.CylinderGeometry(.075, .075, .027, 24);
const pathGeometry = new Map();
const rockerGeometry = new Map();

function line(parent, points, radius, mat, name) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const key = points.flat().join(',') + ':' + radius;
  if (!pathGeometry.has(key)) pathGeometry.set(key, new THREE.TubeGeometry(path, 14, radius, 5, false));
  const mesh = new THREE.Mesh(pathGeometry.get(key), mat);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function rocker(side) {
  if (rockerGeometry.has(side)) {
    const saved = new THREE.Mesh(rockerGeometry.get(side), satinCarbon);
    saved.name = 'Roadster sculpted rocker';
    return saved;
  }
  const w = side * 1.15, thickness = -.085 * side;
  const outline = [
    [w,.29,-.86], [w,.275,.91], [w,.58,.88], [w,.56,-.83],
  ];
  const vertices = outline.flat().concat(outline.map(([x,y,z]) => [x+thickness,y,z]).flat());
  const faces = [0,1,2,0,2,3,4,6,5,4,7,6];
  for (let i=0;i<4;i++) {
    const j=(i+1)%4;
    faces.push(i,j,i+4,j,j+4,i+4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(faces);geo.computeVertexNormals();
  rockerGeometry.set(side, geo);
  const mesh = new THREE.Mesh(geo,satinCarbon);
  mesh.name='Roadster sculpted rocker';
  return mesh;
}

// Plan outline (x, -z) extruded into a thin painted panel.
function wingPanel(outline) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x,y]) => new THREE.Vector2(x,y))), {
    depth: .04, bevelEnabled: true, bevelThickness: .01, bevelSize: .01,
    bevelSegments: 1, steps: 1, curveSegments: 1,
  });
  geo.rotateX(-Math.PI/2);
  return geo;
}
const wingMain = wingPanel([[-.80,-.22],[.80,-.22],[.80,.20],[-.80,.20]]);
// Each tip hinges at the main plane's edge and folds down into a swept endplate (photos 04/06/13).
const wingTip = wingPanel([[0,-.22],[.30,-.20],[.30,.06],[0,.20]]);
const mirroredTubes = (points, radius, segments) => mergeGeometries([-1,1].map(side => new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(points.map(([x,y,z]) => new THREE.Vector3(side*x,y,z))), segments, radius, 5, false)));
// Swan necks hang from the wing's underside; stowed, they sink below the deck out of sight.
const swanNecks = mirroredTubes([[.42,0,.02],[.42,-.07,.09],[.42,-.20,.05],[.42,-.46,-.03]], .022, 12);
const actuators = mirroredTubes([[.48,-.01,-.12],[.48,-.46,-.14]], .009, 1);
const wingBay = new THREE.PlaneGeometry(1.2,.36).rotateX(-Math.PI/2);

function activeWing(paint) {
  const wing = new THREE.Group();
  wing.name = 'Roadster active wing';
  const part = (geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    wing.add(mesh);
    return mesh;
  };
  part(wingMain, paint, 'Roadster aerofoil');
  for (const side of [-1,1]) {
    const tip = part(wingTip, paint, 'Roadster wing tip');
    tip.position.x = side*.80;
    tip.scale.x = side;
    tip.userData.fold = -side*1.05;
  }
  part(swanNecks, graphite, 'Roadster wing swan-neck struts');
  part(actuators, satinCarbon, 'Roadster wing actuators');
  // Stowed, the wing is the deck lid overhanging the light slot; poseWing raises and opens it.
  wing.position.set(0,1.08,2.25);
  wing.userData = { restY: 1.08, lift: .34 };
  return wing;
}

export function addRoadsterWheelDetail(wheel, side) {
  const inset = new THREE.Mesh(wheelInset, graphite);
  inset.rotation.z = Math.PI / 2;
  inset.position.x = side * .151;
  inset.name = 'Roadster aero inset';
  wheel.add(inset);
  const spokes = new THREE.Mesh(wheelSpokeShape, new THREE.MeshStandardMaterial({
    color: '#ced4d5', metalness: .86, roughness: .22, side: THREE.DoubleSide,
  }));
  spokes.position.x = side * .172;
  spokes.name = 'Roadster aero spoke assembly';
  wheel.add(spokes);
  const hub = new THREE.Mesh(wheelHub,bronze);
  hub.rotation.z = Math.PI/2;
  hub.position.x=side*.18;
  wheel.add(hub);
}

export function addRoadsterTrim(group, m) {
  addReferenceFront(group,m,line);
  for (const side of [-1,1]) {
    group.add(rocker(side));
    line(group,[
      [side*.89,1.065,-1.12],[side*.82,1.35,-.72],
      [side*.74,1.49,.08],[side*.76,1.46,.65],
      [side*.77,1.11,1.84],[side*.64,1.02,2.02],
    ],.017,graphite,'Roadster glass surround');
  }

  const rearLight = createRearLight();
  group.add(rearLight.group);
  group.userData.rearLight = rearLight;

  addReferenceRear(group,m,line);
  addRoadsterRearNozzles(group);
  // Black bay revealed under the raised wing.
  const bay = new THREE.Mesh(wingBay, graphite);
  bay.name = 'Roadster wing bay';
  bay.position.set(0,1.012,2.24);
  group.add(bay);

  const wing = activeWing(m.paint);
  group.add(wing);
  return wing;
}
