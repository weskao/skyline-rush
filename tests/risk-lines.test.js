import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RISK_SCORE } from '../src/game.js';
import { normalizeRaceConfig, rulesSignature } from '../src/race-config.ts';

const ready = race => { startRace(race); race.phase = 'racing'; race.countdown = 0; return race; };
// Score one risk-ring pickup and one close ground pass for a given race.
function payouts(config) {
  const ringRace = ready(createRace('coast', config));
  const ring = ringRace.rings.find(r => r.type === 'risk');
  let ringPay = null;
  if (ring) {
    Object.assign(ringRace.player, { distance: ring.distance - 1, x: ring.x, altitude: ring.altitude, speed: 30, score: 0 });
    stepRace(ringRace, { throttle: true }, .1);
    ringPay = ringRace.player.score;
  }
  const hazardRace = ready(createRace('coast', { ...config, hazards: 'standard' }));
  const hazard = hazardRace.hazards.find(h => !h.moving);
  let nearPay = null;
  if (hazard) {
    Object.assign(hazardRace.player, { distance: hazard.distance - 3, x: hazard.x + 3, altitude: 0, speed: 60, score: 0 });
    stepRace(hazardRace, { throttle: true }, .1);
    nearPay = hazardRace.player.score;
  }
  return { ringPay, nearPay, risky: ringRace.rings.filter(r => r.type === 'risk').length, rings: ringRace.rings };
}

test('default difficulty keeps today\'s risk-line rewards, so Classic and Daily stay identical', () => {
  const classic = payouts({});
  assert.ok(classic.risky > 0);
  assert.ok(classic.ringPay >= 150 + RISK_SCORE);
  assert.deepEqual(payouts({ mode: 'custom' }).ringPay, classic.ringPay);
  assert.deepEqual(createRace('coast', 'double-traffic').rings, createRace('coast').rings);
  assert.equal(normalizeRaceConfig({}).riskLines, undefined);
});

test('harder Custom races pay more for aerial risk rings and close ground passes', () => {
  const normal = payouts({ mode: 'custom', difficulty: 'normal' });
  const hard = payouts({ mode: 'custom', difficulty: 'hard' });
  assert.ok(hard.ringPay > normal.ringPay, `risk ring ${hard.ringPay} > ${normal.ringPay}`);
  assert.ok(hard.nearPay > normal.nearPay, `near pass ${hard.nearPay} > ${normal.nearPay}`);
  assert.deepEqual(payouts({ mode: 'custom', difficulty: 'easy' }).ringPay, normal.ringPay, 'easy never pays less than today');
});

test('practice can switch risk lines and their scoring off without moving any other ring', () => {
  for (const mode of ['custom', 'free']) {
    const on = payouts({ mode }), off = payouts({ mode, riskLines: 'off' });
    assert.equal(off.risky, 0);
    assert.deepEqual(off.rings.map(r => [r.distance, r.x]), on.rings.map(r => [r.distance, r.x]), 'same seeded layout');
    assert.ok(off.rings.every((r, i) => on.rings[i].type === 'risk' ? r.type === 'nitro' : r.type === on.rings[i].type));
    assert.equal(off.nearPay, 0, 'no ground-line score when risk lines are off');
  }
});

test('the risk-lines rule is practice-only and changes signatures only when used', () => {
  for (const mode of ['classic', 'time', 'gauntlet', 'checkpoint', 'stunt']) {
    assert.equal(normalizeRaceConfig({ mode, riskLines: 'off' }).riskLines, undefined, mode);
  }
  const base = { mode: 'custom', rivals: 2 };
  assert.equal(rulesSignature(base), rulesSignature({ ...base, riskLines: 'on' }));
  assert.notEqual(rulesSignature(base), rulesSignature({ ...base, riskLines: 'off' }));
  assert.equal(normalizeRaceConfig({ mode: 'free', riskLines: 'bogus' }).riskLines, undefined);
});
