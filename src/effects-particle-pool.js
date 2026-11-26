import * as THREE from 'three';
import { markRange } from './effects-particle-upload.js';

// Fixed ring pool behind the race particle Points. Tracks the conservative span of slots that may be alive, so each
// frame integrates, uploads and draws only that span. Slot order (= draw order) and the emission ring are unchanged.
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
  const attributes = Object.values(geometry.attributes);
  let cursor = 0, first = count, last = -1;
  geometry.setDrawRange(0, 0);
  return {
    particles, arrays, geometry,
    get first() { return first; },
    get last() { return last; },
    emit(x, y, distance, vx, vy, forward, size, life, color, gravity, kind = 0, opacity = 0.85, radialX = Math.sign(vx)) {
      const p = particles[cursor];
      p.x = x; p.y = y; p.distance = distance; p.vx = vx; p.vy = vy; p.forward = forward; p.size = size;
      p.life = life; p.maxLife = life; p.color = color; p.gravity = gravity; p.kind = kind; p.opacity = opacity;
      p.radialX = radialX; p.grounded = false; p.phase = cursor * 2.39996;
      if (cursor < first) first = cursor;
      if (cursor > last) last = cursor;
      cursor = (cursor + 1) % count;
    },
    // After integrating [first, last]: queue that span's upload, then draw only [liveFirst, liveLast].
    commit(liveFirst, liveLast) {
      if (last >= first) for (const attribute of attributes) markRange(attribute, first, last - first + 1);
      first = liveLast >= liveFirst ? liveFirst : count;
      last = liveLast >= liveFirst ? liveLast : -1;
      geometry.setDrawRange(last >= first ? first : 0, last >= first ? last - first + 1 : 0);
    },
    reset() {
      for (const p of particles) p.life = 0;
      arrays.alpha.fill(0);
      markRange(geometry.attributes.alpha, 0, count);
      cursor = 0; first = count; last = -1;
      geometry.setDrawRange(0, 0);
    },
  };
}
