import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, LANES, RACE_TRACKS } from '../src/game.js';
import { normalizeRaceConfig, validateRaceRequest, rulesSignature } from '../src/race-config.ts';
import { THEMED_TRACKS, themedHazards, themedPlacements } from '../src/track-themes.ts';
import { validateHazardPlacement } from '../src/hazard-schema.ts';
import { hazardReach } from '../src/hazard-race.ts';
import { OBJECT_CATALOG } from '../src/object-catalog.ts';

// 11B: themed hazards are opt-in (Custom, Free Drive, Gauntlet); every other race and record is unchanged.
const BLOCKED_SECTIONS = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);
const CAR_HALF_WIDTH = 0.85;

test('themes are an opt-in rule of Custom, Free Drive and Gauntlet only', () => {
  for (const mode of ['custom', 'free', 'gauntlet']) {
    assert.equal(normalizeRaceConfig({ mode, themes: true }).themes, true);
    assert.equal(validateRaceRequest({ mode, themes: true }).themes, true);
    assert.equal(Object.hasOwn(normalizeRaceConfig({ mode }), 'themes'), false, 'absent by default keeps old signatures');
  }
  for (const mode of ['classic', 'time', 'checkpoint', 'cup', 'stunt', 'elimination']) {
    assert.equal(Object.hasOwn(normalizeRaceConfig({ mode, themes: true }), 'themes'), false, mode);
    assert.throws(() => validateRaceRequest({ mode, themes: true }), RangeError, mode);
  }
  assert.throws(() => validateRaceRequest({ mode: 'custom', themes: 'yes' }), RangeError);
  assert.equal(rulesSignature({ mode: 'custom' }), rulesSignature({ mode: 'custom', themes: false }));
});

test('Classic, Daily and the other modes never get themed hazards', () => {
  for (const trackId of THEMED_TRACKS) {
    assert.deepEqual(createRace(trackId).hazards, []);
    assert.deepEqual(createRace(trackId, 'double-traffic').hazards, []);
    for (const mode of ['time', 'checkpoint', 'stunt', 'cup', 'elimination'])
      assert.deepEqual(createRace(trackId, { mode, themes: true }).hazards, [], `${trackId} ${mode}`);
    assert.deepEqual(createRace(trackId, { mode: 'custom' }).hazards, [], 'Custom without themes is unchanged');
  }
});

test('every themed placement is valid, off tunnels/gaps/shortcuts and leaves two lanes open', () => {
  for (const trackId of THEMED_TRACKS) {
    const track = RACE_TRACKS[trackId];
    const placements = themedPlacements(trackId);
    assert.ok(placements.length >= 4, `${trackId} has a theme`);
    assert.equal(new Set(placements.map(p => p.id)).size, placements.length, 'unique ids');
    for (const p of placements) {
      assert.deepEqual(validateHazardPlacement(p), p);
      assert.ok(p.distance > 450 && p.distance < track.length - 220, `${p.id} clear of start and finish`);
      assert.ok(!track.sections.some(s => BLOCKED_SECTIONS.has(s.type) && p.distance >= s.from - 35 && p.distance <= s.to + 35), `${p.id} off special sections`);
    }
    // Gusts only shove; blockers and low-grip patches (which AI steers around) count against the open lanes.
    const solid = themedHazards(trackId).filter(h => hazardReach(h) > 0);
    for (let d = 0; d < track.length; d += 2) {
      const blocked = new Set();
      for (const h of solid) {
        if (Math.abs(h.distance - d) > h.halfLength + 2.2) continue;
        for (const lane of LANES) if (Math.abs(lane - h.x) < hazardReach(h) + CAR_HALF_WIDTH) blocked.add(lane);
      }
      assert.ok(blocked.size <= 2, `${trackId} @${d}: ${blocked.size} lanes blocked`);
    }
  }
});

test('themed hazards join Custom races sorted, and generated hazards stay clear of them', () => {
  for (const trackId of THEMED_TRACKS) {
    const race = createRace(trackId, { mode: 'custom', themes: true, hazards: 'extreme' });
    const themed = race.hazards.filter(h => h.type);
    assert.equal(themed.length, themedHazards(trackId).length); // ramps and hoops are routed to race.ramps / race.rings
    // Every placement lands in exactly one place, so a dropped one fails instead of vanishing.
    const placements = themedPlacements(trackId), key = p => `${p.distance}:${p.lateralOffset ?? p.x}`;
    const ramps = race.ramps ?? [], hoops = race.rings.filter(r => r.spin);
    assert.deepEqual(themed.map(h => h.id).sort(), placements.filter(p => !['ramp', 'ring'].includes(p.type)).map(p => p.id).sort());
    assert.deepEqual(ramps.map(key).sort(), placements.filter(p => p.type === 'ramp').map(key).sort(), `${trackId} ramps`);
    assert.deepEqual(hoops.map(key).sort(), placements.filter(p => p.type === 'ring').map(key).sort(), `${trackId} hoops`);
    assert.ok(hoops.every(r => r.type === 'risk'));
    assert.equal(themed.length + ramps.length + hoops.length, placements.length);
    assert.deepEqual(race.hazards.map(h => h.distance), [...race.hazards.map(h => h.distance)].sort((a, b) => a - b));
    for (const generated of race.hazards.filter(h => !h.type))
      assert.ok(themed.every(h => Math.abs(h.distance - generated.distance) > 35), `generated @${generated.distance}`);
    assert.deepEqual(themedHazards(trackId), themedHazards(trackId), 'deterministic');
  }
});

