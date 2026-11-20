// Task 8c: what flies round the Sky Spiral while its kit is drawn: seabirds soaring in circles beside the road and one
// airship drifting further out. They are nodes of spiral-landmarks.glb on the kit's one material, so they add four
// instanced draws and no program. A bird is a body and two wings; each wing turns about its shoulder here, on the
// CPU. Everything moves with the scene clock: Reduced Motion holds the birds in their glide where they are.
import * as THREE from 'three';
import { SKY_LENGTH, SKY_SPIRAL, skyFrame, skyTowerOrigin } from './sky-track.ts';
import { SPIRAL_NODE_RADIUS, SPIRAL_NODE_SPAN, type SpiralNode, type SpiralPlacement } from './spiral-scenery-plan.ts';

export const SKY_LIFE_NODES = ['bird_body', 'bird_wing_l', 'bird_wing_r', 'airship'] as const;
/** The wing pivots in the bird's own space, mirrored on x (assets-src/spiral-landmarks/contract.json `bird.shoulders`). */
export const BIRD_SHOULDER = Object.freeze({ x: .08, y: .02 });
/** A flock circles `aside` of the road every `every` metres from `first`, on the side away from the tower (the struts
 *  run to it); the two nearest ahead of the car are flown. Where a kit piece stands in the circle it takes the other
 *  side, away from the helix only, or stays empty. */
export const SKY_FLOCKS = Object.freeze({ first: 600, every: 1100, behind: 150, ahead: 1100, birds: 7, aside: 115, radius: 55, above: 26, scale: 1.5 });
/** One airship, at the slot nearest the car, drawn inside `range`. */
export const SKY_AIRSHIP = Object.freeze({ first: 5200, every: 5000, aside: 420, above: 70, radius: 120, range: 2600 });
const SECTOR = 200, FLOCKS = 2, FIELDS = 5; // per flock: the circle's centre (x, y, z), a seed, the turn (-1 or 1)
const chance = (n: number): number => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
/** What a flyer must keep out of; the road's own signs, the struts and the clouds are cleared by where it flies. */
const solid = (node: SpiralNode): boolean => node === 'peak' || node === 'station' || node.startsWith('platform');

interface Host {
  /** Holds track space (sky-scene.js `parts.road`). */ road: THREE.Object3D;
  /** The shared scene clock, in seconds. */ clock: { value: number };
  /** The kit's placements for the lap being driven: its plan, not a second one (40 ms to make). */ plan(): readonly SpiralPlacement[];
}

