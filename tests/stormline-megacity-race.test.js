import test from 'node:test';
import assert from 'node:assert/strict';
import { STORMLINE_COURSE_GRAPH as graph } from '../src/courses/stormline-course-graph.ts';
import { STORMLINE_MEGACITY } from '../src/courses/stormline-megacity.ts';
import { STORMLINE_ID, STORMLINE_TRACK, stormlineFrame, stormlineLeg } from '../src/courses/stormline-megacity-race.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { COURSE_TRACKS, RACE_TRACKS, raceTrack, isModeTrack } from '../src/race-tracks.ts';
import { trackFrame, trackOverview, trackPoint } from '../src/track-paths.ts';
import { createRace, stepRace } from '../src/game.js';
import { measureEconomy } from '../scripts/pickup-economy.mjs';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);

test('Stormline race length is the authored ground route, START and FINISH far apart', () => {
  assert.equal(STORMLINE_ID, 'stormline-megacity');
  assert.equal(STORMLINE_TRACK.length, Math.floor(groundLength));
  assert.ok(STORMLINE_TRACK.length > 12_000 && STORMLINE_TRACK.length < 15_000, `${STORMLINE_TRACK.length} m`);
  assert.equal(STORMLINE_TRACK.topology, 'course-graph');
  assert.equal(STORMLINE_TRACK.topologyVersion, 1);
  const start = trackPoint(STORMLINE_ID, 0), finish = trackPoint(STORMLINE_ID, STORMLINE_TRACK.length);
  const finishNode = graph.nodes.find(n => n.id === graph.finish).at;
  assert.deepEqual([start.x, start.y, start.z], [0, 0, 0]);
  assert.ok(Math.hypot(finish.x - finishNode[0], finish.y - finishNode[1], finish.z - finishNode[2]) < 1.5);
  assert.ok(Math.hypot(finish.x, finish.z) > 3000);
});

test('distance maps to the CourseGraph ground edge and its road contact, with no seam jumps', () => {
  let offset = 0;
  for (const id of graph.groundRoute) {
    const length = routeLength(graph, id);
    for (const local of [0.5, length / 2, length - 0.5]) {
      const expected = sampleRoute(graph, id, local), frame = stormlineFrame(offset + local);
      assert.equal(stormlineLeg(offset + local).edgeId, id);
      assert.ok(Math.abs(stormlineLeg(offset + local).localS - local) < 1e-6);
      assert.ok(Math.hypot(frame.point.x - expected.point[0], frame.point.y - expected.point[1], frame.point.z - expected.point[2]) < 1e-6, `${id}@${local}`);
      assert.ok(Math.abs(Math.hypot(...frame.forward) - 1) < 1e-9);
    }
    offset += length;
  }
  for (let d = 0; d < STORMLINE_TRACK.length; d += 7) {
    const a = trackPoint(STORMLINE_ID, d), b = trackPoint(STORMLINE_ID, d + 1);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 1.2, `seam at ${d}`);
  }
  const f = trackFrame(STORMLINE_ID, 3000), g = stormlineFrame(3000);
  assert.deepEqual(f.right, g.right);
  assert.equal(trackOverview(STORMLINE_ID, 64).length, 64);
  // Out-of-range distances clamp to START / FINISH instead of extrapolating.
  assert.deepEqual(stormlineLeg(-50), { edgeId: graph.groundRoute[0], localS: 0 });
  assert.equal(stormlineLeg(Infinity).edgeId, graph.groundRoute[0]);
  assert.equal(stormlineLeg(1e9).edgeId, graph.groundRoute.at(-1));
});

test('each fork is a same-stretch shortcut over its safe edge, and fork lengths stay within 3%', () => {
  const shortcuts = STORMLINE_TRACK.sections.filter(s => s.type === 'shortcut');
  assert.equal(shortcuts.length, STORMLINE_MEGACITY.forks.length);
  for (const [s, fork] of shortcuts.map((s, i) => [s, STORMLINE_MEGACITY.forks[i]])) {
    assert.equal(stormlineLeg(s.from).edgeId, fork.safe);
    assert.equal(stormlineLeg(s.to - 1).edgeId, fork.safe);
    assert.ok(s.altitude > 0 && Math.abs(s.x) <= 7.5);
    const risky = routeLength(graph, fork.risky), safe = routeLength(graph, fork.safe);
    assert.ok(Math.abs(risky - safe) / safe < 0.03, `${fork.risky} ${risky.toFixed(0)} vs ${fork.safe} ${safe.toFixed(0)}`);
  }
  // The rooftop flight is an open corridor (fly in); the two drive alternatives carry solid decks.
  assert.deepEqual(shortcuts.map(s => !!s.deck), [true, true, false]);
  const sorted = [...STORMLINE_TRACK.sections].sort((a, b) => a.from - b.from);
  sorted.forEach((s, i) => { assert.ok(s.from < s.to && s.to <= STORMLINE_TRACK.length); if (i) assert.ok(sorted[i - 1].to <= s.from, 'no overlap'); });
});

test('Stormline is a gated classic sprint: dev-unlocked only, never in the catalog or other modes', () => {
  assert.equal(RACE_TRACKS[STORMLINE_ID], undefined);
  assert.equal(COURSE_TRACKS[STORMLINE_ID], STORMLINE_TRACK);
  assert.equal(raceTrack(STORMLINE_ID), STORMLINE_TRACK);
  for (const mode of ['time', 'circuit', 'classic']) assert.equal(isModeTrack(STORMLINE_ID, mode), false, mode);
  const race = createRace(STORMLINE_ID);
  assert.equal(race.length, STORMLINE_TRACK.length);
  assert.equal(race.circuit, null);
  assert.equal(race.rivals.length, 7);
  for (const mode of ['endless', 'time', 'circuit']) assert.throws(() => createRace(STORMLINE_ID, { mode }), RangeError, mode);
  assert.equal(released(STORMLINE_ID), false);
  assert.equal(unlocked(STORMLINE_ID), true);
});

