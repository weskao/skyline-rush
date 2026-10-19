import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSlidePad } from '../src/slide-pad.js';

function pad(options) {
  const p = createSlidePad(options);
  p.down(100, 200);
  return p;
}

test('idle pad reads inactive neutral', () => {
  const r = createSlidePad().read();
  assert.equal(r.steer, 0);
  assert.equal(r.brake, false);
  assert.equal(r.active, false);
});

test('touch-down point is the center; dead zone gives zero steer', () => {
  const p = pad();
  assert.deepEqual(p.read().origin, { x: 100, y: 200 });
  assert.equal(p.read().active, true);
  p.move(105, 200);
  assert.equal(p.read().steer, 0);
  p.move(95, 200);
  assert.equal(p.read().steer, 0);
  p.move(106, 200);
  assert.ok(p.read().steer > 0);
});

test('steer is analog: midpoint is half, full lock is 1', () => {
  const p = pad();
  p.move(130, 200);
  assert.equal(p.read().steer, 0.5);
  p.move(70, 200);
  assert.equal(p.read().steer, -0.5);
  p.move(160, 200);
  assert.equal(p.read().steer, 1);
});

test('past full lock the center follows the thumb and reversing responds immediately', () => {
  const p = pad();
  p.move(300, 200);
  assert.equal(p.read().steer, 1);
  assert.deepEqual(p.read().origin, { x: 240, y: 200 });
  p.move(270, 200);
  assert.equal(p.read().steer, 0.5);
  p.move(200, 200);
  assert.ok(p.read().steer < 0);
});

test('release clears steer, brake and active', () => {
  const p = pad();
  p.move(160, 260);
  p.up();
  const r = p.read();
  assert.deepEqual([r.steer, r.brake, r.active], [0, false, false]);
  p.move(200, 300);
  assert.equal(p.read().active, false);
});

test('sliding down 40px brakes without steering', () => {
  const p = pad();
  p.move(100, 239);
  assert.equal(p.read().brake, false);
  p.move(100, 240);
  assert.deepEqual([p.read().brake, p.read().steer], [true, 0]);
});

test('down plus sideways brakes and steers analog (drift)', () => {
  const p = pad();
  p.move(130, 250);
  const r = p.read();
  assert.equal(r.brake, true);
  assert.equal(r.steer, 0.5);
});

test('setFullLock rescales steering sensitivity', () => {
  const p = pad({ fullLock: 60 });
  p.setFullLock(40);
  p.move(120, 200);
  assert.equal(p.read().steer, 0.5);
  p.setFullLock(80);
  assert.equal(p.read().steer, 0.25);
  p.move(180, 200);
  assert.equal(p.read().steer, 1);
});

test('reset behaves like release', () => {
  const p = pad();
  p.move(150, 200);
  p.reset();
  assert.equal(p.read().active, false);
  assert.equal(p.read().steer, 0);
});