export function createSpiralSkyLife(source: THREE.Object3D, { road, clock, plan }: Host) {
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert(), root = new THREE.Group();
  root.name = 'Sky Spiral sky life'; root.visible = false;
  function pool(node: string, capacity: number): THREE.InstancedMesh {
    const mesh = source.getObjectByName(node) as THREE.Mesh | undefined;
    if (!mesh?.isMesh) throw new Error(`node ${node} is missing`);
    const made = new THREE.InstancedMesh(mesh.geometry, mesh.material, capacity);
    made.name = node; made.frustumCulled = false; made.count = 0;
    made.userData.local = rootInverse.clone().multiply(mesh.matrixWorld); // the node's own (dequantization) transform
    root.add(made);
    return made;
  }
  const capacity = FLOCKS * SKY_FLOCKS.birds;
  const body = pool('bird_body', capacity), left = pool('bird_wing_l', capacity), right = pool('bird_wing_r', capacity), airship = pool('airship', 1);
  road.add(root);

  const flocks = new Float64Array(FLOCKS * FIELDS), ship = new THREE.Vector3(), spot = new THREE.Vector3();
  let flying = 0, sector = NaN, mode = false, shipSeed = 0, turn = 1;
  /** `spot`: `aside` of the road at `s`, away from the tower, or on the other side where a kit piece stands within
   *  `clear` of that and the helix is not near. False where neither is free. */
  function beside(s: number, endless: boolean, aside: number, above: number, clear: number): boolean {
    const { point, right: across } = skyFrame(s, endless || s > SKY_LENGTH), tower = skyTowerOrigin(s, endless);
    const placed = plan(), away = (point.x - tower.x) * across[0] + (point.z - tower.z) * across[2] < 0 ? 1 : -1; // also the turn: the near side flies the car's way
    const open = (point.x - tower.x) ** 2 + (point.z - tower.z) ** 2 > (2 * SKY_SPIRAL.radius + aside) ** 2;
    for (turn = away; ; turn = -away) {
      spot.set(point.x - across[0] * turn * aside, point.y + above, point.z - across[2] * turn * aside);
      if (!placed.some(p => solid(p.node) && spot.y > p.y + SPIRAL_NODE_SPAN[p.node][0] * p.scale - 15 && spot.y < p.y + SPIRAL_NODE_SPAN[p.node][1] * p.scale + 15
        && (p.x - spot.x) ** 2 + (p.z - spot.z) ** 2 < (SPIRAL_NODE_RADIUS[p.node] * p.scale + clear) ** 2)) return true;
      if (turn !== away || !open) return false;
    }
  }
  /** The circles within reach of the car: re-chosen every SECTOR of travel, not per frame. */
  function choose(distance: number, endless: boolean): void {
    flying = 0;
    for (let k = Math.max(0, Math.ceil((distance - SKY_FLOCKS.behind - SKY_FLOCKS.first) / SKY_FLOCKS.every)); flying < FLOCKS; k++) {
      const s = SKY_FLOCKS.first + k * SKY_FLOCKS.every;
      if (s >= distance + SKY_FLOCKS.ahead) break;
      if (!beside(s, endless, SKY_FLOCKS.aside, SKY_FLOCKS.above, SKY_FLOCKS.radius + 20)) continue;
      const o = flying++ * FIELDS;
      flocks[o] = spot.x; flocks[o + 1] = spot.y; flocks[o + 2] = spot.z; flocks[o + 3] = chance(k + .5); flocks[o + 4] = turn;
    }
    const slot = Math.max(0, Math.round((distance - SKY_AIRSHIP.first) / SKY_AIRSHIP.every)), s = SKY_AIRSHIP.first + (endless ? slot : Math.min(slot, 1)) * SKY_AIRSHIP.every;
    airship.count = Math.abs(s - distance) < SKY_AIRSHIP.range && beside(s, endless, SKY_AIRSHIP.aside, SKY_AIRSHIP.above, SKY_AIRSHIP.radius + 40) ? 1 : 0;
    ship.copy(spot); shipSeed = slot * 2.4;
  }

  const at = new THREE.Object3D(), matrix = new THREE.Matrix4(), hinge = new THREE.Matrix4();
  /** `at`, then a turn of `angle` about the front-to-back axis through the shoulder on `side`. */
  function wing(mesh: THREE.InstancedMesh, index: number, side: number, angle: number): void {
    const c = Math.cos(angle), s = Math.sin(angle), x = side * BIRD_SHOULDER.x, y = BIRD_SHOULDER.y;
    hinge.makeRotationZ(angle).setPosition(x - (c * x - s * y), y - (s * x + c * y), 0);
    mesh.setMatrixAt(index, matrix.multiplyMatrices(at.matrix, hinge).multiply(mesh.userData.local));
  }
  function fly(): void {
    const t = clock.value;
    let n = 0;
    at.scale.setScalar(SKY_FLOCKS.scale);
    for (let f = 0; f < flying; f++) {
      const o = f * FIELDS, seed = flocks[o + 3]!, way = flocks[o + 4]!;
      for (let j = 0; j < SKY_FLOCKS.birds; j++, n++) {
        const a = way * (t * .22 + seed * 6.2832 - j * .1), r = SKY_FLOCKS.radius + ((j & 1) * 2 - 1) * ((j + 1) >> 1) * 3.2; // 12 m/s, a loose V
        at.position.set(flocks[o]! + Math.cos(a) * r, flocks[o + 1]! + (j % 3) * 1.5 + Math.sin(t * .5 + j * 1.7) * 1.2, flocks[o + 2]! + Math.sin(a) * r);
        at.rotation.set(0, Math.atan2(way * Math.sin(a), -way * Math.cos(a)), -way * .32); // heads along the circle, banked into it
        at.updateMatrix();
        body.setMatrixAt(n, matrix.multiplyMatrices(at.matrix, body.userData.local));
        const flap = Math.sin(t * 5.5 + j * 2.1 + seed * 9) * (.2 + .3 * (.5 + .5 * Math.sin(t * .6 + j))); // beats, then glides
        wing(left, n, -1, -flap); wing(right, n, 1, flap);
      }
    }
    body.count = left.count = right.count = n;
    body.instanceMatrix.needsUpdate = left.instanceMatrix.needsUpdate = right.instanceMatrix.needsUpdate = true;
    if (!airship.count) return;
    const b = t * .02 + shipSeed; // 2.4 m/s round a 120 m circle
    at.position.set(ship.x + Math.cos(b) * SKY_AIRSHIP.radius, ship.y, ship.z + Math.sin(b) * SKY_AIRSHIP.radius);
    at.rotation.set(0, Math.atan2(Math.sin(b), -Math.cos(b)), 0); at.scale.setScalar(1); at.updateMatrix();
    airship.setMatrixAt(0, matrix.multiplyMatrices(at.matrix, airship.userData.local));
    airship.instanceMatrix.needsUpdate = true;
  }

  return {
    show(on: boolean): void { root.visible = on; },
    /** Per frame while shown, after the kit has streamed `distance` (its plan is the lap's). */
    stream(distance: number, endless: boolean): void {
      const here = Math.floor(distance / SECTOR); // a lap is a whole number of sectors: a new plan is a new sector
      if (here !== sector || endless !== mode) { choose(distance, endless); sector = here; mode = endless; }
      fly();
    },
    /** Frees the instance buffers only: the GLB's geometry and material belong to the model cache. */
    dispose(): void { root.removeFromParent(); for (const mesh of [body, left, right, airship]) mesh.dispose(); },
  };
}
export type SpiralSkyLife = ReturnType<typeof createSpiralSkyLife>;
