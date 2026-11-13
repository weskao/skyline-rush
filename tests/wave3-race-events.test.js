import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { createWave3RaceEventBridge } from '../src/wave3-race-events.ts';

const aRace = (mode = 'classic') => ({ phase: 'racing', trackId: 'coast', mode,
  elapsed: 5, result: null, player: { driftPayout: null, longestCombo: 0 } });

test('real drift payout, combo and eligible finish increment demo only from game state', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, () => 'real-race-00000001');
  const race = aRace();
  bridge.capture(race);
  race.player.driftPayout = { time: 7, nitro: .3 };
  race.player.longestCombo = 2;
  bridge.capture(race);
  bridge.capture(race);
  assert.equal(demo.getSnapshot().missions['mission-drift'].progress, 0, 'staged until real finish');
  assert.equal(demo.getSnapshot().missions['mission-combo'].progress, 0, 'staged until real finish');
  assert.equal(demo.getSnapshot().missions['mission-race'].progress, 0);
  race.phase = 'finished'; race.result = { success: true, time: 51, position: 1 };
  assert.equal(bridge.finish(race, false).status, 'completed');
  assert.equal(demo.getSnapshot().missions['mission-drift'].progress, 1);
  assert.equal(demo.getSnapshot().missions['mission-combo'].progress, 1);
  assert.equal(demo.getSnapshot().missions['mission-race'].progress, 1);
  assert.equal(demo.getSnapshot().demoPoints, 40);
  assert.equal(bridge.finish(race, false).status, 'duplicate');
  assert.equal(demo.getSnapshot().demoPoints, 40);
});

test('unfinished race, partial heat, Free mode and failed result grant nothing', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, (() => { let n = 0; return () => `race-${++n}-aaaaaaaa`; })());
  const racing = aRace();
  assert.equal(bridge.finish(racing, false), null);
  racing.phase = 'finished'; racing.result = { success: true, time: 30 };
  assert.equal(bridge.finish(racing, true).status, 'ineligible');
  const free = aRace('free'); free.phase = 'finished'; free.result = { success: true, time: 25 };
  assert.equal(bridge.finish(free, false).status, 'ineligible');
  const failed = aRace('time'); failed.phase = 'finished'; failed.result = { success: false, time: 25 };
  assert.equal(bridge.finish(failed, false).status, 'ineligible');
  assert.equal(demo.getSnapshot().demoPoints, 20);
  assert.equal(demo.getSnapshot().missions['mission-race'].progress, 0);
});

test('a stale race must not settle into a newly signed-in account', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, () => 'race-account-0000001');
  const race = aRace(); bridge.capture(race);
  demo.setAccount('account_B');
  race.phase = 'finished'; race.result = { success: true, time: 60 };
  assert.equal(bridge.finish(race, false), null);
  assert.equal(demo.getSnapshot().demoPoints, 20);
});

test('each newly finished race receives a unique completion identifier', () => {
  const demo = createWave3LocalDemo();
  let n = 0; const bridge = createWave3RaceEventBridge(demo, () => `race-${++n}-aaaaaaaa`);
  for (let i = 0; i < 2; i++) {
    const race = aRace(); race.phase = 'finished'; race.result = { success: true, time: 70 };
    assert.equal(bridge.finish(race, false).status, 'completed');
  }
  assert.equal(demo.getSnapshot().demoPoints, 60);
});

test('aborted race cannot grant demo mission progress or rewards', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, () => 'race-aborted-00001');
  const race = aRace();
  race.player.driftPayout = { time: 2, nitro: .15 };
  race.player.longestCombo = 3;
  bridge.capture(race);
  assert.equal(bridge.finish(race, false), null);
  assert.equal(demo.getSnapshot().missions['mission-drift'].progress, 0);
  assert.equal(demo.getSnapshot().missions['mission-combo'].progress, 0);
  assert.equal(demo.getSnapshot().demoPoints, 20);
});

