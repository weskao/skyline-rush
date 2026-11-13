import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { ringVariety } from '../scripts/ring-variety.mjs';

// User, 2026-11-07: ring lines on some maps always sat in one lane (Coast: lane 3 only; trains: lanes 2/3 only).
// Rings now use all four lanes, yet trains, rows and pickup runs stay and collecting must not get much harder.
// Pre-change baseline over the same 12 seeds (scripts/ring-variety.mjs): bot ring take % and NITRO per minute.
// User, 2026-11-13: the first five maps carry 40% more ring slots, so the bot takes a smaller share of more rings
// while its NITRO/min rises; their baseline is re-measured then (was coast 70.6/19.52, neon 73.9/23.04,
// canyon 75.8/19.3, aurora 82.1/19.38, spiral 78.7/20.31).
const BASELINE = {
  coast: [64.6, 21.78], neon: [68.6, 24.55], canyon: [74.7, 22.48], aurora: [76.5, 20.85], spiral: [73.1, 22.83],
  taipei: [78.2, 19.23], tokyo: [80.3, 19.8], alpine: [82.4, 17.19], coastal: [78.2, 19.53], cosmic: [81.8, 18.31],
};
const rows = Object.keys(RACE_TRACKS).map(id => ringVariety(id, 12));

test('ring lines use all four lanes on every track, no lane dominating', () => {
  for (const r of rows) {
    const lanes = r.lanes.split('/').map(Number);
    assert.ok(lanes.every(share => share >= 15) && r.topLane <= 35, `${r.trackId} lanes ${r.lanes}`);
  }
});

test('trains and rows keep appearing, so consecutive-ring runs survive', () => {
  for (const r of rows) assert.ok(r.trains >= 0.5 && r.rows >= 0.3, `${r.trackId} trains ${r.trains} rows ${r.rows}`);
});

test('collecting stays about as easy: bot ring take and NITRO rate hold near the pre-change baseline', () => {
  for (const r of rows) {
    const [taken, nitro] = BASELINE[r.trackId];
    assert.ok(r.taken >= taken - 3, `${r.trackId} takes ${r.taken}% (was ${taken}%)`);
    assert.ok(r.nitroPerMinute >= nitro * 0.95, `${r.trackId} NITRO/min ${r.nitroPerMinute} (was ${nitro})`);
  }
});
