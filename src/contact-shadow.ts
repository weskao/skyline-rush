import * as THREE from 'three';
import { look3d } from './look-gate.ts';

// `?look=3d` (board panel 1): sized to the Roadster's footprint with a dense core; the develop 5 x 8 m blob reads as a
// halo, not contact. Without the gate the develop shadow stays.
const BOARD = { width: 3, length: 5.8, opacity: 0.75, stops: [[0, 0.92], [0.55, 0.55], [1, 0]] };
const DEVELOP = { width: 5, length: 8, opacity: 0.6, stops: [[0, 0.8], [1, 0]] };
const look = () => look3d() ? BOARD : DEVELOP;

// The player's contact shadow: one canvas-gradient plane that world.js lays on the road under the car.
export function createContactShadow(scene: THREE.Scene) {
  const { width, length, stops } = look();
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d')!;
  const shadowGradient = shadowContext.createRadialGradient(32, 32, 5, 32, 32, 32);
  for (const [at, alpha] of stops) shadowGradient.addColorStop(at!, `rgba(0,0,0,${alpha})`);
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: shadowOpacity(0), depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  return { shadow, texture };
}

/** Shadow opacity for the car's height above the road: fades as it lifts off. */
export const shadowOpacity = (lift: number): number => look().opacity / (1 + lift * 0.2);
