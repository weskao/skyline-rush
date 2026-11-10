import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../src/courses/monsoon-ruins-runtime-adapter.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { MONSOON_ID, MONSOON_TRACK, monsoonFrame, monsoonLeg } from '../src/courses/monsoon-ruins-race.ts';
import { COURSE_TRACKS, RACE_TRACKS, raceTrack } from '../src/race-tracks.ts';
import { trackFrame, trackPoint, trackOverview } from '../src/track-paths.ts';
import { createRace, stepRace } from '../src/game.js';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';
const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);
test('Monsoon Crown race length and FINISH follow authored CourseGraph', () => {
  assert.equal(MONSOON_ID, 'monsoon-ruins');
  assert.ok(groundLength > 12000 && groundLength < 18000);
  assert.equal(MONSOON_TRACK.length, Math.floor(groundLength));
  assert.equal(MONSOON_TRACK.topology, 'course-graph');
  assert.equal(MONSOON_TRACK.topologyVersion, 1);
  assert.deepEqual(monsoonLeg(0), { edgeId: graph.groundRoute[0], localS: 0 });
  assert.equal(monsoonLeg(1e9).edgeId, graph.groundRoute.at(-1));
  const finish = trackPoint(MONSOON_ID, MONSOON_TRACK.length);
  const node = graph.nodes.find(n => n.id === graph.finish).at;
  assert.ok(Math.hypot(finish.x - node[0], finish.y - node[1], finish.z - node[2]) < 2);
});
test('arc-length samples share the authored road frame with no seams', () => {
  let offset = 0;
  for (const edge of graph.groundRoute) {
    const length = routeLength(graph, edge);
    for (const local of [0.5, length / 2, length - 0.5]) {
      const frame = monsoonFrame(offset + local), expected = sampleRoute(graph, edge, local);
      assert.equal(monsoonLeg(offset + local).edgeId, edge);
      assert.ok(Math.abs(monsoonLeg(offset + local).localS - local) < 1e-6);
      assert.ok(Math.hypot(frame.point.x - expected.point[0], frame.point.y - expected.point[1], frame.point.z - expected.point[2]) < 1e-6, edge);
      assert.ok(Math.abs(Math.hypot(...frame.forward) - 1) < 1e-8);
    }
    offset += length;
  }
  for (let s = 0; s < MONSOON_TRACK.length; s += 11) {
    const a = trackPoint(MONSOON_ID, s), b = trackPoint(MONSOON_ID, s + 1);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1.5, 'jump at ' + s);
  }
  assert.deepEqual(trackFrame(MONSOON_ID, 5000).forward, monsoonFrame(5000).forward);
  assert.equal(trackOverview(MONSOON_ID, 64).length, 64);
});
test('three forks map to safe ground edges, preserving measured arc-length ratios', () => {
  const sections = MONSOON_TRACK.sections.filter(s => s.type === 'shortcut');
  assert.equal(sections.length, 3);
  for (const [i, id] of ['river-ford','waterfall-skybridge','canopy-ruins'].entries()) {
    const risky = graph.edges.find(e => e.id === id);
    const safe = graph.edges.find(e => e.from === risky.from && e.to === risky.to && e.mode === 'ground');
    const section = sections[i];
    assert.equal(monsoonLeg(section.from + 1).edgeId, safe.id);
    assert.equal(monsoonLeg(section.to - 1).edgeId, safe.id);
    assert.ok(section.from < section.to && section.to <= MONSOON_TRACK.length);
    assert.ok(section.altitude > 0 && Math.abs(section.x) <= 7.5);
    assert.ok(Math.abs(routeLength(graph,id)-routeLength(graph,safe.id)) / routeLength(graph,safe.id) < .20);
    if (i) assert.ok(sections[i-1].to < section.from);
  }
  assert.deepEqual(sections.map(s => !!s.deck), [true,false,true]);
});
test('Monsoon is a dev-unlocked-only classic sprint', () => {
  assert.equal(RACE_TRACKS[MONSOON_ID], undefined);
  assert.equal(COURSE_TRACKS[MONSOON_ID], MONSOON_TRACK);
  assert.equal(raceTrack(MONSOON_ID), MONSOON_TRACK);
  assert.equal(unlocked(MONSOON_ID), true);
  assert.equal(released(MONSOON_ID), false);
  const race = createRace(MONSOON_ID);
  assert.equal(race.rivals.length, 7);
  for (const mode of ['time', 'endless']) assert.equal(createRace(MONSOON_ID, { mode }).mode, mode);
  assert.throws(() => createRace(MONSOON_ID, { mode: 'circuit' }), RangeError);
});
test('Monsoon finishes once with a valid eight-car ranking', () => {
  const race = createRace(MONSOON_ID);
  race.phase = 'racing';
  for (let i = 0; i < 60*60*7 && race.phase !== 'finished'; i++)
    stepRace(race, { throttle: true, boost: race.player.fuel > 40 }, 1/60);
  assert.equal(race.phase, 'finished');
  assert.ok(race.player.distance >= race.length);
  assert.ok(Number.isInteger(race.result.position) && race.result.position >= 1 && race.result.position <= 8);
});
test('Monsoon scene shows the authored jungle ground, stone decks and no phantom branch road', async () => {
  const THREE = await import('three');
  const { createMonsoonRuinsRaceScene } = await import('../src/monsoon-ruins-race-scene.ts');
  const scene = new THREE.Scene(), race = createMonsoonRuinsRaceScene(scene);
  assert.equal(race.group.parent, scene);
  race.update(0);
  const names = [];
  race.group.traverse(o => names.push(o.name));
  assert.ok(names.filter(n => n === 'monsoon-course-chunk-ground').length > 30);
  for (const risky of ['river-ford','waterfall-skybridge','canopy-ruins'])
    assert.ok(!names.includes('monsoon-course-chunk-' + risky), risky);
  assert.equal(names.filter(n => n === 'shortcut-deck').length, 2);
  race.hide(); assert.equal(race.group.visible, false);
  race.dispose(); assert.equal(race.group.parent, null);
});
test('Monsoon scenery runs on past FINISH as far as the race view reaches, not a bare plane', async () => {
  const THREE = await import('three');
  const { createMonsoonRuinsRaceScene } = await import('../src/monsoon-ruins-race-scene.ts');
  const race = createMonsoonRuinsRaceScene(new THREE.Scene());
  race.update(MONSOON_TRACK.length + 40); // the car rolls on after the line
  race.group.updateMatrixWorld(true);
  const { forward } = monsoonFrame(MONSOON_TRACK.length);
  const box = new THREE.Box3(), centre = new THREE.Vector3();
  const ahead = race.group.children.filter(c => c.name === 'monsoon-course-chunk-ground' && c.visible)
    .map(c => { box.setFromObject(c).getCenter(centre); return centre.x * forward[0] + centre.z * forward[2]; });
  // FogExp2 .0013 is ~98% opaque at 1500 m: ground chunks must reach that far beyond the line.
  assert.ok(Math.max(...ahead) > 1300, 'farthest scenery ahead of FINISH: ' + Math.round(Math.max(...ahead)) + ' m');
  race.dispose();
  const { MONSOON_RUINS_COURSE, MONSOON_RUNOUT, sampleMonsoonRoute } = await import('../src/courses/monsoon-ruins.ts');
  const end = MONSOON_RUINS_COURSE.length, y = s => sampleMonsoonRoute('ground', s).point[1];
  assert.ok(Math.abs(y(end + MONSOON_RUNOUT) - y(end)) < 40, 'run-out stays level: ' + (y(end + MONSOON_RUNOUT) - y(end)).toFixed(1) + ' m');
  assert.throws(() => sampleMonsoonRoute('ground', end + MONSOON_RUNOUT + 1), /distance/i);
});
