import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPCOMING_TRACKS, homeTrackStatus, isUpcomingTrack } from '../src/upcoming-tracks.ts';
import { RACE_TRACKS } from '../src/game.js';
import { availableTracks as developmentTracks } from '../src/access/dev-unlocked.ts';
import { availableTracks as productionTracks } from '../src/access/production.ts';

const IDS = ['dune-tempest', 'monsoon-ruins', 'skyfall-archipelago',
  'volcanic-crown', 'stormline-megacity', 'frostbite-canyon'];

test('all six unreleased courses are cover-only and never in the released race catalog', () => {
  assert.deepEqual(Object.keys(UPCOMING_TRACKS), IDS);
  for (const id of IDS) {
    assert.equal(isUpcomingTrack(id), true);
    assert.equal(Object.hasOwn(RACE_TRACKS, id), false, id);
    assert.equal(homeTrackStatus(id, new Set(IDS)), 'coming-soon', id);
    assert.match(UPCOMING_TRACKS[id].image, /^track-teasers\/[a-z-]+\.jpg$/);
  }
});

test('all-unlocked Make variants still cannot unlock a registered cover-only course', () => {
  RACE_TRACKS['dune-tempest'] = RACE_TRACKS.coast; // Regression: accidentally merged unfinished runtime
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: key => key === 'skyline-rush-unlocked' ? JSON.stringify(['coast', 'dune-tempest']) : null,
      setItem() {} },
  });
  try {
    assert.equal(developmentTracks().includes('dune-tempest'), false);
    assert.equal(productionTracks().includes('dune-tempest'), false);
    assert.equal(developmentTracks().includes('coast'), true);
  } finally {
    delete RACE_TRACKS['dune-tempest'];
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('Coming Soon gallery does not join the real race selector and cannot be clicked to START', () => {
  const shell = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const select = readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8');
  assert.match(shell, /v-for="\(track, id\) in UPCOMING_TRACKS"/);
  assert.match(shell, /:data-upcoming-track="id"/);
  assert.match(shell, /aria-disabled="true"/);
  assert.match(shell, /COMING SOON/);
  assert.match(select, /!isUpcomingTrack\(trackId\)/, 'even a mistakenly registered runtime cannot START');
});

test('all unlocked Make targets resolve the development-only policy', () => {
  const make = readFileSync(new URL('../Makefile', import.meta.url), 'utf8');
  assert.match(make, /test-unlocked:\s*dev-unlocked/);
  assert.match(make, /dev-unlocked:[\s\S]*?vite\.unlocked\.config\.js/);
  assert.match(make, /phone-unlocked:[\s\S]*?vite\.unlocked\.config\.js/);
  assert.match(make, /dev-feature:[\s\S]*?scripts\/dev-feature\.mjs/);
});
