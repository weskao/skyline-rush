import test from 'node:test';
import assert from 'node:assert/strict';
import { orderRaceLeaderboard, graphRivalGap } from '../src/course-hud-standings.ts';

const racers = [{ name: 'YOU', distance: 1600 }, { name: 'NOVA', distance: 1200 }, { name: 'APEX', distance: 1500 }];
const standings = [
  { id: 'NOVA', place: 1, finished: false, nextCheckpoint: 2, remainingMetres: 100 },
  { id: 'YOU', place: 2, finished: false, nextCheckpoint: 2, remainingMetres: 600 },
  { id: 'APEX', place: 3, finished: false, nextCheckpoint: 1, remainingMetres: 800 },
];

test('CourseGraph leaderboard sorts checkpoint-aware places, not raw branch odometers', () => {
  assert.deepEqual(orderRaceLeaderboard(racers, standings).map(r => r.name), ['NOVA','YOU','APEX']);
  assert.deepEqual(orderRaceLeaderboard(racers).map(r => r.name), ['YOU','APEX','NOVA']);
  assert.deepEqual(racers.map(r => r.name), ['YOU','NOVA','APEX'], 'does not mutate host race data');
});

test('CourseGraph rival gap uses physical remaining road, not branch odometer', () => {
  assert.equal(graphRivalGap(standings,'NOVA'), 500);
  assert.equal(graphRivalGap(standings,'APEX'), -200);
  assert.equal(graphRivalGap(standings,'RIFT'), null);
});
