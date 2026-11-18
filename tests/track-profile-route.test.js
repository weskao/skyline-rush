import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, RACE_TRACKS, stepRace } from '../src/game.js';
import { MODES } from '../src/race-config.ts';
import { raceCompletion } from '../src/race-objectives.ts';
import { hasStreamingRouteMap, routeMarker, routeSamples } from '../src/route-map.ts';
import { trackFrame, trackPoint } from '../src/track-paths.ts';
import { isCurrentLayout, recordTrackId, roadRecordLayout } from '../src/record-layout.ts';

const index = JSON.parse(readFileSync(new URL('../docs/designs/3d-pipeline/track-profiles/route-designs.json', import.meta.url)));
const canyon = index.find(track => track.id === 'canyon');
const lengthBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('Canyon follows the design elevations and headings for a measured 10 km', () => {
  assert.equal(RACE_TRACKS.canyon.length, 10000);
  for (const [distance, heading, elevation] of canyon.knots) {
    const { point, forward } = trackFrame('canyon', distance);
    const bearing = Math.atan2(forward[0], -forward[2]) * 180 / Math.PI;
    assert.ok(Math.abs(point.y - (elevation - canyon.knots[0][2])) < .01, 'elevation at ' + distance);
    assert.ok(Math.abs(bearing - heading) < .05, 'bearing at ' + distance);
  }
  let length = 0;
  for (let d = 0; d < 10000; d += 4) length += lengthBetween(trackPoint('canyon', d), trackPoint('canyon', d + 4));
  assert.ok(Math.abs(length - 10000) < 1, 'measured route length');
  assert.deepEqual(trackPoint('canyon', 10001), trackPoint('canyon', 10000), 'finite routes end at the finish');
});

test('finite Canyon modes follow the redesigned finish and checkpoint sequence', () => {
  for (const mode of MODES.filter(id => !['endless', 'elimination', 'circuit'].includes(id))) {
    const race = createRace('canyon', { mode });
    race.player.distance = 6000;
    assert.equal(raceCompletion(race).done, false, mode + ' passes the old finish');
    race.player.distance = 10000;
    assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' }, mode);
    if (race.checkpoint) assert.ok(race.checkpoint.gates.at(-1).distance > 9400);
  }
  for (const daily of ['gold-rings', 'double-traffic']) assert.equal(createRace('canyon', daily).length, 10000);
  assert.throws(() => createRace('canyon', { mode: 'circuit' }), /circuit/i);
  assert.equal(recordTrackId('canyon'), 'canyon@7');
  assert.equal(roadRecordLayout('canyon'), 3);
  const cup = { mode: 'cup', cupTracks: ['neon', 'canyon', 'aurora'] };
  assert.equal(recordTrackId('neon', cup), 'neon@9');
  assert.equal(isCurrentLayout({ track: 'neon', rules: JSON.stringify(cup), layout: 7 }), false);
  assert.equal(routeSamples('canyon').at(-1).distance, 10000);
  assert.notDeepEqual(routeMarker('canyon', 6000), routeMarker('canyon', 10000));
});

test('Canyon streaming modes cross the authored finish and continue with a smooth road frame', () => {
  for (const mode of ['endless', 'elimination']) {
    const race = createRace('canyon', { mode });
    race.phase = 'racing';
    for (const finish of [10000, 20000, 50000]) {
      const before = trackFrame('canyon', finish - .5, true), after = trackFrame('canyon', finish + .5, true);
      assert.ok(lengthBetween(before.point, after.point) < 1.02);
      assert.ok(before.forward.reduce((sum, n, i) => sum + n * after.forward[i], 0) > .999);
      Object.assign(race.player, { distance: finish - .2, speed: 74, cooldown: 2 });
      stepRace(race, { throttle: true }, 1 / 60);
      assert.ok(race.player.distance > finish);
      assert.equal(race.phase, 'racing');
    }
  }
});

for (const design of index.filter(track => track.id !== 'canyon')) {
  const { id, designDistanceM: distance, knots } = design;
  test(id + ' follows the measured design and the same finish in every finite mode', () => {
    assert.ok(distance >= 8000 && distance <= 12000);
    assert.equal(RACE_TRACKS[id].length, distance);
    for (const [station, heading, elevation] of knots) {
      const { point, forward } = trackFrame(id, station);
      const bearing = Math.atan2(forward[0], -forward[2]) * 180 / Math.PI;
      const difference = ((bearing - heading + 540) % 360) - 180;
      assert.ok(Math.abs(point.y - (elevation - knots[0][2])) < .01, 'elevation at ' + station);
      assert.ok(Math.abs(difference) < .1, 'bearing at ' + station);
    }
    let measured = 0;
    for (let d = 0; d < distance; d += 4) {
      measured += lengthBetween(trackPoint(id, d), trackPoint(id, Math.min(d + 4, distance)));
    }
    assert.ok(Math.abs(measured - distance) < 1, 'measured length ' + measured);
    assert.deepEqual(trackPoint(id, distance + 1), trackPoint(id, distance));
    assert.equal(routeSamples(id).at(-1).distance, distance);
    for (const mode of MODES.filter(mode => !['endless', 'elimination', 'circuit'].includes(mode))) {
      const race = createRace(id, { mode });
      race.player.distance = distance - .25;
      assert.equal(raceCompletion(race).done, false, mode);
      race.player.distance = distance;
      assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' }, mode);
      if (race.checkpoint) assert.ok(race.checkpoint.gates.at(-1).distance > distance * .94);
    }
    for (const daily of ['gold-rings', 'double-traffic']) assert.equal(createRace(id, daily).length, distance);
  });

  test(id + ' continues through the shared profile in Endless and Elimination', () => {
    for (const mode of ['endless', 'elimination']) {
      assert.equal(hasStreamingRouteMap(id, mode), true);
      const race = createRace(id, { mode });
      race.phase = 'racing';
      for (const seam of [distance, 2 * distance, 5 * distance]) {
        const before = trackFrame(id, seam - .25, true), after = trackFrame(id, seam + .25, true);
        assert.ok(Math.abs(lengthBetween(before.point, after.point) - .5) < .01);
        assert.ok(before.forward.reduce((sum, n, i) => sum + n * after.forward[i], 0) > .999);
        Object.assign(race.player, { distance: seam - .2, speed: 74, cooldown: 2 });
        stepRace(race, { throttle: true }, 1 / 60);
        assert.ok(race.player.distance > seam);
        assert.equal(race.phase, 'racing');
      }
    }
  });
}
