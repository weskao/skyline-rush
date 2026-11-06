import test from 'node:test';
import assert from 'node:assert/strict';
import { STORMLINE_MEGACITY, groundRoute, edgeLength } from '../src/courses/stormline-megacity.ts';

const edgeById = new Map(STORMLINE_MEGACITY.edges.map(edge => [edge.id, edge]));
function heading(a, b) {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  assert.ok(length > 0, 'Road heading must not be degenerate');
  return [dx / length, dz / length];
}

test('both Stormline landing paths merge into the interchange without a sideways steering snap', () => {
  const outgoing = edgeById.get('final-interchange');
  for (const id of ['roof-flight', 'ground-detour']) {
    const incoming = edgeById.get(id);
    assert.equal(incoming.to, outgoing.from);
    const end = incoming.points.at(-1);
    const approach = heading(incoming.points.at(-2), end);
    const departure = heading(outgoing.points[0], outgoing.points[1]);
    const alignment = approach[0] * departure[0] + approach[1] * departure[1];
    assert.ok(alignment >= 0.95, `${id} entry/exit alignment ${alignment.toFixed(3)} is too sharp`);
  }
});

test('landing climb is gentle and safe ground route retains approximately 14.24 km', () => {
  const exit = edgeById.get('final-interchange');
  const [landing, rise] = exit.points;
  const planar = Math.hypot(rise[0] - landing[0], rise[2] - landing[2]);
  assert.ok(Math.abs(rise[1] - landing[1]) / planar < 0.08, 'Landing ramp is too steep');
  const length = groundRoute(STORMLINE_MEGACITY).reduce((sum, edge) => sum + edgeLength(edge), 0);
  assert.ok(length >= 13_500 && length <= 14_800, `Unexpected route length ${length}m`);
  assert.equal(STORMLINE_MEGACITY.checkpoints.at(-2).node, 'j');
  assert.equal(STORMLINE_MEGACITY.forks.length, 3);
});
