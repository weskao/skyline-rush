import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { UI } from '../src/locales/ui.ts';
import { UPCOMING_TRACKS, isUpcomingTrack, homeTrackStatus } from '../src/upcoming-tracks.ts';

const ids = ['dune-tempest', 'monsoon-ruins', 'skyfall-archipelago', 'volcanic-crown', 'stormline-megacity'];

test('only the five Stage 1 planning tracks appear as selectable coming-soon home cards', () => {
  assert.deepEqual(Object.keys(UPCOMING_TRACKS), ids);
  for (const id of ids) {
    assert.equal(isUpcomingTrack(id), true);
    assert.equal(RACE_TRACKS[id], undefined, 'concept maps cannot enter playable RaceFactory');
    const item = UPCOMING_TRACKS[id];
    assert.ok(item.length >= 12000 && item.length <= 17000);
    assert.ok(item.names.en.length > 0 && item.names['zh-TW'].length > 0);
    assert.ok(item.image.endsWith('.jpg'));
  }
  assert.equal(isUpcomingTrack('frostbite-canyon'), false, 'Stage 2 stays out of home');
});

test('coming-soon never becomes playable through an unlock save or another game mode', () => {
  const unlocked = new Set(['coast', 'dune-tempest']);
  assert.equal(homeTrackStatus('dune-tempest', unlocked), 'coming-soon');
  assert.equal(homeTrackStatus('coast', unlocked), 'unlocked');
  assert.equal(homeTrackStatus('neon', unlocked), 'locked');
});

test('home selection uses preview-only state; never constructs an unfinished race', () => {
  const raceSelect = readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  assert.match(app, /data-upcoming-track/);
  assert.match(app, /upcoming-scene-image/);
  assert.match(raceSelect, /upcomingSelection/);
  assert.match(raceSelect, /homeTrackStatus/);
  assert.match(raceSelect, /startButton\.disabled/);
  assert.match(raceSelect, /startButton\.querySelector/);
  assert.match(raceSelect, /canRace\s*=.*upcomingSelection/);
  assert.doesNotMatch(raceSelect, /options\.createRace\(\s*upcomingSelection/);
});

test('CTA and status have localized text with no extra button width', () => {
  for (const lang of ['en', 'zh-TW']) {
    for (const key of ['track.comingSoon', 'track.comingSoonInfo', 'track.unavailable', 'start.race'])
      assert.ok(UI[lang][key], lang + ' missing ' + key);
  }
  const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(style, /#start-button\s*\{[^}]*width:\s*236px/);
});
