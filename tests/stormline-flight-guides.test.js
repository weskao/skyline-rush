import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';
import { stormlineRoadLength } from '../src/courses/stormline-course-graph.ts';
import { STORMLINE_MEGACITY } from '../src/courses/stormline-megacity.ts';

const sample = (_id, s) => ({ point: [0, 32, -s], right: [1, 0, 0], up: [0, 1, 0] });
const edge = STORMLINE_MEGACITY.edges.find(e => e.id === 'roof-flight');

function positions(chunk) {
  const guides = chunk.group.getObjectByName('stormline:flight-guides:roof-flight');
  if (!guides) return [];
  assert.ok(guides instanceof THREE.InstancedMesh);
  const matrix = new THREE.Matrix4(), center = new THREE.Vector3();
  const result = [];
  for (let i = 0; i < guides.count; i++) {
    guides.getMatrixAt(i, matrix); center.setFromMatrixPosition(matrix);
    assert.ok(Math.abs(center.x) >= edge.width / 2 + 4, 'route beacons must stay outside the flying corridor');
    result.push(center.toArray().map(x => x.toFixed(3)).join(','));
  }
  return result.sort();
}

test('rooftop flight is visible at Low without inventing a solid road or engine', () => {
  const chunk = createStormlineChunk('roof-flight', 0, 350, sample, 'low');
  try {
    assert.equal(chunk.group.getObjectByName('stormline:road:roof-flight'), undefined);
    assert.ok(positions(chunk).length >= 4, 'must have cyan/magenta guide pairs even at Low');
  } finally { chunk.dispose(); }
});

test('air corridor beacons and final landing cues stay fixed across streaming splits', () => {
  const end = stormlineRoadLength('roof-flight');
  const whole = createStormlineChunk('roof-flight', 0, end, sample, 'medium');
  const first = createStormlineChunk('roof-flight', 0, 145, sample, 'medium');
  const last = createStormlineChunk('roof-flight', 145, end, sample, 'medium');
  try {
    const unsplit = positions(whole);
    const split = [...positions(first), ...positions(last)].sort();
    assert.deepEqual(split, unsplit);
    assert.ok(unsplit.some(s => Math.abs(Number(s.split(',')[2]) + end - 35) < 1),
      'place a visible guide near the shared legal landing junction');
  } finally { whole.dispose(); first.dispose(); last.dispose(); }
});

test('eviction disposes flight marker geometry once', () => {
  const chunk = createStormlineChunk('roof-flight', 0, 180, sample, 'high');
  const guide = chunk.group.getObjectByName('stormline:flight-guides:roof-flight');
  assert.ok(guide instanceof THREE.InstancedMesh);
  let releases = 0;
  guide.geometry.addEventListener('dispose', () => releases++);
  chunk.dispose(); chunk.dispose();
  assert.equal(releases, 1);
});