test('a bot drives START to FINISH on the ground route', () => {
  const run = measureEconomy(STORMLINE_ID);
  assert.equal(run.phase, 'finished');
  assert.ok(run.time >= 100 && run.time <= 200, `finish ${run.time}s`);
});

test('rivals finish the point-to-point course and the race ends exactly once', () => {
  const race = createRace(STORMLINE_ID);
  race.phase = 'racing';
  for (let i = 0; i < 60 * 60 * 6 && race.phase !== 'finished'; i++) stepRace(race, { throttle: true, boost: race.player.fuel > 40 }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.ok(race.player.distance >= race.length);
  assert.ok(Number.isInteger(race.result.position) && race.result.position >= 1 && race.result.position <= 8);
});

test('a finished Stormline race writes only its topology-keyed results, never campaign progress', async () => {
  const { settleRace } = await import('../src/race-results.ts');
  const { loadSessionProgress } = await import('../src/session-progress.ts');
  const { createGhostStore } = await import('../src/ghost-store.ts');
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  try {
    const race = Object.assign(createRace(STORMLINE_ID), { phase: 'finished', elapsed: 150,
      result: { position: 1, time: 150, score: 900, stars: 3, collisions: 0, nearMisses: 0, success: true } });
    const settled = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress: loadSessionProgress(['coast']),
      ghosts: createGhostStore(), daily: null, trace: [{ t: 0, distance: 0, x: 0, altitude: 0 }] });
    assert.equal(settled.next, null);
    assert.deepEqual(Object.keys(JSON.parse(store.get('skyline-rush-best-tracks'))), ['stormline-megacity@t1l1']);
    assert.deepEqual(JSON.parse(store.get('skyline-rush-unlocked')), ['coast']);
  } finally { delete globalThis.localStorage; }
});

test('the race uses the Coming Soon card name in both locales', async () => {
  const { trackName } = await import('../src/i18n.ts');
  const { UPCOMING_TRACKS } = await import('../src/upcoming-tracks.ts');
  for (const locale of ['en', 'zh-TW']) assert.equal(trackName(STORMLINE_ID, locale), UPCOMING_TRACKS[STORMLINE_ID].names[locale]);
});

test('race scene: road on the race frame, decks where the physics deck is, no phantom hazards, full dispose', async () => {
  const THREE = await import('three');
  const { createStormlineRaceScene } = await import('../src/stormline-megacity-race-scene.ts');
  const { SHORTCUT_TOLERANCE } = await import('../src/road-falls.ts');
  const scene = new THREE.Scene(), race = createStormlineRaceScene(scene);
  assert.equal(race.group.parent, scene);
  race.update(0);
  assert.equal(race.group.visible, true);
  const names = []; race.group.traverse(o => names.push(o.name));
  for (const edge of graph.groundRoute) assert.ok(names.includes(`stormline:road:${edge}`), edge);
  for (const fork of STORMLINE_MEGACITY.forks) assert.ok(!names.includes(`stormline:road:${fork.risky}`), `${fork.risky} is raced as a corridor, not drawn as a road`);
  race.group.traverse(o => { if (o.name.startsWith('stormline:hazard:')) assert.equal(o.visible, false, o.name); });
  // Road edge vertices (race-group space, chunks untransformed) sit on the CourseGraph frame the cars use.
  for (const d of [1500, STORMLINE_TRACK.length / 2, STORMLINE_TRACK.length - 400]) {
    const { edgeId } = stormlineLeg(d), f = stormlineFrame(d), half = STORMLINE_MEGACITY.edges.find(e => e.id === edgeId).width / 2;
    const roads = []; race.group.traverse(o => { if (o.name === `stormline:road:${edgeId}`) roads.push(o); });
    for (const side of [-1, 1]) {
      const edge = new THREE.Vector3(f.point.x + f.right[0] * side * half, f.point.y + f.right[1] * side * half, f.point.z + f.right[2] * side * half);
      let best = Infinity, dy = Infinity; const v = new THREE.Vector3();
      for (const road of roads) {
        const pos = road.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const h = Math.hypot(v.x - edge.x, v.z - edge.z); if (h < best) { best = h; dy = Math.abs(v.y - edge.y); } }
      }
      assert.ok(best < 8 && dy < 0.5, `${edgeId}@${d} side ${side}: ${best.toFixed(2)} m away, ${dy.toFixed(2)} m off`);
    }
  }
  const decks = []; race.group.traverse(o => { if (o.name === 'shortcut-deck') decks.push(o); });
  assert.equal(decks.length, STORMLINE_TRACK.sections.filter(s => s.deck).length);
  for (const [deck, s] of decks.map((d, i) => [d, STORMLINE_TRACK.sections.filter(s => s.deck)[i]])) {
    deck.geometry.computeBoundingBox();
    const top = deck.geometry.boundingBox.max.y, c = stormlineFrame((s.from + s.to) / 2).point.y;
    assert.ok(top >= c + s.altitude - SHORTCUT_TOLERANCE - 1e-6, 'deck top at the corridor floor');
  }
  race.update(STORMLINE_TRACK.length);
  race.hide(); assert.equal(race.group.visible, false);
  race.dispose(); assert.equal(race.group.parent, null);
});
