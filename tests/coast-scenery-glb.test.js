import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { COAST_CHUNK_METRES, COAST_PIECES, coastChunkPlan, coastChunkWindow, PIECE_DEPTH, RAIL_CHUNKS } from '../src/coast-scenery-glb.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';

const center = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const PROCEDURAL = ['Coast shoreline rocks', 'Coast wind-shaped trees', 'Coast tree trunks'];

/** Stand-in for the parsed coast-scenery.glb: same node names, palms with two primitives, the arch as two shells. */
function fakeGlb() {
  const root = new THREE.Group();
  const mat = name => Object.assign(new THREE.MeshStandardMaterial(), { name });
  const box = new THREE.BoxGeometry(2, 2, 2);
  const leaf = (name, material) => Object.assign(new THREE.Mesh(box, material), { name });
  for (const [name, material] of [['cliff_a', 'coast_cliff_a'], ['cliff_b', 'coast_cliff_b'], ['rock_a', 'coast_rock'], ['rock_b', 'coast_rock'], ['guard_rail', 'coast_rail_steel']]) {
    const mesh = leaf(name, mat(material));
    mesh.position.y = 1;
    root.add(mesh);
  }
  const bark = mat('coast_palm_bark'), frond = mat('coast_palm_frond');
  for (const name of ['palm_a', 'palm_b']) {
    const palm = Object.assign(new THREE.Group(), { name });
    palm.add(leaf(name + '_1', bark), leaf(name + '_2', frond));
    root.add(palm);
  }
  const arch = Object.assign(new THREE.Group(), { name: 'sea_arch' }), shell = new THREE.BoxGeometry(4, 4, 1), archMat = mat('coast_arch');
  const front = Object.assign(new THREE.Mesh(shell, archMat), { name: 'sea_arch_front' });
  const back = Object.assign(new THREE.Mesh(shell, archMat), { name: 'sea_arch_back' });
  back.position.z = -4; back.rotation.y = Math.PI;
  arch.add(front, back);
  root.add(arch);
  return root;
}

const layerMeshes = kit => kit.group.children.filter(o => o.isInstancedMesh && !PROCEDURAL.includes(o.name));
const matrixOf = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; };

test('the chunk plan covers every manifest piece and is keyed by absolute chunk index and endless seed', () => {
  assert.deepEqual([...COAST_PIECES].sort(), MODEL_MANIFEST['coast-scenery'].nodes.filter(n => !/_front|_back/.test(n)).sort());
  assert.deepEqual(coastChunkPlan(7), coastChunkPlan(7), 'deterministic');
  assert.notDeepEqual(coastChunkPlan(7), coastChunkPlan(8));
  assert.notDeepEqual(coastChunkPlan(7, 1001), coastChunkPlan(7, 2002), 'endless seeds give different coasts');
  const seen = new Set();
  for (let chunk = 0; chunk < 400; chunk++) for (const p of coastChunkPlan(chunk)) {
    seen.add(p.piece);
    for (const value of [p.along, p.offset, p.y, p.yaw, p.scale]) assert.ok(Number.isFinite(value));
    assert.ok(p.along >= 0 && p.along < COAST_CHUNK_METRES);
    assert.ok(p.scale > 0, 'never zero-scaled lit normals');
    const inner = Math.abs(p.offset) - PIECE_DEPTH[p.piece] * p.scale;
    // Rails ride the existing curb line (12.4 m); everything else clears the 24 m road and the curbs by a wide margin.
    if (p.piece === 'guard_rail') assert.equal(Math.abs(p.offset), 12.4);
    else assert.ok(inner >= 20, `${p.piece} reaches ${inner.toFixed(1)} m from the centre line`);
    // Rock skirts carry stretched scan UVs: most of each rock sits below the sea plane (y = -6).
    if (p.piece === 'rock_a' || p.piece === 'rock_b') assert.ok(p.y <= -6 - .1 * p.scale, `${p.piece} skirt above the water`);
  }
  assert.deepEqual([...seen].sort(), [...COAST_PIECES].sort(), 'every piece appears somewhere along 48 km');
});

test('chunk window: one chunk behind, more ahead on High than Medium, nothing on Low', () => {
  assert.deepEqual(coastChunkWindow(250, 'low'), null);
  const medium = coastChunkWindow(250, 'medium'), high = coastChunkWindow(250, 'high');
  assert.equal(medium.first, 1);
  assert.equal(high.first, 1);
  assert.ok(high.count > medium.count);
});

