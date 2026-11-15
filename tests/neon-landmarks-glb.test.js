// Neon Downtown landmark kit (Task 5b steps 6 and 7, asset half): the shipped GLB against its integration contract
// (assets-src/neon-landmarks/contract.json, written by build.py) and the road numbers its openings were sized to.
// The runtime that places the pieces is another change; this file only pins what that change may rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Box3, Triangle, Vector3 } from 'three';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { NEON_LANDMARKS_NOT_PLACED } from '../src/model-manifest-neon.ts';
import { NEON_PIECES } from '../src/neon-scenery-plan.ts';
import { CAR_HEIGHT, LANES, ROAD_LIMIT, TUNNEL_CEILING } from '../src/game.js';
import { checkGlb, glbJson, parseGlb, summarize } from '../scripts/assets/check-glb.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const contract = JSON.parse(read('assets-src/neon-landmarks/contract.json'));
const entry = MODEL_MANIFEST['neon-landmarks'];
const pieces = Object.entries(contract.pieces);
const spanning = pieces.filter(([, piece]) => piece.kind === 'span');
// The two sectors of the 10 km lap (2026-11-15). Modelled here, placed by a later change.
const NEW_SECTORS = { harbour: ['harbour_gantry', 'container_stack', 'cargo_ship'], oldtown: ['oldtown_gate', 'lantern_span', 'clock_tower'] };
const NEW_PIECES = Object.values(NEW_SECTORS).flat();
// All six near LODs; the nine of the 4000 m lap keep their own 12000. 9000 -> 14000 (second look-dev pass, measured
// 13058): real lattice, stairs and hull detail. Each hero piece stands once on the lap, the near LOD inside ~150 m only.
const NEW_NEAR_BUDGET = 14_000;
// [LOD0, LOD1] per piece, re-pinned in the second look-dev pass (were 300 to 2000 / 300 to 1200): the hero pieces,
// each placed once (ship, tower, gate) or three times as a span (gantry), may carry real structure up to 6000 near;
// the repeated container stack and lantern span stay at 1500. LOD1 is at most 40 % of LOD0 (asserted below).
const NEW_BUDGETS = { harbour_gantry: [6000, 2400], cargo_ship: [6000, 2400], oldtown_gate: [6000, 2400], clock_tower: [6000, 2400],
  container_stack: [1500, 600], lantern_span: [1500, 600] };

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
  assert.deepEqual(entry.materials, contract.materials);
  assert.deepEqual([...entry.nodes].sort(), pieces.flatMap(([name, piece]) => [name, ...Object.keys(piece.lods)]).sort());
});

test('every piece is an unmoved pivot with one mesh per LOD on its kit material', async () => {
  const { gltf, json } = await loaded;
  // second look-dev pass: the six harbour and oldtown pieces bake their own atlas set onto their own material, so the
  // nine placed pieces keep the atlases they shipped with (one draw per piece either way)
  assert.deepEqual(contract.materials, ['neon_landmarks', 'neon_landmarks_sectors']);
  assert.deepEqual(json.materials.map(material => material.name), contract.materials, 'one material per kit');
  for (const [name, piece] of pieces) assert.equal(piece.material, contract.materials[NEW_PIECES.includes(name) ? 1 : 0], name);
  assert.equal(pieces.length, 15);
  assert.deepEqual(NEW_PIECES.filter(name => !contract.pieces[name]), [], 'the harbour and oldtown pieces are in the kit');
  for (const [name, piece] of pieces) {
    const pivot = gltf.scene.getObjectByName(name);
    assert.ok(pivot && !pivot.isMesh, `${name}: pivot node`);
    assert.deepEqual(pivot.matrixWorld.elements, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], `${name}: pivot at the origin, unrotated, unscaled`);
    assert.deepEqual(pivot.children.map(child => child.name).sort(), [`${name}_lod0`, `${name}_lod1`]);
    assert.deepEqual(Object.keys(piece.lods), [`${name}_lod0`, `${name}_lod1`]);
    for (const child of pivot.children) {
      assert.ok(child.isMesh && !Array.isArray(child.material), `${child.name}: one primitive, one draw`);
      assert.equal(child.material.name, piece.material);
    }
  }
});

