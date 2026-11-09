import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

/** The shared rain/snow particle set: 180 deterministic points, drawn range and position driven per frame by world.js. */
export function createWeatherPoints() {
  const positions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) positions.set([Math.sin(i * 29) * 45, i * 17 % 32, -(i * 13 % 180)], i * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const points = new Points(geometry, new PointsMaterial({ color: '#b8d8ef', size: .18, transparent: true, opacity: .65, depthWrite: false }));
  return { positions, geometry, points };
}
