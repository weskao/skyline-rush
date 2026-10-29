import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BufferGeometry } from 'three';

test('shared vehicle/road geometry has a single TypeScript implementation', async () => {
  assert.ok(existsSync(new URL('../src/geometry.ts', import.meta.url)), 'strict typed geometry service must exist');
  assert.equal(existsSync(new URL('../src/geometry.js', import.meta.url)), false, 'remove duplicate JS geometry source');
  const { carShell, canopy, roadRibbon } = await import('../src/geometry.ts');
  const shell = carShell([[-1, 1, .4, 1], [1, 1, .4, 1]]);
  const roof = canopy(.8, -1, .6, 1, .6, .5, -.8, .8, 1.2);
  const road = roadRibbon(4);
  for (const geometry of [shell, roof, road]) {
    assert.ok(geometry instanceof BufferGeometry);
    assert.ok(geometry.attributes.position.count > 0);
    assert.ok(geometry.index.count > 0);
  }
  assert.equal(road.attributes.normal.count, road.attributes.position.count);
  for (let i = 0; i < road.attributes.normal.count; i++)
    assert.deepEqual([road.attributes.normal.getX(i), road.attributes.normal.getY(i), road.attributes.normal.getZ(i)], [0, 1, 0]);
  for (const geometry of [shell, roof, road]) geometry.dispose();
});
