// Per-frame edge-id lookup microbench (CPU only, seeded dune-tempest graph, 8 cars).
// Usage: node --experimental-strip-types scripts/edge-lookup-bench.mjs   (label the environment when quoting numbers)
import { performance } from 'node:perf_hooks';
import * as THREE from 'three';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';
import { createCourseRuntime } from '../src/course-race.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { groundOffset } from '../src/course-items.ts';
import { graphLookAhead } from '../src/course-render-pose.ts';
import { createCourseRaceScene } from '../src/course-race-scene.ts';

const graph = DUNE_TEMPEST_RACE.graph, N = 20000;
const alt = graph.edges.find(e => !graph.groundRoute.includes(e.id));
const rt = createCourseRuntime(DUNE_TEMPEST_RACE, [{ id: 'YOU', distance: 0, x: 0 }]);
const ids = [graph.groundRoute[0], graph.groundRoute[3], graph.groundRoute[7]];
const cars = new Map(RACE_DRIVER_IDS.map((id, i) => [id, { travel: { currentEdgeId: ids[i % 3], localS: 50 + i * 9 } }]));
const race = { trackId: 'dune-tempest', elapsed: 1, course: { spec: DUNE_TEMPEST_RACE, cars } };
const host = createCourseRaceScene(new THREE.Scene());
host.update(race, 'low');
const time = (fn, n) => { for (let i = 0; i < n / 10; i++) fn(); const t = performance.now(); for (let i = 0; i < n; i++) fn(); return Math.round((performance.now() - t) / n * 1e6) / 1e3; };
console.log(JSON.stringify({ node: process.version, edges: graph.edges.length, unit: 'us/call',
  groundOffsetAlternate: time(() => groundOffset(graph, alt.id, 10), N),
  graphLookAhead900m: time(() => graphLookAhead(rt, 0, 900), N),
  sceneUpdate8Cars: time(() => host.update(race, 'low'), 2000) }));
