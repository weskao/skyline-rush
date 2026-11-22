import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackLoadRecorder } from '../src/track-load-telemetry.ts';

test('measures selection to true first showcase frame, not a different track or stale frame', () => {
  let now = 100, results = [];
  const recorder = createTrackLoadRecorder(() => now, result => results.push(result));
  recorder.select('coast'); now += 50; recorder.showcase('neon');
  assert.equal(results.length, 0);
  now += 110; recorder.showcase('coast');
  assert.deepEqual(results[0], { kind: 'showcase', trackId: 'coast', start: 100, end: 260, ms: 160 });
  now += 40; recorder.showcase('coast');
  assert.equal(results.length, 1);
});

test('measures Start to race grid separately, and ignores the current Home frame', () => {
  let now = 200, results = [];
  const recorder = createTrackLoadRecorder(() => now, result => results.push(result));
  recorder.start('spiral'); now += 120; recorder.showcase('spiral');
  assert.equal(results.length, 0);
  now += 300; recorder.race('spiral');
  assert.equal(results[0].kind, 'race');
  assert.equal(results[0].ms, 420);
  assert.equal(results.length, 1);
});

test('switching selection and losing tab focus discards out-of-date timers', () => {
  let now = 0, results = [];
  const recorder = createTrackLoadRecorder(() => now, result => results.push(result));
  recorder.select('coast'); now += 100; recorder.select('neon');
  recorder.showcase('coast');
  assert.equal(results.length, 0);
  now += 20; recorder.showcase('neon');
  assert.equal(results[0].ms, 20);
  recorder.start('neon'); recorder.cancel(); recorder.race('neon');
  assert.equal(results.length, 1);
});
