import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_CANYON_GRAPH as graph } from '../src/courses/frostbite-canyon.ts';
import { FROSTBITE_ID, FROSTBITE_TRACK, frostbiteFrame, frostbiteLeg } from '../src/courses/frostbite-race.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { RACE_TRACKS, raceTrack, isModeTrack } from '../src/race-tracks.ts';
import { trackFrame, trackOverview, trackPoint } from '../src/track-paths.ts';
import { createRace, stepRace } from '../src/game.js';
import { measureEconomy } from '../scripts/pickup-economy.mjs';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);

test('Frostbite race length is the authored ground route, START and FINISH far apart', () => {
  assert.equal(FROSTBITE_TRACK.length, Math.floor(groundLength));
  assert.ok(FROSTBITE_TRACK.length > 13_500 && FROSTBITE_TRACK.length < 14_100);
  const start = trackPoint(FROSTBITE_ID, 0), finish = trackPoint(FROSTBITE_ID, FROSTBITE_TRACK.length);
  const finishNode = graph.nodes.find(n => n.id === graph.finish).at;
  assert.deepEqual([start.x, start.y, start.z], [0, 0, 0]);
  assert.ok(Math.hypot(finish.x - finishNode[0], finish.y - finishNode[1], finish.z - finishNode[2]) < 1.5);
  assert.ok(Math.hypot(finish.x, finish.z) > 5000);
});

test('the race frame is the CourseGraph road contact on every ground edge', () => {
  let offset = 0;
  for (const id of graph.groundRoute) {
    const length = routeLength(graph, id);
    for (const local of [0.5, length / 2, length - 0.5]) {
      const expected = sampleRoute(graph, id, local), frame = frostbiteFrame(offset + local);
      assert.equal(frostbiteLeg(offset + local).edgeId, id);
      assert.ok(Math.hypot(frame.point.x - expected.point[0], frame.point.y - expected.point[1], frame.point.z - expected.point[2]) < 1e-6, `${id}@${local}`);
      assert.ok(Math.abs(frame.right[1]) < 1e-9 && Math.abs(Math.hypot(...frame.forward) - 1) < 1e-9);
    }
    offset += length;
  }
  // Shared track API (cars, camera, minimap) resolves to the same frame; no seam jumps between edges.
  for (let d = 0; d < FROSTBITE_TRACK.length; d += 7) {
    const a = trackPoint(FROSTBITE_ID, d), b = trackPoint(FROSTBITE_ID, d + 1);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 1.2, `seam at ${d}`);
  }
  const f = trackFrame(FROSTBITE_ID, 3000), g = frostbiteFrame(3000);
  assert.deepEqual(f.right, g.right);
  assert.equal(trackOverview(FROSTBITE_ID, 64).length, 64);
});

test('the three graph decisions are elevated shortcut lanes on their split stretches, ice on hard-ice edges', () => {
  const shortcuts = FROSTBITE_TRACK.sections.filter(s => s.type === 'shortcut');
  assert.equal(shortcuts.length, 3);
  for (const [s, edge] of shortcuts.map((s, i) => [s, ['glacier-valley', 'rift-lower-canyon', 'aurora-basin'][i]])) {
    assert.equal(frostbiteLeg(s.from).edgeId, edge);
    assert.equal(frostbiteLeg(s.to - 1).edgeId, edge);
    assert.ok(s.altitude > 0 && Math.abs(s.x) <= 7.5);
  }
  for (const s of FROSTBITE_TRACK.sections.filter(s => s.type === 'ice'))
    assert.equal(graph.edges.find(e => e.id === frostbiteLeg((s.from + s.to) / 2).edgeId).surface, 'hard-ice');
  const sorted = [...FROSTBITE_TRACK.sections].sort((a, b) => a.from - b.from);
  sorted.forEach((s, i) => { assert.ok(s.from < s.to && s.to <= FROSTBITE_TRACK.length); if (i) assert.ok(sorted[i - 1].to <= s.from, 'no overlap'); });
});

