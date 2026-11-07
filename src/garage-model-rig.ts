// Task 4: binds a GLB car's named nodes and materials to the procedural car that the frame loop animates
// (wheels, active wing, lift fans, paint, light colour). GLB pivots sit at the procedural pivots, so each bound node
// copies its partner's local TRS. Per frame: copies only, no allocation.
import type { Color, Material, Mesh, Object3D } from 'three';

interface Tinted extends Material { color?: Color; emissive?: Color; metalness?: number; roughness?: number }
interface CarParts {
  wheels?: Object3D[];
  jets?: Object3D;
  wing?: Object3D & { userData: { blade?: Object3D; rams?: Object3D } };
  body?: Mesh;
  brakeLight?: { color: Color };
}

export interface GarageRig { update(): void; dispose(): void }

const corner = (o: Object3D): string => `wheel_${o.position.z < 0 ? 'f' : 'r'}${o.position.x < 0 ? 'l' : 'r'}`;

function boundPairs(car: Object3D, instance: Object3D): [Object3D, Object3D][] {
  const { wheels = [], wing, jets } = car.userData as CarParts;
  // Only wheels authored to the rig contract (a `<wheel>_spin` pivot child) follow; the Phase 2 probe's wheels
  // sit on their own pivots and would be thrown off by the procedural TRS.
  const rigged = wheels.filter(w => instance.getObjectByName(`${corner(w)}_spin`)?.parent?.name === corner(w));
  const procedural: [string, Object3D | undefined][] = rigged.flatMap(w => [
    [corner(w), w], [`${corner(w)}_spin`, w.getObjectByName('Roadster wheel spin')],
  ] as [string, Object3D | undefined][]);
  if (wing) {
    const { blade, rams } = wing.userData;
    const tips = blade?.children.filter(c => c.userData.fold) ?? [];
    procedural.push(['wing', wing], ['wing_blade', blade], ['wing_rams', rams],
      ['wing_tip_l', tips.find(t => t.position.x < 0)], ['wing_tip_r', tips.find(t => t.position.x > 0)]);
  }
  procedural.push(['lift_fans', jets]); // Task 4b: shown only while thrusting, like the procedural fans
  const pairs: [Object3D, Object3D][] = [];
  for (const [name, source] of procedural) {
    const target = instance.getObjectByName(name);
    if (source && target) pairs.push([target, source]);
  }
  return pairs;
}

/** Gives `instance` its own paint/light materials (named `<x>_paint` / `<x>_light`) and binds them and its nodes to `car`. */
export function bindGarageRig(car: Object3D, instance: Object3D): GarageRig {
  const parts = car.userData as CarParts;
  const pairs = boundPairs(car, instance);
  const owned = new Map<Material, Tinted>();
  instance.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || !/_(paint|light)$/.test(mesh.material.name)) return;
    if (!owned.has(mesh.material)) owned.set(mesh.material, mesh.material.clone() as Tinted);
    mesh.material = owned.get(mesh.material)!;
  });
  const paints = [...owned.values()].filter(m => m.name.endsWith('_paint'));
  const lights = [...owned.values()].filter(m => m.name.endsWith('_light'));
  return {
    update() {
      for (const [target, source] of pairs) {
        target.position.copy(source.position);
        target.quaternion.copy(source.quaternion);
        target.scale.copy(source.scale);
        target.visible = source.visible;
      }
      const body = parts.body?.material as Tinted | undefined;
      if (body?.color) for (const paint of paints) {
        paint.color?.copy(body.color);
        paint.metalness = body.metalness;
        paint.roughness = body.roughness;
      }
      if (parts.brakeLight) for (const light of lights) light.emissive?.copy(parts.brakeLight.color);
    },
    dispose() { for (const material of owned.values()) material.dispose(); },
  };
}
