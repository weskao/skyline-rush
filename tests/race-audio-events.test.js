import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace } from '../src/game.js';
import { createRaceAudioEvents } from '../src/race-audio-events.ts';

const racing = () => { const race = createRace(); race.phase = 'racing'; race.player.speed = 40; return race; };
const cues = frame => frame.sounds.filter(sound => typeof sound === 'string');
const impulses = frame => frame.sounds.filter(sound => typeof sound !== 'string');

test('cue detection has one home: the synth engine keeps no race-transition bookkeeping', () => {
  const engine = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /collectedPickups|lastNearMiss|wasThrusting|lowCharge/);
});

test('countdown ticks once per new second and GO fires once on the switch to racing', () => {
  const events = createRaceAudioEvents();
  const race = createRace();
  race.phase = 'countdown'; race.countdown = 2.5;
  assert.deepEqual(cues(events.update(race, true)), ['tick']);
  race.countdown = 2.1;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.countdown = 1.9;
  assert.deepEqual(cues(events.update(race, true)), ['tick']);
  race.phase = 'racing';
  assert.deepEqual(cues(events.update(race, true)), ['go']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('a new race asks for silence once and does not replay pickups already taken', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  race.pickups[0].taken = true;
  const first = events.update(race, true);
  assert.equal(first.silence, true);
  assert.deepEqual(cues(first), []);
  assert.equal(events.update(race, true).silence, false);
});

test('a pickup collected while muted is consumed and never cues after unmuting', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.pickups[0].taken = true;
  assert.deepEqual(cues(events.update(race, false)), []);
  assert.deepEqual(cues(events.update(race, true)), []);
  race.pickups[1].taken = true;
  assert.deepEqual(cues(events.update(race, true)), [`pickup-${race.pickups[1].tier}`]);
});

const ringAt = (race, type) => { const ring = { type, hit: false, distance: 500, x: 0, altitude: 0, radius: 4.8, group: 0 }; race.rings.push(ring); return ring; };

test('each ring type cues once when the player takes it, named for its type', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  for (const type of ['charge', 'nitro', 'slipstream', 'risk', 'mystery', 'speed-pad']) {
    const ring = ringAt(race, type);
    assert.deepEqual(cues(events.update(race, true)), [], `${type} untouched is silent`);
    ring.hit = true;
    assert.deepEqual(cues(events.update(race, true)), [`ring-${type}`], `${type} takes cue`);
    assert.deepEqual(cues(events.update(race, true)), [], `${type} never repeats`);
  }
});

test('a ring taken while muted, paused or before this race started never cues later', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  race.rings[0].hit = true;
  assert.deepEqual(cues(events.update(race, true)), [], 'already-hit ring in a fresh race');
  const muted = ringAt(race, 'charge');
  muted.hit = true;
  assert.deepEqual(cues(events.update(race, false)), []);
  assert.deepEqual(cues(events.update(race, true)), [], 'consumed while muted');
  race.phase = 'paused';
  ringAt(race, 'nitro').hit = true;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.phase = 'racing';
  assert.deepEqual(cues(events.update(race, true)), [], 'consumed while paused');
});

test('a 6-ring train cues six times, one per ring', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  const train = Array.from({ length: 6 }, () => ringAt(race, 'charge'));
  let heard = 0;
  for (const ring of train) { ring.hit = true; heard += cues(events.update(race, true)).length; }
  assert.equal(heard, 6);
});

test('a chain landing adds one chain-land cue on top of the touchdown; plain or muted landings do not', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.elapsed = 5;
  race.player.landing = { time: 4.95, speed: 6 };
  assert.deepEqual(cues(events.update(race, true)), []);
  race.player.landing = { time: 4.97, speed: 6, chain: true };
  const frame = events.update(race, true);
  assert.deepEqual(cues(frame), ['chain-land']);
  assert.equal(impulses(frame).length, 1, 'the touchdown thump still plays');
  assert.deepEqual(cues(events.update(race, true)), [], 'no replay next frame');
  race.player.landing = { time: 4.99, speed: 6, chain: true };
  assert.deepEqual(cues(events.update(race, false)), []);
  assert.deepEqual(cues(events.update(race, true)), [], 'muted chain is consumed');
});

