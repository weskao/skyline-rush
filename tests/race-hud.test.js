import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRaceHud } from '../src/race-hud.ts';
import { createModePanels } from '../src/race-hud-modes.ts';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../src/race-hud.ts', import.meta.url), 'utf8') + readFileSync(new URL('../src/race-hud-modes.ts', import.meta.url), 'utf8');

test('the in-race HUD has its own modules; main.js only calls hud.update', () => {
  for (const fn of [createRaceHud, createModePanels]) assert.equal(typeof fn, 'function');
  for (const moved of [/const hudNodes/, /nitroSegments/, /leaderboardOrder/, /calloutReports/, /speedTicks/, /mode\.checkpointHud/, /let L = /])
    assert.doesNotMatch(main, moved);
  assert.match(main, /hud\.update\(now, input\)/);
});

test('HUD updates never query the DOM or touch Vue reactivity per tick', () => {
  const update = hud.slice(hud.indexOf('function update('));
  assert.doesNotMatch(hud, /from 'vue'/);
  assert.doesNotMatch(update.slice(0, update.indexOf('\n  return {')), /querySelector|getElementById|\$\(/);
});
