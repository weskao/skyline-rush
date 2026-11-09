import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPCOMING_TRACKS, upcomingReadiness } from '../src/upcoming-tracks.ts';
import { ENTERABLE_STAGES, isUpcomingEnterable as developmentAccess } from '../src/access/dev-unlocked.ts';
import { isUpcomingEnterable as productionAccess } from '../src/access/production.ts';

test('ready is a declared upcoming stage', () => {
  const code = readFileSync(new URL('../src/upcoming-tracks.ts', import.meta.url), 'utf8');
  assert.match(code, /export type UpcomingReadiness\s*=\s*[^;]*'ready'/);
});

test('development policy accepts only playable or ready stages with registered runtimes', () => {
  assert.deepEqual([...ENTERABLE_STAGES].sort(), ['playable','ready']);
});

test('unlisted readiness defaults to preview and neither access policy permits START', () => {
  const previews = Object.keys(UPCOMING_TRACKS).filter(id => upcomingReadiness(id) === 'preview');
  for (const id of previews) {
    assert.equal(developmentAccess(id), false, id);
    assert.equal(productionAccess(id), false, id);
  }
  assert.equal(developmentAccess('unknown-track'), false);
});
