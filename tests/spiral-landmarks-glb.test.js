// Sky Spiral landmark kit (Task 8c step 5, asset half): the shipped GLB against its node contract
// (assets-src/spiral-landmarks/contract.json, written by build.py). The runtime that places the nodes is another
// change; this file only pins what that change may rely on: names, pivots, extents, caps, one material, one atlas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Box3, Triangle, Vector3 } from 'three';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { SPIRAL_CLOUD_SPREAD, SPIRAL_NODES, SPIRAL_NODE_RADIUS, SPIRAL_NODE_SPAN } from '../src/spiral-scenery-plan.ts';
import { checkGlb, glbJson, parseGlb, summarize } from '../scripts/assets/check-glb.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const contract = JSON.parse(read('assets-src/spiral-landmarks/contract.json'));
const entry = MODEL_MANIFEST['spiral-landmarks'];
// The node contract of the kit: triangle cap per node, in the order the runtime lists them.
const CAPS = { tower: 6000, tower_far: 1200, strut: 300, platform_a: 1500, platform_b: 1500, station: 800, chevron_sign: 120,
  gap_marker: 200, cloud_a: 400, cloud_b: 400, cloud_c: 400, peak: 800, bird_body: 70, bird_wing_l: 30, bird_wing_r: 30, airship: 900 };
const NAMES = Object.keys(CAPS);
const QUANTIZE = 0.1;   // meshopt stores positions on a 14-bit grid of each node's box: 3 cm on the 540 m tower

const loaded = (async () => {
  const buffer = read(contract.glb);
  const gltf = await parseGlb(buffer);
  gltf.scene.updateMatrixWorld(true);
  return { buffer, gltf, json: glbJson(buffer) };
})();

/** One node's geometry in its own pivot space (the node's dequantization transform applied): corners, normals, UVs. */
function piece(gltf, name) {
  const mesh = gltf.scene.getObjectByName(name), { position, normal, uv } = mesh.geometry.attributes, index = mesh.geometry.index;
  const at = i => new Vector3().fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
  const triangles = Array.from({ length: (index ?? position).count / 3 }, (_, t) => new Triangle(at(3 * t), at(3 * t + 1), at(3 * t + 2)));
  const points = Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  const normals = Array.from({ length: normal.count }, (_, i) => new Vector3().fromBufferAttribute(normal, i).length());
  const uvs = Array.from({ length: uv.count }, (_, i) => [uv.getX(i), uv.getY(i)]);
  return { mesh, triangles, points, normals, uvs, box: new Box3().setFromPoints(points) };
}
const near = (actual, expected, label, slack = QUANTIZE) => assert.ok(Math.abs(actual - expected) <= slack, `${label}: ${actual}, expected ${expected}`);
const across = (box, axis) => box.max[axis] - box.min[axis];

test('the manifest entry and the shipped GLB agree, inside the budgets', async () => {
  assert.ok(entry, 'spiral-landmarks manifest entry');
  assert.equal(`public/${entry.url}`, contract.glb);
  assert.ok(existsSync(new URL(`../${contract.glb}`, import.meta.url)), `${contract.glb} is missing`);
  const { buffer } = await loaded;
  assert.deepEqual(checkGlb(await summarize(buffer), entry), []);
  assert.equal(createHash('sha256').update(buffer).digest('hex'), entry.glb.sha256);
  assert.equal(buffer.length, entry.glb.bytes);
  assert.deepEqual(entry.nodes, NAMES);
  assert.deepEqual(entry.materials, [contract.material]);
});

test('sixteen named mesh nodes and nothing else: no light, camera, animation or skin', async () => {
  const { gltf, json } = await loaded;
  assert.deepEqual(json.nodes.map(node => node.name).sort(), [...NAMES].sort());
  for (const name of NAMES) assert.ok(gltf.scene.getObjectByName(name)?.isMesh, `${name} is one mesh`);
  assert.deepEqual([json.cameras, json.animations, json.skins, json.extensions?.KHR_lights_punctual], [undefined, undefined, undefined, undefined]);
  assert.equal(gltf.animations.length, 0);
});

