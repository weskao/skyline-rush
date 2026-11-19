import * as THREE from 'three';
import { accentVertex, accentFragment } from './garage-drift-accent-shader.js';

// One shared pool for both tyres; capacity counts visible submissions, not new allocations.
const BUDGETS = {
  low: { spacing: 0, limit: 0 },
  medium: { spacing: 3.2, limit: 96 },
  high: { spacing: 1.6, limit: 224 },
  ultra: { spacing: 1.2, limit: 256 },
};
const CAPACITY = BUDGETS.ultra.limit;

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
  const contact = makeAttribute(3), up = makeAttribute(3), side = makeAttribute(3), birthSeedPower = makeAttribute(4);
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
  let quality = 'high', budget = BUDGETS.high;
  function reset() {
    next = geometry.instanceCount = 0;
    last = -Infinity;
    mesh.visible = false;
  }
  reset();

  function spawn(from, to, normal, across, fraction, born, cell, strength, sparkle) {
    const x = THREE.MathUtils.lerp(from.x, to.x, fraction);
    contact.setXYZ(next, x, THREE.MathUtils.lerp(from.y, to.y, fraction), THREE.MathUtils.lerp(from.z, to.z, fraction));
    up.setXYZ(next, normal.x, normal.y, normal.z);
    side.setXYZ(next, across.x, across.y, across.z);
    // Contact space and the distance cell give each tyre a stable, independent seed.
    const salt = Math.sin(cell * 11.91 + x * 9.23 + sparkle * 13.97) * 438.54;
    birthSeedPower.setXYZW(next, born, salt - Math.floor(salt), strength, sparkle);
    for (const attribute of attributes) {
      attribute.addUpdateRange(next * attribute.itemSize, attribute.itemSize);
      attribute.needsUpdate = true;
    }
    next = (next + 1) % budget.limit;
    geometry.instanceCount = Math.min(budget.limit, geometry.instanceCount + 1);
    mesh.visible = true;
  }

  return {
    setQuality(nextQuality) {
      if (quality === nextQuality) return;
      quality = nextQuality;
      budget = BUDGETS[quality];
      reset();
    },
    setStyle(style) {
      if (style === 1) geometry.setDrawRange(6, 12);
      else if (style === 3) geometry.setDrawRange(18, geometry.index.count - 18);
      else geometry.setDrawRange(0, 6);
    },
    emit(tyre, to, normal, across, along, strength, time) {
      if (!budget.limit) return;
      const { spacing } = budget;
      // Emit every crossed distance cell, even on a long frame. The skid discontinuity
      // check bounds the number of cells a single sample can cross.
      const first = Math.floor((tyre.along + 1e-6) / spacing) + 1;
      const end = Math.floor((along + 1e-6) / spacing);
      for (let cell = first; cell <= end; cell++) {
        const fraction = Math.min(1, (cell * spacing - tyre.along) / (along - tyre.along));
        const born = THREE.MathUtils.lerp(tyre.trailTime ?? time, time, fraction);
        spawn(tyre.last, to, normal, across, fraction, born, cell, strength, 0);
        if (quality === 'ultra' && cell % 2 === 0) {
          spawn(tyre.last, to, normal, across, fraction, born, cell, strength, 1);
        }
        last = time;
      }
    },
    tick(time) {
      if (mesh.visible && time - last >= 1.22) reset();
    },
    place(shift) { if (mesh.visible) mesh.position.copy(shift); },
    reset,
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
