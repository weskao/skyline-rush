import test from 'node:test';
import assert from 'node:assert/strict';
import { createFramePacer, parseFpsPreference } from '../src/frame-pacing.ts';

function simulate(pacer, refreshHz, seconds, costMs = 2, startAt = 0) {
  const frames = Math.round(refreshHz * seconds);
  let rendered = 0;
  for (let i = 1; i <= frames; i++) {
    const now = startAt + i * 1000 / refreshHz;
    if (pacer.tick(now, { racing: true })) {
      rendered++;
      pacer.completeRender(costMs);
    }
  }
  return { rendered, endAt: startAt + frames * 1000 / refreshHz };
}

test('90 and 120 are valid persisted manual preferences; unsupported values still fall back to Auto', () => {
  for (const preference of ['auto', '30', '60', '90', '120'])
    assert.equal(parseFpsPreference(preference), preference);
  for (const invalid of [null, 90, 120, '144', '-1', '120hz', {}])
    assert.equal(parseFpsPreference(invalid), 'auto');
});

test('manual 90 and 120 pace correctly on a 120 Hz browser without changing simulation callbacks', () => {
  for (const desired of [90, 120]) {
    const pacer = createFramePacer(String(desired));
    const { rendered } = simulate(pacer, 120, 4);
    assert.equal(pacer.preference, String(desired));
    assert.equal(pacer.targetFps, desired);
    assert.ok(Math.abs(rendered - desired * 4) <= 4,
      `expected ${desired * 4} renders on 120Hz, got ${rendered}`);
    assert.equal(pacer.renderScale, 1, 'manual cap does not automatically lower graphics resolution');
  }
});

test('manual high-rate preference keeps its selection but caps to an observed 60 or 90 Hz browser', () => {
  for (const [hz, requested, effective] of [[60, '120', 60], [90, '120', 90], [60, '90', 60]]) {
    const pacer = createFramePacer(requested);
    simulate(pacer, hz, 4);
    assert.equal(pacer.preference, requested);
    assert.equal(pacer.targetFps, effective);
  }
});

test('Auto can step up to 90 and 120 only after sustained low-cost racing on high-refresh callbacks', () => {
  const pacer = createFramePacer('auto');
  const first = simulate(pacer, 120, 18, 2);
  assert.equal(pacer.targetFps, 90);
  simulate(pacer, 120, 18, 2, first.endAt);
  assert.equal(pacer.targetFps, 120);
  const regular = createFramePacer('auto');
  simulate(regular, 60, 45, 2);
  assert.equal(regular.targetFps, 60);
});

test('Auto high-rate steps down under sustained load, preserving manual selection on the same device', () => {
  const pacer = createFramePacer('auto');
  let state = simulate(pacer, 120, 36, 2);
  assert.equal(pacer.targetFps, 120);
  state = simulate(pacer, 120, 18, 13, state.endAt);
  assert.ok(pacer.targetFps <= 90, `auto should lower 120 under load; got ${pacer.targetFps}`);
  pacer.setPreference('120');
  state = simulate(pacer, 120, 25, 20, state.endAt);
  assert.equal(pacer.preference, '120');
  assert.equal(pacer.targetFps, 120, 'manual cap does not silently switch to Auto');
});

test('high-refresh pacing recovers after tab suspension and remains independent of fixed 60Hz state', () => {
  const pacer = createFramePacer('120');
  const before = simulate(pacer, 120, 3);
  assert.equal(pacer.targetFps, 120);
  assert.equal(pacer.tick(before.endAt + 10000, { racing: true, hidden: true }), false);
  assert.equal(pacer.tick(before.endAt + 10100, { racing: true }), true);
  simulate(pacer, 120, 3, 2, before.endAt + 10100);
  assert.equal(pacer.targetFps, 120);
  const run = (preference) => {
    const p = createFramePacer(preference);
    let elapsed = 0, ghost = 0, renders = 0;
    for (let i = 1; i <= 600; i++) {
      // Fixed-step game logic executes on every callback regardless of drawing.
      elapsed += 1 / 60;
      ghost += 42 / 60;
      if (p.tick(i * 1000 / 120, { racing: true })) { renders++; p.completeRender(2); }
    }
    return { elapsed, ghost, renders };
  };
  const slow = run('60'), fast = run('120');
  assert.deepEqual([slow.elapsed, slow.ghost], [fast.elapsed, fast.ghost]);
  assert.ok(fast.renders > slow.renders);
});
