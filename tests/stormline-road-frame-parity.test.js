import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STORMLINE_MEGACITY } from '../src/courses/stormline-megacity.ts';
import { sampleStormlineRoad } from '../src/courses/stormline-course-graph.ts';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';

test('hairpin visible road meshes use precisely the shared road contact frame', () => {
  const edgeId = 'hairpin-west', from = 64, to = 192, step = 8;
  const width = STORMLINE_MEGACITY.edges.find(e => e.id === edgeId).width;
  const chunk = createStormlineChunk(edgeId, from, to, sampleStormlineRoad, 'high');
  try {
    const road = chunk.group.getObjectByName(`stormline:road:${edgeId}`);
    assert.ok(road instanceof THREE.Mesh);
    const vertices = road.geometry.getAttribute('position');
    const sections = Math.max(2, Math.ceil((to - from) / step));
    assert.equal(vertices.count, (sections + 1) * 2);
    for (const i of [0, Math.floor(sections / 2), sections]) {
      const frame = sampleStormlineRoad(edgeId, from + (to - from) * i / sections);
      for (const side of [0, 1]) {
        const sign = side === 0 ? 1 : -1;
        const index = i * 2 + side;
        const expected = frame.point.map((v, axis) => v + sign * width / 2 * frame.right[axis]);
        const actual = [vertices.getX(index), vertices.getY(index), vertices.getZ(index)];
        assert.ok(Math.hypot(...actual.map((v, axis) => v - expected[axis])) < .005,
          `road and contact diverged at section ${i} side ${side}`);
      }
    }
  } finally { chunk.dispose(); }
});
