import * as THREE from 'three';
import { REAR_PORTS } from './aero-vfx.js';

// Photos 01/04/06: short satin-bronze tubes stand proud of the black port bar, each
// with a rolled lip and a warm dark bore. Shared geometry never changes at runtime.
const metal = new THREE.MeshStandardMaterial({ color: '#9a8468', metalness: .87, roughness: .3, side: THREE.DoubleSide });
const bezel = new THREE.MeshStandardMaterial({ color: '#1c2225', metalness: .48, roughness: .42 });
// Photo 01: the tube wall glows bronze down to a dark back.
const bore = new THREE.MeshStandardMaterial({
  color: '#4a3b2c', metalness: .8, roughness: .42, side: THREE.DoubleSide,
});
const shadow = new THREE.MeshStandardMaterial({ color: '#060809', metalness: .08, roughness: .83 });
const socketMetal = new THREE.MeshStandardMaterial({ color: '#05070a', metalness: .6, roughness: .34, side: THREE.DoubleSide });
// Photo 01: a dark counterbore steps from the port bar down to each bronze barrel.
const socketGeometry = new THREE.LatheGeometry([[.074,-.022],[.094,0]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
const collarGeometry = new THREE.TorusGeometry(.077, .006, 6, 20);
// Profile (radius, depth): inner wall, rolled lip, then the outer barrel back into the bar.
const lipGeometry = new THREE.LatheGeometry([
  [.057,-.11],[.057,-.005],[.060,.003],[.066,.005],[.071,0],[.072,-.01],[.072,-.07],
].map(([r, y]) => new THREE.Vector2(r, y)), 20);
const throatGeometry = new THREE.CylinderGeometry(.056, .056, .11, 20, 1, true);
const backGeometry = new THREE.CircleGeometry(.056, 20);

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
    // The bore back stays ahead of the body's flat rear cap (z 2.37).
    assembly.position.set(port.position[0], port.position[1], 2.40);
    layer(assembly, socketGeometry, socketMetal, 'Roadster nozzle socket', .088).rotation.x = Math.PI / 2;
    layer(assembly, collarGeometry, bezel, 'Roadster nozzle bevel collar', .078);
    layer(assembly, lipGeometry, metal, 'Roadster nozzle satin lip', .13).rotation.x = Math.PI / 2;
    layer(assembly, throatGeometry, bore, 'Roadster nozzle recessed throat', .075).rotation.x = Math.PI / 2;
    layer(assembly, backGeometry, shadow, 'Roadster nozzle shadow back', .02);
    group.add(assembly);
  }
}
