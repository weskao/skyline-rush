import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { MISSION_DEFINITIONS, createMissionPeriodState, reduceMissionEvent,
  projectMissionState, missionPeriodBounds, missionStatus, trophyTier } from '../src/wave3-demo-missions.ts';

const at = Date.parse('2026-11-10T12:00:01Z');
const event = (id, kind = 'finish', extra = {}) => ({
  schemaVersion: 1, eventId:id, completionId:'completion-00001', trackId:'coast',
  mode:'classic', kind, occurredAt:at-1000, eligible:true, accountId:'guest', ...extra,
});
test('first visit starts at zero for all four families, daily and weekly', () => {
  const p=projectMissionState(createMissionPeriodState('guest',at),at);
  assert.equal(MISSION_DEFINITIONS.length,8);
  for(const d of MISSION_DEFINITIONS) assert.equal(p[d.id].progress,0);
});
test('real eligible race finish counts race, but not time; ineligible finish does not count', () => {
  const s=createMissionPeriodState('guest',at);
  const a=reduceMissionEvent(s,event('finish-0001'),at);
  const p=projectMissionState(a,at);
  assert.equal(p['mission-race:daily'].progress,1);
  assert.equal(p['mission-time:daily'].progress,0);
  assert.equal(reduceMissionEvent(a,event('finish-bad','finish',{eligible:false}),at),a);
});
test('valid time challenge, drift and combo update only the corresponding task', () => {
  let s=createMissionPeriodState('guest',at);
  for(const e of [event('finish-time','finish',{mode:'time'}),event('drift-0001','drift'),event('combo-0001','combo')]) s=reduceMissionEvent(s,e,at);
  const p=projectMissionState(s,at);
  assert.equal(p['mission-race:daily'].progress,0);
  assert.equal(p['mission-time:daily'].progress,1);
  assert.equal(p['mission-drift:daily'].progress,1);
  assert.equal(p['mission-combo:weekly'].progress,1);
});
test('drift progress is capped and duplicate event ids never increment again', () => {
  let s=createMissionPeriodState('guest',at);
  for(let i=0;i<12;i++) s=reduceMissionEvent(s,event('drift-'+String(i).padStart(4,'0'),'drift'),at);
  assert.equal(projectMissionState(s,at)['mission-drift:daily'].progress,2);
  assert.equal(projectMissionState(s,at)['mission-drift:weekly'].progress,6);
  assert.equal(reduceMissionEvent(s,event('drift-0001','drift'),at),s);
});
test('UTC day and Monday week rollover do not replay old progress into new periods', () => {
  const t=Date.parse('2026-11-15T23:59:59Z');
  const bounds=missionPeriodBounds(t);
  assert.equal(new Date(bounds.weekStart).toISOString(),'2026-11-09T00:00:00.000Z');
  const s=reduceMissionEvent(createMissionPeriodState('guest',t),event('finish-week','finish',{occurredAt:t}),t);
  assert.equal(projectMissionState(s,t)['mission-race:weekly'].progress,1);
  const p=projectMissionState(s,t+1000);
  assert.equal(p['mission-race:daily'].progress,0);
  assert.equal(p['mission-race:weekly'].progress,0);
  const replay=reduceMissionEvent(s,event('finish-old','finish',{occurredAt:t}),t+1000);
  assert.equal(projectMissionState(replay,t+1000)['mission-race:weekly'].progress,0);
});
test('daily rollover keeps this week progress; next account has zero', () => {
  const t=Date.parse('2026-11-10T23:59:59Z');
  const s=reduceMissionEvent(createMissionPeriodState('guest',t),event('finish-day','finish',{occurredAt:t}),t);
  assert.equal(projectMissionState(s,t+1000)['mission-race:daily'].progress,0);
  assert.equal(projectMissionState(s,t+1000)['mission-race:weekly'].progress,1);
  assert.equal(projectMissionState(createMissionPeriodState('account-B',t+1000),t+1000)['mission-race:weekly'].progress,0);
  assert.equal(reduceMissionEvent(s,event('finish-wrong','finish',{accountId:'account-B'}),t),s);
});
test('F01 port owns claims and prevents repeat payout, with no server', () => {
  const port=createWave3LocalDemo();
  const receipt=port.recordGameEvent(event('finish-core','finish'));
  assert.equal(receipt.status,'completed');
  const points=port.getSnapshot().demoPoints;
  assert.equal(port.claimMission('mission-race').status,'completed');
  assert.equal(port.claimMission('mission-race').status,'duplicate');
  assert.equal(port.getSnapshot().demoPoints,points+10);
  assert.equal(port.getSnapshot().authority,'local');
  assert.equal(port.getSnapshot().missions['mission-race'].claimed,true);
});
test('locale display status does not mutate snapshot; account switch rejects stale event', () => {
  const port=createWave3LocalDemo();
  const before=port.getSnapshot();
  assert.equal(missionStatus(before.missions['mission-race']),'not-started');
  assert.equal(missionStatus({progress:1,goal:1,claimed:false,rewardDemoPoints:10}),'claimable');
  assert.equal(missionStatus({progress:1,goal:1,claimed:true,rewardDemoPoints:10}),'claimed');
  assert.equal(missionStatus(null),'unavailable');
  assert.equal(trophyTier(4),'platinum');
  port.setAccount('account-B');
  assert.equal(port.recordGameEvent(event('old-user')).status,'invalid');
  assert.equal(port.getSnapshot().missions['mission-race'].progress,0);
});

test('unsupported race mode never advances missions even with an eligible flag', () => {
  const state=createMissionPeriodState('guest',at);
  assert.equal(reduceMissionEvent(state,event('bad-mode','finish',{mode:'endless'}),at),state);
});
