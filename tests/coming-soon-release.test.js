import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPCOMING_TRACKS, homeTrackStatus, isUpcomingTrack, upcomingReadiness } from '../src/upcoming-tracks.ts';
import { RACE_TRACKS } from '../src/game.js';
import { STAGE2_TRACKS, stage2PreviewRequest } from '../src/stage2-tracks.ts';
import { availableTracks as developmentTracks, isUpcomingEnterable as developmentEnterable } from '../src/access/dev-unlocked.ts';
import { availableTracks as productionTracks, isUpcomingEnterable as productionEnterable } from '../src/access/production.ts';

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

test('an approved playable preview with a real runtime is playable in dev-unlocked only', () => {
  // Readiness 'playable' + a resolvable runtime is the only approval; Frostbite and Stormline are the approved cards.
  assert.deepEqual(IDS.filter(id => upcomingReadiness(id) === 'playable'), ['stormline-megacity', 'frostbite-canyon']);
  RACE_TRACKS['dune-tempest'] = RACE_TRACKS.coast; // a merged runtime without readiness approval
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(['coast', 'dune-tempest']), setItem() {} },
  });
  try {
    assert.equal(developmentEnterable('frostbite-canyon'), true);
    assert.equal(productionEnterable('frostbite-canyon'), false, 'production never enters a Coming Soon id');
    assert.equal(developmentEnterable('dune-tempest'), false, 'a runtime alone is not approval');
    assert.equal(developmentTracks().includes('dune-tempest'), false, 'unapproved cards stay blocked');
    assert.equal(productionTracks().includes('dune-tempest'), false, 'production never unlocks a Coming Soon id');
    assert.equal(developmentEnterable('monsoon-ruins'), false);
  } finally {
    delete RACE_TRACKS['dune-tempest'];
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('Coming Soon cards keep original selectable route-map and KM styling, not a parallel gallery', () => {
  const shell = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const select = readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8');
  assert.match(shell, /<button v-for="\(track, id\) in UPCOMING_TRACKS"/);
  assert.match(shell, /class="upcoming-track-card"/);
  assert.match(shell, /:data-upcoming-track="id" aria-pressed="false"/);
  assert.match(shell, /class="track-route-map"[^>]*><img class="upcoming-route-image"/);
  assert.match(shell, /<strong>\{\{ track.names.en \}\}<\/strong><span>\{\{ track.length \/ 1000 \}\} KM <small><\/small><\/span>/);
  assert.doesNotMatch(shell, /class="coming-soon-card"/);
  assert.match(select, /for \(const button of upcomingButtons\(\)\) button.addEventListener\('click'/);
  assert.match(select, /const id = button\.dataset\.upcomingTrack as UpcomingTrackId;\s*upcomingSelection = options\.isUpcomingEnterable\(id\) \? null : id;/);
  assert.match(select, /labelKey = upcoming \? 'track.comingSoon'/);
  assert.match(select, /isUpcomingTrack\(id\) \? options\.isUpcomingEnterable\(id\) : unlockedTracks\.has\(id\)/, 'preview race is forbidden regardless of saved unlock');
  assert.match(select, /startButton.disabled = Boolean\(upcoming\)/);
});

test('existing locale and navigation hooks describe all six Coming Soon previews', () => {
  const locale = readFileSync(new URL('../src/locales/upcoming-copy.ts', import.meta.url), 'utf8');
  const swipe = readFileSync(new URL('../src/track-swipe-ui.ts', import.meta.url), 'utf8');
  assert.match(locale, /'track.comingSoon': 'COMING SOON'/);
  assert.match(locale, /'track.comingSoon': '即將推出'/);
  assert.match(locale, /'track.previewLength':/);
  assert.match(swipe, /swipeTrackId/);
  assert.match(swipe, /data-upcoming-track/);
});

test('all unlocked Make targets resolve the development-only policy', () => {
  const make = readFileSync(new URL('../Makefile', import.meta.url), 'utf8');
  assert.match(make, /test-unlocked:\s*dev-unlocked/);
  assert.match(make, /dev-unlocked:[\s\S]*?vite\.unlocked\.config\.js/);
  assert.match(make, /phone-unlocked:[\s\S]*?vite\.unlocked\.config\.js/);
  assert.match(make, /dev-feature:[\s\S]*?scripts\/dev-feature\.mjs/);
});

test('direct start and restart paths fail closed for Coming Soon, including Daily mode', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /const isUpcomingBlocked = id => isUpcomingTrack\(id\) && !isUpcomingEnterable\(id\);/);
  assert.match(main, /function start\(\) \{\s*if \(raceSelect\.isUpcomingSelected\(\) \|\| isUpcomingBlocked\(race\.trackId\)\) return;/);
  assert.match(main, /function restart\(trackId = race\.trackId\) \{\s*if \(raceSelect\.isUpcomingSelected\(\) \|\| isUpcomingBlocked\(trackId\)\) return;/);
});

test('Frostbite home shares Stage 2 metadata and only accepts the explicit showroom URL', () => {
  assert.equal(UPCOMING_TRACKS['frostbite-canyon'], STAGE2_TRACKS['frostbite-canyon']);
  assert.deepEqual(stage2PreviewRequest('?stage2-preview=frostbite-canyon&shot=p02'), { id: 'frostbite-canyon', shot: 'p02' });
  assert.deepEqual(stage2PreviewRequest('?stage2-preview=frostbite-canyon'), { id: 'frostbite-canyon', shot: 'p01' });
  assert.equal(stage2PreviewRequest('?stage2-preview=dune-tempest'), null);
  assert.equal(stage2PreviewRequest('?stage2-preview=unknown&shot=p02'), null);
});
