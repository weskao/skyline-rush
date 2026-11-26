import * as THREE from 'three';
import { edgeOf, routeLength, sampleRoute } from './course-route-frame.ts';
import { TRAFFIC_PREFIX, type CourseRuntime } from './course-race.ts';
import { DUNE_TEMPEST_ID } from './courses/dune-tempest-race.ts';
import { SKYFALL_ARCHIPELAGO_ID } from './courses/skyfall-archipelago-race.ts';
import { createSkyfallWorld } from './courses/skyfall-world.ts';
import { createDuneTempestVisualChunk } from './courses/dune-tempest-chunk.ts';
import { createDuneTerrain } from './courses/dune-tempest-terrain.ts';
import { createRoadRunout } from './road-runout.ts';

type Quality = 'low' | 'medium' | 'high';
type Chunk = ReturnType<typeof createDuneTempestVisualChunk>;
type RaceView = { trackId: string; elapsed?: number; course?: CourseRuntime };
const CHUNK_METRES = 400, BEHIND_METRES = 120, AHEAD_METRES = 680, HYSTERESIS_METRES = 40;

/** Streams graph-owned geometry into the existing world renderer. No second scene/camera/physics. */
export function createCourseRaceScene(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = 'CourseGraph race scenery';
  scene.add(root);
  const live = new Map<string, Chunk>();
  let dune: ReturnType<typeof createDuneTerrain> | null = null;
  let runout: ReturnType<typeof createRoadRunout> | null = null;
  let skyfall: ReturnType<typeof createSkyfallWorld> | null = null;
  let quality: Quality | null = null;
  const clear = () => {
    for (const chunk of live.values()) chunk.dispose();
    live.clear();
    runout?.dispose();
    runout = null;
    skyfall?.dispose();
    skyfall = null;
    root.visible = false;
  };
  const hide = () => {
    clear();
    dune?.dispose();
    dune = null;
    quality = null;
  };
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
      skyfall.setFocus([...runtime.cars].filter(([id]) => !id.startsWith(TRAFFIC_PREFIX)).map(([, car]) => ({
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
    if (!dune) {
      dune = createDuneTerrain();
      root.add(dune.group);
    }
    root.visible = true;
    const active = new Set<string>();
    let nearFinish = false;
    const lengths = new Map<string, number>();
    const length = (id: string) => {
      let result = lengths.get(id);
      if (result === undefined) { result = routeLength(graph, id); lengths.set(id, result); }
      return result;
    };
    const include = (edgeId: string, from: number, to: number, keepOnly: boolean) => {
      const max = length(edgeId);
      const begin = Math.max(0, Math.floor(Math.max(0, from) / CHUNK_METRES));
      const end = Math.min(Math.ceil(max / CHUNK_METRES) - 1, Math.floor(Math.max(0, to) / CHUNK_METRES));
      for (let index = begin; index <= end; index++) {
        const key = edgeId + ':' + index;
        active.add(key);
        if (live.has(key) || keepOnly) continue;
        const startS = index * CHUNK_METRES, endS = Math.min(max, startS + CHUNK_METRES);
        const chunk = createDuneTempestVisualChunk(root, edgeId, startS, endS, length,
          (id, s) => sampleRoute(graph, id, s), tier);
        live.set(key, chunk);
      }
    };
    const cover = (edge: typeof graph.edges[number], localS: number, behind: number, ahead: number, keepOnly: boolean) => {
      const remaining = length(edge.id) - localS;
      include(edge.id, localS - behind, Math.min(length(edge.id) - 1e-6, localS + ahead), keepOnly);
      // Just past a node the road behind lies on the previous edge(s); no history is kept, so every
      // predecessor keeps its tail until the car is clear of it (otherwise it pops out at the node).
      if (localS < behind) for (const prev of graph.edges) {
        if (prev.to === edge.from) include(prev.id, length(prev.id) - (behind - localS), length(prev.id) - 1e-6, keepOnly);
      }
      if (remaining < ahead) for (const next of graph.edges) {
        if (next.from === edge.to) include(next.id, 0, Math.min(length(next.id) - 1e-6, ahead - remaining), keepOnly);
      }
    };
    for (const [id, car] of runtime.cars) {
      if (id.startsWith(TRAFFIC_PREFIX)) continue; // traffic stays near the player: its scenery streams anyway
      const { currentEdgeId, localS } = car.travel;
      const edge = edgeOf(graph, currentEdgeId);
      if (!edge) continue;
      cover(edge, localS, BEHIND_METRES, AHEAD_METRES, false);
      // Hysteresis: a live chunk is released only HYSTERESIS_METRES past the window that created it,
      // so a car jittering on a chunk boundary (recovery, reverse, wall scrape) cannot rebuild it every frame.
      cover(edge, localS, BEHIND_METRES + HYSTERESIS_METRES, AHEAD_METRES + HYSTERESIS_METRES, true);
      if (length(currentEdgeId) - localS < AHEAD_METRES && edge.to === graph.finish) nearFinish = true;
    }
    for (const [key, chunk] of live) if (!active.has(key)) { chunk.dispose(); live.delete(key); }
    // FINISH has no outgoing edge: the road runs on past it for the streaming range (drawing only; rules/road-runout.md).
    if (nearFinish && !runout) {
      const last = graph.groundRoute.at(-1)!, end = sampleRoute(graph, last, length(last));
      runout = createRoadRunout(end, { width: end.width, length: AHEAD_METRES,
        road: { color: 0xab7546, roughness: 1 }, rail: 0x966047, mark: 0xe5d3a8, bed: 0xb77b49 });
      root.add(runout.group);
    } else if (!nearFinish && runout) { runout.dispose(); runout = null; }
    for (const chunk of live.values()) chunk.update(time, tier, reducedMotion);
    const player = runtime.cars.get('YOU');
    if (player) {
      const f = sampleRoute(graph, player.travel.currentEdgeId, player.travel.localS);
      root.position.set(-f.point[0], -f.point[1], -f.point[2]);
      dune.update(f.point[0], f.point[2]);
    }
  };
  const dispose = () => { hide(); root.removeFromParent(); };
  return { update, hide, dispose };
}
