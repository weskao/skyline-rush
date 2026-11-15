// Neon Downtown landmark kit (Task 5b steps 6 and 7, asset half): the shipped GLB against its integration contract
// (assets-src/neon-landmarks/contract.json, written by build.py) and the road numbers its openings were sized to.
// The runtime that places the pieces is another change; this file only pins what that change may rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Box3, Triangle, Vector3 } from 'three';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { CAR_HEIGHT, LANES, ROAD_LIMIT, TUNNEL_CEILING } from '../src/game.js';
import { checkGlb, glbJson, parseGlb, summarize } from '../scripts/assets/check-glb.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const contract = JSON.parse(read('assets-src/neon-landmarks/contract.json'));
const entry = MODEL_MANIFEST['neon-landmarks'];
const pieces = Object.entries(contract.pieces);
const spanning = pieces.filter(([, piece]) => piece.kind === 'span');

// Road numbers measured in the code the pieces stand next to. A change there must re-open the clearances below.
const roadRender = read('src/classic-road-render.ts').toString();
const literal = (name, source = roadRender) => Number(source.match(new RegExp(`\\b${name} = ([\\d.]+)`))?.[1]);
const ROAD_HALF = literal('ROAD_HALF');
const KERB_OUTER = 12.4 + 0.55 / 2;   // kerb centre and width in classic-road-render.ts
const TUNNEL_WALL_OUTER = 12.6 + 1 / 2; // the procedural tunnel wall the underpass shell must enclose
const TUNNEL_ROOF_TOP = 4.25 + 0.5 / 2;
const FLIGHT_TOP = 12 + CAR_HEIGHT;     // game.js clamps altitude to 0..12; the roof is CAR_HEIGHT above that
const QUANTIZE = 0.02;                  // meshopt stores positions on a grid: allow 2 cm

const loaded = (async () => {
  const buffer = read(contract.glb);
  const gltf = await parseGlb(buffer);
  gltf.scene.updateMatrixWorld(true);
  return { buffer, gltf, json: glbJson(buffer) };
})();

/** World-space triangles of one LOD mesh node. */
function triangles(gltf, name) {
  const mesh = gltf.scene.getObjectByName(name), position = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const corner = i => new Vector3().fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
  return Array.from({ length: (index ?? position).count / 3 }, (_, t) => new Triangle(corner(3 * t), corner(3 * t + 1), corner(3 * t + 2)));
}
const bounds = list => list.reduce((box, t) => box.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c), new Box3());
const crossing = (list, box) => list.filter(t => box.intersectsTriangle(t)).length;

test('road numbers the kit was sized to still hold', () => {
  assert.equal(ROAD_HALF, 12);
  assert.equal(literal('STEP'), 12, 'the 12 m modules repeat on the road render step');
  assert.match(roadRender, /12\.4/, 'kerb centre line');
  assert.deepEqual([ROAD_LIMIT, TUNNEL_CEILING, CAR_HEIGHT, Math.max(...LANES)], [10.2, 4, 1.2, 7.5]);
  assert.match(read('src/game.js').toString(), /clamp\(car\.altitude \+ car\.verticalSpeed \* dt, 0, 12\)/, 'flight ceiling 12 m');
});

test('the manifest entry and the shipped GLB agree, inside the budgets', async () => {
  assert.ok(entry, 'neon-landmarks manifest entry');
  assert.equal(`public/${entry.url}`, contract.glb);
  assert.ok(existsSync(new URL(`../${contract.glb}`, import.meta.url)), `${contract.glb} is missing`);
  const { buffer } = await loaded;
  assert.deepEqual(checkGlb(await summarize(buffer), entry), []);
  assert.deepEqual(entry.materials, [contract.material]);
  assert.deepEqual([...entry.nodes].sort(), pieces.flatMap(([name, piece]) => [name, ...Object.keys(piece.lods)]).sort());
});

test('every piece is an unmoved pivot with one mesh per LOD on the one shared material', async () => {
  const { gltf, json } = await loaded;
  assert.equal(json.materials.length, 1, 'one material for the whole kit');
  assert.equal(pieces.length, 9);
  for (const [name, piece] of pieces) {
    const pivot = gltf.scene.getObjectByName(name);
    assert.ok(pivot && !pivot.isMesh, `${name}: pivot node`);
    assert.deepEqual(pivot.matrixWorld.elements, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], `${name}: pivot at the origin, unrotated, unscaled`);
    assert.deepEqual(pivot.children.map(child => child.name).sort(), [`${name}_lod0`, `${name}_lod1`]);
    assert.deepEqual(Object.keys(piece.lods), [`${name}_lod0`, `${name}_lod1`]);
    for (const child of pivot.children) {
      assert.ok(child.isMesh && !Array.isArray(child.material), `${child.name}: one primitive, one draw`);
      assert.equal(child.material.name, contract.material);
    }
  }
});