test('triangle budgets per piece and LOD, as measured by the build', async () => {
  const { gltf } = await loaded;
  let near = 0, nearNew = 0;
  for (const [name, piece] of pieces) {
    const [lod0, lod1] = Object.entries(piece.lods).map(([lod, measured], level) => {
      const count = triangles(gltf, lod).length;
      assert.equal(count, measured.triangles, `${lod}: contract.json is stale, rebuild`);
      assert.ok(count <= piece.budget_triangles[level], `${lod}: ${count} > budget ${piece.budget_triangles[level]}`);
      return count;
    });
    assert.ok(lod1 <= lod0, `${name}: the far LOD is never heavier`);
    if (NEW_PIECES.includes(name)) {
      assert.deepEqual(piece.budget_triangles, NEW_BUDGETS[name], `${name}: budget re-pinned here, with its reason`);
      assert.ok(lod1 <= 0.4 * lod0, `${name}: far LOD ${lod1} over 40 % of ${lod0}`);
      nearNew += lod0;
    } else near += lod0;
  }
  assert.ok(near <= 12000, `the nine near LODs of the 4000 m lap: ${near} triangles`);
  assert.ok(nearNew <= NEW_NEAR_BUDGET, `the six harbour and oldtown near LODs: ${nearNew} triangles`);
});

test('seven KTX2 atlases, colour maps sRGB and the data maps linear, none over 2048 px', async () => {
  const { buffer, json } = await loaded;
  const summary = await summarize(buffer);
  assert.deepEqual(summary.colorSpaceErrors, []);
  assert.ok(summary.maxTexturePx <= 2048, `${summary.maxTexturePx} px`);
  assert.equal(json.images.length, 7, 'base colour, emissive, occlusion-roughness-metal per kit, and the sectors normal map');
  assert.ok(json.textures.every(texture => texture.extensions?.KHR_texture_basisu), 'KTX2 only');
  const used = new Set();
  for (const material of json.materials) {
    const pbr = material.pbrMetallicRoughness;
    for (const slot of [pbr.baseColorTexture, material.emissiveTexture, pbr.metallicRoughnessTexture, material.occlusionTexture]) {
      assert.ok(slot, material.name);
      used.add(slot.index);
    }
    assert.equal(material.occlusionTexture.index, pbr.metallicRoughnessTexture.index, 'occlusion shares the roughness-metal atlas');
    assert.deepEqual(material.emissiveFactor, [1, 1, 1], 'the runtime scales the glow; the asset ships it at 1');
    assert.equal(Boolean(material.normalTexture), material.name === 'neon_landmarks_sectors', `${material.name}: normal map only on the sectors kit`);
    if (material.normalTexture) used.add(material.normalTexture.index);
  }
  assert.equal(used.size, 7, 'no atlas shared between the kits');
});

test('the nine placed pieces keep the atlases they shipped with before the harbour and oldtown pieces (b414abef)', () => {
  const sha = path => createHash('sha256').update(read(`assets-src/neon-landmarks/textures/${path}`)).digest('hex');
  assert.deepEqual(Object.fromEntries(['basecolor.jpg', 'emissive.png', 'orm.png'].map(map => [map, sha(`neon_landmarks_${map}`)])), {
    'basecolor.jpg': '3b7e784afa2b14eb43bf720e2a84c79dce0f2877c8d0963870f5ffe427daedae',
    'emissive.png': '66564cb73bab549699ffb1480900ede91c3d65cde12fe790e743e77a413c99e2',
    'orm.png': '7ca35ce9575ccffc0afef7088281012f423a45dc55916d41fa25341d2ddd641b',
  });
});

test('at the game landmark strength no lamp texel clips to white, and no sectors texel reaches the Neon bloom', () => {
  const strength = Number(read('src/neon-scenery.ts').toString().match(/landmarks: ([\d.]+) \}/)?.[1]);
  const threshold = Number(read('src/coast-lighting.ts').toString().match(/nightRain:[\s\S]*?threshold: ([\d.]+)/)?.[1]);
  assert.deepEqual([contract.emissive.game_strength, contract.emissive.bloom_threshold], [strength, threshold], 'build.py measured against the runtime numbers');
  for (const material of contract.materials) assert.equal(contract.emissive[material].white_texels, 0, material);
  assert.equal(contract.emissive.neon_landmarks_sectors.bloom_texels, 0, 'the lamps glow through the bloom pass only where the runtime adds light');
  assert.ok(contract.emissive.neon_landmarks_sectors.max_luminance < threshold);
  for (const [lamp, level] of Object.entries(contract.lamp_levels)) {
    const linear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); // lamps are listed in sRGB
    const [r, g, b] = contract.lamps[lamp].map(c => linear(c) * level * strength);
    assert.ok(0.299 * r + 0.587 * g + 0.114 * b < threshold, `${lamp}: level ${level} blooms at game strength`);
  }
});

