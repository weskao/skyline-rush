import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRaceConfig, MODES } from '../src/race-config.ts';
import { createRace, startRace, stepRace, useHeldItem, RACE_TRACKS } from '../src/game.js';

test('normalization keeps classic defaults and validates mode names', () => {
  const config = normalizeRaceConfig();
  assert.equal(config.mode, 'classic');
  assert.equal(config.rivals, 7);
  assert.equal(config.traffic, 'normal');
  assert.equal(config.items, true);
  assert.equal(config.difficulty, 'normal');
  assert.equal(config.rulesVersion, 1);
  assert.ok(MODES.includes('free'));
  assert.throws(() => normalizeRaceConfig({ mode: 'unknown' }), /mode/i);
});

test('custom settings are bounded and have deterministic safe defaults', () => {
  assert.deepEqual(normalizeRaceConfig({ mode: 'custom', rivals: 0, traffic: 'off', items: false }).rivals, 0);
  assert.equal(normalizeRaceConfig({ mode: 'custom', rivals: 20 }).rivals, 3);
  assert.equal(normalizeRaceConfig({ mode: 'custom', traffic: 'garbage' }).traffic, 'normal');
  assert.equal(normalizeRaceConfig({ mode: 'time', rivals: 3 }).rivals, 0);
  assert.equal(normalizeRaceConfig({ mode: 'free', rivals: 1 }).rivals, 0);
});

test('classic and Daily Challenge physics and traffic remain unchanged', () => {
  const classic = createRace('coast');
  const daily = createRace('coast', 'double-traffic');
  assert.equal(classic.mode, 'classic');
  assert.equal(classic.modifier, null);
  assert.equal(classic.rivals.length, 7);
  assert.equal(classic.traffic.length, 36);
  assert.equal(daily.modifier, 'double-traffic');
  assert.equal(daily.traffic.length, 72);
  assert.deepEqual(classic.rings.map(ring => ring.distance), createRace('coast').rings.map(ring => ring.distance));
});

test('custom race creates zero rivals and no random traffic or items on demand', () => {
  const race = createRace('neon', { mode: 'custom', rivals: 0, traffic: 'off', items: false });
  assert.equal(race.mode, 'custom');
  assert.equal(race.rivals.length, 0);
  assert.equal(race.traffic.length, 0);
  assert.equal(race.pickups.length, 0);
  assert.ok(race.rings.length > 0);
  assert.equal(race.config.items, false);
});

test('custom race preserves selected AI count and normal track configuration', () => {
  const race = createRace('aurora', { mode: 'custom', rivals: 2, traffic: 'light', difficulty: 'hard' });
  assert.deepEqual(race.rivals.map(r => r.name), ['NOVA', 'ORBIT']);
  assert.equal(race.traffic.length, Math.round(36 * RACE_TRACKS.aurora.trafficDensity * 0.5));
  assert.equal(race.config.difficulty, 'hard');
});

test('free driving ends the run at the end of the route instead of parking the car there', () => {
  const race = createRace('coast', { mode: 'free' });
  assert.equal(race.rivals.length, 0);
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  assert.equal(race.phase, 'racing');
  race.player.distance = race.length - 0.1;
  race.player.speed = 85;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.position, 1);
  assert.ok(race.player.distance <= race.length);
});

test('time attack has no rivals and still completes a normal sprint', () => {
  const race = createRace('coast', { mode: 'time' });
  assert.equal(race.rivals.length, 0);
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  race.player.distance = race.length - 0.1;
  race.player.speed = 80;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.position, 1);
});

import { recordModeRace, loadModeHistory, loadHistory, loadUnlocks } from '../src/history.ts';

