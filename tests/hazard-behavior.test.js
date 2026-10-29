import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHazardPlacement } from '../src/hazard-schema.ts';
import { hazardFrame, hazardContact } from '../src/hazard-behavior.ts';

const place = (type, movementPattern = { kind: 'static' }, extra = {}) => validateHazardPlacement({
  id: `t-${type}`, trackId: 'coast', distance: 1000, lateralOffset: 0, altitude: 0, type,
  triggerWindow: { from: 900, to: 1050 }, warningLeadSeconds: 1.5, movementPattern, difficulty: 'standard', seed: 3, ...extra,
});
const car = (x, altitude = 0, distance = 1000) => ({ distance, x, altitude });

test('ENV-04 static cones and barricades never move and block their own footprint only', () => {
  for (const type of ['cone', 'barrier']) {
    const p = place(type);
    for (const t of [0, 1.3, 99]) assert.deepEqual(hazardFrame(p, t), { active: true, lateralOffset: 0, altitude: 0, angle: 0 });
    assert.equal(hazardContact(p, hazardFrame(p, 0), car(0)), 'block');
    assert.equal(hazardContact(p, hazardFrame(p, 0), car(5)), null);
    assert.equal(hazardContact(p, hazardFrame(p, 0), car(0, 0, 1010)), null, 'outside its length');
    assert.equal(hazardContact(p, hazardFrame(p, 0), car(0, 3)), null, 'flown over');
  }
});

test('ENV-04 gates sweep side to side within one lane, deterministically', () => {
  const p = place('gate', { kind: 'sweep', amplitude: 1.8, period: 4, phase: 0 });
  assert.equal(hazardFrame(p, 0).lateralOffset, 0);
  assert.equal(hazardFrame(p, 1).lateralOffset, 1.8);
  assert.equal(hazardFrame(p, 3).lateralOffset, -1.8);
  assert.deepEqual(hazardFrame(p, 5), hazardFrame(p, 1), 'periodic');
  assert.equal(hazardContact(p, hazardFrame(p, 1), car(1.8)), 'block');
  assert.equal(hazardContact(p, hazardFrame(p, 1), car(-1.8)), null, 'the gate swept away');
});

test('ENV-04 energy barriers and rail crossings are only solid in the on half of their cycle', () => {
  for (const type of ['energy-barrier', 'rail-crossing']) {
    const p = place(type, { kind: 'pulse', period: 4, phase: 0 });
    assert.equal(hazardFrame(p, 0.5).active, true);
    assert.equal(hazardFrame(p, 2.5).active, false);
    assert.equal(hazardContact(p, hazardFrame(p, 0.5), car(0)), 'block');
    assert.equal(hazardContact(p, hazardFrame(p, 2.5), car(0)), null);
  }
});

test('ENV-04 debris falls from its start height, lands and stays solid', () => {
  const p = place('debris', { kind: 'fall', period: 5, phase: 0 }, { altitude: 12 });
  assert.equal(hazardFrame(p, 0).altitude, 12);
  assert.equal(hazardFrame(p, 1).altitude, 6);
  assert.equal(hazardFrame(p, 2).altitude, 0);
  assert.equal(hazardFrame(p, 4.9).altitude, 0);
  assert.equal(hazardContact(p, hazardFrame(p, 0), car(0)), null, 'still overhead');
  assert.equal(hazardContact(p, hazardFrame(p, 3), car(0)), 'block');
});

test('ENV-04 rings rotate in place; gusts push, terrain slows, markers and checkpoints trigger', () => {
  const ring = place('ring', { kind: 'rotate', period: 4, phase: 0 }, { altitude: 5 });
  assert.equal(hazardFrame(ring, 1).angle, Math.PI / 2);
  assert.equal(hazardFrame(ring, 1).altitude, 5);
  assert.equal(hazardContact(ring, hazardFrame(ring, 1), car(0, 5)), 'collect');
  assert.equal(hazardContact(place('gust'), hazardFrame(place('gust'), 0), car(6)), 'push');
  assert.equal(hazardContact(place('terrain'), hazardFrame(place('terrain'), 0), car(1)), 'slow');
  assert.equal(hazardContact(place('branch-marker'), hazardFrame(place('branch-marker'), 0), car(4)), 'trigger');
  assert.equal(hazardContact(place('ramp'), hazardFrame(place('ramp'), 0), car(0)), 'launch');
});

test('ENV-04 corrupt timestamps fail safe to the start of the cycle', () => {
  const p = place('gate', { kind: 'sweep', amplitude: 1.8, period: 4, phase: 0 });
  for (const t of [NaN, Infinity, -Infinity]) assert.deepEqual(hazardFrame(p, t), hazardFrame(p, 0));
});

test('ENV-06 hazardFrameInto writes the same frame in place, for every movement kind', async () => {
  const { hazardFrameInto } = await import('../src/hazard-behavior.ts');
  const out = { active: false, lateralOffset: 9, altitude: 9, angle: 9 };
  for (const p of [place('cone'), place('gate', { kind: 'sweep', amplitude: 1.8, period: 4, phase: 0 }),
    place('energy-barrier', { kind: 'pulse', period: 4, phase: 0 }), place('ring', { kind: 'rotate', period: 4, phase: 0 }, { altitude: 5 }),
    place('debris', { kind: 'fall', period: 5, phase: 0 }, { altitude: 12 })]) for (const t of [0, 0.5, 1, 2.5, 3, NaN]) {
    assert.equal(hazardFrameInto(p, t, out), out, 'no new frame object');
    assert.deepEqual({ ...out }, hazardFrame(p, t), `${p.type} at ${t}`);
  }
});
