import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { normalizeRaceConfig, validateRaceRequest, rulesSignature } from '../src/race-config.ts';
import { loadRecentCustom, saveRecentCustom } from '../src/recent-custom.ts';

test('explicit item rules distinguish Off, Classic, Active and All on every track', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) for (const mode of ['custom', 'free']) {
    const off = createRace(trackId, { mode, itemRules: 'off' });
    assert.equal(off.pickups.length, 0, `${trackId} ${mode}: Off supplies`);
    assert.equal(off.rings.length, 0, `${trackId} ${mode}: Off rings`);
    const classic = createRace(trackId, { mode, itemRules: 'classic' });
    assert.ok(classic.pickups.length > 0);
    assert.ok(classic.rings.length > 0);
    assert.equal(classic.config.activeItems, undefined);
    const active = createRace(trackId, { mode, itemRules: 'active' });
    assert.equal(active.pickups.length, 0);
    assert.equal(active.config.activeItems, true);
    assert.ok(active.rings.every(ring => ring.type === 'mystery'));
    assert.deepEqual(active.rings.map(ring => ring.distance), classic.rings.filter(ring => ring.type === 'mystery').map(ring => ring.distance));
    const all = createRace(trackId, { mode, itemRules: 'all' });
    assert.equal(all.config.activeItems, true);
    assert.deepEqual(all.rings, classic.rings);
    assert.deepEqual(all.pickups, classic.pickups);
  }
});

test('legacy item configurations retain their signatures and original supply-only switch', () => {
  assert.equal(rulesSignature({ mode: 'custom' }), '{"rulesVersion":1,"mode":"custom","rivals":3,"traffic":"normal","difficulty":"normal","items":true}');
  assert.equal(rulesSignature({ mode: 'free', items: false }), '{"rulesVersion":1,"mode":"free","rivals":0,"traffic":"normal","difficulty":"normal","items":false}');
  const legacy = createRace('coast', { mode: 'custom', items: false });
  assert.equal(legacy.pickups.length, 0);
  assert.ok(legacy.rings.length > 0);
  const classic = createRace('coast', { mode: 'classic', itemRules: 'off' });
  assert.ok(classic.pickups.length > 0);
  assert.ok(classic.rings.length > 0);
  assert.equal(classic.config.itemRules, undefined);
  assert.ok(createRace('coast', 'gold-rings').rings.every(ring => ring.type === 'nitro'));
});

test('strict item-rule requests reject unknown, incompatible and conflicting settings', () => {
  assert.throws(() => validateRaceRequest({ mode: 'custom', itemRules: 'unknown' }), /itemRules/);
  assert.throws(() => validateRaceRequest({ mode: 'classic', itemRules: 'all' }), /itemRules/);
  assert.throws(() => validateRaceRequest({ mode: 'free', itemRules: 'off', activeItems: true }), /activeItems/);
  assert.throws(() => validateRaceRequest({ mode: 'custom', itemRules: 'active', items: true }), /items/);
  for (const itemRules of ['off', 'classic', 'active', 'all'])
    assert.equal(validateRaceRequest({ mode: 'free', itemRules }).itemRules, itemRules);
  assert.equal(normalizeRaceConfig({ mode: 'custom', itemRules: 'invalid' }).itemRules, undefined);
});

test('new item rules survive recent setups and remain separate ruleset identities', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  saveRecentCustom(storage, 'coast', { mode: 'custom', itemRules: 'active' });
  saveRecentCustom(storage, 'coast', { mode: 'custom', itemRules: 'all' });
  assert.deepEqual(loadRecentCustom(storage).map(entry => entry.config.itemRules), ['all', 'active']);
  assert.notEqual(rulesSignature({ mode: 'custom', itemRules: 'active' }), rulesSignature({ mode: 'custom', itemRules: 'all' }));
});

test('filtering Active rings preserves authored mystery rewards and does not auto-activate them', () => {
  for (const itemRules of ['active', 'all']) {
    const race = createRace('coast', { mode: 'free', itemRules });
    race.phase = 'racing';
    const ring = race.rings.find(ring => ring.distance === 3080);
    Object.assign(race.player, { distance: 3079.9, speed: 50, x: ring.x, altitude: ring.altitude });
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.heldItem, 'shield'); // Coast's authored mystery at source index 13.
    assert.equal(race.player.effects.shield, 0);
    assert.equal(race.player.perfectLines, 0);
    assert.equal(race.player.nitro, 0);
  }
});
