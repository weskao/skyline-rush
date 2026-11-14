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
  const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3();
  const roadBasis = new THREE.Matrix4();
  let shell, shells = [], uniforms, sectionSource, fittedSections;
  if (originalBody?.isMesh) {
    uniforms = {
      primary: { value: new THREE.Color() }, secondary: { value: new THREE.Color() },
      progress: { value: 0 }, strength: { value: 0 }, tier: { value: 0 },
      zRange: { value: new THREE.Vector2() }, yRange: { value: new THREE.Vector2() },
      vehicleInverse: { value: new THREE.Matrix4() }, inflate: { value: 0 }, paintLight: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: BODY_VERTEX, fragmentShader: BODY_FRAGMENT, uniforms,
      // Alpha-blended tint, not additive light: additive clips to white on light paints (R2 default) and vanishes.
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    shell = new THREE.Mesh(originalBody.geometry, material);
    shell.name = 'Pickup body sweep';
    shell.userData.followsBody = true; // the garage rig binds it to the selected GLB body
    // Every other painted procedural part (wing, merged trim) gets its own shell, so a car whose silhouette is
    // mostly not `body` still lights up as a whole. Not riders: a dressed GLB masks them with their parent part.
    const painted = [];
    player.traverse(object => { if (object.isMesh && object !== originalBody && object.material === originalBody.material) painted.push(object); });
    shells = [shell, ...painted.map(part => {
      const extra = new THREE.Mesh(part.geometry, material);
      extra.name = 'Pickup paint sweep';
      part.add(extra);
      return extra;
    })];
    for (const mesh of shells) { mesh.renderOrder = 11; mesh.visible = false; }
    originalBody.add(shell);
  }

  function place(group, pose, roadNormal) {
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
    if (!roadNormal) return;
    up.copy(roadNormal).normalize();
    back.setFromMatrixColumn(pose.matrixWorld, 2).projectOnPlane(up);
    if (back.lengthSq() < 1e-8) back.setFromMatrixColumn(pose.matrixWorld, 0).cross(up);
    back.normalize();
    right.crossVectors(up, back).normalize();
    group.quaternion.setFromRotationMatrix(roadBasis.makeBasis(right, up, back));
  }

  function absorbTarget(pose, target) {
    const bounds = pose.userData.visualBounds;
    if (bounds) {
      const { min, max } = bounds;
      target.set(max.x - .12, THREE.MathUtils.lerp(min.y, max.y, .62), THREE.MathUtils.lerp(min.z, max.z, .61));
    } else target.set(1.08, .87, .42);
    return pose.localToWorld(target);
  }

  function sections(pose) {
    const profile = pose?.userData.pickupProfile;
    if (sectionSource !== profile) {
      sectionSource = profile;
      fittedSections = profile?.sections.map(section => {
        const { min, max } = profile.bounds;
        const center = (min.x + max.x) * .5;
        const width = (max.x - min.x) / DESIGN_WIDTH, height = Math.max(.05, (max.y - min.y) / DESIGN_HEIGHT);
        return { left: (section.left - center) / width, right: (section.right - center) / width,
          top: (section.top - min.y) / height };
      });
    }
    return fittedSections;
  }

  function updateBody(slot, frame, secondary) {
    if (!shell) return;
    const visible = !!slot && slot.age < slot.style.life && !slot.reducedMotion && !frame.reducedMotion && frame.enabled !== false;
    for (const mesh of shells) mesh.visible = visible;
    if (!visible) return;
    const geometry = shell.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    shell.updateWorldMatrix(true, false);
    uniforms.vehicleInverse.value.copy(player.matrixWorld).invert();
    vehicleFromBody.multiplyMatrices(uniforms.vehicleInverse.value, shell.matrixWorld);
    const { min, max } = vehicleBounds.copy(geometry.boundingBox).applyMatrix4(vehicleFromBody);
    uniforms.zRange.value.set(min.z, max.z);
    uniforms.yRange.value.set(min.y, max.y);
    geometry.boundingBox.getSize(localSize);
    uniforms.inflate.value = Math.max(localSize.x, localSize.z) * .005;
    // Paint of the body carrying the shell (procedural, or the GLB body after a garage re-dress; Garage paints included).
    // shortcut: a textured paint is judged by its colour factor only; sample the map if a white-factor GLB paint appears.
    const paint = shell.parent?.material?.color;
    uniforms.paintLight.value = paint ? THREE.MathUtils.smoothstep(paint.r * .2126 + paint.g * .7152 + paint.b * .0722, .25, .75) : 0;
    uniforms.primary.value.set(slot.style.color);
    uniforms.secondary.value.set(secondary);
    uniforms.tier.value = slot.tierIndex;
    uniforms.progress.value = slot.age / slot.style.life;
    uniforms.strength.value = slot.quality === 'low' ? .55 : .9;
  }

  return {
    place, updateBody, absorbTarget, sections,
    reset() { for (const mesh of shells) mesh.visible = false; },
    dispose() { for (const mesh of shells) mesh.removeFromParent(); shell?.material.dispose(); },
  };
}
