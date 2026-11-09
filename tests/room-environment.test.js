import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRoomEnvironment } from '../src/room-environment.ts';

test('the RoomEnvironment prefilter lives in its own module, not in world.js', () => {
  assert.equal(typeof createRoomEnvironment, 'function');
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /RoomEnvironment\(\)/, 'world.js no longer builds the room scene');
  assert.match(world, /createRoomEnvironment\(renderer\)/);
});