test('practice history stays separate from campaign history and unlocks', () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const race = createRace('coast', { mode: 'time' });
  race.result = { position: 1, time: 40.5, score: 1000 };
  const first = recordModeRace(race, storage);
  assert.deepEqual(first, { best: 40.5, record: true });
  assert.equal(loadModeHistory(storage).length, 1);
  assert.equal(loadHistory(storage).length, 0);
  assert.deepEqual(loadUnlocks(storage), ['coast']);
  race.result.time = 42;
  assert.deepEqual(recordModeRace(race, storage), { best: 40.5, record: false });
  race.result.time = 39;
  assert.deepEqual(recordModeRace(race, storage), { best: 39, record: true });
});

test('invalid and incomplete practice data cannot be saved', () => {
  const race = createRace('coast', { mode: 'free' });
  assert.throws(() => recordModeRace(race), /finished practice/);
  const classic = createRace('coast');
  classic.result = { time: 10, position: 1 };
  assert.throws(() => recordModeRace(classic), /finished practice/);
});

import { loadModeGhost, saveModeGhost } from '../src/history.ts';

test('Time Attack ghosts never overwrite Classic ghosts', () => {
  const data = {};
  const storage = { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  const race = createRace('coast', { mode: 'time' });
  const samples = Array.from({ length: 501 }, (_, k) => [k * 10, 2.5, 0]);
  const run = { time: 50, samples };
  assert.equal(saveModeGhost('coast', race.config, run, storage), true);
  assert.equal(loadModeGhost('coast', race.config, storage).time, 50);
  assert.equal(data['skyline-rush-ghosts'], undefined);
  assert.equal(loadModeGhost('coast', createRace('coast').config, storage), null);
});

test('Free Drive skips countdown and races until the road end', () => {
  const race = createRace('coast', { mode: 'free' });
  startRace(race);
  assert.equal(race.phase, 'racing');
  race.player.speed = 85;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'racing');
  assert.equal(race.result, null);
});
test('AI opponent count supports one or three opponents without changing Classic', () => {
  assert.equal(createRace('coast', { mode: 'custom', rivals: 1 }).rivals.length, 1);
  assert.equal(createRace('coast', { mode: 'custom', rivals: 3 }).rivals.length, 3);
  assert.equal(createRace('coast').rivals.length, 7);
});

import { RULE_PRESETS } from '../src/race-config.ts';

test('rule presets cover five distinct, valid race configurations', () => {
  assert.deepEqual(Object.keys(RULE_PRESETS), ['standard', 'traffic', 'noitems', 'air', 'precision']);
  assert.equal(RULE_PRESETS.standard.rivals, 7);
  assert.equal(RULE_PRESETS.traffic.traffic, 'heavy');
  assert.equal(RULE_PRESETS.noitems.items, false);
  assert.equal(RULE_PRESETS.air.traffic, 'off');
  assert.equal(RULE_PRESETS.precision.rivals, 0);
  for (const preset of Object.values(RULE_PRESETS)) assert.deepEqual(
    normalizeRaceConfig({ mode: 'custom', ...preset }), { ...normalizeRaceConfig({ mode: 'custom' }), ...preset });
});

test('Time Attack runs with zero traffic and rivals to keep ghost comparisons fair', () => {
  const race = createRace('coast', { mode: 'time' });
  assert.equal(race.rivals.length, 0);
  assert.equal(race.traffic.length, 0);
});

test('Free Drive allows traffic and pickups to be disabled independently', () => {
  const race = createRace('coast', { mode: 'free', traffic: 'off', items: false });
  assert.equal(race.traffic.length, 0);
  assert.equal(race.pickups.length, 0);
  assert.equal(race.config.traffic, 'off');
});

