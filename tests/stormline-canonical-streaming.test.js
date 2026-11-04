import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STORMLINE_MEGACITY, edgeLength } from '../src/courses/stormline-megacity.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';

const sample = (_edgeId, s) => ({ point: [0, 0, -s], right: [1, 0, 0], up: [0, 1, 0] });

test('Stormline road streams the canonical arc-length tail after the authored polyline endpoint', () => {
  const edge = STORMLINE_MEGACITY.edges.find(item => item.id === 'hairpin-west');
  // The shared sampler is the source of truth for distance, not the map's rough polyline estimate.
  const canonical = routeLength({ edges: [{ ...edge, mode: 'ground' }] }, edge.id);
  const blockout = edgeLength(edge);
  assert.ok(canonical > blockout + 5, 'hairpin must expose the polyline/curve discrepancy');

  const tail = createStormlineChunk(edge.id, blockout + 2, canonical, sample, 'low');
  try {
    const road = tail.group.getObjectByName('stormline:road:hairpin-west');
    assert.ok(road instanceof THREE.Mesh, 'last metres of the canonical hairpin must be rendered');
    const positions = road.geometry.getAttribute('position');
    const lastZ = positions.getZ(positions.count - 1);
    assert.ok(Math.abs(lastZ + canonical) < 0.05, `road ends at ${-lastZ} m instead of ${canonical} m`);
  } finally {
    tail.dispose();
  }
});
