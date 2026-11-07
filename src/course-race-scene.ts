import * as THREE from 'three';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import type { CourseRuntime } from './course-race.ts';
import { DUNE_TEMPEST_ID } from './courses/dune-tempest-race.ts';
import { SKYFALL_ARCHIPELAGO_ID } from './courses/skyfall-archipelago-race.ts';
import { createSkyfallWorld } from './courses/skyfall-world.ts';
import { createDuneTempestVisualChunk } from './courses/dune-tempest-chunk.ts';

type Quality = 'low' | 'medium' | 'high';
type Chunk = ReturnType<typeof createDuneTempestVisualChunk>;
type RaceView = { trackId: string; elapsed?: number; course?: CourseRuntime };
const CHUNK_METRES = 400, BEHIND_METRES = 120, AHEAD_METRES = 680;

/** Streams graph-owned geometry into the existing world renderer. No second scene/camera/physics. */
export function createCourseRaceScene(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = 'CourseGraph race scenery';
  scene.add(root);
  const live = new Map<string, Chunk>();
  let skyfall: ReturnType<typeof createSkyfallWorld> | null = null;
  let quality: Quality | null = null;
  const clear = () => {
    for (const chunk of live.values()) chunk.dispose();
    live.clear();
    skyfall?.dispose();
    skyfall = null;
    root.visible = false;
  };
  const hide = () => { clear(); quality = null; };
  const update = (race: RaceView, tier: Quality, time = race.elapsed ?? 0, reducedMotion = false) => {
    if (!race.course || (race.trackId !== DUNE_TEMPEST_ID && race.trackId !== SKYFALL_ARCHIPELAGO_ID)) {
      hide(); return;
    }
    const runtime = race.course, graph = runtime.spec.graph;
    if (race.trackId === SKYFALL_ARCHIPELAGO_ID) {
      if (quality !== tier || !skyfall) {
        hide();
        skyfall = createSkyfallWorld(scene, tier);
        root.add(skyfall.group);
        quality = tier;
      }
      root.visible = true;
      skyfall.setFocus([...runtime.cars.values()].map(car => ({
        edgeId: car.travel.currentEdgeId, localS: car.travel.localS,
      })));
      skyfall.update(time, reducedMotion);
      const player = runtime.cars.get('YOU');
      if (player) {
        const frame = sampleRoute(graph, player.travel.currentEdgeId, player.travel.localS);
        root.position.set(-frame.point[0], -frame.point[1], -frame.point[2]);
      }
      return;
    }
    if (skyfall) hide();
    if (quality !== tier) { clear(); quality = tier; }
    root.visible = true;
    const active = new Set<string>();
    const lengths = new Map<string, number>();
    const length = (id: string) => {
      let result = lengths.get(id);
      if (result === undefined) { result = routeLength(graph, id); lengths.set(id, result); }
      return result;
    };
    const include = (edgeId: string, from: number, to: number) => {
      const max = length(edgeId);
      const begin = Math.max(0, Math.floor(Math.max(0, from) / CHUNK_METRES));
      const end = Math.min(Math.ceil(max / CHUNK_METRES) - 1, Math.floor(Math.max(0, to) / CHUNK_METRES));
      for (let index = begin; index <= end; index++) {
        const key = edgeId + ':' + index;
        active.add(key);
        if (live.has(key)) continue;
        const startS = index * CHUNK_METRES, endS = Math.min(max, startS + CHUNK_METRES);
        const chunk = createDuneTempestVisualChunk(root, edgeId, startS, endS, length,
          (id, s) => sampleRoute(graph, id, s), tier);
        live.set(key, chunk);
      }
    };
    for (const car of runtime.cars.values()) {
      const { currentEdgeId, localS } = car.travel;
      const edge = graph.edges.find(item => item.id === currentEdgeId);
      if (!edge) continue;
      include(currentEdgeId, localS - BEHIND_METRES, Math.min(length(currentEdgeId) - 1e-6, localS + AHEAD_METRES));
      const remaining = length(currentEdgeId) - localS;
      if (remaining < AHEAD_METRES) for (const next of graph.edges) {
        if (next.from === edge.to) include(next.id, 0, Math.min(length(next.id) - 1e-6, AHEAD_METRES - remaining));
      }
    }
    for (const [key, chunk] of live) if (!active.has(key)) { chunk.dispose(); live.delete(key); }
    for (const chunk of live.values()) chunk.update(time, tier, reducedMotion);
    const player = runtime.cars.get('YOU');
    if (player) {
      const f = sampleRoute(graph, player.travel.currentEdgeId, player.travel.localS);
      root.position.set(-f.point[0], -f.point[1], -f.point[2]);
    }
  };
  const dispose = () => { hide(); root.removeFromParent(); };
  return { update, hide, dispose };
}
