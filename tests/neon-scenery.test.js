// Task 5b steps 5 to 7: the Neon Downtown kits as pooled instances on the loop, plus the land they stand on.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNeonScenery } from '../src/neon-scenery.ts';
import { NEON_CHUNK_METRES, NEON_GROUND, NEON_PIECES, neonChunkPlan, neonChunkWindow } from '../src/neon-scenery-plan.ts';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { REFLECT_LAYER } from '../src/wet-reflection.ts';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { trackLook } from '../src/track-look.ts';

const route = classicRoadRoute('neon');
const piecesOf = kit => Object.keys(NEON_PIECES).filter(piece => NEON_PIECES[piece].kit === kit);

/** Stand-in for a parsed kit GLB: `<piece>` pivots with `<piece>_lod<n>` meshes on one shared material. */
function fakeKit(kit) {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ name: `neon_${kit}` });
  for (const piece of piecesOf(kit)) {
    const node = Object.assign(new THREE.Group(), { name: piece });
    for (let lod = 0; lod < NEON_PIECES[piece].lods; lod++) node.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material), { name: `${piece}_lod${lod}` }));
    root.add(node);
  }
  return root;
}
function rig() {
  const scene = new THREE.Scene(), kit = createNeonScenery(scene), city = fakeKit('city'), landmarks = fakeKit('landmarks');
  kit.attachKit('city', city); kit.attachKit('landmarks', landmarks);
  const pools = () => kit.group.children.filter(o => o.isInstancedMesh), pool = name => kit.group.getObjectByName(name);
  return { scene, kit, city, landmarks, pools, pool };
}
const matrixOf = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; };
const positions = mesh => Array.from({ length: mesh.count }, (_, i) => new THREE.Vector3().setFromMatrixPosition(matrixOf(mesh, i)));
/** Placements the window should draw, split into the LOD 0 band around the car and the far band. */
function expected(distance, quality, seed) {
  const window = neonChunkWindow(distance, quality), counts = {};
  for (let chunk = window.first; chunk < window.first + window.count; chunk++) for (const p of neonChunkPlan(chunk, seed)) {
    const spec = NEON_PIECES[p.piece], band = chunk - window.first - 1 <= spec.near || window.count <= 2 + spec.near ? 'near' : 'far';
    if (band === 'far' && !spec.far) continue; // street furniture is not drawn past its LOD 0 band
    counts[`${p.piece}:${band}`] = (counts[`${p.piece}:${band}`] ?? 0) + 1;
  }
  return counts;
}

test('each piece is one pooled draw per LOD band: LOD 0 around the car, its last LOD beyond, the far skyline in one', () => {
  const { kit, city, pools, pool } = rig();
  for (const piece of Object.keys(NEON_PIECES)) {
    const spec = NEON_PIECES[piece], near = pool(`${piece}:near`), far = pool(`${piece}:far`);
    const source = name => (spec.kit === 'city' ? city : kit.group).getObjectByName(name) ?? null;
    assert.ok(near?.isInstancedMesh, piece);
    assert.equal(!!far, spec.far && spec.near < 6, `${piece} far pool`);
    if (spec.kit === 'city') {
      assert.equal(near.geometry, source(`${piece}_lod0`).geometry);
      if (far) assert.equal(far.geometry, source(`${piece}_lod${spec.lods - 1}`).geometry, 'the last LOD');
    }
  }
  for (const mesh of pools()) assert.equal(mesh.frustumCulled, false, mesh.name);
  kit.update(route, 300, 'low');
  assert.equal(kit.group.visible, false, 'Low draws no kit');
  kit.update(route, 300, 'medium');
  assert.equal(kit.group.visible, true);
  kit.hide();
  assert.equal(kit.group.visible, false);
  kit.dispose();
});