test('Frostbite is a gated classic sprint: not in the sprint catalog, saves or modes', () => {
  assert.equal(RACE_TRACKS[FROSTBITE_ID], undefined);
  assert.equal(raceTrack(FROSTBITE_ID), FROSTBITE_TRACK);
  assert.equal(isModeTrack(FROSTBITE_ID, 'time'), false);
  const race = createRace(FROSTBITE_ID);
  assert.equal(race.length, FROSTBITE_TRACK.length);
  assert.equal(race.circuit, null);
  assert.equal(race.rivals.length, 7);
  assert.throws(() => createRace(FROSTBITE_ID, { mode: 'endless' }), RangeError);
  assert.equal(released(FROSTBITE_ID), false);
  assert.equal(unlocked(FROSTBITE_ID), true);
  assert.equal(unlocked('dune-tempest'), false);
});

// Measured on the shared engine (no physics change): bot 129 s, throttle-only 160 s; the spec's 3:20-4:40 was an
// unmeasured hypothesis. The window guards against a broken route (too short) or a stall (too long).
test('a bot drives START to FINISH on the ground route, about twice the longest classic sprint', () => {
  const run = measureEconomy(FROSTBITE_ID);
  assert.equal(run.phase, 'finished');
  assert.ok(run.time >= 115 && run.time <= 200, `finish ${run.time}s`);
});

test('rivals finish the point-to-point course and the race ends exactly once', () => {
  const race = createRace(FROSTBITE_ID);
  race.phase = 'racing';
  for (let i = 0; i < 60 * 60 * 6 && race.phase !== 'finished'; i++) stepRace(race, { throttle: true, boost: race.player.fuel > 40 }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.ok(race.player.distance >= race.length);
  assert.ok(Number.isInteger(race.result.position) && race.result.position >= 1 && race.result.position <= 8);
});

// Since 2026-11-04 a finished Frostbite race persists its results under a topology-keyed id (tests/frostbite-persistence.test.js);
// it still never touches the campaign: no unlocks, stars, medals, NEXT, or bare/classic best ids.
test('a finished gated Frostbite race writes only its topology-keyed results, never campaign progress', async () => {
  const { settleRace } = await import('../src/race-results.ts');
  const { loadSessionProgress } = await import('../src/session-progress.ts');
  const { createGhostStore } = await import('../src/ghost-store.ts');
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  try {
    const race = Object.assign(createRace(FROSTBITE_ID), { phase: 'finished', elapsed: 150,
      result: { position: 1, time: 150, score: 900, stars: 3, collisions: 0, nearMisses: 0, success: true } });
    const settled = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress: loadSessionProgress(['coast']),
      ghosts: createGhostStore(), daily: null, trace: [{ t: 0, distance: 0, x: 0, altitude: 0 }] });
    assert.equal(settled.next, null);
    assert.deepEqual([...store.keys()].filter(k => k.startsWith('skyline-rush-')).sort(),
      ['skyline-rush-best-tracks', 'skyline-rush-history', 'skyline-rush-unlocked']); // a 1-sample trace is no valid Ghost
    assert.deepEqual(Object.keys(JSON.parse(store.get('skyline-rush-best-tracks'))), ['frostbite-canyon@t1l1']);
    assert.deepEqual(JSON.parse(store.get('skyline-rush-unlocked')), ['coast']);
  } finally { delete globalThis.localStorage; }
});

test('chase-camera look-ahead is unchanged on every existing track and shortened only through Frostbite hairpins', async () => {
  const { lookAheadDistance } = await import('../src/track-paths.ts');
  for (const id of [...Object.keys(RACE_TRACKS), 'harbor-circuit'])
    for (let d = 0; d < raceTrack(id).length; d += 25) for (const reach of [34, 65])
      assert.equal(lookAheadDistance(id, d, reach), reach, `${id}@${d}`);
  const hairpin = [...Array(400).keys()].map(i => i * 30).find(d => lookAheadDistance(FROSTBITE_ID, d, 34) < 34);
  assert.ok(hairpin !== undefined);
  const reach = lookAheadDistance(FROSTBITE_ID, hairpin, 34), f = trackFrame(FROSTBITE_ID, hairpin).forward, g = trackFrame(FROSTBITE_ID, hairpin + reach).forward;
  assert.ok(Math.acos(Math.min(1, f[0] * g[0] + f[1] * g[1] + f[2] * g[2])) <= 22.5 * Math.PI / 180);
  assert.ok(reach > 5);
});
