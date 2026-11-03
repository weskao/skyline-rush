import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FROSTBITE_CANYON_GRAPH as graph, FROSTBITE_FLIGHT, FROSTBITE_SEED } from '../courses/frostbite-canyon.ts';
import { courseRoadGeometry } from '../course-road-geometry.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { seededRng } from '../rng.ts';
import { BOUNDS, createGlacierField, distantPeaks, type HeroEdge } from './frostbite-terrain.ts';
import { bridgeStructure, crystalField, crystalSentinels, edgeReflectors, flightGuide, iceArch } from './frostbite-landmarks.ts';
import { createFrostbiteSky } from './frostbite-sky.ts';
import type { CameraPose } from '../track-preview.ts';

// Stage 2 HOME showroom for Frostbite Canyon: a bounded slice of the REAL CourseGraph around the
// Rift Spine (approach bend, ice bridge, lower canyon, merge). The shared host owns car/camera/loop.
type Quality = 'low' | 'medium' | 'high';
export type FrostbiteShot = 'p01' | 'p02';

const APPROACH = 'riverbed-hairpin', BRIDGE = 'rift-ice-bridge', CANYON = 'rift-lower-canyon', MERGE = 'rift-to-observatory';
const approachLength = routeLength(graph, APPROACH);
/** Shot frames: P01 = ground bend with arch/crystals/aurora; P02 = airborne on the authored flight shortcut over the chasm. */
export const FROSTBITE_SHOTS: Readonly<Record<FrostbiteShot, { edgeId: string; localS: number }>> = Object.freeze({
  p01: { edgeId: APPROACH, localS: approachLength - 330 },
  p02: { edgeId: FROSTBITE_FLIGHT.edgeId, localS: 380 },
});
/** P02 is a flight-layer chase camera: higher and further back so the span, void and landing read. */
const SHOT_CAMERA: Readonly<Record<FrostbiteShot, CameraPose | null>> = Object.freeze({
  p01: null,
  p02: { cameraSide: 14, cameraBack: 30, cameraHeight: 13, lookSide: 6, lookAhead: 40, lookHeight: -10 },
});
const HERO: readonly HeroEdge[] = [
  { id: APPROACH, from: approachLength - 900, carve: true },
  { id: BRIDGE, carve: false },
  { id: CANYON, carve: true },
  { id: MERGE, carve: true },
  { id: 'observatory-climb', to: 320, carve: true },
];

function roadMaterials() {
  return {
    road: new THREE.MeshStandardMaterial({ color: '#4d6b91', roughness: .5, metalness: .12, envMapIntensity: 1.1 }),
    shoulder: new THREE.MeshStandardMaterial({ color: '#dbe9f8', roughness: .9 }),
    deck: new THREE.MeshStandardMaterial({ color: '#8fb3d8', roughness: .2, metalness: .2, envMapIntensity: 1.5 }),
  };
}

function buildRoads(group: THREE.Group) {
  const m = roadMaterials();
  const trunk = HERO.filter(e => e.id !== BRIDGE && e.id !== CANYON);
  const road = new THREE.Mesh(mergeGeometries(trunk.map(e => courseRoadGeometry(graph, e.id, { from: e.from, to: e.to })))!, m.road);
  road.name = 'ground-road';
  road.userData.edgeIds = trunk.map(e => e.id);
  const canyon = new THREE.Mesh(courseRoadGeometry(graph, CANYON), m.road);
  canyon.name = 'lower-canyon-road';
  const bridge = new THREE.Mesh(courseRoadGeometry(graph, BRIDGE), m.deck);
  bridge.name = 'ice-bridge';
  const underside = new THREE.Mesh(courseRoadGeometry(graph, BRIDGE, { margin: .4, lift: -2.6 }), m.deck);
  underside.name = 'bridge-underside';
  // Snowbank shoulders: a slightly wider band just under the road surface (visual only).
  const shoulders = new THREE.Mesh(mergeGeometries([...trunk, { id: CANYON }].map(e =>
    courseRoadGeometry(graph, e.id, { from: (e as HeroEdge).from, to: (e as HeroEdge).to, margin: 2.6, lift: -.12, step: 8 })))!, m.shoulder);
  shoulders.name = 'snow-shoulders';
  group.add(road, canyon, bridge, underside, shoulders);
}