test('the pools hold exactly what the plan puts in the window; spare instances are parked, never zero-scaled', () => {
  const { kit, pools } = rig();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (const [distance, quality] of [[1000, 'high'], [1000, 'medium'], [2500, 'high'], [3400, 'high'], [20, 'high']]) {
    kit.update(route, distance, quality);
    const want = expected(distance, quality);
    for (const mesh of pools()) {
      if (mesh.name.startsWith('skyline')) assert.ok(mesh.count <= (want[mesh.name] ?? 0), `${mesh.name}: towers too near another part of the road are left out`);
      else assert.equal(mesh.count, want[mesh.name] ?? 0, `${mesh.name} at ${distance} m on ${quality}`);
      assert.ok(mesh.count <= mesh.instanceMatrix.count, `${mesh.name} fits its pool`);
      for (let i = 0; i < mesh.instanceMatrix.count; i++) {
        matrixOf(mesh, i).decompose(p, q, s);
        assert.ok(s.x > 0 && s.y > 0 && s.z > 0);
        if (i >= mesh.count) assert.ok(p.y < -500, 'spare instances wait below the scene');
      }
    }
  }
  kit.dispose();
});

test('two laps evict chunks without new draws, leaks or disposing the GLB resources; the next lap is the same city', () => {
  const { scene, kit, city, landmarks, pools } = rig(), disposed = [];
  for (const source of [city, landmarks]) source.traverse(o => { if (o.isMesh) { o.geometry.addEventListener('dispose', () => disposed.push(o.name)); o.material.addEventListener('dispose', () => disposed.push(o.name)); } });
  const layer = pools(), towers = kit.group.getObjectByName('tower_glass_a:near');
  for (let d = 0; d < 8200; d += 13) {
    kit.update(route, d, 'high');
    const want = expected(d, 'high');
    for (const piece of ['tower_glass_a', 'shop_market_a', 'expressway_rail', 'rail_segment', 'street_lamp']) for (const band of ['near', 'far'])
      assert.equal(kit.group.getObjectByName(`${piece}:${band}`)?.count ?? 0, want[`${piece}:${band}`] ?? 0, `${piece}:${band} at ${d} m`);
  }
  assert.deepEqual(pools(), layer, 'the same pooled meshes while driving');
  const local = () => positions(towers).map(v => v.toArray().map(n => +n.toFixed(3)).join());
  kit.update(route, 250, 'high'); const first = local();
  kit.update(route, 4250, 'high');
  assert.deepEqual(local(), first, 'a tower stands on the same plot every lap');
  assert.equal(scene.children.length, 1);
  assert.deepEqual(disposed, []);
  kit.dispose();
  assert.deepEqual(disposed, [], 'the model cache handle owns the GLB resources');
  assert.equal(scene.children.length, 0);
});

test('street sides face the road on both sides, parapets turn their -X to it, and the portals stand on the centre line', () => {
  const { kit, pool } = rig();
  const along = (mesh, i, axis, metres) => new THREE.Vector3().setFromMatrixPosition(matrixOf(mesh, i)).add(new THREE.Vector3().setFromMatrixColumn(matrixOf(mesh, i), axis).normalize().multiplyScalar(metres));
  kit.update(route, 200, 'high');
  const towers = pool('tower_glass_a:near'), sides = new Set();
  assert.ok(towers.count >= 2);
  for (let i = 0; i < towers.count; i++) {
    const pivot = along(towers, i, 2, 0), front = along(towers, i, 2, 13.4);
    assert.ok(Math.abs(route.offset(front.x, front.z, 64) - 22) < .3, `tower ${i}: its +Z face is the 22 m building line`);
    sides.add(Math.sign(route.offset(pivot.x - 30, pivot.z, 64) - route.offset(pivot.x + 30, pivot.z, 64)));
  }
  assert.equal(sides.size, 2, 'both sides of the boulevard are built');
  kit.update(route, 1900, 'high'); // the expressway sweeper
  const rails = pool('expressway_rail:near');
  for (let i = 0; i < rails.count; i++) {
    const inner = along(rails, i, 0, -4);
    assert.ok(Math.abs(route.offset(inner.x, inner.z, 64) - 9.2) < .2, `parapet ${i}: local -X points at the road`);
  }
  const end = (i, z) => new THREE.Vector3(0, 0, z).applyMatrix4(matrixOf(rails, i)); // the modelled parapet spans z -6..6
  const ends = Array.from({ length: rails.count }, (_, i) => [end(i, -6), end(i, 6)]);
  let joined = 0;
  for (const [front] of ends) if (ends.some(([, back]) => front.distanceTo(back) < .05)) joined++;
  assert.ok(joined >= rails.count - 2, 'each 12 m parapet is stretched to meet the next one through the sweeper');
  kit.update(route, 500, 'high');
  const portals = positions(pool('rail_portal:near')).map(v => [v.x, v.z]);
  for (const lap of [478, 682]) assert.ok(portals.some(([x, z]) => Math.hypot(x - route.point(lap)[0], z - route.point(lap)[1]) < 1e-3), `portal at ${lap}`); // instance matrices are 32-bit
  const [x, z] = route.point(500);
  assert.deepEqual(kit.group.position.toArray().map(n => +n.toFixed(6)), [-x, 0, -z].map(n => +n.toFixed(6)), 'the kit follows the car like the road does');
  kit.dispose();
});