test('every node is under its triangle cap and matches the contract the build measured', async () => {
  const { gltf } = await loaded;
  assert.deepEqual(Object.keys(contract.nodes), NAMES);
  for (const name of NAMES) {
    const { triangles, box } = piece(gltf, name), measured = contract.nodes[name];
    assert.ok(triangles.length <= CAPS[name], `${name}: ${triangles.length} triangles, cap ${CAPS[name]}`);
    assert.equal(triangles.length, measured.triangles, `${name}: contract.json is stale`);
    assert.equal(measured.triangle_cap, CAPS[name], name);
    for (const [k, axis] of ['x', 'y', 'z'].entries()) {
      near(box.min[axis], measured.min[k], `${name} min ${axis}`);
      near(box.max[axis], measured.max[k], `${name} max ${axis}`);
    }
  }
});

test('one material on one KTX2 atlas, colour maps sRGB and data maps linear, none over 2048 px', async () => {
  const { buffer, gltf, json } = await loaded;
  const summary = await summarize(buffer);
  assert.deepEqual(summary.colorSpaceErrors, []);
  assert.ok(summary.maxTexturePx <= 2048, `${summary.maxTexturePx} px`);
  assert.deepEqual(json.materials.map(material => material.name), ['spiral_landmarks']);
  assert.equal(new Set(NAMES.map(name => gltf.scene.getObjectByName(name).material.uuid)).size, 1, 'every node shares the material: one program');
  assert.ok(json.meshes.every(mesh => mesh.primitives.length === 1), 'one draw per node');
  const [material] = json.materials, pbr = material.pbrMetallicRoughness;
  for (const slot of [pbr.baseColorTexture, pbr.metallicRoughnessTexture, material.occlusionTexture, material.normalTexture, material.emissiveTexture]) assert.ok(slot, 'all five slots');
  assert.equal(pbr.metallicRoughnessTexture.index, material.occlusionTexture.index, 'occlusion, roughness and metal share one map');
  assert.equal(json.images.length, 4, 'base colour, normal, ORM, emissive');
  assert.ok(json.textures.every(texture => texture.extensions?.KHR_texture_basisu), 'KTX2 only');
  assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE', 'opaque: the clouds take no alpha');
  assert.ok(!material.doubleSided, 'back faces are culled');
});

test('the tower stands on the spiral axis, y -140 to +400, with a 40 m core where the struts meet it', async () => {
  const { gltf } = await loaded;
  const [low, high] = contract.tower.strut_span_y, core = contract.tower.core_radius;
  assert.deepEqual([low, high, core], [-10, 115, 40]);
  for (const name of ['tower', 'tower_far']) {
    const { points, box } = piece(gltf, name);
    near(box.min.y, -140, `${name} foot`);
    near(box.max.y, 400, `${name} top`);
    near(box.min.x + box.max.x, 0, `${name} axis x`);
    const reach = p => Math.hypot(p.x, p.z);
    const span = points.filter(p => p.y >= low - QUANTIZE && p.y <= high + QUANTIZE);
    // the shell is exactly 40 m; gantries, ribs and the light strip stand up to 3 m proud, their roots 0.6 m inside
    assert.ok(Math.min(...span.map(reach)) > core - 1 - QUANTIZE && Math.max(...span.map(reach)) < core + 3.1 + QUANTIZE,
      `${name}: radius ${Math.min(...span.map(reach))} .. ${Math.max(...span.map(reach))} in the strut span`);
    for (const y of [low, high]) {
      const ring = span.filter(p => Math.abs(p.y - y) <= QUANTIZE && Math.abs(reach(p) - core) <= QUANTIZE);
      assert.ok(ring.length >= 16, `${name}: ${ring.length} shell vertices at ${core} m, y = ${y}`);
    }
    // the light strip: the furthest geometry toward +Z over the strut span is on the +Z side, on the axis plane
    const front = span.reduce((best, p) => (p.z > best.z ? p : best));
    assert.ok(front.z > core + 0.9 && Math.abs(front.x) < 4, `${name}: strip at x ${front.x}, z ${front.z}`);
  }
  const both = ['tower', 'tower_far'].map(name => piece(gltf, name).box);
  for (const axis of ['x', 'y', 'z']) near(across(both[0], axis), across(both[1], axis), `tower_far keeps the outline on ${axis}`);
});

