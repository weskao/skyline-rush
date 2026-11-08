import * as THREE from 'three';

// The player's contact shadow: one canvas-gradient plane that world.js lays on the road under the car. Sized to the
// Roadster's footprint with a dense core (board panel 1); the old 5 x 8 m blob read as a halo, not contact.
export function createContactShadow(scene: THREE.Scene) {
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d')!;
  const shadowGradient = shadowContext.createRadialGradient(32, 32, 5, 32, 32, 32);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,0.92)');
  shadowGradient.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 5.8), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: shadowOpacity(0), depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  return { shadow, texture };
}

/** Shadow opacity for the car's height above the road: fades as it lifts off. */
export const shadowOpacity = (lift: number): number => 0.75 / (1 + lift * 0.2);
