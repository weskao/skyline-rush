// Diagnostic, not a gate: drives 8 cars down the Dune ground route at 70 m/s (60 Hz) and reports
// update() time, chunk create/dispose counts and "no road 100 m behind the player" checks.
// Usage: node scripts/course-streaming-probe.mjs [--oscillate] [--log]
import * as THREE from 'three';
const { RACE_DRIVER_IDS } = await import('../src/race-grid.ts');
const { DUNE_TEMPEST_RACE } = await import('../src/courses/dune-tempest-race.ts');
const { routeLength, sampleRoute } = await import('../src/course-route-frame.ts');
const { createCourseRaceScene } = await import('../src/course-race-scene.ts');
const graph = DUNE_TEMPEST_RACE.graph;
const reverse = process.argv.includes('--oscillate');
const cars = new Map(RACE_DRIVER_IDS.map((id, i) => [id, { travel: { currentEdgeId: graph.groundRoute[0], localS: 20 + i * 15 } }]));
const race = { trackId: 'dune-tempest', elapsed: 0, course: { spec: DUNE_TEMPEST_RACE, cars } };
const scene = new THREE.Scene(), host = createCourseRaceScene(scene), root = scene.getObjectByName('CourseGraph race scenery');
const route = graph.groundRoute, len = route.map(id => routeLength(graph, id));
const pos = [...cars.values()].map((c, i) => ({ e: 0, s: 20 + i * 15 }));
const frames = 60 * 150, times = []; let created = 0, disposed = 0, gaps = 0, checks = 0, prev = new Set();
const roadNear = (p) => { let hit = false; root.traverse(o => { if (hit || o.name !== 'Dune road') return; const a = o.geometry.attributes.position;
  for (let i = 0; i < a.count; i += 1) { const dx = a.getX(i) - p[0], dz = a.getZ(i) - p[2]; if (dx * dx + dz * dz < (p.width / 2 + 5) ** 2) { hit = true; return; } } }); return hit; };
for (let f = 0; f < frames; f++) {
  let i = 0;
  for (const car of cars.values()) {
    const p = pos[i++]; p.s += reverse ? (Math.floor(f / 90) % 2 ? -1 : 1) * 70 / 60 + 0.4 : 70 / 60;
    while (p.e < route.length - 1 && p.s >= len[p.e]) { p.s -= len[p.e]; p.e++; }
    while (p.e > 0 && p.s < 0) { p.e--; p.s += len[p.e]; }
    p.s = Math.max(0, Math.min(p.s, len[p.e] - 1));
    car.travel.currentEdgeId = route[p.e]; car.travel.localS = p.s;
  }
  const t0 = performance.now(); host.update(race, 'medium', f / 60); times.push(performance.now() - t0);
  const now = new Set(root.children.filter(c => c.name.startsWith('Dune chunk')));
  for (const c of now) if (!prev.has(c)) created++;
  for (const c of prev) if (!now.has(c)) disposed++;
  prev = now;
  if (f % 6 === 0) { // road must exist 100 m behind the player, across node crossings too
    let { e, s } = pos[0]; s -= 100; while (e > 0 && s < 0) { e--; s += len[e]; }
    if (s >= 0) { checks++; if (!roadNear(Object.assign(sampleRoute(graph, route[e], s).point, { width: sampleRoute(graph, route[e], s).width }))) { gaps++; if (process.argv.includes("--log")) console.log(pos[0].e, pos[0].s.toFixed(0), e, s.toFixed(0), len[e].toFixed(0)); } }
  }
}
times.sort((a, b) => a - b);
const q = p => times[Math.floor(p * (times.length - 1))].toFixed(4);
console.log(JSON.stringify({ mode: reverse ? 'oscillate' : 'forward', frames, median: q(.5), p95: q(.95), p99: q(.99), created, disposed, gapChecks: checks, gaps }));
host.dispose();
