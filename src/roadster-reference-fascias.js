import * as THREE from 'three';
import { REAR_PORTS } from './aero-vfx.js';

// Shared cross-car surfaces sculpt the wedge nose and layered tail without
// touching the collision hull or the NITRO emitter's four immutable anchors.
const dark = new THREE.MeshStandardMaterial({ color: '#090d11', metalness: .25, roughness: .29 });
const carbon = new THREE.MeshStandardMaterial({ color: '#172026', metalness: .3, roughness: .37 });
const slitGeometry = new THREE.BoxGeometry(.105, .014, .018);
// Five shared swept fences sculpt the deep diffuser channels visible from
// straight behind and from the rear quarter, without adding new draw calls.
const rearVaneGeometry = (() => {
  const profile = [[-.155,-.24],[-.035,-.24],[.145,-.07],[.12,.20],[-.155,.25]];
  const vertices = [], indices = [];
  for (const x of [-.0175,.0175]) for (const [y,z] of profile) vertices.push(x,y,z);
  for (let i = 1; i < profile.length-1; i++) {
    indices.push(0,i+1,i,profile.length,profile.length+i,profile.length+i+1);
  }
  for (let i = 0; i < profile.length; i++) {
    const j = (i+1)%profile.length;
    indices.push(i,j,profile.length+i,j,profile.length+j,profile.length+i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
})();
const frontXs = [-.88,-.72,-.52,-.24,0,.24,.52,.72,.88];
const rearXs = [-1.05,-.90,-.67,-.34,0,.34,.67,.90,1.05];

function curvedSheet(xs, high, low, depth, front = false) {
  const vertices = [], indices = [];
  xs.forEach(x => {
    const edge = Math.abs(x) / Math.max(Math.abs(xs[0]),Math.abs(xs.at(-1)));
    const z = depth(edge);
    vertices.push(x, high(edge), z, x, low(edge), z);
  });
  for (let i = 0; i < xs.length - 1; i++) {
    const a = i*2, b = a+1, c = a+2, d = a+3;
    indices.push(...(front ? [a,c,b,b,c,d] : [a,b,c,b,d,c]));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const wedgeSkin = curvedSheet(frontXs,
  edge => .655 + .035*edge, edge => .51 + .025*edge,
  edge => -2.535 + .205*edge*edge, true);
const lowerMouth = curvedSheet(frontXs.slice(1,-1),
  edge => .495 + .045*edge, edge => .392 + .06*edge,
  edge => -2.57 + .14*edge*edge, true);
const upperTailSlot = curvedSheet(rearXs,
  edge => 1.073 - .015*edge, edge => .884 + .013*edge,
  edge => 2.426 - .115*edge*edge);
const whiteTail = curvedSheet(rearXs,
  edge => .875 + .018*edge, edge => .724 + .045*edge,
  edge => 2.464 - .145*edge*edge);
// The carbon lower valance and slightly proud black port bank use genuine
// cutouts. The NITRO mount coordinates are shared with the game VFX.
function perforatedRear(width, low, high, radius, frontZ, curvature) {
  const outline = new THREE.Shape();
  outline.moveTo(-width,low);
  outline.lineTo(width,low);
  outline.lineTo(width,high);
  outline.lineTo(-width,high);
  outline.closePath();
  for (const port of REAR_PORTS) {
    const hole = new THREE.Path();
    hole.absarc(port.position[0],port.position[1],radius,0,Math.PI*2,true);
    outline.holes.push(hole);
  }
  const geometry = new THREE.ShapeGeometry(outline,16);
  const points = geometry.getAttribute('position');
  for (let i=0; i<points.count; i++) {
    const edge = points.getX(i)/width;
    points.setZ(i,frontZ-curvature*edge*edge);
  }
  geometry.computeVertexNormals();
  return geometry;
}
const lowerValance = perforatedRear(1.05,.38,.80,.119,2.44,.155);
const portBank = perforatedRear(.85,.508,.785,.115,2.474,.083);
const bankDark = new THREE.MeshStandardMaterial({ color: '#080b0e', metalness: .31, roughness: .42 });
const edgeCarbon = new THREE.MeshStandardMaterial({ color: '#363b3b', metalness: .38, roughness: .36 });

// A black rear quarter flows out of the white rear wheel shoulder into the
// deeper diffuser. Keep its leading edge behind the animated rear wheel.
const rearQuarterCuts = [-1,1].map(side => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([
    side*1.174,.605,1.84, side*1.09,.78,2.35,
    side*1.09,.34,2.35, side*1.174,.30,1.84,
  ],3));
  geo.setIndex(side < 0 ? [0,2,1,0,3,2] : [0,1,2,0,2,3]);
  geo.computeVertexNormals();
  return geo;
});

const add = (group, geometry, material, name) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  group.add(mesh);
  return mesh;
};

export function addReferenceFront(group, materials) {
  add(group, wedgeSkin, materials.paint, 'Roadster sculpted front fascia');
  add(group, lowerMouth, dark, 'Roadster black lower intake');
  for (const side of [-1,1]) {
    const lamp = add(group, slitGeometry, materials.white, 'Roadster front slit lamp');
    lamp.position.set(side*.85,.688,-2.309);
    lamp.rotation.y = -side*.17;
  }
}

export function addReferenceRear(group, materials, trace) {
  add(group, upperTailSlot, dark, 'Roadster black rear light recess');
  add(group, whiteTail, materials.paint, 'Roadster curved rear fascia');
  add(group, lowerValance, carbon, 'Roadster curved rear valance');
  add(group, portBank, bankDark, 'Roadster machined four-port surround');
  trace(group, [
    [-.85,.797,2.39],[-.48,.809,2.458],[0,.814,2.486],
    [.48,.809,2.458],[.85,.797,2.39],
  ],.009,edgeCarbon,'Roadster port bank upper lip');
  trace(group, [
    [-.84,.485,2.39],[-.45,.492,2.459],[0,.494,2.486],
    [.45,.492,2.459],[.84,.485,2.39],
  ],.009,edgeCarbon,'Roadster port bank lower lip');
  for (const panel of rearQuarterCuts) add(group,panel,carbon,'Roadster rear quarter carbon cut');
  trace(group, [
    [-1.02,1.074,2.318],[-.58,1.083,2.38],[0,1.086,2.424],
    [.58,1.083,2.38],[1.02,1.074,2.318],
  ], .008, materials.paint, 'Roadster rear light edge');

  // Recessed blank license plate: no hardcoded manufacturer mark.
  const plate = add(group,new THREE.BoxGeometry(.43,.14,.018),materials.paint,'Roadster blank rear plate');
  plate.position.set(0,.793,2.491);
  add(group,new THREE.BoxGeometry(2.04,.37,.27),carbon,'Roadster deep rear diffuser')
    .position.set(0,.315,2.33);
  for (const x of [-.85,-.47,0,.47,.85]) {
    const vane = add(group,rearVaneGeometry,dark,'Roadster diffuser vane');
    vane.position.set(x,.205,2.325);
  }
}
