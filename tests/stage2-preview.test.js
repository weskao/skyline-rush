import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('Frostbite is preview-only Coming Soon metadata, never a Stage 1 card', () => {
  const frost = STAGE2_TRACKS['frostbite-canyon'];
  assert.equal(frost.length, 13800);
  assert.equal(frost.names['zh-TW'], '極地冰原峽谷');
  assert.ok(!('frostbite-canyon' in UPCOMING_TRACKS), 'no sixth Stage 1 card');
  assert.equal(isUpcomingTrack('frostbite-canyon'), false, 'no home card / swipe target');
  assert.equal(upcomingTrackInfo('frostbite-canyon'), frost);
  assert.equal(upcomingTrackName('frostbite-canyon', 'zh-TW'), '極地冰原峽谷');
  assert.equal(upcomingTrackInfo('dune-tempest'), UPCOMING_TRACKS['dune-tempest']);
});

test('the preview gate is compiled only into dev / VITE_STAGE2_PREVIEW builds', async () => {
  const { default: config } = await import('../vite.config.js');
  const alias = (mode, command) => config({ command, mode }).resolve.alias['@stage2-environments'];
  assert.match(alias('production', 'build'), /upcoming-scenes\/stage2-none\.ts$/, 'production ships no Stage 2 scene');
  assert.match(alias('development', 'serve'), /upcoming-scenes\/stage2\.ts$/);
  process.env.VITE_STAGE2_PREVIEW = '1';
  try { assert.match(alias('production', 'build'), /upcoming-scenes\/stage2\.ts$/, 'explicit QA build'); }
  finally { delete process.env.VITE_STAGE2_PREVIEW; }
  const { STAGE2_ENVIRONMENTS } = await import('../src/upcoming-scenes/stage2-none.ts');
  assert.deepEqual(STAGE2_ENVIRONMENTS, {});
  assert.match(readFileSync(new URL('../src/world.js', import.meta.url), 'utf8'), /from '@stage2-environments'/);
  assert.match(readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8'),
    /if \(import\.meta\.env\.DEV \|\| import\.meta\.env\.VITE_STAGE2_PREVIEW\)/);
});
