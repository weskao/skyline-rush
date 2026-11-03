import * as THREE from 'three';
import { createRearLight } from './rear-light.ts';
import { REAR_PORTS } from './aero-vfx.js';

// Visual-only Roadster 2 interpretation: negative Z is the nose, positive Z the tail.
// Keep dimensions inside the shared arcade collision envelope; no physics data changes.
const BODY_STATIONS = [
  [-2.48, .92, .40, .55, .61],
  [-2.31, 1.03, .37, .59, .73],
  [-1.91, 1.13, .35, .66, .93],
  [-1.41, 1.19, .81, .74, 1.03],
  [-.72, 1.16, .36, .76, 1.04],
  [.44, 1.15, .36, .77, 1.04],
  [1.27, 1.19, .83, .78, 1.08],
  [1.79, 1.18, .39, .78, 1.08],
  [2.21, 1.1, .42, .73, .99],
  [2.37, 1.04, .43, .67, .92],
];

function loft(rings, close = true) {
  const vertices = rings.flat();
  const count = rings[0].length / 3;
  const faces = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < (close ? count : count - 1); j++) {
      const a = i * count + j, b = i * count + (j + 1) % count;
      const c = (i + 1) * count + j, d = (i + 1) * count + (j + 1) % count;
      faces.push(a, c, b, b, c, d);
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
    const sideRise = Math.min(.12, (shoulder - bottom) * .26);
    const cornerDrop = Math.min(.16, (shoulder - bottom) * .26);
    return [
    -.83*w, bottom, z, -w, bottom+sideRise, z,
    -w, shoulder-cornerDrop, z, -.88*w, shoulder, z,
    -.57*w, deck, z, .57*w, deck, z,
    .88*w, shoulder, z, w, shoulder-cornerDrop, z,
    w, bottom+sideRise, z, .83*w, bottom, z,
    ];
  });
  return loft(rings);
}

export function roadsterCanopy() {
  // One continuous tapering glasshouse: raked windscreen, short roof, long fastback.
  const stations = [
    [-1.16, .93, 1.04, .86, 1.055],
    [-.72, .98, 1.07, .75, 1.35],
    [.08, .98, 1.075, .72, 1.48],
    [.65, .96, 1.075, .70, 1.46],
    [1.24, .91, 1.075, .75, 1.30],
    [1.84, .83, 1.07, .77, 1.11],
  ];
  const rings = stations.map(([z, base, baseY, roof, roofY]) => [
    -base, baseY, z, -roof, roofY, z, roof, roofY, z, base, baseY, z,
  ]);
  return loft(rings, false);
}

const silver = new THREE.MeshStandardMaterial({ color: '#adb6ba', metalness: .88, roughness: .25 });
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
const frontBlade = new THREE.BoxGeometry(1.77, .028, .046);

function line(parent, points, radius, mat, name) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 14, radius, 5, false), mat);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function rocker(side) {
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
  const mesh = new THREE.Mesh(geo,satinCarbon);
  mesh.name='Roadster sculpted rocker';
  return mesh;
}

function aerofoil() {
  const outline = new THREE.Shape();
  outline.moveTo(-1.16,-.22);
  outline.lineTo(1.16,-.22);
  outline.lineTo(1.19,.17);
  outline.lineTo(.88,.27);
  outline.lineTo(-.88,.27);
  outline.lineTo(-1.19,.17);
  outline.closePath();
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012,
    bevelSegments: 1, steps: 1, curveSegments: 1,
  });
  geo.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geo,silver);
  mesh.name = 'Roadster aerofoil';
  return mesh;
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
  // Nose: hairline DRL in a dark horizontal blade, plus two subtle hood break lines.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.86,.095,.055),graphite);
  nose.position.set(0,.57,-2.47);
  group.add(nose);
  const blade = new THREE.Mesh(frontBlade,m.white);
  blade.position.set(0,.616,-2.51);
  blade.name = 'Roadster front light blade';
  group.add(blade);
  for (const side of [-1,1]) {
    line(group,[
      [side*.51,.595,-2.38], [side*.69,.70,-1.98],
      [side*.83,.81,-1.54], [side*.88,.94,-1.20],
    ],.008,m.paint,'Roadster hood crease');
    group.add(rocker(side));
    line(group,[
      [side*.89,1.065,-1.12],[side*.82,1.35,-.72],
      [side*.74,1.49,.08],[side*.76,1.46,.65],
      [side*.77,1.11,1.84],
    ],.017,graphite,'Roadster glass surround');
  }

  const rearLight = createRearLight();
  group.add(rearLight.group);
  group.userData.rearLight = rearLight;

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(2.07,.26,.052),graphite);
  fascia.position.set(0,.75,2.395);
  group.add(fascia);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.40,.14,.035),silver);
  plate.position.set(0,.79,2.443);
  group.add(plate);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.91,.055,.45),graphite);
  diffuser.position.set(0,.22,2.20);
  group.add(diffuser);
  for (const x of [-.84,-.47,0,.47,.84]) {
    const vane = new THREE.Mesh(new THREE.BoxGeometry(.035,.28,.39),satinCarbon);
    vane.position.set(x,.18,2.19);
    vane.name='Roadster diffuser vane';
    group.add(vane);
  }
  for (const port of REAR_PORTS) {
    const assembly = new THREE.Group();
    assembly.position.set(port.position[0],port.position[1],2.43);
    assembly.name='Roadster recessed thruster';
    const cavity=new THREE.Mesh(new THREE.CylinderGeometry(.103,.115,.16,20,1,true),graphite);
    cavity.rotation.x=Math.PI/2; cavity.position.z=.01;
    const dark=new THREE.Mesh(new THREE.CircleGeometry(.098,20),graphite);
    dark.position.z=-.074;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,8,24),bronze);
    ring.position.z=.095;
    assembly.add(cavity,dark,ring);
    group.add(assembly);
  }

  const wing = new THREE.Group();
  wing.name='Roadster active wing';
  wing.add(aerofoil());
  for (const side of [-1,1]) {
    const strut=new THREE.Mesh(new THREE.BoxGeometry(.052,.34,.09),graphite);
    strut.position.set(side*.71,-.19,-.015);
    wing.add(strut);
    const endplate=new THREE.Mesh(new THREE.BoxGeometry(.065,.18,.49),satinCarbon);
    endplate.position.set(side*1.13,.005,-.006);
    wing.add(endplate);
  }
  wing.position.set(0,1.08,1.98);
  wing.userData={restY:1.08,lift:.34};
  group.add(wing);
  return wing;
}
