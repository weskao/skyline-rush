import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createCallouts } from '../src/callouts.js';
import { setLocale } from '../src/i18n.js';
import { VFX_RANGES, vfxLabelKey } from '../src/vfx-settings.ts';
import { GAME } from '../src/locales/game.js';

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

test('a real airborne flick announces its roll, then its landing reward without a duplicate refill', () => {
  const race = running(), callouts = createCallouts();
  Object.assign(race.player, { speed: 60, altitude: 4 });
  race.traffic = []; race.pickups = []; race.rings = [];
  callouts.update(race);
  stepRace(race, { steer: -1 }, 1 / 60);
  callouts.update(race);
  stepRace(race, { steer: 1 }, 1 / 60);
  assert.equal(callouts.update(race)?.title, 'BARREL ROLL');
  for (let i = 0; i < 48; i++) { stepRace(race, {}, 1 / 60); callouts.update(race); }
  Object.assign(race.player, { altitude: .001, verticalSpeed: -1 });
  stepRace(race, {}, 1 / 60);
  callouts.update(race);
  race.elapsed += 1.3;
  assert.equal(callouts.update(race)?.title, 'TRICK +0.25');
  race.elapsed += 1.3;
  assert.equal(callouts.update(race), null, 'the same reward is not also a generic refill');
});

test('a hard trick landing announces the lost reward once and never replays after pause', () => {
  const race = running(), callouts = createCallouts();
  callouts.update(race);
  race.player.trickPayout = { time: 0, nitro: 0, hard: true };
  assert.equal(callouts.update(race)?.title, 'HARD LANDING');
  race.elapsed = 1.3;
  assert.equal(callouts.update(race), null);
  race.phase = 'paused'; callouts.update(race);
  race.phase = 'racing';
  assert.equal(callouts.update(race), null);
});

test('entering a shortcut corridor announces SHORTCUT once per entry, never on the road beneath it', () => {
  const race = running(), callouts = createCallouts();
  const corridor = race.sections.find(section => section.type === 'shortcut');
  race.traffic = []; race.pickups = []; race.rings = [];
  callouts.update(race);
  Object.assign(race.player, { distance: corridor.from + 10, x: corridor.x, altitude: 0, speed: 30 });
  stepRace(race, {}, 1 / 60);
  assert.equal(callouts.update(race), null, 'driving under the corridor is not entering it');
  Object.assign(race.player, { altitude: corridor.altitude, verticalSpeed: 0 });
  stepRace(race, { fly: true }, 1 / 60);
  assert.equal(race.player.inShortcut, true);
  assert.equal(callouts.update(race)?.title, 'SHORTCUT');
  race.elapsed += 1.3;
  stepRace(race, { fly: true }, 1 / 60);
  assert.equal(callouts.update(race), null, 'staying inside does not repeat it');
});

test('callouts resolve in the active locale, with parameterized tiers, combo and charge', () => {
  setLocale('zh-TW');
  try {
    const race = running(), callouts = createCallouts();
    callouts.update(race);
    Object.assign(race.player, { nearMisses: 2, nearMiss: { combo: 2, charge: 41.6 } });
    const near = callouts.update(race);
    assert.deepEqual([near.title, near.detail], ['驚險閃避 ×2', '擦身而過 · 集氣 +42%']);
    race.elapsed = 1.3;
    race.player.drift = { time: 2.4 };
    const drift = callouts.update(race);
    assert.deepEqual([drift.title, drift.detail], ['漂移 · 橘色', '火花等級達成']);
    race.elapsed = 2.6;
    race.player.nitroUses = 1;
    assert.equal(callouts.update(race).title, 'NITRO'); // brand term stays English
  } finally { setLocale('en'); }
  const english = createCallouts(), race = running();
  english.update(race);
  Object.assign(race.player, { nearMisses: 1, nearMiss: { combo: 1, charge: 0 } });
  const shown = english.update(race);
  assert.deepEqual([shown.title, shown.detail], ['NEAR MISS ×1', 'CLOSE PASS · CHARGE FULL']);
});

test('every VFX label and sign has a catalog entry in both locales, and en matches the source label', () => {
  for (const [key, [label]] of Object.entries(VFX_RANGES)) {
    assert.equal(GAME.en[vfxLabelKey(key)], label);
    assert.ok(GAME['zh-TW'][vfxLabelKey(key)]);
  }
  for (const type of ['tunnel', 'gap', 'crosswind', 'ice', 'uphill', 'shortcut', 'launch', 'spiral', 'finish'])
    assert.ok(GAME['zh-TW'][`sign.${type}`] && GAME.en[`sign.${type}`]);
});

test('a NITRO reward that also refills flight charge says how much; a full charge keeps the plain detail', () => {
  for (const [fuel, detail] of [[50, 'NITRO · +20% CHARGE'], [100, 'NITRO CHARGE']]) {
    const race = running(), callouts = createCallouts();
    Object.assign(race.player, { speed: 60, fuel });
    race.traffic = []; race.rings = [];
    race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude: 0, tier: 'tank' }];
    callouts.update(race);
    stepRace(race, {}, 1 / 60);
    const callout = callouts.update(race);
    assert.equal(callout.title, '+1');
    assert.equal(callout.detail, detail, `fuel ${fuel}`);
  }
});

test('a landed roll that refills flight charge names the charge in its detail', () => {
  const race = running(), callouts = createCallouts();
  Object.assign(race.player, { speed: 60, altitude: 4, fuel: 50 });
  race.traffic = []; race.pickups = []; race.rings = [];
  callouts.update(race);
  stepRace(race, { steer: -1 }, 1 / 60);
  callouts.update(race);
  stepRace(race, { steer: 1 }, 1 / 60);
  assert.equal(callouts.update(race)?.title, 'BARREL ROLL');
  for (let i = 0; i < 48; i++) { stepRace(race, {}, 1 / 60); callouts.update(race); }
  Object.assign(race.player, { altitude: .001, verticalSpeed: -1 });
  stepRace(race, {}, 1 / 60);
  callouts.update(race);
  race.elapsed += 1.3;
  const callout = callouts.update(race);
  assert.equal(callout?.title, 'TRICK +0.25');
  assert.equal(callout.detail, 'CLEAN LANDING · +5% CHARGE');
});
