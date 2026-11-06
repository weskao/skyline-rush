import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { STAGE2_TRACKS, stage2PreviewRequest } from '../src/stage2-tracks.ts';
import { UPCOMING_TRACKS, isUpcomingTrack, upcomingTrackInfo, upcomingTrackName } from '../src/upcoming-tracks.ts';

test('Stage 2 preview request is parsed strictly from the URL', () => {
  assert.deepEqual(stage2PreviewRequest('?stage2-preview=frostbite-canyon'), { id: 'frostbite-canyon', shot: 'p01' });
  assert.deepEqual(stage2PreviewRequest('?stage2-preview=frostbite-canyon&shot=p02'), { id: 'frostbite-canyon', shot: 'p02' });
  assert.deepEqual(stage2PreviewRequest('?stage2-preview=frostbite-canyon&shot=evil'), { id: 'frostbite-canyon', shot: 'p01' });
  assert.equal(stage2PreviewRequest('?stage2-preview=coast'), null);
  assert.equal(stage2PreviewRequest('?stage2-preview=__proto__'), null);
  assert.equal(stage2PreviewRequest(''), null);
});

test('Frostbite is a sixth Coming Soon card with its real scene, never a playable track', async () => {
  const frost = STAGE2_TRACKS['frostbite-canyon'];
  assert.equal(frost.length, 13800);
  assert.equal(frost.names['zh-TW'], '極地冰原峽谷');
  assert.equal(UPCOMING_TRACKS['frostbite-canyon'], frost);
  assert.equal(isUpcomingTrack('frostbite-canyon'), true, 'home card / swipe target');
  assert.equal(upcomingTrackInfo('frostbite-canyon'), frost);
  assert.equal(upcomingTrackName('frostbite-canyon', 'zh-TW'), '極地冰原峽谷');
  assert.equal(upcomingTrackInfo('dune-tempest'), UPCOMING_TRACKS['dune-tempest']);
  assert.equal(RACE_TRACKS['frostbite-canyon'], undefined, 'race runtime is not wired yet');
  const { UPCOMING_ENVIRONMENTS } = await import('../src/upcoming-scenes/index.ts');
  assert.equal(typeof UPCOMING_ENVIRONMENTS['frostbite-canyon'], 'function', 'real Three.js scene ships with the card');
});