test('fresh impacts and landings become impulses in order, sized like before', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.elapsed = 5;
  race.player.impact = { time: 4.9, intensity: 0.7, kind: 'barrier' };
  race.player.landing = { time: 4.95, speed: 28 };
  assert.deepEqual(impulses(events.update(race, true)), [
    { intensity: 0.7, landing: false, barrier: true },
    { intensity: 1, landing: true, barrier: false },
  ]);
  assert.deepEqual(impulses(events.update(race, true)), [], 'the same impact never repeats');
});

test('entering pause asks for silence once', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.phase = 'paused';
  assert.equal(events.update(race, true).silence, true);
  assert.equal(events.update(race, true).silence, false);
});

test('low charge warns once below 20 % and re-arms only after recovering to 30 %', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), ['low']);
  race.player.fuel = 25;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), [], 'no re-arm between 20 and 30');
  race.player.fuel = 35; events.update(race, true);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), ['low']);
});

test('the frame reports racing and boosting state for the engine mix', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  race.player.nitroTime = 1;
  assert.deepEqual([events.update(race, true).active, events.update(race, true).boosting], [true, true]);
  race.phase = 'ready'; race.player.nitroTime = 0;
  assert.deepEqual([events.update(race, true).active, events.update(race, true).boosting], [false, false]);
});

test('ITEM-12: a shield blocking a hit plays its own cue once, and never a crash impulse', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.player.shieldBlock = { distance: 100, x: 0, altitude: 0, time: race.elapsed };
  const frame = events.update(race, true);
  assert.deepEqual([cues(frame), impulses(frame)], [['shield-block'], []]);
  assert.deepEqual(cues(events.update(race, true)), []);
});


test('each road supply selects its own cue once at collection', () => {
  const events = createRaceAudioEvents(), race = racing();
  events.update(race, true);
  for (const tier of ['cell', 'can', 'tank', 'overcharge']) {
    const pickup = { tier, taken: false };
    race.pickups.push(pickup);
    assert.deepEqual(cues(events.update(race, true)), []);
    pickup.taken = true;
    assert.deepEqual(cues(events.update(race, true)), [`pickup-${tier}`]);
    assert.deepEqual(cues(events.update(race, true)), []);
  }
});

