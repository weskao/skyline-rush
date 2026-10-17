import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { carShell } from '../src/geometry.js';

test('the closed car body faces outward so WebGL does not cull the painted shell', () => {
  const geometry = carShell([[-2, 1, 0.4, 0.8], [-1, 1.1, 0.4, 1], [1, 1.1, 0.4, 1], [2, 1, 0.4, 0.8]]);
  const vertices = geometry.attributes.position;
  const indices = geometry.index;
  const center = new Vector3(0, 0.65, 0);
  for (let i = 0; i < indices.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(vertices, indices.getX(i + offset)));
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const outward = a.clone().add(b).add(c).divideScalar(3).sub(center);
    assert.ok(normal.dot(outward) > 0, `Triangle ${i / 3} points into the car`);
  }
  geometry.dispose();
});
