import * as THREE from 'three';
import { STREAK_VERTEX, STREAK_FRAGMENT } from './pickup-collect-shaders.js';

const STEPS = 32;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const envelope = (age, life) => Math.min(1, age / .07) * (1 - age / life) ** 1.18;

// One dynamic mesh per playing effect. Each strip faces the camera and follows the fitted body frame.
export function createPickupStreaks(group, tier) {
  const electric = tier === 'cell';
  const lines = electric ? 7 : 8;
  const positions = new Float32Array(lines * (STEPS + 1) * 6);
  const uv = [], indices = [];
  for (let line = 0; line < lines; line++) for (let i = 0; i <= STEPS; i++) {
    uv.push(i / STEPS, 0, i / STEPS, 1);
    const a = (line * (STEPS + 1) + i) * 2;
    if (i < STEPS) indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERTEX, fragmentShader: STREAK_FRAGMENT,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: {
      tint: { value: new THREE.Color(electric ? 0x36baff : 0xff7832) },
      core: { value: new THREE.Color(electric ? 0xc4f9ff : 0xffe0a3) },
      age: { value: 0 }, power: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Pickup body streaks';
  mesh.frustumCulled = false;
  mesh.visible = false;
  group.add(mesh);
  const points = Array.from({ length: STEPS + 1 }, () => new THREE.Vector3());
  const eye = new THREE.Vector3(), width = new THREE.Vector3(), view = new THREE.Vector3();

  function point(q, line, age, progress, out, sections) {
    const side = line % 2 ? 1 : -1;
    if (electric) {
      const front = lerp(-2.25, 2.28, 1 - (1 - Math.min(1, age / .46)) ** 2);
      const z = Math.max(-2.43, front - (1 - q) * (line < 3 ? 3.4 : 2.3));
      const jitter = Math.sin(q * 34 + line * 2.4 + age * 38) * .08 + Math.sin(q * 77 + line + age * 24) * .045;
      const section = sections?.[clamp(Math.floor((z + 2.45) / 4.7 * sections.length), 0, sections.length - 1)];
      const edge = side < 0 ? section?.left : section?.right;
      out.set(line < 3 ? (line - 1) * .58 + jitter : (Number.isFinite(edge) ? edge : side * 1.18) + side * (.08 + Math.abs(jitter)),
        line < 3 ? (Number.isFinite(section?.top) ? section.top : 1.32) + .08 : .5 + .19 * (line % 3) + jitter, z);
      return;
    }
    const reach = q * (2.2 + 6.4 * progress), phase = q * 12 - age * 24 + line * .85;
    out.set(side * (.58 + reach * .11 + (line >> 1) * .045) + Math.sin(phase) * (.025 + q * .27),
      .38 + q * (.15 + .37 * progress) + Math.sin(phase * 1.2) * q * .28, 2.33 + reach);
  }

  return {
    mesh,
    update(slot, camera, sections) {
      const { age, style, visualWeight } = slot;
      const power = envelope(age, style.life) * visualWeight;
      mesh.visible = !!camera && power > .005 && slot.follow && slot.quality !== 'low';
      if (!mesh.visible) return;
      camera.getWorldPosition(eye);
      group.worldToLocal(eye);
      const count = slot.quality === 'medium' ? 4 : lines;
      for (let line = 0; line < count; line++) {
        for (let i = 0; i <= STEPS; i++) point(i / STEPS, line, age, age / style.life, points[i], sections);
        const radius = electric ? (line < 3 ? .135 : .074) : (line < 4 ? .23 : .12);
        for (let i = 0; i <= STEPS; i++) {
          const p = points[i];
          view.subVectors(eye, p);
          width.subVectors(points[Math.min(STEPS, i + 1)], points[Math.max(0, i - 1)])
            .cross(view).normalize().multiplyScalar(radius * (.38 + .62 * Math.sin(i / STEPS * Math.PI)));
          const offset = (line * (STEPS + 1) + i) * 6;
          positions[offset] = p.x - width.x;
          positions[offset + 1] = p.y - width.y;
          positions[offset + 2] = p.z - width.z;
          positions[offset + 3] = p.x + width.x;
          positions[offset + 4] = p.y + width.y;
          positions[offset + 5] = p.z + width.z;
        }
      }
      geometry.setDrawRange(0, count * STEPS * 6);
      geometry.attributes.position.needsUpdate = true;
      material.uniforms.age.value = age;
      material.uniforms.power.value = power;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
