import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { MODES } from '../src/race-config.ts';
import { COURSE_TRACKS, raceTrack, isModeTrack } from '../src/race-tracks.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { availableTracks as devTracks, isUpcomingEnterable as devEnterable } from '../src/access/dev-unlocked.ts';
import { availableTracks as releasedTracks, isUpcomingEnterable as releasedEnterable } from '../src/access/production.ts';
import { createCup } from '../src/championship-cup.ts';
import { ENDLESS_COLLISIONS } from '../src/endless-highway.ts';
import { loadModeHistory, recordModeRace } from '../src/history.ts';
import { mergeProgress } from '../src/cloud-progress-merge.ts';

const ids = Object.keys(UPCOMING_TRACKS), modes = MODES.filter(mode => mode !== 'circuit');
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};

test('six approved courses reuse original modes without opening production Coming Soon access', () => {
  assert.equal(ids.length, 6);
  assert.equal(Object.keys(RACE_TRACKS).length, 10);
  const unlocked = devTracks();
  for (const id of ids) {
    assert.ok(COURSE_TRACKS[id] && raceTrack(id), id + ' has real race data');
    assert.ok(devEnterable(id) && unlocked.includes(id), id + ' participates in local unlocked selection');
    assert.ok(!releasedEnterable(id) && !releasedTracks().includes(id), id + ' stays locked in release');
    for (const mode of modes) {
      const race = createRace(id, { mode });
      assert.equal(race.mode, mode, id + '/' + mode);
      assert.equal(race.trackId, id, id + '/' + mode);
      assert.equal(isModeTrack(id, mode), mode !== 'classic', id + '/' + mode + ' mode record eligibility');
      if (mode === 'endless' || mode === 'elimination') {
        assert.ok(race.endless && !race.course, id + '/' + mode + ': unbounded highway, not a finite graph');
        assert.ok(race.rings.length && race.pickups.length && race.traffic.length, id + ': streamed encounters');
      } else if (COURSE_RUNTIMES[id]) assert.ok(race.course, id + '/' + mode + ': authored graph preserved');
      else assert.equal(race.course, undefined, id + ': measured point-to-point engine preserved');
    }
    assert.throws(() => createRace(id, { mode: 'circuit' }), RangeError, id + ': Circuit uses Harbor only');
  }
});

test('dev Cup selection includes six unreleased routes without changing the ten-track campaign catalog', () => {
  const unlocked = devTracks();
  for (const id of ids) {
    const cup = createCup(unlocked, id, 3);
    assert.equal(cup.tracks[0], id);
    assert.equal(cup.tracks.length, 3);
    assert.ok(cup.tracks.every(track => !!raceTrack(track)));
    assert.equal(createRace(id, { mode: 'cup', cupTracks: cup.tracks }).mode, 'cup');
  }
  assert.equal(Object.keys(RACE_TRACKS).length, 10);
});

test('each upcoming Endless highway streams beyond its finite finish and records a survival distance', () => {
  for (const id of ids) {
    const race = createRace(id, { mode: 'endless' }); race.phase = 'racing';
    for (const distance of [race.length + 80, 25_000, 50_000, 85_000]) {
      Object.assign(race.player, { distance, x: 0, speed: 70, altitude: 0, cooldown: 1 });
      stepRace(race, { throttle: true }, 1 / 60);
      assert.equal(race.phase, 'racing', id + ' @' + distance);
      assert.ok(race.player.distance > distance, id + ' must keep advancing');
      assert.ok(race.traffic.length <= 40 && race.rings.length <= 65 && race.pickups.length <= 100, id + ' encounters bounded');
    }
    race.player.collisions = ENDLESS_COLLISIONS;
    stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(race.phase, 'finished', id);
    assert.equal(race.result.endReason, 'collisions', id);
    const storage = memory(), saved = recordModeRace(race, storage);
    assert.equal(saved.best, race.result.distance, id);
    assert.equal(loadModeHistory(storage)[0].track, id);
    assert.equal(mergeProgress({ modeHistory: loadModeHistory(storage) }, null).modeHistory.length, 1,
      id + ': mode records can sync independently of campaign unlocks');
  }
});

test('Coming Soon mode selection goes through the common mode config, not a Classic-only override', () => {
  const source = readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /isUpcomingTrack\(trackId\)\s*\?\s*options\.createRace\(trackId\)/);
  assert.match(source, /options\.createRace\(trackId,\s*\{ mode: selectedMode/);
});