test('step 4: the lit pieces around the car are on the wet mirror layer; far bands, kerbs, trees and the skyline are not', () => {
  const { kit, pools } = rig();
  for (const mesh of pools()) {
    const [piece, band] = mesh.name.split(':');
    assert.equal(mesh.layers.isEnabled(REFLECT_LAYER), band === 'near' && NEON_PIECES[piece].mirror, mesh.name);
    assert.ok(mesh.layers.isEnabled(0), 'and every pool draws in the main view');
  }
  // N6: the mirror redraws every pool on its layer, so only what lights the street is on it.
  for (const piece of ['kerb_redwhite', 'cherry_tree', 'skyline_spire', 'railing', 'rail_segment', 'expressway_pier', 'canal_bank', 'rail_portal']) assert.equal(NEON_PIECES[piece].mirror, false, piece);
  for (const piece of ['sign_blade_a', 'billboard_b', 'shop_market_a', 'street_lamp', 'tower_glass_a', 'expressway_rail', 'canal_bridge_rail', 'plaza_sculpture']) assert.equal(NEON_PIECES[piece].mirror, true, piece);
  kit.dispose();
});

const FURNITURE = ['street_lamp', 'traffic_light', 'railing', 'kerb_redwhite', 'cherry_tree', 'sign_blade_a', 'sign_blade_b', 'sign_stack_a'];
test('N6: street furniture is one draw, LOD 0 and no far pool; buildings and landmarks keep a far band', () => {
  const { kit, pool } = rig();
  for (const piece of FURNITURE) {
    assert.equal(NEON_PIECES[piece].far, false, piece);
    assert.equal(pool(`${piece}:far`), undefined, `${piece} has no far pool`);
  }
  for (const piece of ['tower_glass_a', 'block_office_b', 'shop_market_b', 'billboard_a', 'expressway_rail', 'rail_segment', 'canal_bank']) assert.ok(pool(`${piece}:far`), `${piece} far pool`);
  kit.dispose();
});

// Fault (2026-11-15): furniture drew only 2 chunks ahead (lamps 3), so it popped in 240 to 480 m out, well inside the
// rain fog's view, while the buildings behind it already stood there. It now appears with them, at the window's end.
test('no street furniture pops in: every piece in the chunk window is drawn, as far ahead as the buildings', () => {
  const { kit, pool } = rig();
  for (const quality of ['high', 'medium']) for (let distance = 0; distance < 4000; distance += 97) {
    kit.update(route, distance, quality);
    const window = neonChunkWindow(distance, quality), want = {};
    for (let chunk = window.first; chunk < window.first + window.count; chunk++) for (const p of neonChunkPlan(chunk)) want[p.piece] = (want[p.piece] ?? 0) + 1;
    for (const piece of FURNITURE) assert.equal(pool(`${piece}:near`).count, want[piece] ?? 0, `${piece} at ${distance} m on ${quality}`);
  }
  kit.dispose();
});

