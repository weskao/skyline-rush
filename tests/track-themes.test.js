import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, LANES, RACE_TRACKS } from '../src/game.js';
import { normalizeRaceConfig, validateRaceRequest, rulesSignature } from '../src/race-config.ts';
import { THEMED_TRACKS, themedHazards, themedPlacements } from '../src/track-themes.ts';
import { validateHazardPlacement } from '../src/hazard-schema.ts';

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
    for (let d = 0; d < track.length; d += 2) {
      const blocked = new Set();
      for (const p of placements) {
        if (Math.abs(p.distance - d) > p.hitbox.halfLength + 2.2) continue;
        const reach = p.hitbox.halfWidth + CAR_HALF_WIDTH + (p.movementPattern.kind === 'sweep' ? p.movementPattern.amplitude : 0);
        for (const lane of LANES) if (Math.abs(lane - p.lateralOffset) < reach) blocked.add(lane);
      }
      assert.ok(blocked.size <= 2, `${trackId} @${d}: ${blocked.size} lanes blocked`);
    }
  }
});

test('themed hazards join Custom races sorted, and generated hazards stay clear of them', () => {
  for (const trackId of THEMED_TRACKS) {
    const race = createRace(trackId, { mode: 'custom', themes: true, hazards: 'extreme' });
    const themed = race.hazards.filter(h => h.type);
    assert.equal(themed.length, themedPlacements(trackId).length);
    assert.deepEqual(race.hazards.map(h => h.distance), [...race.hazards.map(h => h.distance)].sort((a, b) => a - b));
    for (const generated of race.hazards.filter(h => !h.type))
      assert.ok(themed.every(h => Math.abs(h.distance - generated.distance) > 35), `generated @${generated.distance}`);
    assert.deepEqual(themedHazards(trackId), themedHazards(trackId), 'deterministic');
  }
});

function driveThrough(trackId, hazard, x, elapsed = 0) {
  const race = createRace(trackId, { mode: 'free', themes: true, traffic: 'off', items: false });
  race.hazards = [{ ...hazard, hit: false, passed: false }];
  race.rings = [];
  startRace(race);
  race.elapsed = elapsed; // when a timed (pulse) hazard is crossed
  Object.assign(race.player, { distance: hazard.distance - 30, x, speed: 40 });
  // The driver holds the lane (e.g. counter-steering Canyon's crosswind); only the hazard decides the outcome.
  for (let i = 0; i < 90 && !race.hazards[0].hit && !race.hazards[0].passed; i++) {
    race.player.x = x;
    stepRace(race, { throttle: true }, 1 / 60);
  }
  return race;
}

test('each themed hazard knocks a car that drives into it and pays a clean pass beside it', () => {
  for (const trackId of THEMED_TRACKS) for (const hazard of themedHazards(trackId)) {
    // A timed gate is solid for half its cycle: drive into it at the first start time that meets it closed.
    const move = hazard.placement.movementPattern;
    const starts = move.kind === 'pulse' ? Array.from({ length: 8 }, (_, i) => i * move.period / 8) : [0];
    const runs = starts.map(t => driveThrough(trackId, hazard, hazard.x, t));
    const hit = runs.find(r => r.hazards[0].hit) ?? runs[0];
    assert.equal(hit.hazards[0].hit, true, `${hazard.id} hit`);
    if (move.kind === 'pulse') assert.ok(runs.some(r => r.hazards[0].passed && !r.player.collisions), `${hazard.id} open gate lets the car through`);
    assert.equal(hit.player.collisions, 1, hazard.id);
    const lane = LANES.find(l => Math.abs(l - hazard.x) > hazard.halfWidth + CAR_HALF_WIDTH + 3);
    const pass = driveThrough(trackId, hazard, lane);
    assert.equal(pass.hazards[0].passed, true, `${hazard.id} pass`);
    assert.equal(pass.player.collisions, 0, hazard.id);
  }
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
