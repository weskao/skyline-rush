import * as THREE from 'three';
import { createLiveSpan } from './effects-particle-upload.js';

// Fixed ring pool behind the race particle Points. Its live span (effects-particle-upload.js) lets each frame
// integrate, upload and draw only slots that may be alive. Slot order (= draw order) and the emission ring are unchanged.
export function createParticlePool(count) {
  const particles = Array.from({ length: count }, () => ({ life: 0 }));
  const arrays = {
    position: new Float32Array(count * 3), color: new Float32Array(count * 3), size: new Float32Array(count),
    alpha: new Float32Array(count), kind: new Float32Array(count), velocity: new Float32Array(count * 3),
  };
  const geometry = new THREE.BufferGeometry();
  for (const [name, array] of Object.entries(arrays)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, array.length / count).setUsage(THREE.DynamicDrawUsage));
  }
  const span = createLiveSpan(count, Object.values(geometry.attributes), { geometry });
  let cursor = 0;
  return {
    particles, arrays, geometry, span,
    emit(x, y, distance, vx, vy, forward, size, life, color, gravity, kind = 0, opacity = 0.85, radialX = Math.sign(vx)) {
      const p = particles[cursor];
      p.x = x; p.y = y; p.distance = distance; p.vx = vx; p.vy = vy; p.forward = forward; p.size = size;
      p.life = life; p.maxLife = life; p.color = color; p.gravity = gravity; p.kind = kind; p.opacity = opacity;
      p.radialX = radialX; p.grounded = false; p.phase = cursor * 2.39996;
      span.add(cursor);
      cursor = (cursor + 1) % count;
    },
    reset() {
      for (const p of particles) p.life = 0;
      arrays.alpha.fill(0);
      span.clear(geometry.attributes.alpha);
      cursor = 0;
    },
  };
}
