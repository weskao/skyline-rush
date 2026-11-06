import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';

const sample = (_edge, s) => ({ point: [0, 24, -s], right: [1, 0, 0], up: [0, 1, 0] });
function dashIntervals(chunk, edge) {
  const object = chunk.group.getObjectByName(`stormline:lane-guides:${edge}`);
  if (!object) return [];
  assert.ok(object instanceof THREE.Mesh);
  const attribute = object.geometry.getAttribute('position');
  assert.equal(attribute.count % 4, 0);
  const ranges = [];
  for (let i = 0; i < attribute.count; i += 4) {
    ranges.push([-attribute.getZ(i), -attribute.getZ(i + 2)]);
    assert.ok(attribute.getY(i) > 24, 'Guides should sit slightly above wet asphalt');
  }
  return ranges;
}

test('wet highway has subdued, visible road guides even on low quality', () => {
  const low = createStormlineChunk('night-start', 0, 120, sample, 'low');
  const high = createStormlineChunk('night-start', 0, 120, sample, 'high');
  const flight = createStormlineChunk('roof-flight', 0, 120, sample, 'high');
  try {
    assert.ok(dashIntervals(low, 'night-start').length >= 4);
    assert.ok(dashIntervals(high, 'night-start').length >= 4);
    assert.deepEqual(dashIntervals(flight, 'roof-flight'), [], 'Flight gap must not gain a painted road');
  } finally { low.dispose(); high.dispose(); flight.dispose(); }
});

test('visible guide dashes do not disappear when streaming splits inside a dash', () => {
  const whole = createStormlineChunk('night-start', 0, 120, sample, 'medium');
  const first = createStormlineChunk('night-start', 0, 37, sample, 'medium');
  const second = createStormlineChunk('night-start', 37, 120, sample, 'medium');
  try {
    const a = dashIntervals(whole, 'night-start');
    const b = [...dashIntervals(first, 'night-start'), ...dashIntervals(second, 'night-start')];
    const covered = (ranges, position) => ranges.some(([from, to]) => position >= from && position <= to);
    for (let position = 0; position < 120; position += 0.5) {
      assert.equal(covered(b, position), covered(a, position), `Guide coverage changed at ${position} m`);
    }
  } finally { whole.dispose(); first.dispose(); second.dispose(); }
});