test('the scanned surfaces of the sectors kit are CC0, recorded with URL and hash; the downloads stay out of the repo', () => {
  const sources = JSON.parse(read('assets-src/neon-landmarks/sources.json'));
  assert.equal(sources.licence, 'CC0-1.0');
  assert.ok(sources.sets.length >= 1);
  for (const set of sources.sets) {
    assert.equal(set.licence, 'CC0-1.0', set.id);
    assert.match(set.url, /^https:\/\/polyhaven\.com\/a\//, set.id);
    assert.ok(set.metres > 0 && set.authors.length > 0, set.id);
    for (const file of set.files) {
      assert.match(file.sha256, /^[0-9a-f]{64}$/, file.path);
      assert.ok(!existsSync(new URL(`../assets-src/neon-landmarks/${file.path}`, import.meta.url)), `${file.path} is committed`);
    }
  }
  assert.equal(entry.license.id, 'CC0-1.0', 'the GLB carries CC0 scans: the manifest says so');
  for (const author of new Set(sources.sets.flatMap(set => set.authors))) assert.ok(entry.license.creator.includes(author), author);
  assert.ok(entry.provenance.commands.includes('python3 -I assets-src/neon-landmarks/fetch_sources.py'));
});

test('each spanning piece keeps its clear opening over the road on both LODs', async () => {
  const { gltf } = await loaded;
  const opening = { rail_portal: [TUNNEL_WALL_OUTER, TUNNEL_ROOF_TOP], rail_segment: [TUNNEL_WALL_OUTER, TUNNEL_ROOF_TOP],
    canal_arch: [KERB_OUTER, FLIGHT_TOP], boulevard_footbridge: [KERB_OUTER, FLIGHT_TOP],
    // no tunnel section under them, so a flying car may pass: they clear the flight top like the arch
    harbour_gantry: [KERB_OUTER, FLIGHT_TOP], oldtown_gate: [KERB_OUTER, FLIGHT_TOP], lantern_span: [KERB_OUTER, FLIGHT_TOP] };
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
  assert.deepEqual(spanning.map(([name]) => name).sort(), ['boulevard_footbridge', 'canal_arch', 'expressway_pier', 'harbour_gantry', 'lantern_span', 'oldtown_gate', 'rail_portal', 'rail_segment']);
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

test('the harbour and oldtown pieces are in the kit but not yet placed: one list names them until a change places them', () => {
  const placed = Object.keys(NEON_PIECES).filter(piece => NEON_PIECES[piece].kit === 'landmarks');
  assert.deepEqual([...NEON_LANDMARKS_NOT_PLACED].sort(), [...NEW_PIECES].sort());
  for (const piece of NEON_LANDMARKS_NOT_PLACED) assert.ok(!(piece in NEON_PIECES), `${piece} is placed now: remove it from NEON_LANDMARKS_NOT_PLACED`);
  assert.deepEqual([...placed, ...NEON_LANDMARKS_NOT_PLACED].sort(), pieces.map(([name]) => name).sort(), 'every kit piece is placed or listed as not yet placed');
  for (const [sector, names] of Object.entries(NEW_SECTORS)) for (const name of names) assert.equal(contract.pieces[name].sector, sector, name);
});

test('lamps come from the kit table at full value; the brightness is set in code; oldtown glows warm', () => {
  const lamps = contract.lamps;
  for (const [lamp, rgb] of Object.entries(lamps)) assert.equal(Math.max(...rgb), 1, `${lamp}: lamp colour at full value`);
  const old = { rail_portal: ['amber'], rail_segment: ['amber'], expressway_pier: ['amber'], expressway_rail: ['cyan'], canal_arch: ['amber', 'cyan'],
    canal_bridge_rail: ['cyan'], canal_bank: ['amber'], plaza_sculpture: ['violet'], boulevard_footbridge: ['pink'] };
  for (const [name, piece] of pieces) {
    assert.ok(piece.lamps.every(lamp => lamp in lamps), `${name}: ${piece.lamps}`);
    if (old[name]) assert.deepEqual(piece.lamps, old[name], name);
    else assert.ok(piece.lamps.length > 0, `${name}: lit at night`);
  }
  for (const name of NEW_SECTORS.oldtown) for (const lamp of contract.pieces[name].lamps) {
    const [r, g, b] = lamps[lamp];
    assert.ok(r > g && g > b, `${name}: ${lamp} is warm, against the violet and cyan of the rest of the lap`);
  }
});
