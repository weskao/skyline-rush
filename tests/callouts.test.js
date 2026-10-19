import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createCallouts } from '../src/callouts.js';

function running() {
  const race = createRace();
  race.phase = 'racing';
  return race;
}

test('simultaneous rewards queue without overlap and each event is announced once', () => {
  const race = running(), callouts = createCallouts();
  assert.equal(callouts.update(race), null);
  Object.assign(race.player, { perfectLines: 1, nearMisses: 3, nearMiss: { combo: 3, charge: 12 } });
  const first = callouts.update(race);
  assert.equal(first.title, 'PERFECT LINE');
  race.elapsed = 0.5;
  assert.equal(callouts.update(race), first);
  race.elapsed = 1.3;
  assert.equal(callouts.update(race).title, 'NEAR MISS ×3');
  race.elapsed = 2.6;
  assert.equal(callouts.update(race), null);
});

test('real NITRO activation and extension each announce once; a held key does not repeat', () => {
  const race = createRace(), callouts = createCallouts();
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  race.player.nitro = 3;
  callouts.update(race);
  stepRace(race, { nitro: true }, 1 / 60);
  assert.equal(callouts.update(race).title, 'NITRO');
  for (let i = 0; i < 90; i++) { stepRace(race, { nitro: true }, 1 / 60); callouts.update(race); }
  assert.equal(callouts.update(race), null);
  stepRace(race, {}, 1 / 60);
  callouts.update(race);
  stepRace(race, { nitro: true }, 1 / 60);
  assert.equal(callouts.update(race).title, 'NITRO');
});

test('fractional refill and drift spark thresholds produce distinct readable feedback', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  race.player.nitro = 0.5;
  assert.equal(callouts.update(race).title, '+0.5');
  assert.equal(callouts.update(race).detail, 'NITRO CHARGE');
  for (const [time, tier] of [[1, 'BLUE'], [2, 'ORANGE'], [3, 'PURPLE']]) {
    race.elapsed += 1.3;
    race.player.drift = { time };
    assert.equal(callouts.update(race).title, `DRIFT · ${tier}`);
  }
});

test('pause drops pending callouts and resume never replays rewards; a new race resets counters', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  Object.assign(race.player, { nitro: 0.5, perfectLines: 1 });
  assert.ok(callouts.update(race));
  race.phase = 'paused';
  assert.equal(callouts.update(race), null);
  race.phase = 'racing';
  assert.equal(callouts.update(race), null);
  const next = running();
  callouts.update(next);
  next.player.nitro = 0.5;
  assert.equal(callouts.update(next).title, '+0.5');
});

test('frequent near misses coalesce while pending instead of building a stale backlog', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  race.player.perfectLines = 1;
  callouts.update(race);
  for (let combo = 1; combo <= 5; combo++) {
    race.player.nearMisses = combo;
    race.player.nearMiss = { combo, charge: 0 };
    callouts.update(race);
  }
  race.elapsed = 1.3;
  assert.equal(callouts.update(race).title, 'NEAR MISS ×5');
  race.elapsed = 2.6;
  assert.equal(callouts.update(race), null);
});

test('contact feedback temporarily hides a callout without spending its display time', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  race.player.nitro = 0.5;
  assert.equal(callouts.update(race).title, '+0.5');
  race.elapsed = 0.3;
  assert.equal(callouts.update(race, true), null);
  race.elapsed = 1.4;
  assert.equal(callouts.update(race, true), null);
  race.elapsed = 1.5;
  assert.equal(callouts.update(race).title, '+0.5');
  race.elapsed = 2.8;
  assert.equal(callouts.update(race), null);
});

test('queued drift feedback describes the earned tier after the player has released', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  race.player.perfectLines = 1;
  race.player.drift = { time: 1.1 };
  callouts.update(race);
  race.player.drift = null;
  race.elapsed = 1.3;
  const event = callouts.update(race);
  assert.equal(event.title, 'DRIFT · BLUE');
  assert.equal(event.detail, 'SPARK TIER EARNED');
});
