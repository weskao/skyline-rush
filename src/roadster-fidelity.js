import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRearLight } from './rear-light.ts';
import { addReferenceFront, addReferenceRear } from './roadster-reference-fascias.js';
import { addRoadsterRearNozzles } from './roadster-rear-nozzles.js';

// Visual-only Roadster 2 interpretation: negative Z is the nose, positive Z the tail.
// Keep dimensions inside the shared arcade collision envelope; no physics data changes.
// [z, half-width, bottom, deck, shoulder, crest x / half-width (default .88)]
const BODY_STATIONS = [
  // Blunt nose cap, then fender towers rising well above a flat, lower hood (photos 05/15):
  // a near-vertical inner wall up to an inboard crest, then a broad top sloping outward.
  [-2.50, .90, .34, .60, .86, .66],
  [-2.33, 1.00, .34, .62, .95, .68],
  [-1.91, 1.10, .35, .66, 1.01, .74],
  [-1.41, 1.19, .81, .72, 1.04, .84],
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
  const rings = BODY_STATIONS.map(([z, w, bottom, deck, shoulder, crest = .88]) => {
    const lowerFloor = Math.min(bottom, .39);
    const sideRise = Math.min(.12, (shoulder - bottom) * .26);
    const cornerDrop = Math.min(.16, (shoulder - bottom) * .26);
    return [
    -.83*w, lowerFloor, z, -w, bottom+sideRise, z,
    -w, shoulder-cornerDrop, z, -crest*w, shoulder, z,
    -.57*w, deck, z, .57*w, deck, z,
    crest*w, shoulder, z, w, shoulder-cornerDrop, z,
    w, bottom+sideRise, z, .83*w, lowerFloor, z,
    ];
  });
  return loft(rings);
}

// [z, base half-width, base y, roof half-width, roof y]: one low glasshouse (photo 14) whose
// windscreen starts at the hood cowl between the fender towers, then a long fastback.
const CANOPY_STATIONS = [
  [-1.32, .68, .745, .62, .76],
  [-.55, 1.00, 1.035, .62, 1.29],
  [.15, 1.00, 1.04, .66, 1.335],
  [.75, .99, 1.045, .66, 1.31],
  [1.30, .98, 1.075, .68, 1.22],
  [1.84, .83, 1.07, .72, 1.10],
  [2.02, .70, .995, .62, 1.015],
];

export function roadsterCanopy() {
  const rings = CANOPY_STATIONS.map(([z, base, baseY, roof, roofY]) => [
    -base, baseY, z, -roof, roofY, z, roof, roofY, z, base, baseY, z,
  ]);
  return loft(rings, false);
}

const graphite = new THREE.MeshStandardMaterial({ color: '#0a1116', metalness: .35, roughness: .3 });
const satinCarbon = new THREE.MeshStandardMaterial({ color: '#222b31', metalness: .2, roughness: .37 });
const bronze = new THREE.MeshStandardMaterial({ color: '#8d8578', metalness: .92, roughness: .24 });
// Photos 02/03/15: five swept dark blades, wide at the hub and pointed at the rim.
const wheelSpokeShape = (() => {
  const verts = [], indices = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5 + .15;
    const point = (radius, offset) => {
      const angle = a + offset;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    };
    const corners = [point(.07,-.42),point(.19,-.20),point(.318,.06),point(.07,.30)];
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

const paleDisc = new THREE.MeshStandardMaterial({ color: '#d6dadb', metalness: .7, roughness: .28 });
const darkBlade = new THREE.MeshStandardMaterial({ color: '#15191c', metalness: .55, roughness: .3, side: THREE.DoubleSide });

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
// The blade hinges on its leading edge, .20 ahead of the wing's centre.
const HINGE = .20;
// Photos 04/13: deployed, the blade stands as a 52-degree airbrake, trailing edge up and back.
const TILT = THREE.MathUtils.degToRad(52);
// Swan necks carry the hinge line; stowed, they sink below the deck out of sight.
const swanNecks = mirroredTubes([[.42,0,-.18],[.42,-.07,-.12],[.42,-.20,-.15],[.42,-.46,-.20]], .022, 12);
// Unit-length rams (y 0..1); poseRoadsterWing stretches them from the bay to the blade underside.
const actuators = mergeGeometries([-1,1].map(side => new THREE.CylinderGeometry(.013,.013,1,6,1).translate(side*.30,.5,0)));
// Ram ends: fixed bay mount (wing space at rest) and the blade underside (blade space).
const RAM_BASE_Y = -.08, RAM_BASE_Z = .05, RAM_TOP_Y = -.012, RAM_TOP_Z = .26;
const wingBay = new THREE.PlaneGeometry(1.2,.36).rotateX(-Math.PI/2);

function activeWing(paint) {
  const wing = new THREE.Group();
  wing.name = 'Roadster active wing';
  const part = (parent, geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const blade = new THREE.Group();
  blade.name = 'Roadster wing blade';
  blade.position.z = -HINGE;
  wing.add(blade);
  part(blade, wingMain, paint, 'Roadster aerofoil').position.z = HINGE;
  for (const side of [-1,1]) {
    const tip = part(blade, wingTip, paint, 'Roadster wing tip');
    tip.position.set(side*.80, 0, HINGE);
    tip.scale.x = side;
    tip.userData.fold = -side*1.05;
  }
  part(wing, swanNecks, graphite, 'Roadster wing swan-neck struts');
  const rams = part(wing, actuators, satinCarbon, 'Roadster wing actuators');
  // Stowed, the wing is the deck lid overhanging the light slot; poseWing raises and tilts it.
  wing.position.set(0,1.08,2.25);
  wing.userData = { restY: 1.08, lift: .34, blade, rams };
  poseRoadsterWing(wing, 0);
  return wing;
}

// `travel` 0..1 of the lift. The blade pitches from the first moment, so the lid swings up
// diagonally while the carriage rises; tips fold into endplates after 35%. Closing reverses.
// Per frame: scalar math only, no allocation.
export function poseRoadsterWing(wing, travel) {
  const { blade, rams, lift } = wing.userData;
  const angle = TILT * THREE.MathUtils.smoothstep(travel, 0, 1);
  blade.rotation.x = -angle;
  const fold = THREE.MathUtils.smoothstep(travel, .35, 1);
  for (const part of blade.children) if (part.userData.fold) part.rotation.z = part.userData.fold * fold;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const dy = RAM_TOP_Y*cos + RAM_TOP_Z*sin - RAM_BASE_Y + travel*lift;
  const dz = RAM_TOP_Y*sin + RAM_TOP_Z*cos - HINGE - RAM_BASE_Z;
  rams.position.set(0, RAM_BASE_Y - travel*lift, RAM_BASE_Z);
  rams.rotation.x = Math.atan2(dz, dy);
  rams.scale.y = Math.hypot(dy, dz);
}

export function addRoadsterWheelDetail(wheel, side) {
  const inset = new THREE.Mesh(wheelInset, paleDisc);
  inset.rotation.z = Math.PI / 2;
  inset.position.x = side * .151;
  inset.name = 'Roadster aero inset';
  wheel.add(inset);
  const spokes = new THREE.Mesh(wheelSpokeShape, darkBlade);
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
    // Dark A-pillar and roof edge, traced along the canopy's own roof line.
    line(group, CANOPY_STATIONS.map(([z,,, roof, roofY]) => [side*roof, roofY+.004, z]),
      .017, graphite, 'Roadster glass surround');
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