test('drift payout has its own release sound in place of generic boost', () => {
  const race = racing(), events = createRaceAudioEvents();
  events.update(race, true);
  race.player.driftPayout = { time: race.elapsed, nitro: .25 };
  race.player.miniBoost = 2;
  assert.deepEqual(cues(events.update(race, true)), ['drift-release']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('NITRO extension, slipstream reward and boost tunnel have distinct transition sounds', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.player.nitroTime = 2;
  events.update(race, true);
  race.player.nitroTime = 3;
  assert.deepEqual(cues(events.update(race, true)), ['nitro-extend']);
  race.player.slipstream.paid = true;
  assert.deepEqual(cues(events.update(race, true)), ['draft-reward']);
  race.player.boostTunnelEvent = { time: race.elapsed, distance: race.player.distance };
  assert.deepEqual(cues(events.update(race, true)), ['tunnel-boost']);
});

test('Perfect Line replaces only the final ring chime and keeps other rings audible', () => {
  const race = racing(), events = createRaceAudioEvents();
  const a = ringAt(race, 'charge'), b = ringAt(race, 'nitro');
  events.update(race, true);
  a.hit = b.hit = true;
  race.player.perfectLines++;
  assert.deepEqual(cues(events.update(race, true)), ['ring-charge', 'perfect-line']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('a missed gap gives a recovery cue once, and entering a shortcut cues once per section', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.sections = [{ type:'shortcut', from: 10, to: 100 }];
  race.player.distance = 20;
  events.update(race, true);
  race.player.inShortcut = true;
  assert.deepEqual(cues(events.update(race, true)), ['shortcut-entry']);
  race.player.inShortcut = false;
  events.update(race, true);
  race.player.inShortcut = true;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.player.fall = { from: 20, distance: 40, time: race.elapsed };
  assert.deepEqual(cues(events.update(race, true)), ['fall-recovery']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('a gap warning plays once per gap and consumes a warning while muted', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.player.fuel = 22;
  events.update(race, true, null);
  assert.deepEqual(cues(events.update(race, true, 80)), ['gap-warning']);
  events.update(race, true, null);
  assert.deepEqual(cues(events.update(race, true, 80)), []);
  events.update(race, false, 380);
  assert.deepEqual(cues(events.update(race, true, 380)), []);
});

test('nearby elimination risk sounds once per round, then the rival knockout sounds once', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.mode = 'elimination';
  race.elimination = { nextAt:10, eliminated:[], outcome:null };
  race.player.distance = 200;
  race.rivals = [{ name:'NOVA', distance:210 }, { name:'ORBIT', distance:220 }];
  race.elapsed = 6.9;
  events.update(race, true);
  race.elapsed = 7.1;
  assert.deepEqual(cues(events.update(race, true)), ['elimination-warning']);
  assert.deepEqual(cues(events.update(race, true)), []);
  race.elapsed = 10;
  race.elimination.nextAt = 20;
  race.elimination.eliminated.push('NOVA');
  assert.deepEqual(cues(events.update(race, true)), ['rival-eliminated']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('final lap and first invalidation distinguish the normal lap sound', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.mode = 'circuit';
  race.circuit = { laps:3, player:{ completed:1, valid:true } };
  events.update(race, true);
  race.circuit.player.completed++;
  assert.deepEqual(cues(events.update(race, true)), ['final-lap']);
  race.circuit.player.valid = false;
  assert.deepEqual(cues(events.update(race, true)), ['objective-invalid']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('clean trial invalidation plays once and consumes changes while paused', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.mode = 'time';
  race.config = { clean:true };
  events.update(race, true);
  race.player.collisions++;
  assert.deepEqual(cues(events.update(race, true)), ['objective-invalid']);
  race.player.collisions++;
  assert.deepEqual(cues(events.update(race, true)), []);
  const other = { ...race, player: { ...race.player, collisions:0 } };
  events.update(other, true);
  other.phase = 'paused'; other.player.collisions++;
  events.update(other, true);
  other.phase = 'racing';
  assert.deepEqual(cues(events.update(other, true)), []);
});

test('collision-limit ending is audible without the ordinary success melody', () => {
  const race = racing(), events = createRaceAudioEvents();
  race.mode = 'endless';
  events.update(race, true);
  race.phase = 'finished'; race.result = { success:true, endReason:'collisions' };
  assert.deepEqual(cues(events.update(race, true)), ['endless-ended']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('entering a CourseGraph branch sounds only when the player leaves the normal route', () => {
  const race = racing(), events = createRaceAudioEvents();
  const travel = { currentEdgeId:'ground-a' };
  race.course = { cars:new Map([['YOU',{ travel }]]), spec:{ graph:{ groundRoute:['ground-a','ground-b'] } } };
  events.update(race, true);
  travel.currentEdgeId = 'flight';
  assert.deepEqual(cues(events.update(race, true)), ['shortcut-entry']);
  travel.currentEdgeId = 'ground-b';
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('the halfway chime plays once when the player crosses half of a finite course', () => {
  const events = createRaceAudioEvents(), race = racing();
  race.player.distance = race.length * 0.49;
  events.update(race, true);
  race.player.distance = race.length * 0.51;
  assert.deepEqual(cues(events.update(race, true)), ['halfway']);
  race.player.distance = race.length * 0.6;
  assert.deepEqual(cues(events.update(race, true)), []);
  const endless = racing();
  endless.endless = {};
  endless.player.distance = endless.length * 0.49;
  events.update(endless, true);
  endless.player.distance = endless.length * 0.51;
  assert.ok(!cues(events.update(endless, true)).includes('halfway'));
});