test('the final simulation step still captures a drift that ends at the finish line', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, () => 'race-final-drift-001');
  const race = aRace();
  bridge.capture(race);
  race.player.driftPayout = { time: 28, nitro: .15 };
  race.phase = 'finished'; race.result = { success: true, time: 28 };
  bridge.capture(race);
  bridge.finish(race, false);
  assert.equal(demo.getSnapshot().missions['mission-drift'].progress, 1);
});


test('finished races use the configured distance, track challenge, AI difficulty and real placement', () => {
  const demo = createWave3LocalDemo();
  let sequence = 0;
  const bridge = createWave3RaceEventBridge(demo, () => `race-reward-${++sequence}`);
  const finish = (trackId, length, difficulty, position, rivalCount, mode = 'custom') => {
    const race = { ...aRace(mode), phase: 'finished', trackId, length,
      config: { difficulty }, rivals: Array.from({ length: rivalCount }),
      result: { success: true, time: 60, position } };
    return bridge.finish(race, false);
  };
  assert.equal(finish('coast', 5000, 'normal', 1, 0, 'time').deltaDemoPoints, 20);
  assert.equal(finish('coast', 5000, 'normal', 1, 7).deltaDemoPoints, 28);
  assert.equal(finish('coast', 5000, 'normal', 8, 7).deltaDemoPoints, 18);
  assert.equal(finish('canyon', 6000, 'normal', 1, 7).deltaDemoPoints, 35);
  assert.equal(finish('canyon', 6000, 'hard', 1, 7).deltaDemoPoints, 43);
  assert.equal(finish('harbor-circuit', 10000, 'normal', 2, 7, 'circuit').deltaDemoPoints, 38);
  assert.equal(finish('coast', 5000, 'hard', 1, 0).deltaDemoPoints, 20);
  assert.equal(demo.getSnapshot().demoPoints, 222);
});

test('a timed stunt settles the distance driven and replaying its receipt never adds points', () => {
  const demo = createWave3LocalDemo();
  const bridge = createWave3RaceEventBridge(demo, () => 'timed-stunt-0001');
  const race = { ...aRace('stunt'), phase: 'finished', length: 5000,
    player: { distance: 2500, driftPayout: null, longestCombo: 0 },
    result: { success: true, time: 120, endReason: 'timer' }, rivals: [] };
  assert.equal(bridge.finish(race, false).deltaDemoPoints, 15);
  assert.equal(bridge.finish(race, false).deltaDemoPoints, 0);
  assert.equal(demo.getSnapshot().demoPoints, 35);
});

test('multi-stage custom rewards use cumulative distance and average finishing position once', () => {
  const demo = createWave3LocalDemo();
  let sequence = 0;
  const bridge = createWave3RaceEventBridge(demo, () => `multi-stage-${++sequence}`);
  const race = { ...aRace('custom'), phase: 'finished', length: 5000, trackId: 'coast',
    config: { difficulty: 'normal' }, rivals: Array.from({ length: 7 }),
    result: { success: true, time: 60, position: 1 } };
  const series = { cup: null, stunt: null, sprintSeries: { count: 3,
    results: [8, 7, 1].map(position => ({ position, time: 60, score: 0 })) } };
  assert.equal(bridge.finish({ ...race }, true, series).deltaDemoPoints, 0);
  assert.equal(bridge.finish(race, false, series).deltaDemoPoints, 34);
  assert.equal(bridge.finish(race, false, series).deltaDemoPoints, 0);
  assert.equal(demo.getSnapshot().demoPoints, 54);
});

test('a settlement marks missions becoming claimable only on the run that crosses the goal', () => {
  const demo = createWave3LocalDemo();
  let count = 0;
  const bridge = createWave3RaceEventBridge(demo, () => 'race-mission-ready-' + ++count);
  const finish = () => {
    const race = aRace();
    race.phase = 'finished'; race.result = { success:true, time:60 };
    return bridge.finish(race, false);
  };
  assert.equal(finish().missionReady, true);
  assert.notEqual(finish().missionReady, true);
});
