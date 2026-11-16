import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';

const DAY = 86400000;
const start = Date.parse('2026-11-10T12:00:00.000Z');
const finish = (time, accountId = 'guest', mode = 'classic', eventId = 'finish-live-0001') => ({
  schemaVersion: 1, eventId, completionId: 'race-live-0001',
  trackId: 'coast', accountId, mode, kind: 'finish', eligible: true, occurredAt: time,
});

test('F02 real eligible event updates the same F01 base/daily/weekly mission snapshot', () => {
  const demo = createWave3LocalDemo({ now: () => start });
  assert.equal(demo.getSnapshot().missions['mission-race:daily'].progress, 0);
  assert.equal(demo.recordGameEvent(finish(start)).status, 'completed');
  for (const id of ['mission-race', 'mission-race:daily', 'mission-race:weekly'])
    assert.equal(demo.getSnapshot().missions[id].progress, 1, id);
  assert.equal(demo.recordGameEvent(finish(start)).status, 'duplicate');
  assert.equal(demo.claimMission('mission-race:daily').status, 'completed');
  assert.equal(demo.claimMission('mission-race:daily').status, 'duplicate');
  assert.equal(demo.getSnapshot().demoPoints, 30);
  assert.equal(demo.getSnapshot().missions['mission-race:daily'].claimed, true);
});

test('daily rollover resets only the daily claim while same-week and replay IDs remain safe', () => {
  let clock = Date.parse('2026-11-10T23:59:58.000Z');
  const demo = createWave3LocalDemo({ now: () => clock });
  const event = finish(clock, 'guest', 'classic', 'finish-rollover-1');
  demo.recordGameEvent(event);
  demo.claimMission('mission-race:daily');
  const checkpoint = demo.getCheckpoint();
  const reloaded = createWave3LocalDemo({ now: () => clock });
  assert.ok(reloaded.restoreCheckpoint(checkpoint));
  assert.equal(reloaded.claimMission('mission-race:daily').status, 'duplicate');
  clock += 3000;
  assert.equal(reloaded.getSnapshot().missions['mission-race:daily'].progress, 0);
  assert.equal(reloaded.getSnapshot().missions['mission-race:daily'].claimed, false);
  assert.equal(reloaded.getSnapshot().missions['mission-race:weekly'].progress, 1);
  assert.equal(reloaded.recordGameEvent(event).status, 'duplicate');
  assert.equal(reloaded.getSnapshot().missions['mission-race:daily'].progress, 0);
});

test('unsupported modes and account switches never grant daily/weekly demo claims', () => {
  const demo = createWave3LocalDemo({ now: () => start });
  assert.equal(demo.recordGameEvent(finish(start, 'guest', 'free')).status, 'ineligible');
  assert.equal(demo.getSnapshot().missions['mission-race:daily'].progress, 0);
  assert.equal(demo.claimMission('mission-race:daily').status, 'ineligible');
  demo.recordGameEvent(finish(start));
  demo.setAccount('driver_B');
  assert.equal(demo.getSnapshot().missions['mission-race:daily'].progress, 0);
  assert.equal(demo.recordGameEvent(finish(start, 'guest')).status, 'invalid');
});

test('older F01 checkpoint retains local credits but starts new weekly challenges at zero', () => {
  const demo = createWave3LocalDemo({ now: () => start });
  const source = demo.getCheckpoint();
  const original = { ...source, snapshot: {
    ...source.snapshot, demoPoints: 42, missions: Object.fromEntries(
      Object.entries(source.snapshot.missions).filter(([id]) => !id.includes(':')),
    ) } };
  assert.ok(demo.restoreCheckpoint(original));
  assert.equal(demo.getSnapshot().demoPoints, 42);
  assert.equal(demo.getSnapshot().missions['mission-race:daily'].progress, 0);
});
