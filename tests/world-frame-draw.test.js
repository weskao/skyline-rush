import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as frameModule from '../src/world-frame-readiness.ts';

const race = { phase: 'racing', trackId: 'stormline' };
function harness(lost = false, diagnostics = true) {
  const calls = [];
  const renderer = { info: { reset: () => calls.push('reset') }, getContext: () => ({ isContextLost: () => lost }) };
  const composer = { render: dt => calls.push(['render', dt]) };
  const frames = { wait: snapshot => { calls.push(['wait', snapshot]); return false; }, presented: (r, id) => calls.push(['presented', r, id]) };
  const deep = diagnostics ? { draw: dt => calls.push(['deep', dt]) } : null;
  return { calls, draw: frameModule.createWorldFrameDraw(renderer, composer, frames, deep) };
}

test('ordinary frames reset counters, draw and publish the selected track', () => {
  const { calls, draw } = harness(false, false);
  assert.equal(draw(race, .016, false), true);
  assert.deepEqual(calls, ['reset', ['render', .016], ['presented', race, 'stormline']]);
});
test('diagnostics record live frames but never trial snapshots', () => {
  const { calls, draw } = harness();
  assert.equal(draw(race, .016, false, null), true);
  assert.equal(draw(race, .02, true), true);
  assert.deepEqual(calls, ['reset', ['deep', .016], ['presented', race, null], 'reset', ['render', .02]]);
});
test('context loss waits instead of publishing the frame', () => {
  const { calls, draw } = harness(true);
  assert.equal(draw(race, .016, false), false);
  assert.deepEqual(calls, ['reset', ['deep', .016], ['wait', false]]);
});