function driveThrough(trackId, hazard, x, startTime = 0) {
  const race = createRace(trackId, { mode: 'free', themes: true, traffic: 'off', items: false });
  race.hazards = hazard ? [{ ...hazard, hit: false, passed: false }] : [];
  race.rings = [];
  startRace(race);
  race.elapsed = startTime;
  hazard ??= { distance: 1000 };
  Object.assign(race.player, { distance: hazard.distance - 30, x, speed: 40 });
  // The driver holds the lane (e.g. counter-steering Canyon's crosswind); only the hazard decides the outcome.
  for (let i = 0; i < 90 && !race.hazards[0]?.hit && !race.hazards[0]?.passed; i++) {
    race.player.x = x;
    stepRace(race, { throttle: true }, 1 / 60);
  }
  return race;
}

const effect = h => OBJECT_CATALOG[h.type].effect;
// Moving blockers are probed through a whole cycle: they must block at some moment and let the car through at another.
const startTimes = h => h.placement.movementPattern.kind === 'static' ? [0]
  : Array.from({ length: 40 }, (_, i) => i * h.placement.movementPattern.period / 40);

test('each themed blocker knocks a car that drives into it and pays a clean pass beside it', () => {
  for (const trackId of THEMED_TRACKS) for (const hazard of themedHazards(trackId).filter(h => effect(h) === 'block')) {
    // A swinging gate times the lane nearest to it; other blockers are met head-on.
    const line = hazard.placement.movementPattern.kind === 'sweep'
      ? LANES.reduce((a, b) => Math.abs(b - hazard.x) < Math.abs(a - hazard.x) ? b : a) : hazard.x;
    const runs = startTimes(hazard).map(t => driveThrough(trackId, hazard, line, t));
    const hit = runs.find(r => r.hazards[0].hit);
    assert.ok(hit, `${hazard.id} hit`);
    assert.equal(hit.player.collisions, 1, hazard.id);
    if (hazard.placement.movementPattern.kind !== 'static')
      assert.ok(runs.some(r => r.hazards[0].passed && r.player.collisions === 0), `${hazard.id}: its motion opens a gap`);
    const lane = LANES.find(l => Math.abs(l - hazard.x) > hazardReach(hazard) + CAR_HALF_WIDTH + 3);
    const pass = driveThrough(trackId, hazard, lane);
    assert.equal(pass.hazards[0].passed, true, `${hazard.id} pass`);
    assert.equal(pass.player.collisions, 0, hazard.id);
  }
});

test('gusts shove the car sideways and ice patches bleed speed, without a crash', () => {
  const effects = new Set();
  for (const trackId of THEMED_TRACKS) for (const hazard of themedHazards(trackId).filter(h => ['push', 'slow'].includes(effect(h)))) {
    effects.add(effect(hazard));
    const run = driveThrough(trackId, hazard, hazard.x);
    assert.equal(run.hazards[0].passed, true, hazard.id);
    assert.equal(run.player.collisions, 0, hazard.id);
    if (effect(hazard) === 'push') assert.equal(run.player.x - hazard.x, hazard.placement.seed % 2 ? 1.5 : -1.5, hazard.id);
    else {
      const free = driveThrough(trackId, null, hazard.x);
      while (free.player.distance < run.player.distance) stepRace(free, { throttle: true }, 1 / 60);
      assert.ok(run.player.speed < free.player.speed * 0.9, `${hazard.id}: ${run.player.speed} vs ${free.player.speed}`);
    }
  }
  assert.deepEqual([...effects].sort(), ['push', 'slow']);
});

test('a small themed cone is narrower than a gauntlet barrier: one metre beside it is clear', () => {
  const cone = themedHazards('coast').find(h => h.type === 'cone');
  const race = driveThrough('coast', cone, cone.x + cone.halfWidth + 0.6);
  assert.equal(race.player.collisions, 0);
});

test('rivals change lane ahead of a themed hazard instead of driving through it', () => {
  for (const trackId of THEMED_TRACKS) for (const hazard of themedHazards(trackId)) {
    const race = createRace(trackId, { mode: 'custom', themes: true, rivals: 1, traffic: 'off', items: false });
    race.hazards = [{ ...hazard, hit: false, passed: false }];
    startRace(race);
    const rival = race.rivals[0];
    Object.assign(race.player, { distance: hazard.distance - 400, x: LANES.find(l => Math.abs(l - hazard.x) > 4) });
    Object.assign(rival, { distance: hazard.distance - 120, x: hazard.x, homeX: hazard.x, speed: 40, pace: 40 });
    race.phase = 'racing';
    for (let i = 0; i < 400 && rival.distance < hazard.distance + 10; i++) stepRace(race, {}, 1 / 60);
    assert.ok(rival.distance >= hazard.distance, `${hazard.id}: rival reached it`);
    assert.equal(rival.cooldown, 0, `${hazard.id}: rival was knocked`);
  }
});

test('ENV-04 a themed course marks a safe/risky branch ahead of a hazard, risky side toward it', () => {
  const markers = THEMED_TRACKS.flatMap(trackId => themedPlacements(trackId).filter(p => p.type === 'branch-marker').map(p => ({ trackId, p })));
  assert.ok(markers.length >= 1, 'at least one themed course places a branch marker');
  for (const { trackId, p } of markers) {
    assert.equal(p.lateralOffset, 0, `${p.id}: the gantry spans the road`);
    const side = p.seed % 2 ? 1 : -1;
    // The risky line leads to a blocker on that side within 200 m: the payout is for taking it on.
    const next = themedPlacements(trackId).find(o => o.distance > p.distance && o.distance - p.distance <= 200 && OBJECT_CATALOG[o.type].effect === 'block');
    assert.ok(next, `${p.id}: a hazard follows the marker`);
    assert.equal(Math.sign(next.lateralOffset), side, `${p.id}: the risky side is the hazard's side`);
    assert.ok(themedHazards(trackId).some(h => h.id === p.id), `${p.id}: markers reach race.hazards`);
  }
});
