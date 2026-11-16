// Crimson GT (second player car): its GLB keeps the Roadster's contract wheel pivots, wing pivot and lift ports, so
// the rig (src/garage-model-rig.ts) binds it on both LODs. Two owner-approved departures follow the concept's
// proportions: the smaller tyre hangs on a static `<wheel>_axle` node, and the four rear nozzles sit off the contract
// rear ports by one rigid offset (src/garage-model.ts moves the rear-port VFX by the same offset).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { LIFT_PORTS } from '../src/lift-ports.js';
import { Box3, Vector3 } from 'three';
import { glbJson, parseGlb } from '../scripts/assets/check-glb.mjs';
import { decodePngRgba } from './helpers/png-rgba.js';
import { fitToRoadsterSize } from '../src/car-display-size.ts';

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
  test(`crimson-gt ${lod} GLB: flake layer under the clearcoat, opaque black glass over a cabin, hood vent pair`, () => {
    const json = gltf(lod === 'low' ? entry.lods[0].url : entry.url);
    const material = name => json.materials.find(m => m.name === name);
    const image = slot => json.images[json.textures[slot.index].extensions?.KHR_texture_basisu?.source ?? json.textures[slot.index].source].name;
    const paint = material('gt_paint');
    assert.equal(image(paint.normalTexture), 'crimson_gt_flake', 'the base normal is the tiling flake map');
    assert.ok(paint.normalTexture.extensions?.KHR_texture_transform?.scale?.[0] > 8, 'the flake map tiles across the atlas');
    assert.equal(image(paint.extensions.KHR_materials_clearcoat.clearcoatNormalTexture), 'crimson_gt_normal', 'the baked edges shape the smooth coat');
    // Owner, 2026-11-16: black glass, the cabin no longer shows through.
    const glass = material('gt_glass');
    assert.equal(glass.alphaMode ?? 'OPAQUE', 'OPAQUE', 'the glass is opaque');
    assert.ok(glass.pbrMetallicRoughness.baseColorFactor.slice(0, 3).every(c => c < 0.02), 'the glass is black');
    for (const name of ['cabin', 'cabin_seats', 'hood_vent_l', 'hood_vent_r', 'hood_vent_slats_l', 'hood_vent_slats_r']) {
      assert.notEqual(json.nodes.find(n => n.name === name)?.mesh, undefined, `${name} mesh`);
    }
  });
}

