import * as THREE from 'three';

// Rings and pickups as one InstancedMesh per material: each frame costs one draw call per material in view,
// however many markers a dense layout shows. Instance 0 starts parked below the scene so the first-frame
// shader warmup draws every variant (WebKit builds a pipeline only on a real draw); an idle pool is hidden.
const PARKED = new THREE.Matrix4().makeTranslation(0, -1e4, 0);
export function createMarkerPool(name, geometry, materials, capacity) {
  const group = new THREE.Group(), meshes = {}, used = {}, drawn = [];
  group.name = name;
  group.userData.drawn = drawn; // [mesh, index, mesh, index, ...] of this frame, in item order
  for (const [key, material] of Object.entries(materials)) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = key; mesh.count = 1; mesh.visible = false;
    mesh.setMatrixAt(0, PARKED);
    meshes[key] = mesh; used[key] = 0;
    group.add(mesh);
  }
  return {
    group,
    begin() { drawn.length = 0; for (const key in used) used[key] = 0; },
    /** Adds one marker; false once that material's pool is full. */
    add(key, matrix) {
      const mesh = meshes[key], index = used[key];
      if (index >= capacity) return false;
      mesh.setMatrixAt(index, matrix);
      used[key] = index + 1;
      drawn.push(mesh, index);
      return true;
    },
    end() {
      for (const key in meshes) {
        const mesh = meshes[key], count = used[key];
        mesh.visible = count > 0;
        if (!count) continue;
        mesh.count = count;
        mesh.instanceMatrix.clearUpdateRanges();
        mesh.instanceMatrix.addUpdateRange(0, count * 16); // upload only the markers in use
        mesh.instanceMatrix.needsUpdate = true;
        // Invalidated every frame the markers move: the bound covers exactly this frame's markers, so a material
        // with nothing on screen is culled (no draw) and a live one never is. Reuses the mesh's sphere, no allocation.
        mesh.computeBoundingSphere();
      }
    },
    dispose() { for (const key in meshes) meshes[key].dispose(); },
  };
}

// What a marker pool drew this frame, in item order: tests and debugging read positions, materials and
// scales from here instead of from per-marker meshes.
export function drawnMarkers(group) {
  const drawn = group.userData.drawn;
  if (!drawn) return group.children.filter(mesh => mesh.visible);
  const markers = [];
  for (let i = 0; i < drawn.length; i += 2) {
    const mesh = drawn[i], matrix = new THREE.Matrix4(), marker = { material: mesh.material, geometry: mesh.geometry, position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3() };
    mesh.getMatrixAt(drawn[i + 1], matrix);
    matrix.decompose(marker.position, marker.quaternion, marker.scale);
    markers.push(marker);
  }
  return markers;
}
