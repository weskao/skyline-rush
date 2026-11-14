import * as THREE from 'three';
import { BODY_FRAGMENT, BODY_VERTEX } from './pickup-collect-shaders.js';

// Pickup choreography is authored in a car frame: +Y up, +Z tail. Map its design
// dimensions to the displayed vehicle's measured bounds, including asymmetric shapes.
const DESIGN_WIDTH = 2.4, DESIGN_HEIGHT = 1.4, DESIGN_NOSE = -2.45, DESIGN_TAIL = 2.25;
const DESIGN_LENGTH = DESIGN_TAIL - DESIGN_NOSE;

export function createPickupVehicleFit(player) {
  const originalBody = player?.userData.body;
  const offset = new THREE.Vector3(), scale = new THREE.Vector3();
  const vehicleFromBody = new THREE.Matrix4(), vehicleBounds = new THREE.Box3();
  const localSize = new THREE.Vector3();
  let shell, uniforms;
  if (originalBody?.isMesh) {
    uniforms = {
      primary: { value: new THREE.Color() }, secondary: { value: new THREE.Color() },
      progress: { value: 0 }, strength: { value: 0 }, tier: { value: 0 },
      zRange: { value: new THREE.Vector2() }, yRange: { value: new THREE.Vector2() },
      vehicleFromBody: { value: vehicleFromBody }, inflate: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: BODY_VERTEX, fragmentShader: BODY_FRAGMENT, uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    shell = new THREE.Mesh(originalBody.geometry, material);
    shell.name = 'Pickup body sweep';
    shell.userData.followsBody = true; // the garage rig binds it to the selected GLB body
    shell.renderOrder = 11;
    shell.visible = false;
    originalBody.add(shell);
  }

  function place(group, pose) {
    const bounds = pose.userData.visualBounds;
    if (bounds) {
      const { min, max } = bounds;
      scale.set((max.x - min.x) / DESIGN_WIDTH, Math.max(.05, (max.y - min.y) / DESIGN_HEIGHT), (max.z - min.z) / DESIGN_LENGTH);
      offset.set((min.x + max.x) * .5, min.y, max.z - DESIGN_TAIL * scale.z);
    } else {
      scale.setScalar(1);
      offset.setScalar(0);
    }
    pose.updateWorldMatrix(true, false);
    pose.matrixWorld.decompose(group.position, group.quaternion, group.scale);
    group.scale.multiply(scale);
    group.position.copy(offset).applyMatrix4(pose.matrixWorld);
  }

  function updateBody(slot, frame, secondary) {
    if (!shell) return;
    shell.visible = !!slot && slot.age < slot.style.life && !slot.reducedMotion && !frame.reducedMotion && frame.enabled !== false;
    if (!shell.visible) return;
    const geometry = shell.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    shell.updateWorldMatrix(true, false);
    vehicleFromBody.copy(player.matrixWorld).invert().multiply(shell.matrixWorld);
    const { min, max } = vehicleBounds.copy(geometry.boundingBox).applyMatrix4(vehicleFromBody);
    uniforms.zRange.value.set(min.z, max.z);
    uniforms.yRange.value.set(min.y, max.y);
    geometry.boundingBox.getSize(localSize);
    uniforms.inflate.value = Math.max(localSize.x, localSize.z) * .005;
    uniforms.primary.value.set(slot.style.color);
    uniforms.secondary.value.set(secondary);
    uniforms.tier.value = slot.tierIndex;
    uniforms.progress.value = slot.age / slot.style.life;
    uniforms.strength.value = slot.quality === 'low' ? .55 : .9;
  }

  return {
    place, updateBody,
    reset() { if (shell) shell.visible = false; },
    dispose() { shell?.removeFromParent(); shell?.material.dispose(); },
  };
}