test('triangle budgets per piece and LOD, as measured by the build', async () => {
  const { gltf } = await loaded;
  let near = 0;
  for (const [name, piece] of pieces) {
    const [lod0, lod1] = Object.entries(piece.lods).map(([lod, measured], level) => {
      const count = triangles(gltf, lod).length;
      assert.equal(count, measured.triangles, `${lod}: contract.json is stale, rebuild`);
      assert.ok(count <= piece.budget_triangles[level], `${lod}: ${count} > budget ${piece.budget_triangles[level]}`);
      return count;
    });
    assert.ok(lod1 <= lod0, `${name}: the far LOD is never heavier`);
    near += lod0;
  }
  assert.ok(near <= 12000, `all nine near LODs: ${near} triangles`);
});

test('three KTX2 atlases, colour maps sRGB and the data map linear, none over 2048 px', async () => {
  const { buffer, json } = await loaded;
  const summary = await summarize(buffer);
  assert.deepEqual(summary.colorSpaceErrors, []);
  assert.ok(summary.maxTexturePx <= 2048, `${summary.maxTexturePx} px`);
  assert.equal(json.images.length, 3, 'base colour, emissive, occlusion-roughness-metal');
  assert.ok(json.textures.every(texture => texture.extensions?.KHR_texture_basisu), 'KTX2 only');
  const [material] = json.materials, pbr = material.pbrMetallicRoughness;
  for (const slot of [pbr.baseColorTexture, material.emissiveTexture, pbr.metallicRoughnessTexture, material.occlusionTexture]) assert.ok(slot);
  assert.equal(material.occlusionTexture.index, pbr.metallicRoughnessTexture.index, 'occlusion shares the roughness-metal atlas');
  assert.deepEqual(material.emissiveFactor, [1, 1, 1], 'the runtime scales the glow; the asset ships it at 1');
});

test('each spanning piece keeps its clear opening over the road on both LODs', async () => {
  const { gltf } = await loaded;
  const opening = { rail_portal: [TUNNEL_WALL_OUTER, TUNNEL_ROOF_TOP], rail_segment: [TUNNEL_WALL_OUTER, TUNNEL_ROOF_TOP],
    canal_arch: [KERB_OUTER, FLIGHT_TOP], boulevard_footbridge: [KERB_OUTER, FLIGHT_TOP] };
  for (const [name, piece] of spanning) for (const lod of Object.keys(piece.lods)) {
    const list = triangles(gltf, lod);
    if (name === 'expressway_pier') { // carries the deck from below: nothing above the deck soffit
      assert.ok(bounds(list).max.y <= -1.5 + QUANTIZE, `${lod}: top ${bounds(list).max.y}`);
      continue;
    }
    const [half, height] = piece.clear, [needHalf, needHeight] = opening[name];
    assert.ok(half >= needHalf + 0.4 && height >= needHeight + 0.3, `${name}: contract opening ${half} x ${height} m`);
    const box = new Box3(new Vector3(-half + QUANTIZE, QUANTIZE, -1000), new Vector3(half - QUANTIZE, height - QUANTIZE, 1000));
    assert.equal(crossing(list, box), 0, `${lod}: geometry inside the ${2 * half} x ${height} m opening`);
  }
  assert.deepEqual(spanning.map(([name]) => name).sort(), ['boulevard_footbridge', 'canal_arch', 'expressway_pier', 'rail_portal', 'rail_segment']);
});

test('side modules stay outside the kerb above the road and tile at their repeat spacing', async () => {
  const { gltf } = await loaded;
  for (const [name, piece] of pieces) for (const lod of Object.keys(piece.lods)) {
    const list = triangles(gltf, lod), box = bounds(list);
    if (piece.offset_m) { // local x = 0 is offset_m from the centre line; -x faces the road
      const overRoad = new Box3(new Vector3(-50, QUANTIZE, -50), new Vector3(KERB_OUTER - piece.offset_m, 50, 50));
      assert.equal(crossing(list, overRoad), 0, `${lod}: above the road surface inside the kerb line`);
    }
    if (piece.kind === 'side' && piece.repeat_m) {
      assert.ok(Math.abs(box.min.z + piece.repeat_m / 2) < QUANTIZE && Math.abs(box.max.z - piece.repeat_m / 2) < QUANTIZE, `${lod}: ${box.min.z} .. ${box.max.z}`);
    }
    if (name === 'rail_segment') assert.ok(box.max.z - box.min.z >= piece.repeat_m + 1.2, 'segments overlap under the joint frame');
    if (name === 'plaza_sculpture') assert.ok(box.max.y >= 12 && box.max.y <= 18 && Math.abs(box.min.y) < QUANTIZE, `sculpture ${box.max.y} m tall on the ground`);
  }
});
