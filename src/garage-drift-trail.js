import * as THREE from 'three';
import { DRIFT_TRAIL_STYLES, driftTrailIndex } from './garage-drift-styles.ts';
import { createDriftAccents } from './garage-drift-accents.js';
import { driftFragment, driftVertex } from './garage-drift-trail-shader.js';

// 512 segments cover two tyres at 120 rendered frames/s for the complete visual lifetime.
const CAPACITY = 512;
const VERTICES = 6;
const INDICES = 12;
const LIFE = 1.85;
const RIBBON_DETAIL = { low: 0, medium: .55, high: 1, ultra: 1 };

export function createDriftTrail(scene) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(CAPACITY * VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const sample = new THREE.BufferAttribute(new Float32Array(position.array.length), 3).setUsage(THREE.DynamicDrawUsage);
  const surface = new THREE.BufferAttribute(new Float32Array(position.array.length), 3).setUsage(THREE.DynamicDrawUsage);
  const uv = new Float32Array(CAPACITY * VERTICES * 2);
  const index = new Uint16Array(CAPACITY * INDICES);
  const faces = [0, 1, 3, 3, 1, 4, 1, 2, 4, 4, 2, 5];
  for (let slot = 0; slot < CAPACITY; slot++) {
    uv.set([0, 0, .5, 0, 1, 0, 0, 1, .5, 1, 1, 1], slot * VERTICES * 2);
    index.set(faces.map(vertex => vertex + slot * VERTICES), slot * INDICES);
  }
  geometry.setAttribute('position', position);
  geometry.setAttribute('birthAlongStrength', sample);
  geometry.setAttribute('roadNormal', surface);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));

  const uniforms = {
    time: { value: 0 }, life: { value: LIFE }, style: { value: 0 }, motion: { value: 1 }, detail: { value: 1 },
    tint: { value: new THREE.Color() }, core: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: driftVertex, fragmentShader: driftFragment, transparent: true,
    depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Drift trail';
  mesh.frustumCulled = false;
  mesh.renderOrder = -0.5; // above the rubber and under the car/foreground particles
  scene.add(mesh);

  const accents = createDriftAccents(scene, { time: uniforms.time, style: uniforms.style,
    tint: uniforms.tint, core: uniforms.core });
  const point = new THREE.Vector3();
  const written = [position, sample, surface];
  let cursor = 0, count = 0, clock = 0, last = -Infinity;
  let style = DRIFT_TRAIL_STYLES[0];
  function reset() {
    cursor = count = 0;
    last = -Infinity;
    geometry.setDrawRange(0, 0);
    mesh.visible = false;
    accents.reset();
  }
  reset();

  function edge(vertex, center, side, up, along, strength, born) {
    const lean = uniforms.motion.value * Math.sin(along * (1.67 + uniforms.style.value * .21));
    const half = style.width * (uniforms.detail.value ? 1 : .76) * (uniforms.motion.value ? 1 : .73) * (.85 + .15 * strength) * .5;
    const contour = uniforms.style.value === 3 ? 1 - Math.abs((along * .73 % 1) * 2 - 1) : .5 + .5 * lean;
    const height = style.height * (.74 + .42 * contour) * (.65 + .35 * strength) * (uniforms.motion.value ? 1 : .38);
    for (let i = 0; i < 3; i++) {
      point.copy(center).addScaledVector(side, (i - 1) * half + lean * .07);
      point.addScaledVector(up, i === 1 ? height : .031);
      position.setXYZ(vertex + i, point.x, point.y, point.z);
      sample.setXYZ(vertex + i, born, along, strength);
      surface.setXYZ(vertex + i, up.x, up.y, up.z);
    }
  }
  return {
    setSkin(id) {
      const next = driftTrailIndex(id);
      if (uniforms.style.value === next) return;
      style = DRIFT_TRAIL_STYLES[next];
      uniforms.style.value = next;
      uniforms.tint.value.set(style.tint);
      uniforms.core.value.set(style.core);
      accents.setStyle(next);
      reset();
    },
    tick(dt, reducedMotion, quality, enabled) {
      if (!enabled) { reset(); return; }
      clock += dt;
      uniforms.time.value = clock;
      uniforms.motion.value = reducedMotion ? 0 : 1;
      const tier = reducedMotion ? 'low' : quality;
      uniforms.detail.value = RIBBON_DETAIL[tier];
      accents.setQuality(tier);
      accents.tick(clock);
      if (count && clock - last >= LIFE) reset();
    },
    lay(tyre, to, side, up, along, strength) {
      if (!uniforms.style.value) return;
      const vertex = cursor * VERTICES;
      const born = tyre.trailTime ?? clock;
      edge(vertex, tyre.last, tyre.side, tyre.up, tyre.along, tyre.alpha, born);
      edge(vertex + 3, to, side, up, along, strength, clock);
      accents.emit(tyre, to, up, side, along, strength, clock);
      tyre.trailTime = last = clock;
      for (const attribute of written) {
        attribute.addUpdateRange(vertex * 3, VERTICES * 3);
        attribute.needsUpdate = true;
      }
      count = Math.min(count + 1, CAPACITY);
      cursor = (cursor + 1) % CAPACITY;
      geometry.setDrawRange(0, count * INDICES);
      mesh.visible = true;
    },
    place(shift) { if (mesh.visible) mesh.position.copy(shift); accents.place(shift); },
    reset,
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); accents.dispose(); },
  };
}
