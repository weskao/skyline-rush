import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { canopy, carShell } from '../src/geometry.ts';

function assertOutward(geometry, center) {
  const vertices = geometry.attributes.position;
  const indices = geometry.index;
  for (let i = 0; i < indices.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(vertices, indices.getX(i + offset)));
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const outward = a.clone().add(b).add(c).divideScalar(3).sub(center);
    assert.ok(normal.dot(outward) > 0, `Triangle ${i / 3} points into the car`);
  }
  geometry.dispose();
}

test('the closed car body faces outward so WebGL does not cull the painted shell', () => {
  assertOutward(carShell([[-2, 1, 0.4, 0.8], [-1, 1.1, 0.4, 1], [1, 1.1, 0.4, 1], [2, 1, 0.4, 0.8]]), new Vector3(0, 0.65, 0));
});

test('the glass canopy faces outward for every car style proportion', () => {
  assertOutward(canopy(0.92, -0.95, 0.86, 1.75, 1.02, 0.66, -0.15, 0.7, 1.4), new Vector3(0, 1.1, 0.4));
  assertOutward(canopy(0.92, -1, 0.95, 1.5, 0.97, 0.72, -0.4, 0.8, 1.6), new Vector3(0, 1.2, 0.2));
});

test('a road ribbon is born lit-safe: unit normals on every vertex and upward-facing quads', async () => {
  const { roadRibbon } = await import('../src/geometry.ts');
  const rows = 4, geometry = roadRibbon(rows);
  const { position, normal } = geometry.attributes;
  assert.equal(position.count, (rows + 1) * 2);
  assert.equal(normal.count, position.count);
  for (let i = 0; i < normal.count; i++) assert.deepEqual([normal.getX(i), normal.getY(i), normal.getZ(i)], [0, 1, 0]);
  for (let i = 0; i <= rows; i++) position.array.set([-1, 0, -i, 1, 0, -i], i * 6);
  assert.equal(geometry.index.count, rows * 6);
  assertOutward(geometry, new Vector3(0, -1, -rows / 2));
});
