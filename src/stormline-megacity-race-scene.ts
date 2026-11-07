import * as THREE from 'three';
import { STORMLINE_TRACK, stormlineFrame } from './courses/stormline-megacity-race.ts';
import { stormlineRuntimeLength as edgeLength, PLAYABLE_COURSE_GRAPH as graph } from './courses/stormline-megacity-runtime-adapter.ts';
import { sampleStormlineRoad } from './courses/stormline-course-graph.ts';
import { createStormlineChunk } from './courses/stormline-scenery.ts';
import { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import { DECK_DEPTH } from './road-falls.ts';

// Stormline Megacity RACE scene: the map's own streamable chunks (stormline-scenery.ts) along the raced ground
// route, built once from the same CourseGraph frame the simulation, cars and camera use, culled like Frostbite's
// race scene and translated by the race origin. Fork edges are raced as shortcut corridors over the safe edge,
// so only the ground route is drawn (no road where no car can drive).
const CHUNK = 300, VIEW_RADIUS = 1500, BEHIND = 300;

/** Deck top = corridor floor (altitude - tolerance), the slab the simulation treats as solid (`stepDeck`). */
function deckGeometry(from: number, to: number, x: number, top: number): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [], rows = Math.max(1, Math.ceil((to - from) / 6));
  const corners = [[-1, 0], [1, 0], [1, -DECK_DEPTH], [-1, -DECK_DEPTH]] as const;
  corners.forEach(([side, drop], k) => {
    const [nextSide, nextDrop] = corners[(k + 1) % corners.length], first = positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      const f = stormlineFrame(Math.min(to, from + i * 6));
      for (const [o, lift] of [[x + side * SHORTCUT_HALF_WIDTH, top + drop], [x + nextSide * SHORTCUT_HALF_WIDTH, top + nextDrop]])
        positions.push(f.point.x + f.right[0] * o + f.up[0] * lift, f.point.y + f.right[1] * o + f.up[1] * lift, f.point.z + f.right[2] * o + f.up[2] * lift);
    }
    for (let i = 0; i < rows; i++) { const p = first + i * 2; indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function createStormlineRaceScene(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'Stormline Megacity race'; group.visible = false;
  const chunks: { group: THREE.Object3D; x: number; z: number; radius: number }[] = [];
  const disposers: (() => void)[] = [];
  let offset = 0; // ground-route distance where this edge begins
  for (const edgeId of graph.groundRoute) {
    const length = edgeLength(edgeId);
    for (let from = 0; from < length; from += CHUNK) {
      const chunk = createStormlineChunk(edgeId, from, Math.min(length, from + CHUNK), sampleStormlineRoad, 'medium');
      // Authored hazards are not colliders in the shared 1D engine: hide them so no car drives through a barrier.
      chunk.group.traverse(object => { if (object.name.startsWith('stormline:hazard:')) object.visible = false; });
      const c = stormlineFrame(offset + Math.min(length, from + CHUNK / 2)).point;
      chunks.push({ group: chunk.group, x: c.x, z: c.z, radius: CHUNK / 2 + 60 });
      disposers.push(() => chunk.dispose());
      group.add(chunk.group);
    }
    offset += length;
  }
  const materials = {
    deck: new THREE.MeshStandardMaterial({ color: '#1b2541', emissive: '#2cc9ea', emissiveIntensity: .25, metalness: .42, roughness: .5 }),
    pylon: new THREE.MeshStandardMaterial({ color: '#f4d8ff', emissive: '#d13ae1', emissiveIntensity: .9 }),
    ground: new THREE.MeshStandardMaterial({ color: '#080f24', roughness: .35, metalness: .3 }),
  };
  // Shortcut corridors exactly where the simulation tests them: decks on drive forks, pylons on every fork.
  const shortcuts = STORMLINE_TRACK.sections.filter(s => s.type === 'shortcut');
  for (const s of shortcuts.filter(s => s.deck)) {
    const deck = new THREE.Mesh(deckGeometry(s.from, s.to, s.x ?? 0, (s.altitude ?? 0) - SHORTCUT_TOLERANCE), materials.deck);
    deck.name = 'shortcut-deck';
    const c = stormlineFrame((s.from + s.to) / 2).point;
    chunks.push({ group: deck, x: c.x, z: c.z, radius: (s.to - s.from) / 2 + 20 });
    group.add(deck);
  }
  const spots = shortcuts.flatMap(s => shortcutPylons(s));
  const pylons = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, SHORTCUT_TOLERANCE * 2, .4), materials.pylon, spots.length);
  const dummy = new THREE.Object3D();
  spots.forEach((p, i) => {
    const f = stormlineFrame(p.distance);
    dummy.position.set(f.point.x + f.right[0] * p.x, f.point.y + p.altitude, f.point.z + f.right[2] * p.x);
    dummy.updateMatrix(); pylons.setMatrixAt(i, dummy.matrix);
  });
  pylons.name = 'shortcut-pylons';
  // Wet city floor under the whole route, just below the street (viaducts stand on their own pillars).
  const box = new THREE.Box3();
  for (let d = 0; d <= STORMLINE_TRACK.length; d += 50) { const p = stormlineFrame(d).point; box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)); }
  box.expandByScalar(VIEW_RADIUS);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z).rotateX(-Math.PI / 2), materials.ground);
  ground.position.set(centre.x, -.25, centre.z); ground.name = 'city-floor';
  group.add(pylons, ground);
  scene.add(group);

  return {
    group,
    update(distance: number): void {
      const { point: p, forward: f } = stormlineFrame(distance);
      group.visible = true;
      group.position.set(-p.x, -p.y, -p.z);
      for (const c of chunks) {
        const dx = c.x - p.x, dz = c.z - p.z;
        c.group.visible = Math.hypot(dx, dz) < VIEW_RADIUS + c.radius && dx * f[0] + dz * f[2] > -BEHIND - c.radius;
      }
    },
    hide(): void { group.visible = false; },
    dispose(): void {
      group.removeFromParent();
      disposers.forEach(dispose => dispose());
      const geometries = new Set<THREE.BufferGeometry>();
      group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
      geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose());
    },
  };
}