test('Obstacle Gauntlet lays out deterministic, reachable single-lane hazards', () => {
  const a = createRace('canyon', { mode: 'gauntlet' });
  const b = createRace('canyon', { mode: 'gauntlet' });
  assert.equal(a.mode, 'gauntlet');
  assert.deepEqual(a.rivals, []);
  assert.deepEqual(a.traffic, []);
  assert.ok(a.hazards.length >= 6);
  assert.deepEqual(a.hazards, b.hazards);
  assert.ok(a.hazards.every(h => h.distance > 200 && h.distance < a.length &&
    [-7.5, -2.5, 2.5, 7.5].includes(h.x) &&
    !a.sections.some(s => ['gap', 'tunnel', 'launch'].includes(s.type) && h.distance >= s.from - 20 && h.distance <= s.to + 20)));
});

test('Obstacle Gauntlet collision loses speed exactly once on crossing', () => {
  const race = createRace('coast', { mode: 'gauntlet' });
  const hazard = race.hazards[0];
  race.phase = 'racing';
  race.player.distance = hazard.distance - 0.7;
  race.player.speed = 82;
  race.player.x = hazard.x;
  race.player.altitude = 0;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.collisions, 1);
  assert.equal(hazard.hit, true);
  const loss = race.player.speed;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.collisions, 1);
  assert.ok(race.player.speed >= loss);
});

test('Obstacle Gauntlet rewards safely passing an obstacle on another lane', () => {
  const race = createRace('coast', { mode: 'gauntlet' });
  const hazard = race.hazards[0];
  race.phase = 'racing';
  race.player.distance = hazard.distance - 0.7;
  race.player.speed = 82;
  race.player.x = hazard.x === 7.5 ? -7.5 : 7.5;
  const score = race.player.score;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.collisions, 0);
  assert.equal(hazard.passed, true);
  assert.ok(race.player.score > score);
});


test('relaxed Custom collisions cap the speed penalty and preserve impact readout', () => {
  const collide = collision => {
    const race = createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off', collision });
    startRace(race);
    for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
    race.traffic = [{ x: race.player.x, distance: 1, speed: 0 }];
    race.player.speed = 70;
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.collisions, 1);
    return race;
  };
  const standard = collide('normal');
  const relaxed = collide('relaxed');
  assert.ok(relaxed.player.speed > standard.player.speed + 15);
  assert.ok(relaxed.player.impact.speedLost < standard.player.impact.speedLost);
  assert.ok(Math.abs(relaxed.player.impact.speedLost - (70 - 4/60) * .2) < .2);
  assert.equal(createRace('coast', { mode:'classic', collision:'relaxed' }).config.collision, undefined);
  assert.equal(createRace('coast', 'double-traffic').config.collision, undefined);
});

test('Checkpoint Rush awards gate-time bonus only for real gate crossings', () => {
  const race = createRace('coast', {mode:'checkpoint'});
  assert.equal(race.rivals.length, 0);
  assert.equal(race.traffic.length, 0);
  assert.ok(race.checkpoint.gates.length >= 4);
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  const gate = race.checkpoint.gates[0];
  race.player.distance = gate.distance - 1;
  race.player.x = gate.x; race.player.altitude = gate.altitude; race.player.speed = 75;
  const timeBefore = race.checkpoint.timeLeft;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.checkpoint.passed, 1);
  assert.ok(race.checkpoint.timeLeft > timeBefore);
  assert.ok(race.player.score >= 250);
});
test('Checkpoint Rush times out without recording an official finish or personal best', () => {
  const race = createRace('coast',{mode:'checkpoint'});
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race,{},1 / 60);
  race.checkpoint.timeLeft = 0.01;
  stepRace(race,{},1 / 60);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.success,false);
  assert.throws(()=>recordModeRace(race));
});
test('Checkpoint Rush completes on the real finish after all gates are cleared', () => {
  const race = createRace('coast',{mode:'checkpoint'});
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race,{},1 / 60);
  for (const gate of race.checkpoint.gates) gate.passed = true;
  race.checkpoint.passed = race.checkpoint.gates.length;
  race.player.distance = race.length - 0.1;
  race.player.speed = 80;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.success,true);
});

