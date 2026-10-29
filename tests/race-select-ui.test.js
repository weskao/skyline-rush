import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupRaceSelectUI } from '../src/race-select-ui.ts';

test('home race selection (modes, rules, track picker, route maps) has one controller', () => {
  assert.equal(typeof setupRaceSelectUI, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/function showTracks/, /function ensureRouteMaps/, /const raceRules/, /let selectedMode/, /\[data-race-preset\]/, /#recent-custom-runs/, /LAST_TRACK_KEY/])
    assert.doesNotMatch(main, moved);
});

test('the track picker renders in small steps instead of one long function', () => {
  const source = readFileSync(new URL('../src/race-select-ui.ts', import.meta.url), 'utf8');
  for (const step of ['renderModeRules', 'renderTrackButtons', 'renderRouteInfo', 'showGhost']) assert.match(source, new RegExp(`function ${step}\\(`));
});