// The race bloom (nightRain, the Neon env) and the two kits' lit texels at emissiveIntensity 1, linear luminance:
// city from its brief's table (strength 6: brightest blade-sign texel 5.98, cyan tube 4.0), landmarks from the
// lamp colours in its brief (cyan, its brightest lamp, sRGB 0.10, 0.95, 1.00). Fault (2026-11-15): city 2.4 put the
// sign and storefront peaks at 2.7x the bloom threshold, so the street fronts and the centre sightline washed white.
const linear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const CYAN = .2126 * linear(.10) + .7152 * linear(.95) + .0722 * linear(1);
const LIT = { city: { neon: 4 / 6, peak: 5.98 / 6 }, landmarks: { neon: CYAN, peak: CYAN } };
test('kit emissive: the neon tubes reach the bloom and the brightest texel stays within twice its threshold', () => {
  const { kit, city, landmarks } = rig(), { threshold } = COAST_ENV_VARIANTS[trackLook('neon').env.track].bloom;
  for (const [name, source] of [['city', city], ['landmarks', landmarks]]) {
    const intensity = source.getObjectByName(`${piecesOf(name)[0]}_lod0`).material.emissiveIntensity;
    assert.ok(LIT[name].neon * intensity >= threshold, `${name} ${intensity}: its neon glows (${(LIT[name].neon * intensity).toFixed(2)} >= ${threshold})`);
    assert.ok(LIT[name].peak * intensity <= 2 * threshold, `${name} ${intensity}: its brightest texel ${(LIT[name].peak * intensity).toFixed(2)} stays within ${2 * threshold}`);
  }
  kit.dispose();
});

test('N3: one ground mesh puts land under the city sectors and leaves the canal open under the expressway and the bridge', () => {
  const { kit } = rig();
  kit.update(route, 100, 'high');
  const ground = kit.group.getObjectByName('Neon ground'), at = ground.geometry.getAttribute('position'), v = new THREE.Vector3();
  assert.ok(ground.isMesh && !ground.isInstancedMesh);
  const top = [];
  for (let i = 0; i < at.count; i++) { v.fromBufferAttribute(at, i); if (v.y > -1) top.push(v.clone()); else assert.ok(Math.abs(v.y - NEON_GROUND.y + NEON_GROUND.depth) < 1e-4, 'the quay wall'); }
  const gap = lap => Math.min(...top.map(p => Math.hypot(p.x - route.point(lap)[0], p.z - route.point(lap)[1])));
  for (const lap of [100, 600, 1200, 3300, 3800]) assert.ok(gap(lap) < 16, `land beside the road at ${lap}`);
  for (const lap of [1800, 2100, 2400, 2800]) assert.ok(gap(lap) > 60, `open water at ${lap}`);
  for (const p of top) assert.ok(route.offset(p.x, p.z, 16) >= NEON_GROUND.inner - .2, 'never over the carriageway');
  const before = ground.geometry;
  kit.update(route, 2000, 'high');
  assert.equal(kit.group.getObjectByName('Neon ground').geometry, before, 'built once per route');
  let freed = false; before.addEventListener('dispose', () => { freed = true; });
  kit.dispose();
  assert.ok(freed, 'the ground is the layer\'s own');
});

test('one kit alone draws its own pools; detaching it removes them', () => {
  const scene = new THREE.Scene(), kit = createNeonScenery(scene);
  kit.attachKit('landmarks', fakeKit('landmarks'));
  kit.update(route, 500, 'high');
  const names = kit.group.children.filter(o => o.isInstancedMesh).map(o => o.name.split(':')[0]);
  assert.deepEqual([...new Set(names)].sort(), piecesOf('landmarks').sort());
  assert.equal(kit.group.getObjectByName('rail_portal:near').count, 2);
  kit.detachKit('landmarks');
  assert.equal(kit.group.children.filter(o => o.isInstancedMesh).length, 0);
  kit.update(route, 500, 'high');
  kit.dispose();
  assert.throws(() => createNeonScenery(new THREE.Scene()).attachKit('city', new THREE.Group()), /neon-city: missing mesh/);
});
