import * as THREE from 'three';
import { roadRibbon } from './geometry.ts';
import { CIRCUIT_BEACON, CIRCUIT_HALF_WIDTH, CIRCUIT_LENGTH, CIRCUIT_RADIUS, circuitFrame } from './circuit-track.ts';

// Immutable complete loop: geometry is built once, then translated by the same periodic origin as cars.
function circuitRibbon(halfWidth = CIRCUIT_HALF_WIDTH, height = 0, rows = 1000): THREE.BufferGeometry {
  const geometry = roadRibbon(rows), vertices = geometry.attributes.position;
  for (let i = 0; i <= rows; i++) {
    const frame = circuitFrame(i * CIRCUIT_LENGTH / rows);
    for (let side = 0; side < 2; side++) {
      const x = (side * 2 - 1) * halfWidth;
      vertices.setXYZ(i * 2 + side, frame.point.x + frame.right[0] * x, height, frame.point.z + frame.right[2] * x);
    }
  }
  vertices.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}
export function createCircuitScene(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'Harbor Circuit'; group.visible = false;
  const road = new THREE.Mesh(circuitRibbon(), new THREE.MeshStandardMaterial({ color: '#263941', roughness: .88 }));
  group.add(road);
  // Thin, unbroken edge strips follow the analytic radius; lanes and finish share the same frame.
  for (const lateral of [-11.6, -2.5, 2.5, 11.6]) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(CIRCUIT_RADIUS - lateral - .08, CIRCUIT_RADIUS - lateral + .08, 1000),
      new THREE.MeshBasicMaterial({ color: Math.abs(lateral) > 10 ? '#eea966' : '#bdcaca', side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(CIRCUIT_RADIUS, .012, 0); group.add(mesh);
  }
  const railGeometry = new THREE.TorusGeometry(CIRCUIT_RADIUS, .16, 4, 640);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeometry, new THREE.MeshStandardMaterial({ color: '#e3a96a', roughness: .65 }));
    rail.rotation.x = Math.PI / 2; rail.position.set(CIRCUIT_RADIUS, .65, 0);
    const scale = (CIRCUIT_RADIUS + side * CIRCUIT_HALF_WIDTH) / CIRCUIT_RADIUS;
    rail.scale.set(scale, scale, 1); group.add(rail);
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(CIRCUIT_RADIUS + 160, 96),
    new THREE.MeshStandardMaterial({ color: '#537d70', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(CIRCUIT_RADIUS, -.08, 0); group.add(ground);
  // A tall beacon gives the new venue a distinct, visible home landmark clear of the road.
  const beacon = new THREE.Group(); beacon.name = 'Harbor beacon';
  const beaconFrame = circuitFrame(CIRCUIT_BEACON.at);
  beacon.position.set(beaconFrame.point.x - beaconFrame.right[0] * CIRCUIT_BEACON.offset, 0, beaconFrame.point.z - beaconFrame.right[2] * CIRCUIT_BEACON.offset);
  beacon.scale.setScalar(CIRCUIT_BEACON.scale);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3, 32, 12),
    new THREE.MeshStandardMaterial({ color: '#c6d9d5', roughness: .8 }));
  column.position.y = 16; beacon.add(column);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 12), new THREE.MeshStandardMaterial({ color: '#ed9959' }));
  crown.position.y = 36; beacon.add(crown); group.add(beacon); scene.add(group);
  return {
    update(distance: number): void { const p = circuitFrame(distance).point; group.visible = true; group.position.set(-p.x, -p.y, -p.z); },
    hide(): void { group.visible = false; },
    dispose(): void {
      group.removeFromParent();
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      group.traverse(object => {
        if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of [object.material].flat()) materials.add(material); }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
