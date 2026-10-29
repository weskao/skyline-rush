import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { RISK_RING_RADIUS } from '../src/ring-layout.ts';
import { SECTION_SIGN_LABELS } from '../src/section-signs.ts';
import { t } from '../src/i18n.ts';

// 11B Cosmic Orbit: opt-in low-gravity sectors where a gliding car floats, each threaded by a rising
// sequence of aerial gates scored through the existing risk-hoop path.
const themed = (extra = {}) => createRace('cosmic', { mode: 'custom', rivals: 0, traffic: 'off', themes: true, ...extra });
const ready = race => { startRace(race); race.phase = 'racing'; race.countdown = 0; return race; };
const sectors = race => race.sections.filter(s => s.type === 'low-gravity');

test('low-gravity sectors are opt-in: without themes every track keeps its own sections', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) {
    assert.deepEqual(createRace(trackId).sections, RACE_TRACKS[trackId].sections, `${trackId} Classic`);
    assert.deepEqual(createRace(trackId, { mode: 'custom' }).sections, RACE_TRACKS[trackId].sections, `${trackId} themes off`);
  }
  assert.equal(sectors(createRace('cosmic', { mode: 'custom' })).length, 0);
});

test('Cosmic themes add two low-gravity sectors on open road, signed in both languages', () => {
  const race = themed(), low = sectors(race), track = RACE_TRACKS.cosmic.sections;
  assert.equal(low.length, 2);
  for (const s of low) {
    assert.ok(s.to - s.from >= 300 && s.to <= RACE_TRACKS.cosmic.length, `${s.from}-${s.to} is a real stretch`);
    assert.ok(track.every(o => s.from >= o.to + 80 || s.to <= o.from - 80), `${s.from} clear of crosswinds, shortcut and tunnel`);
  }
  assert.deepEqual(race.sections.map(s => s.from), [...race.sections.map(s => s.from)].sort((a, b) => a - b), 'sections stay in road order');
  assert.ok('low-gravity' in SECTION_SIGN_LABELS, 'a roadside sign announces the sector');
  for (const locale of ['en', 'zh-TW']) assert.notEqual(t('sign.low-gravity', undefined, locale), 'sign.low-gravity', locale);
});

test('a gliding car falls slower inside a low-gravity sector and normally outside it, at any frame rate', () => {
  const drop = (race, distance, fps) => {
    ready(race);
    Object.assign(race.player, { distance, x: 2.5, speed: 0, altitude: 10, verticalSpeed: 0, fuel: 0 });
    for (let i = 0; i < fps; i++) stepRace(race, {}, 1 / fps);
    return 10 - race.player.altitude;
  };
  const [inside] = sectors(themed());
  for (const fps of [30, 60, 120]) {
    const normal = drop(createRace('cosmic', { mode: 'custom', rivals: 0, traffic: 'off' }), inside.from + 20, fps);
    const floating = drop(themed(), inside.from + 20, fps);
    assert.ok(normal > 3 && floating > 0.5 && floating < normal * 0.5, `${fps} FPS: ${floating.toFixed(2)} m vs ${normal.toFixed(2)} m`);
    assert.equal(drop(themed(), inside.from + 20, fps), floating, 'deterministic');
    assert.equal(drop(themed(), 600, fps), drop(createRace('cosmic', { mode: 'custom', rivals: 0, traffic: 'off' }), 600, fps), 'normal gravity outside');
  }
});

test('each sector is threaded by a rising sequence of aerial gates that pay the risk-hoop score once', () => {
  const race = ready(themed()), gates = race.rings.filter(r => r.spin);
  assert.ok(race.hazards.every(h => h.type !== 'ring'), 'gates are collected, never solid, so every lane stays open');
  for (const s of sectors(race)) {
    const run = gates.filter(g => g.distance > s.from && g.distance < s.to).sort((a, b) => a.distance - b.distance);
    assert.ok(run.length >= 3, `${s.from}: a gate sequence`);
    for (let i = 1; i < run.length; i++) assert.ok(run[i].altitude > run[i - 1].altitude, 'each gate climbs');
    for (const g of run) { assert.equal(g.type, 'risk'); assert.equal(g.radius, RISK_RING_RADIUS); assert.ok(g.altitude >= 4 && g.altitude <= 10); }
  }
  const gate = gates[0];
  Object.assign(race.player, { distance: gate.distance - 1, x: gate.x, altitude: gate.altitude, speed: 30, score: 0 });
  stepRace(race, { throttle: true, fly: true }, .1);
  assert.ok(race.player.score >= 150 + race.risk.ringScore, 'pays the risk-hoop score');
  assert.equal(themed({ riskLines: 'off' }).rings.filter(r => r.spin).length, 0, 'risk lines off removes the gates');
});
