import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { measureEconomy, economyMatrix, ECONOMY_CASES } from '../scripts/pickup-economy.mjs';

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
test('R1: the bot changes lane around rivals instead of ramming them', () => {
  for (const id of ['coast', 'alpine', 'aurora']) {
    const run = measureEconomy(id, undefined, 600, { rivals: true });
    assert.ok(run.collisions <= 1, `${id} collisions ${run.collisions}`);
  }
});

test('R1: the matrix covers every layout-inheriting mode on every track, and Custom on every difficulty', () => {
  const keys = new Set(economyMatrix({ rivals: false }).map(r => r.key));
  for (const { key } of ECONOMY_CASES) assert.ok(keys.has(key), key);
  for (const difficulty of ['easy', 'normal', 'hard']) assert.ok(keys.has(`custom/${difficulty}/coast`), difficulty);
  assert.ok(keys.has('circuit/normal/harbor-circuit'));
  assert.ok(![...keys].some(k => k.startsWith('endless/') || k.startsWith('eventlab/')), 'own-course modes stay out');
});

test('R1: the frozen stage-1 baseline has a row for every matrix case', () => {
  for (const { key } of ECONOMY_CASES) {
    const row = STAGE1[key];
    assert.ok(row && row.nitroPerMinute > 0 && row.boostShare > 0, key);
  }
});