test('Extreme gauntlet increases obstacle count without affecting Classic traffic or score', () => {
  const base = createRace('coast',{mode:'gauntlet'});
  const extreme = createRace('coast',{mode:'gauntlet',hazardTier:'extreme'});
  assert.ok(extreme.hazards.length > base.hazards.length);
  assert.equal(extreme.traffic.length,0);
  assert.equal(createRace('coast').hazards.length,0);
  assert.equal(base.config.hazardTier,undefined);
  assert.equal(extreme.config.hazardTier,'extreme');
});

test('clean Time Attack never records runs after contact, while old Time Attack stays valid', () => {
  const race = createRace('coast',{mode:'time',clean:true});
  assert.equal(race.config.clean,true);
  startRace(race);
  for(let i=0;i<181;i++) stepRace(race,{},1/60);
  race.player.collisions = 1;
  race.player.distance = race.length - .1;
  race.player.speed = 80;
  stepRace(race,{},1/60);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.success,false);
  assert.throws(()=>recordModeRace(race));
  assert.equal(createRace('coast',{mode:'classic',clean:true}).config.clean,undefined);
});

test('Championship is a distinct ranked seven-rival mode with no Career unlock eligibility', () => {
  const race=createRace('coast',{mode:'cup',cupTracks:['coast','neon','canyon']});
  assert.equal(race.mode,'cup');
  assert.equal(race.rivals.length,7);
  assert.deepEqual(race.config.cupTracks,['coast','neon','canyon']);
  assert.equal(createRace('coast').config.cupTracks,undefined);
});

test('Stunt Attack uses a solo moving-traffic score run and finishes at its timer', () => {
  const race = createRace('coast', {mode:'stunt', duration:120});
  assert.equal(race.rivals.length,0);
  assert.ok(race.traffic.length > 0);
  assert.equal(race.config.duration,120);
  assert.ok(race.styleAttack);
  startRace(race);
  for (let i=0;i<181;i++) stepRace(race,{},1/60);
  race.stuntLimit=race.elapsed+.05;
  for (let i=0;i<4;i++) stepRace(race,{},1/60);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.endReason,'timer');
  assert.equal(race.result.success,true);
  assert.ok(Number.isFinite(race.result.score));
});
test('Stunt Attack exposes a new heat rather than claiming a fake circuit lap at route end', () => {
  const race=createRace('coast',{mode:'stunt',duration:180});
  startRace(race);
  for(let i=0;i<181;i++)stepRace(race,{},1/60);
  race.player.distance=race.length-.1;
  race.player.speed=80;
  stepRace(race,{},1/60);
  assert.equal(race.result.endReason,'route');
  assert.ok(race.elapsed < race.config.duration);
});

test('active mystery inventory is opt-in and does not change Classic behavior', () => {
  const classic=createRace('coast',{mode:'classic',activeItems:true});
  const custom=createRace('coast',{mode:'custom',activeItems:true});
  assert.equal(classic.config.activeItems,undefined);
  assert.equal(custom.config.activeItems,true);
  custom.phase='racing'; custom.player.heldItem='shield';
  assert.equal(useHeldItem(custom),'shield');
  assert.equal(custom.player.effects.shield,10);
  assert.equal(useHeldItem(classic),null);
});

test('Legacy four-car Elimination still finishes without Career unlock', () => {
  const race=createRace('coast',normalizeRaceConfig({mode:'elimination',rulesVersion:1,rivals:3}));
  assert.equal(race.rivals.length,3);
  assert.equal(race.elimination.nextAt,10);
  race.phase='racing';race.elapsed=9.999;
  race.player.distance=100;
  for (const [i,r] of race.rivals.entries()) r.distance=80-i*20;
  stepRace(race,{},.05);
  assert.equal(race.elimination.eliminated[0],'APEX');
  assert.equal(race.rivals.length,2);
  race.elapsed=19.999;stepRace(race,{},.05);
  race.elapsed=29.999;stepRace(race,{},.05);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.success,true);
});
