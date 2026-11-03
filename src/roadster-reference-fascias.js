import * as THREE from 'three';

// Shared cross-car surfaces sculpt the wedge nose and layered tail without
// touching the collision hull or the NITRO emitter's four immutable anchors.
const dark = new THREE.MeshStandardMaterial({ color: '#090d11', metalness: .25, roughness: .29 });
const carbon = new THREE.MeshStandardMaterial({ color: '#172026', metalness: .3, roughness: .37 });
const slitGeometry = new THREE.BoxGeometry(.105, .014, .018);
const rearVaneGeometry = new THREE.BoxGeometry(.035, .29, .42);
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
const lowerValance = curvedSheet(rearXs,
  edge => .718 + .035*edge, edge => .39 + .040*edge,
  edge => 2.44 - .155*edge*edge);

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