test('the strut runs 170 m along +X from its deck end, its top at y = -0.5', async () => {
  const { box } = piece((await loaded).gltf, 'strut');
  assert.deepEqual([contract.strut.length, contract.strut.top_y], [170, -0.5]);
  near(box.min.x, 0, 'deck end', 0.02);
  near(box.max.x, 170, 'tower end', 0.02);
  near(box.max.y, -0.5, 'top surface', 0.02);
  assert.ok(across(box, 'z') <= 5 && box.min.y > -30, 'a slender arm under the deck');
});

test('platforms, station, signs, clouds and the peak keep their pivots and sizes', async () => {
  const { gltf } = await loaded;
  const box = name => piece(gltf, name).box;
  for (const name of ['platform_a', 'platform_b']) {
    const b = box(name);
    assert.ok(Math.max(across(b, 'x'), across(b, 'z')) >= 38 && Math.max(across(b, 'x'), across(b, 'z')) <= 50, `${name} is about 40 m across`);
    assert.ok(b.max.y >= 25 && b.max.y <= 45, `${name} spire ${b.max.y} m`);
    assert.ok(b.min.y <= -30 && b.min.y >= -50, `${name} keel ${b.min.y} m`);
  }
  const station = box('station');
  for (const [axis, size] of [['x', 30], ['y', 10], ['z', 14]]) near(across(station, axis), size, `station ${axis}`, 1);
  const sign = box('chevron_sign'), marker = box('gap_marker');
  near(across(sign, 'x'), 4, 'chevron board width', 0.3);
  near(marker.max.y, 6, 'gap marker height', 0.1);
  for (const name of ['cloud_a', 'cloud_b', 'cloud_c']) {
    const b = box(name);
    const wide = Math.max(across(b, 'x'), across(b, 'z'));
    assert.ok(wide >= 300 && wide <= 500 + QUANTIZE, `${name} is ${wide} m across`);
    assert.ok(b.max.y >= 60 && b.max.y <= 90 + QUANTIZE, `${name} is ${b.max.y} m tall`);
  }
  const peak = box('peak');
  near(across(peak, 'x'), 500, 'peak base', 1);
  near(peak.max.y, 260, 'peak height', 1);
  for (const name of ['station', 'chevron_sign', 'gap_marker', 'cloud_a', 'cloud_b', 'cloud_c', 'peak']) {
    const b = box(name);
    near(b.min.y, 0, `${name} base`);
    near(b.min.x + b.max.x, 0, `${name} centred on x`, 0.5);
    near(b.min.z + b.max.z, 0, `${name} centred on z`, 0.5);
  }
});

