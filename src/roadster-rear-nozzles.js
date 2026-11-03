import * as THREE from 'three';
import { REAR_PORTS } from './aero-vfx.js';

// Photo-inspired matte machined sockets: small warm-metal lips, deep unlit
// barrels, and no glowing chrome hubcaps. Shared geometry never changes at runtime.
const metal = new THREE.MeshStandardMaterial({ color: '#8c8070', metalness: .87, roughness: .33 });
const bezel = new THREE.MeshStandardMaterial({ color: '#1c2225', metalness: .48, roughness: .42 });
const bore = new THREE.MeshStandardMaterial({
  color: '#0c1012', metalness: .18, roughness: .74, side: THREE.DoubleSide,
});
const shadow = new THREE.MeshStandardMaterial({ color: '#060809', metalness: .08, roughness: .83 });
const collarGeometry = new THREE.TorusGeometry(.098, .010, 6, 20);
const rimGeometry = new THREE.TorusGeometry(.083, .010, 6, 20);
const throatGeometry = new THREE.CylinderGeometry(.069, .075, .20, 20, 1, true);
const backGeometry = new THREE.CircleGeometry(.066, 20);

function layer(parent, geometry, material, name, z) {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.z = z;
  parent.add(part);
  return part;
}

export function addRoadsterRearNozzles(group) {
  for (const port of REAR_PORTS) {
    const assembly = new THREE.Group();
    assembly.name = 'Roadster recessed thruster';
    assembly.position.set(port.position[0], port.position[1], 2.43);
    layer(assembly, collarGeometry, bezel, 'Roadster nozzle bevel collar', .081);
    layer(assembly, rimGeometry, metal, 'Roadster nozzle satin lip', .116);
    const throat = layer(assembly, throatGeometry, bore, 'Roadster nozzle recessed throat', .008);
    throat.rotation.x = Math.PI / 2;
    layer(assembly, backGeometry, shadow, 'Roadster nozzle shadow back', -.112);
    group.add(assembly);
  }
}
