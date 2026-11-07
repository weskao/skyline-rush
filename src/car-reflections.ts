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

/** Points every lit material of the car at the softened map; VFX shaders and unlit lamps are untouched. */
export function applyCarReflections(car: THREE.Object3D, envMap: THREE.Texture): void {
  car.traverse(object => {
    const { material } = object as THREE.Mesh;
    for (const item of Array.isArray(material) ? material : material ? [material] : [])
      if (item instanceof THREE.MeshStandardMaterial) {
        item.envMap = envMap;
        item.envMapIntensity = CAR_REFLECTION.intensity;
      }
  });
}