// The runtime flaps a wing by turning its node about a front-to-back axis through its shoulder. A node's own
// dequantization transform is not that pivot (rule 29), so the shoulder is pinned in the vertex positions.
test('the seabird heads -Z on the kit origin, each wing on its own side of its shoulder', async () => {
  const { gltf } = await loaded, fine = 0.002;   // 14 bits over a 1.2 m box: under a tenth of a millimetre
  const body = piece(gltf, 'bird_body'), left = piece(gltf, 'bird_wing_l'), right = piece(gltf, 'bird_wing_r');
  assert.deepEqual(contract.bird.shoulders, { bird_wing_l: [-0.08, 0.02, 0], bird_wing_r: [0.08, 0.02, 0] });
  assert.deepEqual([contract.bird.wingspan, contract.bird.forward, contract.bird.flap_axis], [2.4, '-Z', 'Z']);
  for (const [wing, side] of [[left, -1], [right, 1]]) {
    const reach = wing.points.map(p => p.x * side), [, sy, sz] = contract.bird.shoulders[wing.mesh.name];
    near(Math.min(...reach), 0.08, `${wing.mesh.name} root`, fine);
    near(Math.max(...reach), 1.2, `${wing.mesh.name} tip`, fine);
    const root = wing.points.filter(p => Math.abs(p.x * side - 0.08) <= fine);
    assert.ok(root.length >= 3, `${wing.mesh.name}: ${root.length} root vertices on the shoulder plane`);
    assert.ok(root.every(p => Math.abs(p.y - sy) <= 0.03), `${wing.mesh.name}: the root chord is at the shoulder's height`);
    assert.ok(Math.min(...root.map(p => p.z)) < sz && Math.max(...root.map(p => p.z)) > sz, `${wing.mesh.name}: the shoulder is on the root chord`);
    assert.ok(wing.points.every(p => Math.abs(p.y - sy) <= 0.05), `${wing.mesh.name} is flat along X in the glide pose`);
    const tip = wing.points.reduce((best, p) => (p.x * side > best.x * side ? p : best));
    assert.ok(tip.z > 0.02, `${wing.mesh.name}: the hand sweeps back from the wrist, tip at z ${tip.z}`);
  }
  for (const axis of ['y', 'z']) for (const end of ['min', 'max']) near(left.box[end][axis], right.box[end][axis], `the wings mirror on ${axis}`, fine);
  near(right.box.max.x - left.box.min.x, 2.4, 'wingspan', 2 * fine);
  for (const axis of ['x', 'y', 'z']) near(body.box.min[axis] + body.box.max[axis], 0, `body centre ${axis}`, 0.04);
  assert.ok(across(body.box, 'z') > 0.9 && across(body.box, 'z') < 1.2 && body.box.max.x >= 0.08 && body.box.max.x < 0.14, 'a 1 m body that covers both shoulders');
  const beak = body.points.filter(p => p.z < body.box.min.z + 0.06), tail = body.points.filter(p => p.z > body.box.max.z - 0.06);
  assert.ok(beak.every(p => Math.abs(p.x) < 0.03), 'a beak at the -Z end');
  assert.ok(Math.max(...tail.map(p => p.x)) - Math.min(...tail.map(p => p.x)) > 0.12, 'a tail fan at the +Z end');
});

test('the airship is about 60 m long on its hull centre, nose toward -Z, fins at the tail', async () => {
  const { points, box } = piece((await loaded).gltf, 'airship');
  assert.deepEqual([contract.airship.length, contract.airship.forward], [60, '-Z']);
  near(box.min.z, -30, 'nose', 0.05);
  near(box.max.z, 30, 'tail', 0.05);
  near(box.min.x + box.max.x, 0, 'centred on x', 0.05);
  const reach = ends => Math.max(...points.filter(ends).map(p => Math.hypot(p.x, p.y)));
  assert.ok(reach(p => p.z > 20) > 7 && reach(p => p.z < -20) < 5.2, 'tail fins stand out of the hull, the nose is bare');
  const lowest = points.reduce((best, p) => (p.y < best.y ? p : best));
  assert.ok(lowest.z < -4 && lowest.y < -6.5 && Math.abs(lowest.x) < 2.5, `the gondola hangs under the forward hull: lowest point ${lowest.x}, ${lowest.y}, ${lowest.z}`);
  assert.ok(across(box, 'x') < 20 && across(box, 'y') < 20, 'a slender hull: fins and pods inside 20 m');
});

test('unit normals everywhere and no zero-area triangle', async () => {
  const { gltf } = await loaded;
  for (const name of NAMES) {
    const { triangles, normals, mesh } = piece(gltf, name);
    // normals are stored as normalized bytes: a unit vector reads back within a few percent
    const off = normals.filter(length => Math.abs(length - 1) > 0.03).length;
    assert.equal(off, 0, `${name}: ${off} normals are not unit length`);
    assert.ok(mesh.geometry.attributes.tangent === undefined || mesh.geometry.attributes.tangent.count === normals.length, name);
    const flat = triangles.filter(t => t.getArea() < 1e-6).length;
    assert.equal(flat, 0, `${name}: ${flat} zero-area triangles`);
  }
});

