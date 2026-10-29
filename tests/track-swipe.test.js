import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeAxis, swipeOffset, swipeStep, addSwipeSample, releaseVelocity } from '../src/track-swipe.ts';

test('the drag locks to the axis it first moves along', () => {
  assert.equal(swipeAxis(3, 4), null);
  assert.equal(swipeAxis(-12, 5), 'x');
  assert.equal(swipeAxis(4, 12), 'y');
});

test('a swipe changes track when far enough or flicked, and snaps back otherwise', () => {
  assert.equal(swipeStep(-120, 0, 390), 1, 'leftward drag past a fifth of the screen brings the next track');
  assert.equal(swipeStep(100, 0, 390), -1);
  assert.equal(swipeStep(-40, 0, 390), 0, 'short slow drag snaps back');
  assert.equal(swipeStep(-40, -0.8, 390), 1, 'short fast flick commits');
  assert.equal(swipeStep(-10, -2, 390), 0, 'a tap jitter never switches');
  assert.equal(swipeStep(-150, 0.8, 390), 0, 'flinging back toward the start cancels');
  assert.equal(swipeStep(-90, 0, 1440), 0, 'wide screens cap the distance at 96px');
  assert.equal(swipeStep(-100, 0, 1440), 1);
});

test('the preview follows the finger with a rubber band, stiffer at the ends of the list', () => {
  const free = swipeOffset(-200, 390, true), edge = swipeOffset(-200, 390, false);
  assert.ok(free < 0 && edge < 0);
  assert.ok(Math.abs(free) > Math.abs(edge) * 2);
  assert.ok(Math.abs(swipeOffset(10000, 390, true)) < 390 * 0.6, 'never leaves the screen');
  assert.equal(swipeOffset(0, 390, true), 0);
});

test('release velocity only counts the final 100ms', () => {
  const samples = [];
  for (const [time, x] of [[0, 300], [50, 290], [300, 200], [350, 150], [400, 100]]) addSwipeSample(samples, time, x);
  assert.equal(releaseVelocity(samples, 400), -1);
  assert.equal(releaseVelocity(samples, 700), 0, 'a finger held still before lifting is not a flick');
});
