import * as THREE from 'three';
import { FROSTBITE_CANYON_GRAPH as graph, FROSTBITE_SEED } from './courses/frostbite-canyon.ts';
import { FROSTBITE_TRACK, frostbiteFrame, frostbiteLeg } from './courses/frostbite-race.ts';
import { routeLength } from './course-route-frame.ts';
import { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import type { TrackSection } from './game-types.ts';
import { seededRng } from './rng.ts';
import { crystalField, crystalSentinels, edgeReflectors, iceArch } from './upcoming-scenes/frostbite-landmarks.ts';
import { paintGlacier, ridgeNoise, smooth } from './upcoming-scenes/frostbite-terrain.ts';

// Frostbite Canyon RACE scene: the whole 13.8 km ground route, built once from the same `frostbiteFrame`
// the simulation, cars and camera use, cut into spatially culled chunks and translated by the race origin.
export const ROAD_HALF = 12; // drawn road; the simulation's ROAD_LIMIT (10.2 m) sits inside it, as on every track
// The shared FogExp2 (density .0013) leaves under 3% of a surface visible past 1.5 km.
const CHUNK = 600, ROAD_STEP = 6, VIEW_RADIUS = 1500, BEHIND = 300;
// World-aligned terrain tiles: a route-following strip folds over itself inside bends tighter than its width.
const TILE = 480, CELL = 24, REACH = 340;
const LENGTH = FROSTBITE_TRACK.length, RUNOFF = 500;
// Visual only: the road runs straight on past FINISH so the finish camera never faces a snow wall (race frames clamp).
const END = frostbiteFrame(LENGTH);
function frameAt(s: number) {
  if (s <= LENGTH) return frostbiteFrame(s);
  const k = s - LENGTH, f = END.forward;
  return { ...END, point: { x: END.point.x + f[0] * k, y: END.point.y + f[1] * k, z: END.point.z + f[2] * k } };
}

/** Canyon floor follows the nearest road (inverse-distance blend), walls rise once 24 m clear of any road edge. */
export function createCorridorHeight() {
  const BUCKET = 120, buckets = new Map<string, number[]>();
  const key = (x: number, z: number): string => Math.floor(x / BUCKET) + ',' + Math.floor(z / BUCKET);
  for (let s = 0; s <= LENGTH + RUNOFF; s += 8) {
    const p = frameAt(s).point, k = key(p.x, p.z);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p.x, p.y, p.z);
  }
  return function height(x: number, z: number, fallbackY = 0): number {
    let nearest = Infinity, weight = 0, sum = 0;
    const cx = Math.floor(x / BUCKET), cz = Math.floor(z / BUCKET);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = buckets.get((cx + i) + ',' + (cz + j));
      if (list) for (let n = 0; n < list.length; n += 3) {
        const d = Math.hypot(x - list[n], z - list[n + 2]), w = 1 / (d ** 4 + 1);
        nearest = Math.min(nearest, d); weight += w; sum += w * list[n + 1];
      }
    }
    // Flat floor while a 24 m terrain cell can still touch the road (12 + 24·√2 < 48 m), then walls.
    const floor = (weight ? sum / weight : fallbackY) - .55, edge = Math.min(nearest, BUCKET) - ROAD_HALF;
    // shortcut: road distance is capped at BUCKET, so walls plateau beyond ~120 m; widen BUCKET for far ridges.
    return floor + smooth(36, 115, edge) * (34 + 18 * ridgeNoise(x * .7, z * .7))
      + smooth(110, 300, edge) * (60 + 30 * ridgeNoise(z * .3, x * .3));
  };
}

