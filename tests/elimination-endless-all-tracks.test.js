import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { COURSE_TRACKS, raceTrack } from '../src/race-tracks.ts';
import { ENDLESS_COLLISIONS, ENDLESS_CHUNK } from '../src/endless-highway.ts';

const allTracks = () => [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS)];

test('Elimination shares bounded Endless road streams on every current and future non-circuit track', () => {
  const ids = allTracks();
  assert.equal(ids.length, 16, 'ten classic routes and six upcoming routes in this integration');
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    const original = JSON.stringify(raceTrack(id));
    const race = createRace(id, { mode: 'elimination' });
    assert.ok(race.elimination && race.endless, id + ': knockout and infinite road coexist');
    assert.equal(race.course, undefined, id + ': must not attach finite CourseGraph');
    assert.deepEqual(race.sections, [], id + ': authored finish-only obstacles removed');
    assert.ok(race.rings.length && race.pickups.length && race.traffic.length, id + ': shared streamed encounters');
    assert.equal(race.rivals.length, 7, id + ': eight-driver knockout');
    race.phase = 'racing';
    const beyond = Math.max(race.length + 100, 85_000);
    Object.assign(race.player, { distance: beyond, speed: 70, collisions: ENDLESS_COLLISIONS, cooldown: 5 });
    stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(race.phase, 'racing', id + ': no collision-based or finish-based knockout');
    assert.ok(race.player.distance > beyond, id + ': player passes authored finish');
    assert.equal(race.endless.chunk, Math.floor(beyond / ENDLESS_CHUNK), id + ': highway keeps streaming');
    assert.ok(race.rivals.every(r => r.finishTime === null), id + ': no false finish for opponents');
    assert.ok(race.traffic.length <= 40 && race.pickups.length <= 100 && race.rings.length <= 65,
      id + ': encounter arrays remain bounded');
    assert.equal(JSON.stringify(raceTrack(id)), original, id + ': original sprint geometry is untouched');
  }
});

test('all sixteen elimination races keep going past the authored endpoint until the last ten-second knockout', () => {
  for (const id of allTracks()) {
    const race = createRace(id, { mode: 'elimination' });
    race.phase = 'racing';
    for (let round = 0; round < 7; round++) {
      const distance = Math.max(race.length + 1500, 100_000) + round * 500;
      race.elapsed = 10 * (round + 1) - .05;
      Object.assign(race.player, { distance, speed: 75, x: 0, altitude: 0, cooldown: 3, collisions: ENDLESS_COLLISIONS });
      for (const [i, rival] of race.rivals.entries()) Object.assign(rival, { distance: distance - 250 - i * 20, speed: 75 });
      stepRace(race, { throttle: true }, .06);
      assert.equal(race.elimination.eliminated.length, round + 1, id + ': knockout #' + (round + 1));
      assert.equal(race.rivals.length, 6 - round, id + ': only one rival knocked out');
      assert.equal(race.phase, round === 6 ? 'finished' : 'racing', id + ': knockout clock controls finish');
    }
    assert.equal(race.result.success, true, id);
    assert.equal(race.result.position, 1, id);
  }
});

test('a newly added short track automatically uses the same elimination streaming rules', () => {
  const id = 'future-short-track';
  RACE_TRACKS[id] = { name: 'Future short track', length: 100, trafficDensity: 1,
    seed: 37037, layoutVersion: 1, sections: [] };
  try {
    const race = createRace(id, { mode: 'elimination' });
    assert.ok(race.endless && race.elimination && !race.course);
    race.phase = 'racing';
    Object.assign(race.player, { distance: 200, speed: 60, cooldown: 3 });
    stepRace(race, { throttle: true }, .05);
    assert.equal(race.phase, 'racing');
    assert.ok(race.player.distance > 200);
    assert.ok(race.rivals.every(rival => rival.finishTime === null));
  } finally { delete RACE_TRACKS[id]; }
});