function buildLighting(group: THREE.Group) {
  const moon = new THREE.DirectionalLight('#7fb6ff', .8);
  moon.position.set(-200, 400, 300);
  const glow = new THREE.PointLight('#3fe3ff', 320, 120, 1.6);
  glow.name = 'crystal-glow';
  group.add(moon, glow);
  return glow;
}

export function createUpcomingEnvironment(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'frostbite-canyon';
  const world = new THREE.Group();
  world.name = 'frostbite-world';
  group.add(world);
  scene.add(group);
  const seed = seededRng(FROSTBITE_SEED, 'frostbite-home');
  const chasm = { center: new THREE.Vector3(1450, 0, -2100), along: new THREE.Vector3(-.196, 0, .981).normalize() };
  const field = createGlacierField(graph, HERO, chasm);

  const terrain = new THREE.Mesh(field.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: .04, flatShading: true }));
  terrain.name = 'glacier-terrain';
  const peaks = new THREE.Mesh(distantPeaks(new THREE.Vector3((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2), seed),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true }));
  peaks.name = 'distant-peaks';
  world.add(terrain, peaks);
  buildRoads(world);
  const p01 = FROSTBITE_SHOTS.p01.localS;
  world.add(crystalField(graph, field.height, seed, [
    { edgeId: APPROACH, from: p01 - 60, to: p01 + 160, side: -1 },
    { edgeId: APPROACH, from: p01 + 160, to: approachLength - 10, side: 1 },
    { edgeId: CANYON, from: 40, to: 520, side: 1 },
    { edgeId: MERGE, from: 20, to: 300, side: -1 },
  ]));
  world.add(crystalSentinels(graph, field.height, APPROACH, p01 + 70));
  world.add(iceArch(graph, field.height, APPROACH, p01 + 195, 36)); // outside of the left-hand bend, as in View 01
  const { rails, supports } = bridgeStructure(graph, field.height, BRIDGE);
  world.add(rails, supports);
  world.add(edgeReflectors(graph, [{ id: APPROACH, from: approachLength - 700, to: approachLength }, { id: CANYON, from: 0, to: routeLength(graph, CANYON) }]));
  const guide = flightGuide(graph, FROSTBITE_FLIGHT.edgeId, MERGE);
  world.add(guide.arc, guide.landing);
  const glow = buildLighting(world);

  const sky = createFrostbiteSky(seed);
  group.add(sky.group);
  const fog = new THREE.Fog('#24476e', 260, 2600);
  scene.fog = fog;
  let disposed = false, cameraPose: CameraPose | null = null;

  function setShot(shot: FrostbiteShot): void {
    const target = FROSTBITE_SHOTS[shot];
    if (!target) throw new Error('Unknown Frostbite shot: ' + shot);
    cameraPose = SHOT_CAMERA[shot];
    const f = sampleRoute(graph, target.edgeId, target.localS);
    world.position.set(0, 0, 0);
    world.rotation.set(0, Math.atan2(f.forward[0], -f.forward[2]), 0);
    world.updateMatrix();
    const origin = new THREE.Vector3(...f.point).applyMatrix4(world.matrix);
    world.position.set(-origin.x, -origin.y, -origin.z);
    const glowAt = new THREE.Vector3(...sampleRoute(graph, APPROACH, p01 + 70).point);
    glow.position.set(glowAt.x - 20, glowAt.y + 14, glowAt.z);
  }

  function update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void {
    if (disposed) return;
    const t = reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds % 10000;
    sky.update(t, quality, reducedMotion);
    glow.intensity = reducedMotion ? 320 : 320 + Math.sin(t * .7) * 50;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    group.parent?.remove(group);
    if (scene.fog === fog) scene.fog = null;
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        geometries.add(o.geometry);
        for (const m of [o.material].flat()) materials.add(m);
      }
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    group.clear();
  }

  setShot('p01');
  update(0, 'high', false);
  return { group, update, dispose, setShot, get cameraPose() { return cameraPose; } };
}
