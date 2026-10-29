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

test('13B the mode picker markup lives in App.vue, one button per playable mode; scripts only wire it', async () => {
  const { MODES } = await import('../src/race-config.ts');
  const { readdirSync } = await import('node:fs');
  const src = new URL('../src/', import.meta.url), read = name => readFileSync(new URL(name, src), 'utf8');
  const app = read('App.vue');
  for (const mode of MODES)
    assert.equal(app.split(`data-race-mode="${mode}"`).length - 1, 1, `App.vue renders exactly one ${mode} button`);
  // Scripts never build or bind mode buttons outside the race-select controller: main.js stays screen flow.
  const scripts = readdirSync(src).filter(name => /\.(js|ts)$/.test(name));
  for (const name of scripts) {
    const code = read(name);
    // Building markup (a button template, a data attribute set in code), not a selector such as [data-race-mode="${x}"].
    assert.doesNotMatch(code, /<button[^>`]*data-race-mode|(?<!body)\.dataset\.raceMode\s*=(?!=)|setAttribute\(\s*['"]data-race-mode/, `${name} must not create mode buttons`);
    if (name !== 'race-select-ui.ts') assert.doesNotMatch(code, /\[data-race-mode\][^\n]*addEventListener|race-mode-tabs/, `${name} must not wire the mode picker`);
  }
});
