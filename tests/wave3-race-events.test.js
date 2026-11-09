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
