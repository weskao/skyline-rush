import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { recordGhost, ghostAt, validGhost } from '../src/ghost.ts';

test('ghost recording and playback use one strict TypeScript source', () => {
  assert.equal(existsSync(new URL('../src/ghost.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/ghost.js', import.meta.url)), false);
});
test('ghost sample interval records exactly one pose per tick and interpolates safely', () => {
  const samples = [];
  const race = { phase: 'racing', elapsed: 0, player: { distance: 0, x: 0, altitude: 0 } };
  recordGhost(samples, race);
  recordGhost(samples, race);
  assert.deepEqual(samples, [[0, 0, 0]]);
  race.elapsed=.1; race.player.distance=100;race.player.x=2;race.player.altitude=4;
  recordGhost(samples, race);
  assert.deepEqual(samples, [[0,0,0],[100,2,4]]);
  assert.deepEqual(ghostAt({time:0.1,samples},0.05), {distance:50,x:1,altitude:2});
  assert.equal(validGhost({time:.1,samples},'wrong-track'), false);
});
