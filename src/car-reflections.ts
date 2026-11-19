import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// The shared RoomEnvironment's HDR light panels mirror as hot white glints on the Roadster's clear coat, rear fascia
// and nozzles, and it is nearly all of the car's light. A material without its own envMap ignores envMapIntensity
// (scene.environmentIntensity wins), so the car gets one pre-blurred map at one intensity across its whole body:
// dimming only the rear would leave it visibly disconnected from the rest of the car.
export const CAR_REFLECTION = Object.freeze({ blur: 0.3, intensity: 0.3, size: 64 });

/** One small, blurred PMREM shared by every Roadster scene; created once per renderer. */
export function createCarEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  try {
    return generator.fromScene(room, CAR_REFLECTION.blur, 0.1, 100, { size: CAR_REFLECTION.size }).texture;
  } finally {
    room.dispose();
    generator.dispose();
  }
}

// Broaden only tight lobes. Slick paints retain their relative finish, while already rough trim stays the same.
export const outdoorCarRoughness = (roughness: number): number => roughness < 0.3 ? (roughness + 0.3) / 2 : roughness;

/** Gives lit car materials the softened map and, outdoors, spreads tight highlights from every light source. */
export function applyCarReflections(car: THREE.Object3D, envMap: THREE.Texture, finish: 'studio' | 'outdoor' = 'studio'): void {
  const materials = new Set<THREE.MeshStandardMaterial>();
  car.traverse(object => {
    const { material } = object as THREE.Mesh;
    for (const item of Array.isArray(material) ? material : material ? [material] : [])
      if (item instanceof THREE.MeshStandardMaterial) materials.add(item);
  });
  for (const material of materials) {
    material.envMap = envMap;
    material.envMapIntensity = CAR_REFLECTION.intensity;
    if (finish === 'outdoor') {
      material.roughness = outdoorCarRoughness(material.roughness);
      if (material instanceof THREE.MeshPhysicalMaterial && material.clearcoat > 0)
        material.clearcoatRoughness = outdoorCarRoughness(material.clearcoatRoughness);
    }
  }
}