// Owner, 2026-11-16: the fenders over all four wheels read as crash dents. Each arch was cut by clipping the lofted
// sections, which dropped the character line over the wheel and stepped the fender in. The arches are now boolean-cut
// through a flared haunch (assets-src/crimson-gt/build/gt_body.py flare, gt_parts.py cut_arches): just above every
// arch top the fender stands at the body's full width.
for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: every fender is flared to full width over its arch, no step in over the wheel`, async () => {
    const { scene } = await parseGlb(readFileSync(new URL(`../public/${lod === 'low' ? entry.lods[0].url : entry.url}`, import.meta.url)));
    scene.updateMatrixWorld(true);
    const body = scene.getObjectByName('body');
    const pos = body.geometry.attributes.position, v = body.position.clone();
    const points = Array.from({ length: pos.count }, (_, i) => v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld).toArray());
    const widest = Math.max(...points.map(([x]) => Math.abs(x)));
    const archTop = HUB_Y + 0.337 + 0.022; // tyre radius + arch clearance (gt_body.py ARCH_R)
    for (const [name, [wx, , wz]] of Object.entries(WHEELS)) {
      const lip = points.filter(([x, y, z]) => Math.sign(x) === Math.sign(wx) && Math.abs(z - wz) < 0.06 && y > archTop + 0.005 && y < archTop + 0.04);
      assert.ok(lip.length > 0, `${name}: fender vertices over the arch`);
      const fender = Math.max(...lip.map(([x]) => Math.abs(x)));
      assert.ok(fender > widest - 0.03, `${name}: fender ${fender.toFixed(3)} m vs body ${widest.toFixed(3)} m`);
    }
  });
}

// Owner, 2026-11-17: each flank showed two vertical cracks. The bake cut straight 8 mm door-groove boxes into the
// scalloped side; they only grazed the curved skin, so the coat normal map carried broken 30-90 degree slashes
// (assets-src/crimson-gt/bake.py GROOVES). Node cannot transcode the shipped KTX2, so every flank texel the shipped
// body's UVs cover is read from the baked source atlas that was encoded into it.
const NORMAL_ATLAS = new URL('../assets-src/crimson-gt/textures/crimson_gt_normal.png', import.meta.url);
const loadGlb = async lod => {
  const { scene } = await parseGlb(readFileSync(new URL(`../public/${lod === 'low' ? entry.lods[0].url : entry.url}`, import.meta.url)));
  scene.updateMatrixWorld(true);
  return scene;
};
/** Calls visit(tilt degrees, world point, face centre) for every atlas texel under a face of `mesh` that passes keep. */
function atlasTexels({ width, height, pixels }, mesh, keep, visit) {
  const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv, index = mesh.geometry.index;
  const corner = (i) => new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
  for (let t = 0; t < index.count; t += 3) {
    const ids = [0, 1, 2].map(k => index.getX(t + k));
    const [a, b, c] = ids.map(corner);
    const centre = a.clone().add(b).add(c).divideScalar(3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (!keep(centre, normal)) continue;
    const [p, q, r] = ids.map(i => [uv.getX(i) * width, uv.getY(i) * height]);
    const d = (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1]);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = Math.floor(Math.min(p[1], q[1], r[1])); y <= Math.max(p[1], q[1], r[1]); y++) {
      for (let x = Math.floor(Math.min(p[0], q[0], r[0])); x <= Math.max(p[0], q[0], r[0]); x++) {
        const l1 = ((q[1] - r[1]) * (x + 0.5 - r[0]) + (r[0] - q[0]) * (y + 0.5 - r[1])) / d;
        const l2 = ((r[1] - p[1]) * (x + 0.5 - r[0]) + (p[0] - r[0]) * (y + 0.5 - r[1])) / d;
        if (l1 < 0 || l2 < 0 || l1 + l2 > 1 || x >= width || y >= height) continue;
        const at = 4 * (y * width + x), n = [0, 1, 2].map(k => pixels[at + k] / 255 * 2 - 1);
        const tilt = Math.acos(Math.min(1, n[2] / Math.hypot(...n))) * 180 / Math.PI;
        const at3 = v => l1 * a[v] + l2 * b[v] + (1 - l1 - l2) * c[v];
        visit(tilt, { x: at3('x'), y: at3('y'), z: at3('z') }, centre);
      }
    }
  }
}
for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: the body flanks carry no crack in the baked coat normal, left or right`, async () => {
    const atlas = decodePngRgba(readFileSync(NORMAL_ATLAS), { allowRgb: true });
    const body = (await loadGlb(lod)).getObjectByName('body');
    // A crack is a line: a texel tilted over 25 degrees is bake noise at the scallop fold, such texels on 3+ rows (2 cm
    // apart) of one 2 cm z band on one side are a cut. The old door grooves reached 6 rows; the clean bake reaches 1.
    const covered = { '-1': 0, '1': 0 }, bands = new Map();
    // Flank between the arches, sill to shoulder; the bevelled arch lips and sill edge are not panel surface.
    const flank = (centre, normal) => Math.abs(centre.x) >= 0.85 && centre.y >= 0.25 && centre.y <= 0.74 && centre.z >= -0.9 && centre.z <= 0.95 && Math.abs(normal.x) >= 0.5;
    atlasTexels(atlas, body, flank, (tilt, point, centre) => {
      covered[Math.sign(centre.x)]++;
      if (tilt <= 25) return;
      const band = `${centre.x > 0 ? 'right' : 'left'} z ${(Math.round(point.z * 50) / 50).toFixed(2)}`;
      bands.set(band, (bands.get(band) ?? new Set()).add(Math.round(point.y * 50)));
    });
    assert.ok(covered['-1'] > 3000 && covered['1'] > 3000, `both flanks sampled: ${JSON.stringify(covered)}`);
    const cracks = [...bands].filter(([, rows]) => rows.size >= 3).map(([band, rows]) => `${band}: ${rows.size} rows`);
    assert.deepEqual(cracks, [], 'flank z bands with texels tilted over 25 degrees on 3+ rows (a baked crack)');
  });
}

