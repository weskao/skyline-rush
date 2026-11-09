import * as THREE from 'three';
import { MONSOON_TRACK, monsoonFrame } from './courses/monsoon-ruins-race.ts';
import { MONSOON_RUINS_COURSE, MONSOON_RUNOUT, sampleMonsoonRoute } from './courses/monsoon-ruins.ts';
import { createMonsoonRuinsChunk } from './courses/monsoon-ruins-scene.ts';
import { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import { DECK_DEPTH } from './road-falls.ts';

const CHUNK = 240, VIEW_RADIUS = 1500, BEHIND = 300;
function deckGeometry(from: number, to: number, x: number, top: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const rows = Math.max(1, Math.ceil((to - from) / 6));
  const sides = [[-1, 0], [1, 0], [1, -DECK_DEPTH], [-1, -DECK_DEPTH]] as const;
  for (let k = 0; k < sides.length; k++) {
    const [side, drop] = sides[k], [next, nextDrop] = sides[(k + 1) % sides.length];
    const start = vertices.length / 3;
    for (let i = 0; i <= rows; i++) {
      const frame = monsoonFrame(from + (to - from) * i / rows);
      for (const [lateral, y] of [
        [x + side * SHORTCUT_HALF_WIDTH, top + drop],
        [x + next * SHORTCUT_HALF_WIDTH, top + nextDrop],
      ]) vertices.push(
        frame.point.x + frame.right[0] * lateral + frame.up[0] * y,
        frame.point.y + frame.right[1] * lateral + frame.up[1] * y,
        frame.point.z + frame.right[2] * lateral + frame.up[2] * y,
      );
    }
    for (let i = 0; i < rows; i++) {
      const p = start + i * 2;
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function createMonsoonRuinsRaceScene(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'Monsoon Ruins race'; group.visible = false;
  const chunks: {
    group: THREE.Group; x: number; z: number; radius: number;
    update: (time: number, reduce?: boolean) => void; dispose: () => void;
  }[] = [];
  // Source scene distances are authored 0..12500; the shared graph spline's
  // measured odometer differs slightly. Both share the same world-space road.
  // Scenery runs on past FINISH so the post-race camera never looks out over an empty plane.
  const sceneryEnd = MONSOON_RUINS_COURSE.length + MONSOON_RUNOUT;
  for (let from = 0; from < sceneryEnd; from += CHUNK) {
    const to = Math.min(sceneryEnd, from + CHUNK);
    const chunk = createMonsoonRuinsChunk({ edgeId: 'ground', from, to, quality: 'medium' });
    // Obstacles are visual-only until the 1D game's collision adapter is wired.
    chunk.group.traverse(object => { if (object.name.startsWith('solid-')) object.visible = false; });
    const p = sampleMonsoonRoute('ground', (from + to) / 2).point;
    chunks.push({ ...chunk, x: p[0], z: p[2], radius: CHUNK / 2 + 80 });
    group.add(chunk.group);
  }
  const materials = {
    deck: new THREE.MeshStandardMaterial({ color: '#6c7563', roughness: .78, emissive: '#7bada0', emissiveIntensity: .1 }),
    pylon: new THREE.MeshStandardMaterial({ color: '#a2d8c7', emissive: '#6dc9ac', emissiveIntensity: .45 }),
  };
  const geometries: THREE.BufferGeometry[] = [];
  for (const section of MONSOON_TRACK.sections.filter(s => s.type === 'shortcut' && s.deck)) {
    const geometry = deckGeometry(section.from, section.to, section.x ?? 0,
      (section.altitude ?? 0) - SHORTCUT_TOLERANCE);
    const mesh = new THREE.Mesh(geometry, materials.deck);
    mesh.name = 'shortcut-deck'; group.add(mesh); geometries.push(geometry);
  }
  const spots = MONSOON_TRACK.sections.filter(s => s.type === 'shortcut').flatMap(s => shortcutPylons(s));
  const geometry = new THREE.BoxGeometry(.4, SHORTCUT_TOLERANCE * 2, .4);
  geometries.push(geometry);
  const pylons = new THREE.InstancedMesh(geometry, materials.pylon, spots.length);
  const marker = new THREE.Object3D();
  spots.forEach((spot, i) => {
    const f = monsoonFrame(spot.distance);
    marker.position.set(f.point.x + f.right[0] * spot.x, f.point.y + spot.altitude,
      f.point.z + f.right[2] * spot.x);
    marker.updateMatrix(); pylons.setMatrixAt(i, marker.matrix);
  });
  pylons.name = 'shortcut-pylons'; group.add(pylons);
  scene.add(group);
  return {
    group,
    update(distance: number, time = 0, reducedMotion = false): void {
      const { point, forward } = monsoonFrame(distance);
      group.visible = true;
      group.position.set(-point.x, -point.y, -point.z);
      for (const chunk of chunks) {
        const dx = chunk.x - point.x, dz = chunk.z - point.z;
        const visible = Math.hypot(dx, dz) < VIEW_RADIUS + chunk.radius &&
          dx * forward[0] + dz * forward[2] > -BEHIND - chunk.radius;
        chunk.group.visible = visible;
        if (visible) chunk.update(time, reducedMotion);
      }
    },
    hide(): void { group.visible = false; },
    dispose(): void {
      group.removeFromParent();
      chunks.forEach(c => c.dispose());
      geometries.forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
    },
  };
}
