import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { REAR_PORTS } from './aero-vfx.js';

// Shared cross-car surfaces sculpt the nose and layered tail of photos 01/05/06 without
// touching the collision hull or the NITRO emitter's four immutable anchors.
const dark = new THREE.MeshStandardMaterial({ color: '#090d11', metalness: .25, roughness: .29 });
const carbon = new THREE.MeshStandardMaterial({ color: '#172026', metalness: .3, roughness: .37 });
const headlampMaterial = new THREE.MeshStandardMaterial({ color: '#d1eff3', emissive: '#9abfc8', emissiveIntensity: .9, roughness: .2, side: THREE.DoubleSide });
const bankDark = new THREE.MeshStandardMaterial({ color: '#080b0e', metalness: .31, roughness: .42 });
const edgeCarbon = new THREE.MeshStandardMaterial({ color: '#363b3b', metalness: .38, roughness: .36 });
// Matte, so the diffuser tunnels and splitter read as dark carbon instead of mirroring the sky.
const matteCarbon = new THREE.MeshStandardMaterial({ color: '#06080a', metalness: 0, roughness: .92 });

// `edge` is |x| / span, shared by every sheet of one fascia so stacked layers stay parallel.
function curvedSheet(xs, span, high, low, depth, front = false, lowDepth = depth) {
  const vertices = [], indices = [];
  xs.forEach(x => {
    const edge = Math.abs(x) / span;
    vertices.push(x, high(edge), depth(edge), x, low(edge), lowDepth(edge));
  });
  for (let i = 0; i < xs.length - 1; i++) {
    const a = i*2, b = a+1, c = a+2, d = a+3;
    indices.push(...(front ? [a,c,b,b,c,d] : [a,b,c,b,d,c]));
  }
  return indexed(vertices, indices);
}

function indexed(vertices, indices) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// A plan-view outline (x, z) extruded downward from `top` by `height`; indexed so it can
// batch with the other static trim of its material.
function slab(plan, top, height) {
  const shape = new THREE.Shape(plan.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, top, 0);
  return mergeVertices(geo);
}

// Photo 05 front: painted hood lip, hairline blade, tall carbon band, low intake, splitter.
// The centre stands proud and the ends tuck back toward the flat -2.50 nose cap.
const frontXs = [-.80,-.72,-.56,-.30,0,.30,.56,.72,.80];
const noseZ = edge => -2.545 + .035*edge*edge;
const hoodLip = curvedSheet(frontXs.slice(2,-2), .80, () => .618, () => .586,
  edge => noseZ(edge) + .012, true, edge => noseZ(edge) - .006);
const lightBlade = curvedSheet(frontXs, .80, () => .586, () => .570, edge => noseZ(edge) - .004, true);
const carbonBand = curvedSheet(frontXs, .80, () => .570, () => .455, noseZ, true);
const lowerMouth = curvedSheet(frontXs.slice(1,-1), .80, () => .455, () => .365, edge => noseZ(edge) + .006, true);
const splitter = slab([[-.88,-2.46],[.88,-2.46],[.84,-2.60],[.60,-2.655],[-.60,-2.655],[-.84,-2.60]], .345, .025);

// Mirrored triangle/quad: `side` picks the winding that faces the viewer on that side.
const sideGeometry = (vertices, side) => indexed(vertices, vertices.length === 9
  ? (side < 0 ? [0,2,1] : [0,1,2])
  : (side < 0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2]));
// Inverted triangular lamps sit high on each fender face, just above the blade's ends.
const lampPockets = [-1,1].map(side => sideGeometry([
  side*.66,.698,-2.507, side*.86,.70,-2.507, side*.785,.595,-2.507,
], side));
const lampLenses = [-1,1].map(side => sideGeometry([
  side*.685,.688,-2.512, side*.842,.69,-2.512, side*.785,.612,-2.512,
], side));
// Dark lower corners fill the chamfered nose like the carbon feet in photo 05.
const cornerIntakes = [-1,1].map(side => sideGeometry([
  side*.70,.355,-2.506, side*.76,.355,-2.506, side*.895,.455,-2.506, side*.70,.455,-2.506,
], side));

// Photo 01 rear: slot recess, protruding white shelf, recessed white scoop with plate,
// then a black port bar over open diffuser tunnels framed by carbon.
const rearXs = [-1.04,-.92,-.70,-.36,0,.36,.70,.92,1.04];
const upperTailSlot = curvedSheet(rearXs, 1.04, () => 1.05, () => .875, edge => 2.44 - .04*edge*edge);
const rearShelf = slab([[-1.0,2.38],[1.0,2.38],[.98,2.47],[.6,2.50],[-.6,2.50],[-.98,2.47]], .88, .045);
const whiteScoop = curvedSheet(rearXs.slice(1,-1), .92, () => .835, edge => .715 + .085*edge**3,
  edge => 2.445 - .04*edge*edge, false, edge => 2.475 - .05*edge*edge);

