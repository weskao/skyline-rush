import test from 'node:test';
import assert from 'node:assert/strict';
import { collectState } from '../scripts/track-lifecycle/collect.mjs';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

test('collector derives stage and safe access from real modules', async () => {
  const state=await collectState(process.cwd());
  assert.deepEqual(state.upcomingIds,Object.keys(UPCOMING_TRACKS));
  assert.equal(state.courses.length,state.upcomingIds.length);
  assert.equal(state.approvals.size,0,'no automatic release approval is allowed');
  for(const course of state.courses) {
    assert.equal(course.productionEnterable,false,course.id);
    assert.equal(course.productionAvailableWithStaleUnlock,false,course.id);
    assert.deepEqual(course.homeStatuses,['coming-soon','coming-soon'],course.id);
    assert.equal(typeof course.hasEnvironment,'boolean');
    assert.equal(typeof course.developmentEnterable,'boolean');
  }
});