test('blue is the only lamp: its stored luminance is recorded, and the clouds and the peak carry none', async () => {
  const { gltf, json } = await loaded;
  const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  for (const [name, lamp] of Object.entries(contract.lamps)) {
    near(luma(lamp.linear), lamp.luminance, `${name} luminance`, 1e-3);
    assert.ok(lamp.linear[2] > lamp.linear[1] && lamp.linear[1] > lamp.linear[0] * 5, `${name} is blue, never magenta`);
  }
  near(contract.lamps.strip.luminance, 0.368, 'the tower strip', 2e-3);
  assert.deepEqual(json.materials[0].emissiveFactor, [1, 1, 1], 'the kit stores the lamps at strength 1: the runtime sets the strength');
  // glTF's v runs down: an atlas rect (u0, v0, u1, v1, v up) is v 1 - v1 .. 1 - v0 here
  const [u0, v0, u1, v1] = contract.unlit.cloud, slack = 1e-3;
  for (const name of ['cloud_a', 'cloud_b', 'cloud_c']) {
    const out = piece(gltf, name).uvs.filter(([u, v]) => u < u0 - slack || u > u1 + slack || v < 1 - v1 - slack || v > 1 - v0 + slack);
    assert.equal(out.length, 0, `${name}: ${out.length} UVs leave the cloud cell`);
  }
  const [, p0, , p1] = contract.unlit.peak;
  const out = piece(gltf, 'peak').uvs.filter(([, v]) => v < 1 - p1 - slack || v > 1 - p0 + slack);
  assert.equal(out.length, 0, `peak: ${out.length} UVs leave the rock and snow band`);
});

test('the scanned surfaces are CC0, recorded with URL and hash; the downloads stay out of the repo', () => {
  const sources = JSON.parse(read('assets-src/spiral-landmarks/sources.json'));
  assert.equal(sources.licence, 'CC0-1.0');
  assert.ok(sources.sets.length >= 1);
  for (const set of sources.sets) {
    assert.equal(set.licence, 'CC0-1.0', set.id);
    assert.match(set.url, /^https:\/\/polyhaven\.com\/a\//, set.id);
    assert.ok(set.metres > 0 && set.authors.length > 0, set.id);
    for (const file of set.files) {
      assert.match(file.sha256, /^[0-9a-f]{64}$/, file.path);
      assert.ok(!existsSync(new URL(`../assets-src/spiral-landmarks/${file.path}`, import.meta.url)), `${file.path} is committed`);
    }
  }
  assert.equal(entry.license.id, 'CC0-1.0', 'the GLB carries CC0 scans: the manifest says so');
  for (const author of new Set(sources.sets.flatMap(set => set.authors))) assert.ok(entry.license.creator.includes(author), author);
  assert.ok(entry.provenance.commands.includes('python3 -I assets-src/spiral-landmarks/fetch_sources.py'));
});

test('the atlas files of the master are the sizes the contract records', () => {
  for (const [slot, texture] of Object.entries(contract.textures)) {
    assert.ok(texture.px <= 2048, `${slot}: ${texture.px} px`);
    assert.ok(existsSync(new URL(`../assets-src/spiral-landmarks/${texture.file}`, import.meta.url)), texture.file);
  }
  assert.equal(contract.textures.base.px, 2048);
});

// The plan (src/spiral-scenery-plan.ts) keeps pieces clear of the road and closes the cloud sea with these sizes.
test('the placement plan sizes every piece as the shipped GLB is', async () => {
  const { gltf } = await loaded, wrong = [];
  for (const node of SPIRAL_NODES) {
    const { points, box } = piece(gltf, node), [low, high] = SPIRAL_NODE_SPAN[node], radius = SPIRAL_NODE_RADIUS[node];
    const reach = Math.max(...points.map(p => Math.hypot(p.x, p.z))), cover = Math.min(-box.min.x, box.max.x, -box.min.z, box.max.z);
    const measured = `${node}: reach ${reach.toFixed(2)}, cover ${cover.toFixed(2)}, y ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)}`;
    if (box.min.y < low - QUANTIZE || box.max.y > high + QUANTIZE) wrong.push(`${measured} leaves its span ${low}..${high}`);
    // A cloud covers the sea out to its radius (its smallest half-width) and its top is its span; any other piece stays inside its radius.
    if (node.startsWith('cloud') ? cover < radius - QUANTIZE || Math.abs(box.max.y - high) > QUANTIZE || reach > SPIRAL_CLOUD_SPREAD : reach > radius + QUANTIZE) wrong.push(`${measured} against radius ${radius}`);
  }
  assert.deepEqual(wrong, []);
});