test('the GLB layer draws one InstancedMesh per GLB primitive and replaces the procedural rocks/trees on Medium+', () => {
  const scene = new THREE.Scene(), kit = createCoastScenery(scene, center);
  kit.attachModel(fakeGlb());
  const layer = layerMeshes(kit);
  // cliff_a, cliff_b, rock_a, rock_b, guard_rail, 2 x palm bark/frond, one arch shell shared by front and back.
  assert.equal(layer.length, 10, 'one draw per primitive, never one per placed prop');
  for (const mesh of layer) assert.equal(mesh.frustumCulled, false);
  kit.update(300, 'medium');
  for (const name of PROCEDURAL) assert.equal(kit.group.getObjectByName(name).visible, false, name);
  assert.ok(layer.every(mesh => mesh.visible));
  kit.update(300, 'low');
  for (const name of PROCEDURAL) assert.equal(kit.group.getObjectByName(name).visible, true, 'Low keeps the procedural scenery');
  assert.ok(layer.every(mesh => !mesh.visible), 'Low draws no GLB scenery');
  kit.dispose();
});

test('placed pieces sit where the chunk plan puts them, and unused instances are parked, not zero-scaled', () => {
  const kit = createCoastScenery(new THREE.Scene(), center);
  kit.attachModel(fakeGlb());
  kit.update(300, 'high');
  const window = coastChunkWindow(300, 'high');
  const rails = kit.group.getObjectByName('guard_rail');
  let expected = 0;
  // Rails are thin: past the nearest RAIL_CHUNKS they are sub-pixel, and the procedural rail lights carry the line.
  for (let c = window.first; c < window.first + RAIL_CHUNKS; c++) expected += coastChunkPlan(c).filter(p => p.piece === 'guard_rail').length;
  assert.ok(RAIL_CHUNKS < window.count);
  assert.equal(rails.count, expected);
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < rails.count; i++) {
    matrixOf(rails, i).decompose(p, q, s);
    const distance = -p.z;
    assert.ok(Math.abs(Math.abs(p.x - center(distance)) - 12.4) < .05, 'rail rides the curb line');
  }
  for (const mesh of layerMeshes(kit)) for (let i = 0; i < mesh.instanceMatrix.count; i++) {
    matrixOf(mesh, i).decompose(p, q, s);
    assert.ok(s.x > 0 && s.y > 0 && s.z > 0);
    if (i >= mesh.count) assert.ok(p.y < -500, 'spare instances wait below the scene');
  }
  kit.dispose();
});

test('driving evicts chunks without leaks, duplicate draws or disposing shared GLB resources', () => {
  const scene = new THREE.Scene(), kit = createCoastScenery(scene, center), glb = fakeGlb();
  kit.attachModel(glb);
  const disposed = [];
  glb.traverse(o => { if (o.isMesh) { o.geometry.addEventListener('dispose', () => disposed.push(o.name)); o.material.addEventListener('dispose', () => disposed.push(o.name)); } });
  const layer = layerMeshes(kit);
  const arches = kit.group.getObjectByName('sea_arch');
  for (let d = 0; d < 6000; d += 7) {
    kit.update(d, 'high');
    const window = coastChunkWindow(d, 'high');
    let archCount = 0;
    for (let c = window.first; c < window.first + window.count; c++) archCount += coastChunkPlan(c).filter(p => p.piece === 'sea_arch').length;
    assert.equal(arches.count, archCount * 2, 'each arch draws its front and back shell once');
  }
  assert.deepEqual(layerMeshes(kit), layer, 'the same pooled meshes, no new draw calls while driving');
  assert.equal(scene.children.length, 1);
  assert.deepEqual(disposed, [], 'chunk eviction never disposes shared geometry or materials');
  kit.dispose();
  assert.deepEqual(disposed, [], 'the model cache handle owns the GLB resources');
  assert.equal(scene.children.length, 0);
});

test('a chunk keeps its pieces exactly while it stays in the window, and endless scenery stays near the floating origin', () => {
  const kit = createCoastScenery(new THREE.Scene(), center);
  kit.attachModel(fakeGlb());
  kit.update(5000, 'high', 77);
  const cliffs = ['cliff_a', 'cliff_b'].map(n => kit.group.getObjectByName(n));
  // Group-local (road) space: the group itself follows the car laterally every frame, as the procedural scenery does.
  const local = mesh => Array.from({ length: mesh.count }, (_, i) => matrixOf(mesh, i).elements.map(v => +v.toFixed(4)).join());
  const before = new Set(cliffs.flatMap(local));
  kit.update(5050, 'high', 77);
  const after = cliffs.flatMap(local);
  assert.ok(after.filter(m => before.has(m)).length >= after.length - 1, 'only the newly entered chunk adds a cliff');
  kit.update(1_000_000_000, 'high', 77);
  for (const mesh of layerMeshes(kit)) for (let i = 0; i < mesh.count; i++) assert.ok(Math.abs(matrixOf(mesh, i).elements[14]) < 3000);
  kit.dispose();
});

test('detaching the model returns Medium+ to the procedural scenery', () => {
  const kit = createCoastScenery(new THREE.Scene(), center);
  kit.attachModel(fakeGlb());
  kit.update(300, 'medium');
  kit.detachModel();
  kit.update(300, 'medium');
  assert.equal(layerMeshes(kit).length, 0);
  for (const name of PROCEDURAL) assert.equal(kit.group.getObjectByName(name).visible, true);
  kit.dispose();
});
