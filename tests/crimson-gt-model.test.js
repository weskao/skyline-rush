// Crimson GT (second player car): its GLB must sit on the Roadster's contract pivots and ports, so the rig
// (src/garage-model-rig.ts), the wheels, the wing and every VFX port work unchanged on both LODs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { LIFT_PORTS } from '../src/effects.js';
import { glbJson } from '../scripts/assets/check-glb.mjs';

const entry = MODEL_MANIFEST['crimson-gt'];
const WHEELS = { wheel_fl: [-1.05, 0.46, -1.35], wheel_fr: [1.05, 0.46, -1.35], wheel_rl: [-1.05, 0.46, 1.42], wheel_rr: [1.05, 0.46, 1.42] };

/** World translation of every named node (pivots are unrotated, unscaled empties up to the root). */
function pivots(url) {
  const json = glbJson(readFileSync(new URL(`../public/${url}`, import.meta.url)));
  const parent = new Map();
  json.nodes.forEach((node, i) => { for (const child of node.children ?? []) parent.set(child, i); });
  const world = i => {
    const [x, y, z] = json.nodes[i].translation ?? [0, 0, 0];
    if (!parent.has(i)) return [x, y, z];
    const [px, py, pz] = world(parent.get(i));
    return [x + px, y + py, z + pz];
  };
  return new Map(json.nodes.map((node, i) => [node.name, world(i)]));
}

const near = (actual, expected, label) => {
  assert.ok(actual, `${label}: node exists`);
  actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]) < 1e-4, `${label} axis ${axis}: ${value} vs ${expected[axis]}`));
};

test('crimson-gt manifest entry: same rig nodes as roadster2, own materials, low LOD, procedural fallback', () => {
  assert.ok(entry, 'crimson-gt entry exists');
  assert.deepEqual(entry.nodes, MODEL_MANIFEST.roadster2.nodes, 'one rig binds both cars');
  assert.ok(entry.materials.includes('gt_paint') && entry.materials.includes('gt_light'), 'rig-driven paint and rear LED materials');
  assert.deepEqual(entry.lods, [{ quality: 'low', url: 'models/crimson-gt/crimson-gt-low.glb' }]);
  assert.equal(entry.fallback, 'procedural-car');
});

for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: wheels, wing and VFX ports sit on the contract positions`, () => {
    const at = pivots(lod === 'low' ? entry.lods[0].url : entry.url);
    for (const [name, position] of Object.entries(WHEELS)) {
      near(at.get(name), position, name);
      near(at.get(`${name}_spin`), position, `${name}_spin`);
    }
    near(at.get('wing'), [0, 1.08, 2.25], 'wing');
    REAR_PORTS.forEach((port, i) => near(at.get(`nozzle_rear_0${i + 1}`), port.position, `nozzle_rear_0${i + 1}`));
    const lift = LIFT_PORTS.map(([x, z]) => [x, z].join());
    for (let i = 1; i <= 4; i++) {
      const [x, y, z] = at.get(`thruster_0${i}`);
      assert.ok(Math.abs(y - 0.3) < 1e-4, `thruster_0${i} height`);
      assert.ok(lift.includes([Math.round(x * 100) / 100, Math.round(z * 100) / 100].join()), `thruster_0${i} on a lift port: ${x}, ${z}`);
    }
  });
}