// Owner, 2026-11-17: the highlight along the flank scallop stepped and wavered. The scallop was one section point, so
// it lofted into a one-edge fold that went from 14 to 68 degrees along the door: it crossed the bake bevel's angle
// limit (30, assets-src/roadster2/bake.py) and the 50 degree sharp split mid-door, switching how the crease shades.
// The cove is now sampled (gt_body.py COVE_LO/COVE_UP), so no visible flank fold reaches the limit. Its deepest part,
// under the side intake, still meets it; the intake laid there is no longer bevel-baked (crimson-gt/bake.py BEVELLED),
// or it bakes the same on-off steps as blocks and teeth into the trim.
const BEVEL_LIMIT = 30;
// The side intake's footprint (assets-src/crimson-gt/build/gt_parts.py side_intake_), 1 cm margin.
const underIntake = c => c.z > 0.14 && c.z < 1.04 && c.y > 0.49 - 0.22 * (c.z - 0.15) / 0.88 && c.y < 0.52 + 0.12 * (c.z - 0.15) / 0.88;
/** Largest dihedral (degrees) between faces of `mesh` that both pass `keep`, positions welded so split normals join. */
function maxFold(mesh, keep) {
  const pos = mesh.geometry.attributes.position, index = mesh.geometry.index, ids = new Map(), edges = new Map();
  const at = i => new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
  const weld = v => { const key = v.toArray().map(c => Math.round(c * 1e4)).join(); if (!ids.has(key)) ids.set(key, ids.size); return ids.get(key); };
  let worst = { angle: 0, at: null };
  for (let t = 0; t < index.count; t += 3) {
    const v = [0, 1, 2].map(k => at(index.getX(t + k)));
    const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if (normal.lengthSq() < 1e-14) continue;
    normal.normalize();
    const centre = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    if (!keep(centre, normal)) continue;
    const w = v.map(weld);
    for (let k = 0; k < 3; k++) {
      const key = [w[k], w[(k + 1) % 3]].sort((a, b) => a - b).join();
      const other = edges.get(key);
      if (!other) { edges.set(key, normal); continue; }
      const angle = Math.acos(Math.max(-1, Math.min(1, other.dot(normal)))) * 180 / Math.PI;
      if (angle > worst.angle) worst = { angle, at: centre.toArray().map(c => c.toFixed(2)).join(', ') };
    }
  }
  return worst;
}
for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB: no visible flank fold reaches the bake bevel limit, and the side intakes bake no bevel steps`, async () => {
    const scene = await loadGlb(lod);
    // Flank between the arches, rocker top to shoulder, outside the intake; the sill edge (y .19) and arch lips are
    // deliberate creases.
    const flank = (c, n) => Math.abs(c.x) > 0.85 && c.y > 0.25 && c.y < 0.74 && c.z > -0.9 && c.z < 0.95 && Math.abs(n.x) > 0.5 && !underIntake(c);
    const fold = maxFold(scene.getObjectByName('body'), flank);
    assert.ok(fold.angle > 0, 'flank faces found');
    assert.ok(fold.angle < BEVEL_LIMIT, `body flank fold ${fold.angle.toFixed(1)} deg at ${fold.at}`);
    const atlas = decodePngRgba(readFileSync(NORMAL_ATLAS), { allowRgb: true });
    for (const name of ['side_intake_l', 'side_intake_r']) {
      const intake = scene.getObjectByName(name);
      assert.ok(intake, `${name} mesh`);
      // The panel's face (its rim walls excluded): no baked bevel may tilt it.
      let texels = 0, tilted = 0;
      atlasTexels(atlas, intake, (c, n) => Math.abs(n.x) > 0.5, tilt => {
        texels++;
        if (tilt > 10) tilted++;
      });
      assert.ok(texels > 50, `${name} face sampled: ${texels} texels`);
      assert.ok(tilted / texels < 0.02, `${name}: ${tilted} of ${texels} face texels tilted over 10 degrees`);
    }
  });
}

// Owner, 2026-11-13: the GT read much smaller than the Roadster on every screen. The GLB stays as authored; the
// garage adapter measures every player GLB and scales its instance to the Roadster (src/car-display-size.ts).
const shown = async url => {
  const { scene } = await parseGlb(readFileSync(new URL(`../public/${url}`, import.meta.url)));
  fitToRoadsterSize(scene);
  scene.updateMatrixWorld(true);
  return new Box3().setFromObject(scene);
};

for (const lod of ['high', 'low']) {
  test(`crimson-gt ${lod} GLB is shown at the Roadster's size: width, roof and length within 3% of roadster2, tyres on the ground`, async () => {
    const roadster = await shown(lod === 'low' ? MODEL_MANIFEST.roadster2.lods[0].url : MODEL_MANIFEST.roadster2.url);
    const gt = await shown(lod === 'low' ? entry.lods[0].url : entry.url);
    const extent = box => ({ width: box.max.x - box.min.x, roof: box.max.y, length: box.max.z - box.min.z });
    const want = extent(roadster), got = extent(gt);
    for (const key of ['width', 'roof', 'length']) {
      assert.ok(Math.abs(got[key] / want[key] - 1) < 0.03, `${key}: GT ${got[key].toFixed(3)} vs Roadster ${want[key].toFixed(3)}`);
    }
    assert.ok(gt.min.y >= 0 && gt.min.y < 0.05, `tyres on the ground: lowest point ${gt.min.y.toFixed(3)}`);
  });
}
