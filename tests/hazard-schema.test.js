import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHazardPlacement, hazardBox, HAZARD_LIMITS } from '../src/hazard-schema.ts';

const valid = () => ({
  id: 'coast-cone-01', trackId: 'coast', distance: 1200, lateralOffset: -2.5, altitude: 0,
  type: 'cone', triggerWindow: { from: 1100, to: 1205 }, warningLeadSeconds: 1.5,
  movementPattern: { kind: 'static' }, difficulty: 'standard', seed: 7,
});

test('ENV-02 accepts a bounded placement and fills the hitbox from the catalog', () => {
  const placement = validateHazardPlacement(valid());
  assert.deepEqual(placement.hitbox, { halfWidth: 0.35, halfLength: 0.35, height: 0.8 });
  assert.equal(placement.type, 'cone');
  const moving = validateHazardPlacement({ ...valid(), type: 'gate', movementPattern: { kind: 'sweep', amplitude: 1.8, period: 3.5, phase: 0 } });
  assert.equal(moving.movementPattern.kind, 'sweep');
});

test('ENV-02 rejects every out-of-range or unknown property', () => {
  const bad = [
    { id: '' }, { id: 'x'.repeat(65) }, { trackId: 'nowhere' }, { distance: -1 }, { distance: NaN },
    { distance: HAZARD_LIMITS.maxDistance + 1 }, { lateralOffset: 9.5 }, { altitude: -1 }, { altitude: 61 },
    { type: 'building' }, { type: 'unknown' }, { triggerWindow: { from: 1300, to: 1200 } },
    { triggerWindow: { from: 1100, to: 1199 } }, { warningLeadSeconds: 0.2 }, { warningLeadSeconds: 9 },
    { movementPattern: { kind: 'teleport' } }, { movementPattern: { kind: 'sweep', amplitude: 5, period: 3, phase: 0 } },
    { movementPattern: { kind: 'pulse', period: 0.1, phase: 0 } }, { difficulty: 'insane' },
    { seed: -1 }, { seed: 2 ** 32 }, { seed: 1.5 }, { hitbox: { halfWidth: 20, halfLength: 1, height: 1 } },
  ];
  for (const patch of bad) assert.throws(() => validateHazardPlacement({ ...valid(), ...patch }), RangeError, JSON.stringify(patch));
  assert.throws(() => validateHazardPlacement(null), RangeError);
  assert.throws(() => validateHazardPlacement({ ...valid(), extra: 1 }), RangeError, 'unknown keys are refused');
});

test('ENV-02 validation is deterministic and returns a frozen copy', () => {
  const input = valid();
  const a = validateHazardPlacement(input), b = validateHazardPlacement(structuredClone(input));
  assert.deepEqual(a, b);
  assert.ok(Object.isFrozen(a));
  input.distance = 5;
  assert.equal(a.distance, 1200);
});

test('ENV-02 compiles a placement into the world box the collision code uses', () => {
  assert.deepEqual(hazardBox(validateHazardPlacement({ ...valid(), type: 'barrier', altitude: 3 })),
    { from: 1198.9, to: 1201.1, left: -4.05, right: -0.95, bottom: 3, top: 5.5 });
});
