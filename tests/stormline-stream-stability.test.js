import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';

// The shared road sampler owns world coordinates; this deterministic fixture tests streaming only.
const sample = (_edge, s) => ({ point: [0, 24, -s], right: [1, 0, 0], up: [0, 1, 0] });

function towerPositions(chunk, edgeId) {
  const towers = chunk.group.getObjectByName(`stormline:buildings:${edgeId}`);
  if (!towers) return [];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const positions = [];
  for (let i = 0; i < towers.count; i++) {
    towers.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    positions.push(position.toArray().map(value => value.toFixed(3)).join(','));
  }
  return positions.sort();
}

function supportPositions(chunk) {
  return chunk.group.children
    .filter(item => item instanceof THREE.Mesh && item.geometry instanceof THREE.CylinderGeometry)
    .map(item => item.position.z.toFixed(3))
    .sort();
}

test('skyscrapers stay at identical locations when streaming chunks split at arbitrary distances', () => {
  for (const quality of ['low', 'medium', 'high']) {
    const whole = createStormlineChunk('night-start', 0, 700, sample, quality);
    const left = createStormlineChunk('night-start', 0, 230, sample, quality);
    const right = createStormlineChunk('night-start', 230, 700, sample, quality);
    try {
      assert.deepEqual(
        [...towerPositions(left, 'night-start'), ...towerPositions(right, 'night-start')].sort(),
        towerPositions(whole, 'night-start'),
        `${quality} must keep identical buildings when streaming rebalances`,
      );
    } finally {
      whole.dispose(); left.dispose(); right.dispose();
    }
  }
});

test('elevated supports remain fixed in world space across chunk splits', () => {
  const whole = createStormlineChunk('skyway-cut', 100, 900, sample, 'medium');
  const left = createStormlineChunk('skyway-cut', 100, 417, sample, 'medium');
  const right = createStormlineChunk('skyway-cut', 417, 900, sample, 'medium');
  try {
    assert.deepEqual([...supportPositions(left), ...supportPositions(right)].sort(), supportPositions(whole));
  } finally {
    whole.dispose(); left.dispose(); right.dispose();
  }
});