function perforatedRear(width, low, high, radius, frontZ, curvature, opening) {
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
  if (opening) {
    const [w, bottom, top] = opening;
    outline.holes.push(new THREE.Path([[-w,bottom],[-w,top],[w,top],[w,bottom]].map(([x,y]) => new THREE.Vector2(x,y))));
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
const lowerValance = perforatedRear(1.04,.30,.735,.076,2.455,.045,[.80,.33,.555]);
const portBank = perforatedRear(.80,.565,.722,.076,2.478,.03);
// Five shared swept fences frame four tunnels, one under each port.
const rearVaneGeometry = (() => {
  const profile = [[.29,2.00],[.29,2.38],[.30,2.44],[.33,2.47],[.56,2.47]];
  const vertices = [], indices = [];
  for (const x of [-.0175,.0175]) for (const [y,z] of profile) vertices.push(x,y,z);
  for (let i = 1; i < profile.length-1; i++) {
    indices.push(0,i+1,i,profile.length,profile.length+i,profile.length+i+1);
  }
  for (let i = 0; i < profile.length; i++) {
    const j = (i+1)%profile.length;
    indices.push(i,j,profile.length+i,j,profile.length+j,profile.length+i);
  }
  return indexed(vertices, indices);
})();
// The tunnels close against a back wall just ahead of the body's flat rear cap (z 2.37);
// the roof continues under the floor toward the rear axle.
const tunnelBack = new THREE.BoxGeometry(1.66,.26,.01);
const tunnelRoof = new THREE.BoxGeometry(1.60,.02,.40);
const plateGeometry = new THREE.BoxGeometry(.32,.12,.02);
const tailBlade = new THREE.BoxGeometry(.03,.20,.15);
const cornerMarker = new THREE.BoxGeometry(.02,.025,.08);

// A black rear quarter flows out of the white rear wheel shoulder into the
// deeper diffuser. Keep its leading edge behind the animated rear wheel.
const rearQuarterCuts = [-1,1].map(side => sideGeometry([
  side*1.174,.605,1.84, side*1.09,.78,2.35,
  side*1.09,.34,2.35, side*1.174,.30,1.84,
], -side));

const add = (group, geometry, material, name) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  group.add(mesh);
  return mesh;
};

export function addReferenceFront(group, materials, trace) {
  add(group, hoodLip, materials.paint, 'Roadster sculpted front fascia');
  add(group, lightBlade, materials.white, 'Roadster front light blade');
  add(group, carbonBand, edgeCarbon, 'Roadster front carbon band');
  add(group, lowerMouth, dark, 'Roadster black lower intake');
  add(group, splitter, matteCarbon, 'Roadster carbon splitter');
  [-1,1].forEach((side, i) => {
    add(group, cornerIntakes[i], dark, 'Roadster corner intake');
    add(group, lampPockets[i], dark, 'Roadster headlamp pocket');
    add(group, lampLenses[i], headlampMaterial, 'Roadster triangular headlamp');
    // Highlight the fold where the flat hood meets each raised fender.
    trace(group, [
      [side*.547,.632,-2.40], [side*.616,.694,-1.98],
      [side*.667,.736,-1.55], [side*.673,.756,-1.20],
    ], .006, materials.paint, 'Roadster hood crease');
  });
}

export function addReferenceRear(group, materials, trace) {
  add(group, upperTailSlot, dark, 'Roadster black rear light recess');
  add(group, rearShelf, materials.paint, 'Roadster rear shelf');
  add(group, whiteScoop, materials.paint, 'Roadster curved rear fascia');
  add(group, lowerValance, carbon, 'Roadster curved rear valance');
  add(group, portBank, bankDark, 'Roadster machined four-port surround');
  trace(group, [
    [-.80,.725,2.455],[-.40,.725,2.478],[0,.725,2.483],
    [.40,.725,2.478],[.80,.725,2.455],
  ],.008,edgeCarbon,'Roadster port bank upper lip');
  trace(group, [
    [-.80,.562,2.455],[-.40,.562,2.478],[0,.562,2.483],
    [.40,.562,2.478],[.80,.562,2.455],
  ],.008,edgeCarbon,'Roadster port bank lower lip');
  // Crisp painted edge where the shelf meets the light slot.
  trace(group, [
    [-.98,.881,2.47],[-.6,.881,2.50],[0,.881,2.50],
    [.6,.881,2.50],[.98,.881,2.47],
  ], .006, materials.paint, 'Roadster rear light edge');
  [-1,1].forEach((side, i) => {
    add(group,rearQuarterCuts[i],carbon,'Roadster rear quarter carbon cut');
    add(group,tailBlade,materials.paint,'Roadster tail blade').position.set(side*1.045,.965,2.43);
    const marker = add(group,cornerMarker,materials.light,'Roadster rear corner marker');
    marker.position.set(side*1.105,.735,2.28);
    marker.rotation.y = -side*.163;
  });

  // Recessed blank license plate: no hardcoded manufacturer mark.
  add(group,plateGeometry,materials.paint,'Roadster blank rear plate').position.set(0,.775,2.49);
  add(group,tunnelBack,matteCarbon,'Roadster diffuser tunnel back').position.set(0,.44,2.385);
  const roof = add(group,tunnelRoof,matteCarbon,'Roadster deep rear diffuser');
  roof.position.set(0,.345,2.185);
  roof.rotation.x = -.227;
  for (const x of [-.80,-.42,0,.42,.80]) {
    add(group,rearVaneGeometry,matteCarbon,'Roadster diffuser vane').position.x = x;
  }
}
