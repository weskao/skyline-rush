import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBeginTrackSwipe } from '../src/track-swipe-ui.ts';

const base = { button: 0, phase: 'ready', tutorial: false, editing: false, busy: false, dialogOpen: false,
  pointerType: 'touch', clientX: 200, width: 390 };
test('track swipe admits touch drag in center and rejects back-edge gestures', () => {
  assert.equal(canBeginTrackSwipe(base), true);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 390 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0, pointerType: 'mouse' }), true);
});
test('track swipe cannot capture inputs during game play, modal and layout editing', () => {
  for (const state of [{ phase: 'racing' }, { tutorial: true }, { editing: true }, { busy: true }, { dialogOpen: true }, { button: 2 }]) {
    assert.equal(canBeginTrackSwipe({ ...base, ...state }), false);
  }
});

test('swipe preview rendering always reads the live race getter instead of a stale or undeclared race variable', async () => {
  const { readFileSync } = await import('node:fs');
  const code = readFileSync(new URL('../src/track-swipe-ui.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /getWorld\(\)\.render\(race\s*,/, 'a stale undeclared race breaks track swipe render snapshots');
  assert.match(code, /world\.render\(getRace\(\)/, 'snapshots must use live selected race');
});

test('track preview swipe resolves playable and future card IDs without creating a Race', async () => {
  const swipe = await import('../src/track-swipe-ui.ts');
  assert.equal(typeof swipe.swipeTrackId, 'function', 'carousel must recognize upcoming cards');
  assert.equal(swipe.swipeTrackId({ dataset: { track: 'cosmic' } }), 'cosmic');
  assert.equal(swipe.swipeTrackId({ dataset: { upcomingTrack: 'dune-tempest' } }), 'dune-tempest');
  assert.equal(swipe.swipeTrackId({ dataset: {} }), '');
});

test('desktop horizontal paging accepts the lobby and collapsed track rail but leaves nested scrollers alone', async () => {
  const { acceptsTrackWheelTarget } = await import('../src/track-swipe-ui.ts');
  const target = (...ancestors) => ({ closest: selector => ancestors.some(item => selector.split(', ').includes(item)) ? {} : null });
  const scene = target('#world');
  const heading = target('#intro');
  const rail = target('#intro', '.track-select');
  assert.equal(acceptsTrackWheelTarget(scene, true), true);
  assert.equal(acceptsTrackWheelTarget(heading, true), true);
  assert.equal(acceptsTrackWheelTarget(rail, true), true);
  assert.equal(acceptsTrackWheelTarget(rail, false), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', '#lobby-tracks-toggle[aria-expanded="true"] + .track-select'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', '#lobby-mode-options'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', 'select'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('.settings-panel'), true), false);
});
