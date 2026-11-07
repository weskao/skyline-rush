import * as THREE from 'three';
import { VOLCANIC_ID, VOLCANIC_TRACK, volcanicFrame } from './courses/volcanic-crown-race.ts';
import { VOLCANIC_CROWN_RUNTIME as runtime, PLAYABLE_COURSE_GRAPH as graph } from './courses/volcanic-crown-runtime-adapter.ts';
import { VOLCANIC_CHUNK_METERS, createVolcanicCrownChunk } from './courses/volcanic-crown-scene.ts';
import { VOLCANIC_OBSTACLES } from './courses/volcanic-crown-obstacles.ts';
import { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import { DECK_DEPTH } from './road-falls.ts';

// Authored Volcanic chunks follow the very same unrounded CourseGraph arc lengths that
// the shared 1D driver traverses. No extra renderer, camera or physics loop.
const VIEW_RADIUS = 1500, BEHIND = 300;
function bridge(from: number, to: number, lane: number, altitude: number): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  const steps = Math.ceil((to - from) / 6), sides = [
    [-1, 0], [1, 0], [1, -DECK_DEPTH], [-1, -DECK_DEPTH],
  ] as const;
  for (let k = 0; k < sides.length; k++) {
    const [side, drop] = sides[k], [next, nextDrop] = sides[(k + 1) % sides.length], start = positions.length / 3;
    for (let i = 0; i <= steps; i++) {
      const f = volcanicFrame(from + (to - from) * i / steps);
      for (const [lateral, y] of [
        [lane + side * SHORTCUT_HALF_WIDTH, altitude + drop],
        [lane + next * SHORTCUT_HALF_WIDTH, altitude + nextDrop],
      ]) positions.push(
        f.point.x + f.right[0] * lateral + f.up[0] * y,
        f.point.y + f.right[1] * lateral + f.up[1] * y,
        f.point.z + f.right[2] * lateral + f.up[2] * y,
      );
    }
    for (let i = 0; i < steps; i++) {
      const p = start + i * 2;
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function createVolcanicCrownRaceScene(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'Volcanic Crown race'; group.visible = false;
  const chunks: {
    group: THREE.Group; x: number; z: number; radius: number;
    update: (time: number, reducedMotion?: boolean) => void; dispose: () => void;
  }[] = [];
  const hazardNames = new Set(VOLCANIC_OBSTACLES.map(o => o.id));
  let offset = 0;
  for (const edgeId of graph.groundRoute) {
    const length = runtime.edgeLength(edgeId);
    const count = Math.ceil(length / VOLCANIC_CHUNK_METERS);
    for (let i = 0; i < count; i++) {
      const chunk = createVolcanicCrownChunk(edgeId, i, 'medium');
      // 1D runtime has no obstacle-contact adapter. Do not show non-colliding boulders.
      chunk.group.traverse(object => {
        if (hazardNames.has(object.name) || object.name.endsWith('-warning')) object.visible = false;
      });
      const c = volcanicFrame(offset + Math.min(length, (i + .5) * VOLCANIC_CHUNK_METERS)).point;
      chunks.push({ ...chunk, x: c.x, z: c.z, radius: VOLCANIC_CHUNK_METERS / 2 + 80 });
      group.add(chunk.group);
    }
    offset += length;
  }
  const materials = {
    deck: new THREE.MeshStandardMaterial({ color: '#34383d', roughness: .75, emissive: '#fb5a21', emissiveIntensity: .18 }),
    pylons: new THREE.MeshStandardMaterial({ color: '#ff8d4e', emissive: '#ff642b', emissiveIntensity: .65 }),
  };
  const extraGeometry: THREE.BufferGeometry[] = [];
  for (const s of VOLCANIC_TRACK.sections.filter(section => section.type === 'shortcut' && section.deck)) {
    const geo = bridge(s.from, s.to, s.x ?? 0, (s.altitude ?? 0) - SHORTCUT_TOLERANCE);
    const mesh = new THREE.Mesh(geo, materials.deck);
    mesh.name = 'shortcut-deck'; group.add(mesh); extraGeometry.push(geo);
  }
  const spots = VOLCANIC_TRACK.sections.filter(s => s.type === 'shortcut').flatMap(s => shortcutPylons(s));
  const pylonGeometry = new THREE.BoxGeometry(.4, SHORTCUT_TOLERANCE * 2, .4);
  extraGeometry.push(pylonGeometry);
  const pylons = new THREE.InstancedMesh(pylonGeometry, materials.pylons, spots.length);
  const object = new THREE.Object3D();
  spots.forEach((p, i) => {
    const f = volcanicFrame(p.distance);
    object.position.set(f.point.x + f.right[0] * p.x, f.point.y + p.altitude, f.point.z + f.right[2] * p.x);
    object.updateMatrix(); pylons.setMatrixAt(i, object.matrix);
  });
  pylons.name = 'shortcut-pylons'; group.add(pylons);
  scene.add(group);

  return {
    group,
    update(distance: number, time = 0, reducedMotion = false): void {
      const { point, forward } = volcanicFrame(distance);
      group.visible = true;
      group.position.set(-point.x, -point.y, -point.z);
      for (const chunk of chunks) {
        const dx = chunk.x - point.x, dz = chunk.z - point.z;
        const visible = Math.hypot(dx, dz) < VIEW_RADIUS + chunk.radius &&
          dx * forward[0] + dz * forward[2] > -BEHIND - chunk.radius;
        chunk.group.visible = visible;
        if (visible) chunk.update(time, reducedMotion);
        // The chunk updates obstacle visibility internally. Keep non-colliding hazards hidden.
        chunk.group.traverse(o => {
          if (hazardNames.has(o.name) || o.name.endsWith('-warning')) o.visible = false;
        });
      }
    },
    hide(): void { group.visible = false; },
    dispose(): void {
      group.removeFromParent();
      chunks.forEach(chunk => chunk.dispose());
      extraGeometry.forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
    },
  };
}
