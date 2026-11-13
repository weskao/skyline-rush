import * as THREE from 'three';

// Shared by all car models and their wakes: every thrust stream starts at its actual port.
export const LIFT_PORTS = [[-0.79, -1.3], [-0.79, 1.45], [0.79, -1.3], [0.79, 1.45]];
const UNSCALED = new THREE.Vector3(1, 1, 1);
// A dressed GLB shows at the Roadster's measured size (car-display-size.ts), carrying its authored thrusters with it.
export const liftPort = (pose, port, y, out) => out.set(LIFT_PORTS[port][0], y, LIFT_PORTS[port][1]).multiply(pose?.userData.displayScale ?? UNSCALED);
