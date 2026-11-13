// Crimson GT (second player car): its GLB keeps the Roadster's contract wheel pivots, wing pivot and lift ports, so
// the rig (src/garage-model-rig.ts) binds it on both LODs. Two owner-approved departures follow the concept's
// proportions: the smaller tyre hangs on a static `<wheel>_axle` node, and the four rear nozzles sit off the contract
// rear ports by one rigid offset (src/garage-model.ts moves the rear-port VFX by the same offset).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { LIFT_PORTS } from '../src/effects.js';
import { Box3 } from 'three';
import { glbJson, parse } from '../scripts/assets/check-glb.mjs';
import { CARS } from '../src/car-catalog.ts';

const entry = MODEL_MANIFEST['crimson-gt'];
const WHEELS = { wheel_fl: [-1.05, 0.46, -1.35], wheel_fr: [1.05, 0.46, -1.35], wheel_rl: [-1.05, 0.46, 1.42], wheel_rr: [1.05, 0.46, 1.42] };
const HUB_Y = 0.357; // ground .02 + the concept's tyre radius .337 (assets-src/crimson-gt/build/gt_body.py)
const NOZZLE_OFFSET = [0, -0.33, -0.415]; // nozzle minus contract rear port (assets-src/crimson-gt/build/gt_parts.py)
const HINGE = [0, 0.86, 1.63]; // the stowed blade's leading edge, just above the tail deck (assets-src/crimson-gt/build/gt_parts.py WING_STOW)

const gltf = url => glbJson(readFileSync(new URL(`../public/${url}`, import.meta.url)));
/** World translation of every named node (pivots are unrotated, unscaled empties up to the root). */
function pivots(url) {
  const json = gltf(url);
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
  test(`crimson-gt ${lod} GLB: wheel pivots, wing and lift ports on contract; lowered hubs; nozzles one rigid offset from the rear ports`, () => {
    const at = pivots(lod === 'low' ? entry.lods[0].url : entry.url);
    for (const [name, position] of Object.entries(WHEELS)) {
      near(at.get(name), position, name);
      const hub = [position[0], HUB_Y, position[2]];
      near(at.get(`${name}_axle`), hub, `${name}_axle`);
      near(at.get(`${name}_spin`), hub, `${name}_spin`);
    }
    near(at.get('wing'), [0, 1.08, 2.25], 'wing');
    REAR_PORTS.forEach((port, i) => near(at.get(`nozzle_rear_0${i + 1}`), port.position.map((v, axis) => v + NOZZLE_OFFSET[axis]), `nozzle_rear_0${i + 1}`));
    const lift = LIFT_PORTS.map(([x, z]) => [x, z].join());
    for (let i = 1; i <= 4; i++) {
      const [x, y, z] = at.get(`thruster_0${i}`);
      assert.ok(Math.abs(y - 0.3) < 1e-4, `thruster_0${i} height`);
      assert.ok(lift.includes([Math.round(x * 100) / 100, Math.round(z * 100) / 100].join()), `thruster_0${i} on a lift port: ${x}, ${z}`);
    }
  });
}

for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: the wing rests stowed over the tail deck, hinged on its leading edge, and no mesh hangs on the folding tips`, () => {
    const url = lod === 'low' ? entry.lods[0].url : entry.url;
    const at = pivots(url);
    near(at.get('wing_stow'), [HINGE[0], HINGE[1], HINGE[2] + 0.2], 'wing_stow'); // static: the rig drives `wing` above it and `wing_blade` below
    near(at.get('wing_blade'), HINGE, 'wing_blade');
    // The rig folds `wing_tip_*` 60 degrees with the Roadster's tips; the GT's endplates are fixed, so they ride the blade.
    for (const node of gltf(url).nodes.filter(n => /^wing_tip_[lr]$/.test(n.name))) {
      assert.equal(node.mesh, undefined, `${node.name} carries no mesh`);
      assert.equal(node.children?.length ?? 0, 0, `${node.name} has no children`);
    }
  });
}

for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: flake layer under the clearcoat, see-through glass over a cabin, hood vent pair`, () => {
    const json = gltf(lod === 'low' ? entry.lods[0].url : entry.url);
    const material = name => json.materials.find(m => m.name === name);
    const image = slot => json.images[json.textures[slot.index].extensions?.KHR_texture_basisu?.source ?? json.textures[slot.index].source].name;
    const paint = material('gt_paint');
    assert.equal(image(paint.normalTexture), 'crimson_gt_flake', 'the base normal is the tiling flake map');
    assert.ok(paint.normalTexture.extensions?.KHR_texture_transform?.scale?.[0] > 8, 'the flake map tiles across the atlas');
    assert.equal(image(paint.extensions.KHR_materials_clearcoat.clearcoatNormalTexture), 'crimson_gt_normal', 'the baked edges shape the smooth coat');
    assert.equal(material('gt_glass').alphaMode, 'BLEND');
    assert.ok(material('gt_glass').pbrMetallicRoughness.baseColorFactor[3] < 0.7, 'the cabin shows through the glass');
    for (const name of ['cabin', 'cabin_seats', 'hood_vent_l', 'hood_vent_r', 'hood_vent_slats_l', 'hood_vent_slats_r']) {
      assert.notEqual(json.nodes.find(n => n.name === name)?.mesh, undefined, `${name} mesh`);
    }
  });
}

// Owner, 2026-11-13: the GT read much smaller than the Roadster on every screen. The GLB stays as authored; the
// garage adapter scales its instance by CARS['crimson-gt'].scale (src/garage-model.ts) so both cars show one size.
const shown = async (url, scale = [1, 1, 1]) => {
  const { scene } = await parse(readFileSync(new URL(`../public/${url}`, import.meta.url)));
  scene.scale.set(...scale);
  scene.updateMatrixWorld(true);
  return new Box3().setFromObject(scene);
};

for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB is shown at the Roadster's size: width, roof and length within 3% of roadster2, tyres on the ground`, async () => {
    const roadster = await shown(lod === 'low' ? MODEL_MANIFEST.roadster2.lods[0].url : MODEL_MANIFEST.roadster2.url);
    const gt = await shown(lod === 'low' ? entry.lods[0].url : entry.url, CARS['crimson-gt'].scale);
    const extent = box => ({ width: box.max.x - box.min.x, roof: box.max.y, length: box.max.z - box.min.z });
    const want = extent(roadster), got = extent(gt);
    for (const key of ['width', 'roof', 'length']) {
      assert.ok(Math.abs(got[key] / want[key] - 1) < 0.03, `${key}: GT ${got[key].toFixed(3)} vs Roadster ${want[key].toFixed(3)}`);
    }
    assert.ok(gt.min.y >= 0 && gt.min.y < 0.05, `tyres on the ground: lowest point ${gt.min.y.toFixed(3)}`);
  });
}
