import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { measureEconomy, economyMatrix, ECONOMY_CASES } from '../scripts/pickup-economy.mjs';
import { RACE_TRACKS } from '../src/game.js';

const STAGE1 = JSON.parse(readFileSync(new URL('../scripts/pickup-economy-stage1.json', import.meta.url), 'utf8'));

test('R1: the economy bot can race against all seven rivals and counts their NITRO', () => {
  const run = measureEconomy('coast', undefined, 600, { rivals: true });
  assert.deepEqual(measureEconomy('coast', undefined, 600, { rivals: true }), run, 'deterministic with rivals');
  assert.equal(run.rivals, 7);
  assert.equal(run.phase, 'finished');
  assert.ok(run.rivalNitro > 0, 'rivals fire NITRO: ' + run.rivalNitro);
  assert.equal(measureEconomy('coast').rivals, 0, 'the stage-1 measurement stays rival-free');
});

// User decision 2026-11-02: AC1 holds a bot that steers around cars, as a player would, to the rival-free stage 1.
// Before avoidance the bot rammed rivals 4 times on Coast alone; a cautious player still bumps now and then.
test('R1: the bot changes lane around rivals instead of ramming them', () => {
  const runs = Object.keys(RACE_TRACKS).map(id => [id, measureEconomy(id, undefined, 600, { rivals: true }).collisions]);
  const mean = runs.reduce((sum, [, n]) => sum + n, 0) / runs.length;
  assert.ok(mean <= 1.5, `mean contacts ${mean}: ${runs.map(r => r.join(':')).join(' ')}`);
  assert.ok(runs.find(([id]) => id === 'coast')[1] <= 1, 'coast');
});

test('R1: the matrix covers every layout-inheriting mode on every track, and Custom on every difficulty', () => {
  const keys = new Set(economyMatrix({ rivals: false }).map(r => r.key));
  for (const { key } of ECONOMY_CASES) assert.ok(keys.has(key), key);
  for (const difficulty of ['easy', 'normal', 'hard']) assert.ok(keys.has(`custom/${difficulty}/coast`), difficulty);
  assert.ok(keys.has('circuit/normal/harbor-circuit'));
  assert.ok(![...keys].some(k => k.startsWith('endless/') || k.startsWith('eventlab/')), 'own-course modes stay out');
});

// AC1 (user, 2026-11-02): with seven rivals collecting too, the player's NITRO per minute and BOOST share stay
// at or above 95% of the rival-free stage 1, on every mode, track and difficulty.
test('AC1: the player keeps >= 95% of the stage-1 NITRO and BOOST with seven rivals, everywhere', () => {
  const short = economyMatrix({ rivals: true }).filter(r => r.nitroPerMinute < STAGE1[r.key].nitroPerMinute * 0.95 || r.boostShare < STAGE1[r.key].boostShare * 0.95);
  assert.deepEqual(short.map(r => `${r.key} nitro ${STAGE1[r.key].nitroPerMinute}->${r.nitroPerMinute} boost ${STAGE1[r.key].boostShare}->${r.boostShare}`), []);
});

// AC2 (user, 2026-11-02): seven rivals together fire NITRO more per race than before stage 2, averaged over the
// ten tracks: Normal at least +2 in every mode with rivals, Hard (Custom) at least +4. Elimination knocks rivals
// out during the race, so fewer are left to fire: the user accepted "more than before" there (+1.7, 2026-11-02).
test('AC2: rivals fire NITRO at least +2 per race on Normal and +4 on Hard', () => {
  const rows = economyMatrix({ rivals: true }), mean = (prefix, pick) => {
    const list = rows.filter(r => r.key.startsWith(prefix));
    return list.reduce((sum, r) => sum + pick(r), 0) / list.length;
  };
  for (const [prefix, more] of [['classic/normal/', 2], ['cup/normal/', 2], ['elimination/normal/', 1.5], ['custom/normal/', 2], ['circuit/normal/', 2], ['custom/hard/', 4]]) {
    const before = mean(prefix, r => STAGE1[r.key].rivalNitro), after = mean(prefix, r => r.rivalNitro);
    assert.ok(after >= before + more - 1e-9, `${prefix} ${before} -> ${after}, wants +${more}`);
  }
});

test('R1: the frozen stage-1 baseline has a row for every matrix case', () => {
  for (const { key } of ECONOMY_CASES) {
    const row = STAGE1[key];
    assert.ok(row && row.nitroPerMinute > 0 && row.boostShare > 0, key);
  }
});
