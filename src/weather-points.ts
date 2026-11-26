import { BufferAttribute, BufferGeometry, Points, PointsMaterial, Vector3, type Object3D } from 'three';

const ABOVE_CAR = new Vector3(0, 25, 15);

/** The shared rain/snow particle set: 180 deterministic points, drawn range and position driven per frame by world.js. */
export function createWeatherPoints() {
  const positions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) positions.set([Math.sin(i * 29) * 45, i * 17 % 32, -(i * 13 % 180)], i * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const points = new Points(geometry, new PointsMaterial({ color: '#b8d8ef', size: .18, transparent: true, opacity: .65, depthWrite: false }));
  return { positions, geometry, points };
}

/** Centres the weather on the car as drawn this frame (banked/turning roads move it off its lane x and world z=0). */
export function centerWeatherOn(weather: Object3D, car: Object3D) {
  weather.position.copy(car.position).add(ABOVE_CAR);
}
