import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as readiness from '../src/nitro-readiness.ts';

const frame = (fuel, fields = {}) => ({ fuel, phase: 'racing', boosting: false, braking: false, held: false, ...fields });

test('BOOST starts with one ready cue and matches the engine activation gate', () => {
  const boost = readiness.createBoostReadiness();
  assert.deepEqual(boost.update(frame(100, { phase: 'countdown' })), { state: 'disabled', cueReady: false });
  assert.deepEqual(boost.update(frame(100)), { state: 'ready', cueReady: true });
  assert.deepEqual(boost.update(frame(95, { held: true, boosting: true })), { state: 'active', cueReady: false });
  assert.deepEqual(boost.update(frame(95, { braking: true })), { state: 'disabled', cueReady: false });
  assert.deepEqual(boost.update(frame(95, { phase: 'paused' })), { state: 'disabled', cueReady: false });
  assert.deepEqual(boost.update(frame(95)), { state: 'ready', cueReady: false });
});

test('BOOST can be used as soon as fuel returns, with one cue after a useful reserve recharges', () => {
  const boost = readiness.createBoostReadiness();
  boost.update(frame(100));
  assert.deepEqual(boost.update(frame(0)), { state: 'charging', cueReady: false });
  for (const fuel of [.1, 0, .4, 9.99]) assert.equal(boost.update(frame(fuel)).cueReady, false);
  assert.equal(boost.update(frame(9.99)).state, 'ready');
  assert.equal(boost.update(frame(10, { braking: true })).cueReady, false);
  assert.equal(boost.update(frame(10, { held: true })).cueReady, false);
  assert.equal(boost.update(frame(10)).cueReady, true);
  assert.equal(boost.update(frame(11)).cueReady, false);
  boost.reset();
  assert.equal(boost.update(frame(100, { held: true, boosting: true })).cueReady, false);
  assert.equal(boost.update(frame(99)).cueReady, false);
});