interface Mesh { positions: number[]; indices: number[] }
/** Rows along the route at `offsets` (right-positive); triangles wind so normals face up. */
function strip(out: Mesh, from: number, to: number, step: number, offsets: readonly number[], y: (x: number, z: number, roadY: number) => number): void {
  const rows = Math.max(1, Math.ceil((to - from) / step)), first = out.positions.length / 3, cols = offsets.length;
  for (let i = 0; i <= rows; i++) {
    const f = frameAt(Math.min(to, from + i * step));
    for (const o of offsets) {
      const x = f.point.x + f.right[0] * o, z = f.point.z + f.right[2] * o;
      out.positions.push(x, y(x, z, f.point.y), z);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols - 1; j++) {
    const a = first + i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    out.indices.push(a, b, c, b, d, c);
  }
}
function geometry(mesh: Mesh): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  g.setIndex(mesh.indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
const empty = (): Mesh => ({ positions: [], indices: [] });

// Shortcut structures: the deck top is the corridor floor (altitude - tolerance); everything over the
// drivable road keeps >= 2.8 m clearance, supports stand past the road edge on the canyon floor.
type Outline = readonly (readonly [number, number])[]; // [lateral, lift] corners, clockwise seen from behind
/** Extrudes a closed cross-section along the route; each face gets its own vertices so edges stay crisp. */
function extrude(out: Mesh, from: number, to: number, outline: Outline, rise: (s: number) => number = () => 0, step = ROAD_STEP, at = frameAt): void {
  const rows = Math.max(1, Math.ceil((to - from) / step));
  outline.forEach((a, k) => {
    const b = outline[(k + 1) % outline.length], first = out.positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      const s = Math.min(to, from + i * step), f = at(s), r = rise(s);
      for (const [o, lift] of [a, b]) out.positions.push(f.point.x + f.right[0] * o, f.point.y + lift + r, f.point.z + f.right[2] * o);
    }
    for (let i = 0; i < rows; i++) { const p = first + i * 2; out.indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  });
}
const box = (l: number, r: number, bottom: number, top: number): Outline => [[l, top], [r, top], [r, bottom], [l, bottom]];
const DECK_DEPTH = .45, SUPPORT_LATERAL = ROAD_HALF + 3;
type Style = 'glacier-ridge' | 'rift-ice-bridge' | 'aurora-span';
const STYLES: Record<string, Style> = { 'glacier-valley': 'glacier-ridge', 'rift-lower-canyon': 'rift-ice-bridge', 'aurora-basin': 'aurora-span' };
// Ridge: squat stone buttresses; bridge: tapering ice piers with icicles; span: tall glowing towers carrying a cable.
const KIT: Record<Style, { spacing: number; geometry: () => THREE.BufferGeometry; top: number; support: string; rail: string; glow: number }> = {
  'glacier-ridge': { spacing: 20, geometry: () => new THREE.CylinderGeometry(1.1, 1.7, 1, 4), top: 0, support: '#3b4f6b', rail: '#eef7ff', glow: 0 },
  'rift-ice-bridge': { spacing: 30, geometry: () => new THREE.CylinderGeometry(.9, 1.6, 1, 7), top: 0, support: '#7fb9e0', rail: '#cfe9ff', glow: .3 },
  'aurora-span': { spacing: 40, geometry: () => new THREE.CylinderGeometry(.45, .8, 1, 6), top: 15, support: '#6fe3ff', rail: '#9fe9ff', glow: .9 },
};

function placed(geometry: THREE.BufferGeometry, material: THREE.Material, spots: THREE.Matrix4[], name: string): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
  spots.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.name = name;
  return mesh;
}
const dummy = new THREE.Object3D();
function matrixAt(s: number, lateral: number, y: number, size: [number, number, number], span = false): THREE.Matrix4 {
  const f = frostbiteFrame(s, span);
  dummy.position.set(f.point.x + f.right[0] * lateral, y, f.point.z + f.right[2] * lateral);
  dummy.rotation.set(0, Math.atan2(f.forward[0], f.forward[2]), 0); dummy.scale.set(...size); dummy.updateMatrix();
  return dummy.matrix.clone();
}

/** Horizontal distance from (x, z) to the ground route between two race distances (build time only). */
function nearestRoad(x: number, z: number, from: number, to: number): number {
  let best = Infinity;
  for (let s = Math.max(0, from); s <= Math.min(LENGTH, to); s += 4) { const p = frostbiteFrame(s).point; best = Math.min(best, Math.hypot(p.x - x, p.z - z)); }
  return best;
}

function shortcutStructure(section: TrackSection, height: (x: number, z: number) => number, deckMaterial: THREE.Material, hazard: THREE.Material): THREE.Group {
  const style = STYLES[frostbiteLeg((section.from + section.to) / 2).edgeId], kit = KIT[style];
  const { from, to } = section, x = section.x!, top = section.altitude! - SHORTCUT_TOLERANCE, under = top - DECK_DEPTH, span = !!section.span;
  const at = (s: number) => frostbiteFrame(s, span), put = (s: number, lateral: number, y: number, size: [number, number, number]) => matrixAt(s, lateral, y, size, span);
  const side = Math.sign(x), lateral = side * SUPPORT_LATERAL;
  const root = new THREE.Group(); root.name = style;
  const rail = new THREE.MeshStandardMaterial({ color: kit.rail, emissive: kit.rail, emissiveIntensity: kit.glow * .4, roughness: .35, metalness: .2 });
  const deck = empty(), rails = empty();
  extrude(deck, from, to, box(x - SHORTCUT_HALF_WIDTH, x + SHORTCUT_HALF_WIDTH, under, top), undefined, undefined, at);
  for (const edge of [x - SHORTCUT_HALF_WIDTH, x + SHORTCUT_HALF_WIDTH]) extrude(rails, from, to, box(edge - .3, edge + .3, under - .05, top + .35), undefined, undefined, at);
  const supportSpots: THREE.Matrix4[] = [], beamSpots: THREE.Matrix4[] = [], postSpots: THREE.Matrix4[] = [], icicleSpots: THREE.Matrix4[] = [];
  for (let s = from + kit.spacing / 2; s < to; s += kit.spacing) {
    const f = at(s), head = f.point.y + (kit.top || under);
    // On the span the deck crosses the lower canyon: a pier that would stand on that road moves to the deck's other side.
    const foot = [lateral, -lateral].find(l => !span || nearestRoad(f.point.x + f.right[0] * l, f.point.z + f.right[2] * l, from - 400, to + 400) > ROAD_HALF + 4);
    if (foot !== undefined) {
      const ground = height(f.point.x + f.right[0] * foot, f.point.z + f.right[2] * foot) - 1, edge = x + Math.sign(foot) * SHORTCUT_HALF_WIDTH;
      supportSpots.push(put(s, foot, (ground + head) / 2, [1, head - ground, 1]));
      beamSpots.push(put(s, (foot + edge) / 2, f.point.y + under + DECK_DEPTH / 2, [Math.abs(foot - edge) + 1.2, DECK_DEPTH, 1.2]));
    }
    if (style === 'rift-ice-bridge') for (const o of [.6, 1.4, 2.2]) icicleSpots.push(put(s + o * 3 - 3, side * (ROAD_HALF + .5 + o), f.point.y + under - .9, [.35, 1.8, .35]));
  }
  for (let s = from + 6; s < to; s += 12) for (const edge of [x - SHORTCUT_HALF_WIDTH, x + SHORTCUT_HALF_WIDTH]) postSpots.push(put(s, edge, at(s).point.y + top + .8, [.25, .9, .25]));
  const supportMaterial = new THREE.MeshStandardMaterial({ color: kit.support, emissive: kit.support, emissiveIntensity: kit.glow * .5, roughness: .45, flatShading: true });
  const deckMesh = new THREE.Mesh(geometry(deck), deckMaterial), railMesh = new THREE.Mesh(geometry(rails), rail);
  deckMesh.name = 'shortcut-ice-decks'; railMesh.name = 'structure-rails';
  root.add(deckMesh, railMesh,
    placed(kit.geometry(), supportMaterial, supportSpots, 'structure-supports'),
    placed(new THREE.BoxGeometry(1, 1, 1), rail, beamSpots, 'structure-beams'),
    placed(new THREE.BoxGeometry(1, 1, 1), hazard, postSpots, 'hazard-posts'));
  if (icicleSpots.length) root.add(placed(new THREE.ConeGeometry(1, 1, 5).rotateX(Math.PI), supportMaterial, icicleSpots, 'bridge-icicles'));
  if (style === 'aurora-span') {
    // One catenary per tower pair, outside the road: towers top out at kit.top, the cable sags to 6 m mid-span.
    const cable = empty(), first = from + kit.spacing / 2;
    extrude(cable, first, to - kit.spacing / 2, box(lateral - .12, lateral + .12, -.12, .12), s => 6 + (kit.top - 6) * (2 * (((s - first) / kit.spacing) % 1) - 1) ** 2, 2);
    const cables = new THREE.Mesh(geometry(cable), rail); cables.name = 'span-cables';
    root.add(cables);
  }
  return root;
}

/** Tiles within REACH of the route, each with the nearest road height as the far-wall fallback. */
function terrainTiles(): Map<string, number> {
  const tiles = new Map<string, { y: number; d: number }>();
  for (let s = 0; s <= LENGTH + RUNOFF; s += 40) {
    const p = frameAt(s).point;
    for (let tx = Math.floor((p.x - REACH) / TILE); tx <= Math.floor((p.x + REACH) / TILE); tx++)
      for (let tz = Math.floor((p.z - REACH) / TILE); tz <= Math.floor((p.z + REACH) / TILE); tz++) {
        const k = tx + ',' + tz, d = Math.hypot((tx + .5) * TILE - p.x, (tz + .5) * TILE - p.z), seen = tiles.get(k);
        if (!seen || d < seen.d) tiles.set(k, { y: p.y, d });
      }
  }
  return new Map([...tiles].map(([k, v]) => [k, v.y]));
}

export function createFrostbiteRaceScene(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'Frostbite Canyon race'; group.visible = false;
  const height = createCorridorHeight();
  const materials = {
    terrain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .04, flatShading: true }),
    road: new THREE.MeshStandardMaterial({ color: '#4d6b91', roughness: .5, metalness: .12 }),
    paint: new THREE.MeshBasicMaterial({ color: '#cfefff' }),
    pylon: new THREE.MeshStandardMaterial({ color: '#d8f6ff', emissive: '#3fd8ff', emissiveIntensity: .8 }),
    // Frosted ice: translucent so a car on the lower road under the corridor stays visible to the chase camera.
    deck: new THREE.MeshStandardMaterial({ color: '#8fd8ff', emissive: '#1d6f9c', emissiveIntensity: .35, roughness: .2, transparent: true, opacity: .55, depthWrite: false }),
    hazard: new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff6a10', emissiveIntensity: 1.4 }),
  };
  const chunks: { group: THREE.Group; x: number; z: number; radius: number }[] = [];
  for (let from = 0; from < LENGTH + RUNOFF; from += CHUNK) {
    const to = Math.min(LENGTH + RUNOFF, from + CHUNK), chunk = new THREE.Group(), road = empty(), paint = empty();
    chunk.name = `frostbite-chunk-${from}`;
    strip(road, from, to, ROAD_STEP, [-ROAD_HALF, ROAD_HALF], (_x, _z, y) => y);
    for (const edge of [-10.75, 10.45]) strip(paint, from, to, ROAD_STEP, [edge, edge + .3], (_x, _z, y) => y + .03);
    for (let s = from; s + 4 <= to; s += 12) for (const lane of [-5, 0, 5]) strip(paint, s, s + 4, 4, [lane - .12, lane + .12], (_x, _z, y) => y + .03);
    const meshes = [new THREE.Mesh(geometry(road), materials.road), new THREE.Mesh(geometry(paint), materials.paint)];
    meshes[0].name = 'race-road'; meshes[1].name = 'road-paint';
    chunk.add(...meshes);
    const c = frameAt((from + to) / 2).point;
    chunks.push({ group: chunk, x: c.x, z: c.z, radius: CHUNK / 2 });
    group.add(chunk);
  }
  for (const [tile, fallbackY] of terrainTiles()) {
    const [tx, tz] = tile.split(',').map(Number), x0 = tx * TILE, z0 = tz * TILE, n = TILE / CELL;
    const plane = new THREE.PlaneGeometry(TILE, TILE, n, n).rotateX(-Math.PI / 2).translate(x0 + TILE / 2, 0, z0 + TILE / 2);
    const position = plane.getAttribute('position');
    for (let i = 0; i < position.count; i++) position.setY(i, height(position.getX(i), position.getZ(i), fallbackY));
    plane.computeVertexNormals(); plane.computeBoundingSphere(); paintGlacier(plane);
    const mesh = new THREE.Mesh(plane, materials.terrain), chunk = new THREE.Group();
    mesh.name = 'canyon-terrain'; chunk.name = `frostbite-tile-${tile}`; chunk.add(mesh);
    chunks.push({ group: chunk, x: x0 + TILE / 2, z: z0 + TILE / 2, radius: TILE * Math.SQRT1_2 });
    group.add(chunk);
  }

  // Graph decisions as raced: real structures around the simulation's corridor, solid pylons exactly where it tests.
  const shortcuts = FROSTBITE_TRACK.sections.filter(s => s.type === 'shortcut');
  const structures = new THREE.Group(); structures.name = 'shortcut-structures';
  for (const s of shortcuts) {
    const root = shortcutStructure(s, height, materials.deck, materials.hazard), c = frameAt((s.from + s.to) / 2).point;
    structures.add(root);
    chunks.push({ group: root, x: c.x, z: c.z, radius: (s.to - s.from) / 2 + 20 }); // culled like the road chunks
  }
  const pylonSpots = shortcuts.flatMap(s => shortcutPylons(s).map(p => ({ ...p, span: !!s.span })));
  const pylons = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, SHORTCUT_TOLERANCE * 2, .4), materials.pylon, pylonSpots.length);
  pylonSpots.forEach((p, i) => {
    const f = frostbiteFrame(p.distance, p.span);
    dummy.position.set(f.point.x + f.right[0] * p.x, f.point.y + p.altitude, f.point.z + f.right[2] * p.x);
    dummy.updateMatrix(); pylons.setMatrixAt(i, dummy.matrix);
  });
  pylons.name = 'shortcut-pylons';
  group.add(structures, pylons);

  // Signature landmarks from the authored set, standing on this corridor's terrain (never on the road).
  const seed = seededRng(FROSTBITE_SEED, 'frostbite-race'), ground = (x: number, z: number): number => height(x, z);
  const sentinels = crystalSentinels(graph, ground, 'frozen-basin', 1150);
  const arch = iceArch(graph, ground, 'glacier-gate', 150, 42);
  const crystals = crystalField(graph, ground, seed, graph.groundRoute.map((edgeId, i) =>
    ({ edgeId, from: 30, to: routeLength(graph, edgeId) - 30, side: i % 2 ? 1 : -1 })));
  const reflectors = edgeReflectors(graph, graph.groundRoute.map(id => ({ id, from: 0, to: routeLength(graph, id) })), ROAD_HALF, 24);
  group.add(sentinels, arch, crystals, reflectors);
  scene.add(group);

  return {
    group,
    update(distance: number): void {
      const { point: p, forward: f } = frostbiteFrame(distance);
      group.visible = true;
      group.position.set(-p.x, -p.y, -p.z);
      // Chase camera only: drop pieces fogged out or wholly behind the car (cheap: ~70 checks per frame).
      for (const c of chunks) {
        const dx = c.x - p.x, dz = c.z - p.z;
        c.group.visible = Math.hypot(dx, dz) < VIEW_RADIUS + c.radius && dx * f[0] + dz * f[2] > -BEHIND - c.radius;
      }
    },
    hide(): void { group.visible = false; },
    dispose(): void {
      group.removeFromParent();
      const geometries = new Set<THREE.BufferGeometry>(), owned = new Set<THREE.Material>();
      group.traverse(object => {
        if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const m of [object.material].flat()) owned.add(m); }
      });
      geometries.forEach(g => g.dispose()); owned.forEach(m => m.dispose());
    },
  };
}
