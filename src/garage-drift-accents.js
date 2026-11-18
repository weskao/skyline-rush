import * as THREE from 'three';
import { accentVertex, accentFragment } from './garage-drift-accent-shader.js';

// Two tyres, one accent per 1.6 metres per tyre; a single fixed pool for every skin.
const CAPACITY = 256;
const SPACING = 1.6;

// Keep the quad, crossed flame cards and faceted shard in the same instanced mesh.
// A style draws only its own range, so every effect still costs one accent draw.
function accentGeometry() {
  const quad = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
  const faces = [0, 1, 2, 2, 1, 3];
  const positions = [...quad, ...quad, 0, -1, -1, 0, -1, 1, 0, 1, -1, 0, 1, 1];
  const index = [...faces, ...faces.map(i => i + 4), ...faces.map(i => i + 8)];
  const shade = Array(12).fill(1);
  const crystal = [
    [-.66, -.39, -.61], [.64, -.39, -.43], [.48, -.39, .39], [-.45, -.39, .55],
    [.25, 1.08, -.29], [-.17, .58, -.08],
  ];
  const facets = [
    [0, 4, 1, .54], [1, 4, 2, .88], [2, 4, 5, .32],
    [2, 5, 3, .66], [3, 5, 0, .81], [0, 5, 4, .97],
  ];
  for (const [a, b, c, light] of facets) {
    for (const vertex of [a, b, c]) {
      index.push(positions.length / 3);
      positions.push(...crystal[vertex]);
      shade.push(light);
    }
  }
  return new THREE.InstancedBufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('facetShade', new THREE.Float32BufferAttribute(shade, 1))
    .setIndex(index);
}

export function createDriftAccents(scene, shared) {
  const geometry = accentGeometry();
  geometry.setDrawRange(0, 6);
  const makeAttribute = size => new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * size), size)
    .setUsage(THREE.DynamicDrawUsage);
  const contact = makeAttribute(3), up = makeAttribute(3), side = makeAttribute(3), birthSeedPower = makeAttribute(3);
  geometry.setAttribute('contact', contact).setAttribute('roadUp', up)
    .setAttribute('roadSide', side).setAttribute('birthSeedPower', birthSeedPower);
  const attributes = [contact, up, side, birthSeedPower];
  const material = new THREE.ShaderMaterial({
    uniforms: shared, vertexShader: accentVertex, fragmentShader: accentFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Drift trail accents';
  mesh.frustumCulled = false;
  mesh.renderOrder = -.25;
  scene.add(mesh);
  let next = 0, last = -Infinity;
  function reset() {
    next = geometry.instanceCount = 0;
    last = -Infinity;
    mesh.visible = false;
  }
  reset();

  return {
    setStyle(style) {
      if (style === 1) geometry.setDrawRange(6, 12);
      else if (style === 3) geometry.setDrawRange(18, geometry.index.count - 18);
      else geometry.setDrawRange(0, 6);
    },
    emit(previous, to, normal, across, along, strength, time) {
      const cell = Math.floor(along / SPACING);
      if (!shared.detail.value || cell === Math.floor(previous / SPACING)) return;
      contact.setXYZ(next, to.x, to.y, to.z);
      up.setXYZ(next, normal.x, normal.y, normal.z);
      side.setXYZ(next, across.x, across.y, across.z);
      // Three-dimensional contact decorrelates the two tyres without frame-dependent randomness.
      const salt = Math.sin(cell * 11.91 + to.x * 9.23) * 438.54;
      birthSeedPower.setXYZ(next, time, salt - Math.floor(salt), strength);
      for (const attribute of attributes) {
        attribute.addUpdateRange(next * 3, 3);
        attribute.needsUpdate = true;
      }
      next = (next + 1) % CAPACITY;
      geometry.instanceCount = Math.min(CAPACITY, geometry.instanceCount + 1);
      last = time;
      mesh.visible = true;
    },
    tick(time) {
      if (mesh.visible && (!shared.detail.value || time - last >= 1.22)) reset();
    },
    place(shift) { if (mesh.visible) mesh.position.copy(shift); },
    reset,
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
