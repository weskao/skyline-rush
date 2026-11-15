// Neon Downtown city kit (Task 5b step 5): the shipped GLB against its integration contract
// (assets-src/neon-city/asset-brief.md). Module names, LOD counts and per-LOD triangle budgets have one home,
// assets-src/neon-city/modules.json, which build.py also asserts against.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Box3 } from 'three';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { checkGlb, glbJson, parseGlb, summarize } from '../scripts/assets/check-glb.mjs';

const entry = MODEL_MANIFEST['neon-city'];
const file = new URL(`../public/${entry.url}`, import.meta.url);
const kit = JSON.parse(readFileSync(new URL('../assets-src/neon-city/modules.json', import.meta.url), 'utf8'));
const modules = Object.entries(kit.modules);
const lodNames = modules.flatMap(([name, m]) => m.triangles.map((_, i) => `${name}_lod${i}`));
const triangles = mesh => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;

const buffer = existsSync(file) ? readFileSync(file) : null;
const json = buffer && glbJson(buffer);
const gltf = buffer && await parseGlb(buffer);
gltf?.scene.updateMatrixWorld(true);
const node = name => gltf.scene.getObjectByName(name);
/** Bounds in module space: the mesh node carries meshopt's dequantization matrix, so the node matrix is applied. */
const bounds = name => new Box3().setFromObject(node(name));

test('neon-city: the GLB is shipped and inside the manifest budgets', async () => {
  assert.ok(buffer, `missing ${entry.url}: run the commands in the manifest provenance`);
  assert.deepEqual(checkGlb(await summarize(buffer), entry), []);
});

test('neon-city: every module is a pivot node at the origin holding exactly its LOD meshes', () => {
  assert.deepEqual([...entry.nodes].sort(), [...modules.map(([name]) => name), ...lodNames].sort(), 'manifest nodes list every module and LOD');
  for (const [name, m] of modules) {
    const pivot = node(name);
    assert.ok(pivot && !pivot.isMesh, `${name}: pivot node`);
    assert.equal(pivot.parent, gltf.scene, `${name}: top-level`);
    assert.deepEqual(pivot.matrix.elements, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], `${name}: pivot is unmoved, unrotated, unscaled`);
    assert.deepEqual(pivot.children.map(c => c.name).sort(), m.triangles.map((_, i) => `${name}_lod${i}`), `${name}: LOD children`);
    assert.ok(pivot.children.every(c => c.isMesh && c.children.length === 0), `${name}: each LOD is one mesh`);
  }
});

test('neon-city: each LOD keeps its triangle budget and never grows with distance', () => {
  for (const [name, m] of modules) {
    const counts = m.triangles.map((_, i) => triangles(node(`${name}_lod${i}`)));
    counts.forEach((count, i) => assert.ok(count > 0 && count <= m.triangles[i], `${name}_lod${i}: ${count} > budget ${m.triangles[i]}`));
    for (let i = 1; i < counts.length; i++) assert.ok(counts[i] < counts[i - 1], `${name}_lod${i}: ${counts[i]} is not below LOD ${i - 1}`);
  }
});

test('neon-city: one shared material, one draw per module LOD, emissive above 1', () => {
  assert.deepEqual(json.materials.map(m => m.name), ['neon_city']);
  assert.ok(json.meshes.every(mesh => mesh.primitives.length === 1 && mesh.primitives[0].material === 0), 'one primitive per mesh, all on neon_city');
  assert.equal(json.meshes.length, lodNames.length, 'no stray meshes');
  const [material] = json.materials;
  assert.equal(material.extensions?.KHR_materials_emissive_strength?.emissiveStrength, kit.emissiveStrength);
  assert.ok(kit.emissiveStrength > 1, 'neon has to clear the bloom threshold');
  assert.deepEqual(material.emissiveFactor, [1, 1, 1]);
});

test('neon-city: four shared KTX2 atlases inside the texture budget, colour maps sRGB and data maps linear', async () => {
  const { maxTexturePx, colorSpaceErrors } = await summarize(buffer);
  const [material] = json.materials;
  const slots = [material.pbrMetallicRoughness.baseColorTexture, material.emissiveTexture, material.normalTexture, material.occlusionTexture, material.pbrMetallicRoughness.metallicRoughnessTexture];
  assert.ok(slots.every(Boolean), 'colour, emissive, normal and packed ORM are all bound');
  assert.equal(slots[3].index, slots[4].index, 'occlusion shares the roughness/metal texture');
  assert.equal(json.images.length, 4);
  assert.ok(json.images.every(image => image.mimeType === 'image/ktx2'), 'KTX2 only: the colour-space check reads KTX2 headers');
  assert.ok(maxTexturePx > 0 && maxTexturePx <= entry.budgets.textureMaxPx, `${maxTexturePx}px`);
  assert.deepEqual(colorSpaceErrors, []);
});

test('neon-city: modules stand on their pivot, in metres, street side toward +Z', () => {
  for (const [name, m] of modules) for (let i = 0; i < m.triangles.length; i++) {
    const box = bounds(`${name}_lod${i}`);
    assert.ok(box.min.y > -0.02, `${name}_lod${i}: nothing below the ground plane (${box.min.y.toFixed(3)})`);
    // Signs include wall-mounted pieces that hang above their ground pivot; everything else touches the ground.
    if (m.group !== 'sign') assert.ok(box.min.y < 0.05, `${name}_lod${i}: stands on the ground (${box.min.y.toFixed(3)})`);
    assert.ok(Math.abs(box.min.x + box.max.x) < 0.8, `${name}_lod${i}: centred on its footprint across the street axis`);
  }
  const lamp = bounds('street_lamp_lod0'), shop = bounds('shop_market_a_lod0'), spire = bounds('skyline_spire_lod0');
  assert.ok(lamp.max.z > 3 && lamp.min.z > -0.5, 'the lamp arm reaches over the road, toward +Z');
  assert.ok(shop.max.z > -shop.min.z, 'the shop awning is on the +Z face');
  assert.ok(lamp.max.y > 8 && lamp.max.y < 10 && spire.max.y > 200, 'metres, not centimetres');
});
