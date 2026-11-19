import * as THREE from 'three';

type Vec3 = readonly [number, number, number];
/** The road frame where the drawn route ends: the run-out joins it with the same position and tangent. */
export interface RunoutEnd { point: Vec3; forward: Vec3; right: Vec3; up: Vec3 }
export interface RunoutStyle {
  width: number; length: number;
  /** The map's own road material parameters, so the run-out reads as the same asphalt. */
  road: THREE.MeshStandardMaterialParameters; rail: THREE.ColorRepresentation; mark: THREE.ColorRepresentation;
  /** Embankment colour and reach beyond each road edge. */
  bed: THREE.ColorRepresentation; shoulder?: number; depth?: number;
}

/**
 * Drawing only (.claude/rules/road-runout.md): past the finish the road runs straight on along its last
 * heading and grade, with rails, a dashed centre line and an embankment, so the parked car never sits at a deck
 * that ends in the air. Nothing is simulated on it. Built once with its scene; static afterwards.
 */
export function createRoadRunout(end: RunoutEnd, style: RunoutStyle) {
  const { width, length, shoulder = 8, depth = 6 } = style;
  const right = new THREE.Vector3(...end.right), up = new THREE.Vector3(...end.up);
  const back = new THREE.Vector3().crossVectors(right, up); // right × up keeps a proper rotation
  const forward = new THREE.Vector3(...end.forward);
  const basis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back));
  const origin = new THREE.Vector3(...end.point);
  const group = new THREE.Group();
  group.name = 'road-runout';
  const materials = [
    new THREE.MeshStandardMaterial({ ...style.road, side: THREE.FrontSide }),
    new THREE.MeshStandardMaterial({ color: style.bed, roughness: .95 }),
    new THREE.MeshBasicMaterial({ color: style.rail }),
    new THREE.MeshBasicMaterial({ color: style.mark }),
  ];
  // A box of size (x, y, length) whose top centre sits `lateral` across and `lift` above the road surface.
  const slab = (x: number, y: number, lateral: number, lift: number, material: THREE.Material, name: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x, y, length), material);
    mesh.position.copy(origin).addScaledVector(forward, length / 2).addScaledVector(right, lateral)
      .addScaledVector(up, lift - y / 2);
    mesh.quaternion.copy(basis); mesh.name = name; group.add(mesh);
  };
  slab(width, .4, 0, 0, materials[0], 'road-runout-deck');
  slab(width + 2 * shoulder, depth, 0, -.05, materials[1], 'road-runout-bed');
  for (const side of [-1, 1]) slab(.35, .9, side * (width / 2 - .2), .9, materials[2], 'road-runout-rail');
  const dash = 6, gap = 6, count = Math.floor(length / (dash + gap));
  const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .04, dash), materials[3], count);
  const at = new THREE.Object3D();
  at.quaternion.copy(basis);
  for (let i = 0; i < count; i++) {
    at.position.copy(origin).addScaledVector(forward, gap + i * (dash + gap) + dash / 2).addScaledVector(up, .02);
    at.updateMatrix(); marks.setMatrixAt(i, at.matrix);
  }
  marks.name = 'road-runout-marks'; group.add(marks);
  return {
    group,
    /** Midpoint of the run-out, for a scene's distance culling (radius = length / 2). */
    centre: origin.clone().addScaledVector(forward, length / 2),
    dispose(): void {
      group.removeFromParent();
      group.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      materials.forEach(m => m.dispose());
    },
  };
}
