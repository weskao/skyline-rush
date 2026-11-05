import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';
import { sampleStormlineRoad, stormlineRoadLength } from '../src/courses/stormline-course-graph.ts';

test('low-quality hairpin meshes stay within 12 cm of the canonical wheel-contact centreline', () => {
  for (const edgeId of ['hairpin-west', 'hairpin-east']) {
    const length = stormlineRoadLength(edgeId);
    const chunk = createStormlineChunk(edgeId, 0, length, sampleStormlineRoad, 'low');
    try {
      const road = chunk.group.getObjectByName(`stormline:road:${edgeId}`);
      assert.ok(road instanceof THREE.Mesh);
      const position = road.geometry.getAttribute('position');
      const sections = position.count / 2 - 1;
      let worstGap = 0;
      for (let i = 0; i < sections; i++) {
        const center = row => [0, 1, 2].map(axis => {
          const a = position.getComponent(row * 2, axis);
          const b = position.getComponent(row * 2 + 1, axis);
          return (a + b) / 2;
        });
        const a = center(i), b = center(i + 1);
        const midpoint = sampleStormlineRoad(edgeId, (i + 0.5) * length / sections).point;
        const gap = Math.hypot(...midpoint.map((value, axis) => value - (a[axis] + b[axis]) / 2));
        worstGap = Math.max(worstGap, gap);
      }
      assert.ok(worstGap < 0.12, `${edgeId} low-tier road chord gap ${worstGap.toFixed(3)} m`);
    } finally { chunk.dispose(); }
  }
});
