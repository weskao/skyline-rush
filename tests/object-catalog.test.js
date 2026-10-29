import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECT_CATALOG, GAMEPLAY_TYPES, SCENERY_TYPES, isGameplayType } from '../src/object-catalog.ts';
import { RING_RADIUS } from '../src/game.js';

test('ENV-01 catalog separates visual-only scenery from gameplay objects', () => {
  assert.deepEqual(Object.keys(OBJECT_CATALOG).sort(), [...GAMEPLAY_TYPES, ...SCENERY_TYPES].sort());
  for (const type of SCENERY_TYPES) {
    assert.equal(OBJECT_CATALOG[type].role, 'scenery');
    assert.equal('hitbox' in OBJECT_CATALOG[type], false, `${type} must never collide`);
    assert.equal(isGameplayType(type), false);
  }
  for (const type of GAMEPLAY_TYPES) {
    const { role, hitbox } = OBJECT_CATALOG[type];
    assert.equal(role, 'gameplay');
    assert.ok(isGameplayType(type));
    for (const size of [hitbox.halfWidth, hitbox.halfLength, hitbox.height]) assert.ok(size > 0 && size <= 12, `${type} hitbox bounded`);
  }
  assert.equal(isGameplayType('unknown-future-prop'), false);
  assert.ok(Object.isFrozen(OBJECT_CATALOG) && Object.isFrozen(OBJECT_CATALOG.barrier.hitbox));
});

test('ENV-01 hitboxes for objects the simulation already resolves match its constants', () => {
  assert.deepEqual(OBJECT_CATALOG.barrier.hitbox, { halfWidth: 1.55, halfLength: 1.1, height: 2.5 });
  assert.equal(OBJECT_CATALOG.ring.hitbox.halfWidth, RING_RADIUS);
  assert.equal(OBJECT_CATALOG.pickup.hitbox.halfWidth, 1.7);
  // Gauntlet barriers never take more than one lane (5 m) so two lanes stay open.
  for (const type of GAMEPLAY_TYPES) if (OBJECT_CATALOG[type].effect === 'block' && type !== 'rail-crossing') {
    assert.ok(OBJECT_CATALOG[type].hitbox.halfWidth * 2 <= 5, `${type} fits one lane`);
  }
});
