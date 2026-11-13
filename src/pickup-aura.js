// Soft additive halo behind every pickup: one instanced quad pool (one draw call) shared by the race and the guide.
import * as THREE from 'three';
import { PICKUP_ACCENTS, PICKUP_SIZES, pickupPulse } from './pickup-art.js';
import { glowTexture } from './pickup-collect-vfx.js';

const HALO_SCALE = 2.6, HALO_LEVEL = .5;
const PARKED = new THREE.Matrix4().makeTranslation(0, -1e4, 0);
const scratch = new THREE.Object3D(), tint = new THREE.Color();

export function createPickupAura(capacity) {
  const texture = glowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, capacity);
  mesh.name = 'Pickup aura';
  // Instance 0 starts parked with a colour so the instanced-colour program is warmed before racing (marker-pool.js).
  mesh.setMatrixAt(0, PARKED);
  mesh.setColorAt(0, tint.set(0xffffff));
  mesh.count = 1;
  mesh.visible = false;
  let used = 0;
  return {
    mesh,
    begin() { used = 0; },
    /** One halo at a pickup's animated position, facing the camera and breathing with its emissive pulse. */
    add(tier, position, facing, time, reducedMotion) {
      if (used >= capacity) return;
      const pulse = pickupPulse(tier, time, reducedMotion);
      scratch.position.copy(position);
      scratch.quaternion.copy(facing);
      scratch.scale.setScalar((PICKUP_SIZES[tier] ?? PICKUP_SIZES.cell) * HALO_SCALE * (.9 + .1 * pulse));
      scratch.updateMatrix();
      mesh.setMatrixAt(used, scratch.matrix);
      mesh.setColorAt(used++, tint.set(PICKUP_ACCENTS[tier] ?? 0xffffff).multiplyScalar(HALO_LEVEL * pulse));
    },
    end() {
      mesh.visible = used > 0;
      if (!used) return;
      mesh.count = used;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere(); // this frame's halos only, as marker-pool.js does
    },
    dispose() { mesh.geometry.dispose(); material.dispose(); texture.dispose(); mesh.dispose(); },
  };
}
