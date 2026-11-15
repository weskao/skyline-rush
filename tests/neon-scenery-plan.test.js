// Task 5b steps 5 to 7: where the Neon Downtown kits stand, against the two asset briefs' integration contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { NEON_CHUNK_METRES, NEON_GROUND, NEON_LAP, NEON_PIECES, NEON_RESERVED, NEON_SECTORS, NEON_SHORE, NEON_TILE, NEON_YARD, neonChunkPlan, neonChunkWindow, neonSector } from '../src/neon-scenery-plan.ts';
import { NEON_LANDMARKS_NOT_PLACED } from '../src/model-manifest-neon.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { RACE_TRACKS } from '../src/game.js';
import { ROAD_LIMIT } from '../src/game.js';
import { parseGlb } from '../scripts/assets/check-glb.mjs';

const landmarksGlb = await parseGlb(readFileSync(new URL('../public/models/neon-landmarks/neon-landmarks.glb', import.meta.url)));
landmarksGlb.scene.updateMatrixWorld(true);

const LAP_CHUNKS = 83;
/** Every placement of one lap, with its lap position. */
const lap = seed => Array.from({ length: LAP_CHUNKS }, (_, chunk) => neonChunkPlan(chunk, seed).map(p => ({ ...p, lap: chunk * NEON_CHUNK_METRES + p.along }))).flat();
const of = (plan, piece) => plan.filter(p => p.piece === piece).sort((a, b) => a.lap - b.lap);
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
const BUILDINGS = { tower_glass_a: 13.4, tower_glass_b: 10.2, block_retail_a: 7.5, block_office_b: 7.6, shop_market_a: 5.12, shop_market_b: 4.96 }; // pivot to street face (neon-city brief)
/** Pieces on the centre line; the gantry straddles every lane (clear span: tests/neon-landmarks-glb.test.js). */
const CENTRE = ['rail_portal', 'rail_segment', 'expressway_pier', 'canal_arch', 'boulevard_footbridge', 'harbour_gantry'];

test('the pieces are the modules of both manifests, with their LOD counts', () => {
  for (const [kit, id] of [['city', 'neon-city'], ['landmarks', 'neon-landmarks']]) {
    // not-yet-placed landmarks are guarded in neon-landmarks-glb.test.js until a change places them
    const nodes = MODEL_MANIFEST[id].nodes.filter(node => !NEON_LANDMARKS_NOT_PLACED.includes(node.replace(/_lod\d$/, ''))), pieces = Object.keys(NEON_PIECES).filter(piece => NEON_PIECES[piece].kit === kit);
    assert.deepEqual(pieces.sort(), nodes.filter(node => !/_lod\d$/.test(node)).sort(), id);
    for (const piece of pieces) assert.equal(NEON_PIECES[piece].lods, nodes.filter(node => node.startsWith(`${piece}_lod`)).length, piece);
  }
});

// Owner decision 2026-11-15: one 10 km lap, eight sectors. harbour and oldtown are provisional until concept art.
test('a lap is 83 whole chunks split into the eight sectors of the loop, each 600 to 1800 m', () => {
  assert.equal(NEON_LAP, 10000);
  near(NEON_CHUNK_METRES * LAP_CHUNKS, NEON_LAP, 'lap');
  assert.deepEqual(NEON_SECTORS.map(([, name]) => name), ['boulevard', 'underpass', 'market', 'expressway', 'harbour', 'canal', 'oldtown', 'plaza'], 'lap order');
  assert.deepEqual(NEON_SECTORS.map(([from]) => from), [0, 650, 1280, 2851, 4351, 5988, 7038, 8750]);
  NEON_SECTORS.forEach(([from, name], i) => {
    const length = (NEON_SECTORS[i + 1]?.[0] ?? NEON_LAP) - from;
    assert.ok(length >= 600 && length <= 1800, `${name}: ${length} m`);
  });
  for (const [metres, sector] of [[0, 'boulevard'], [649, 'boulevard'], [650, 'underpass'], [1279, 'underpass'], [1280, 'market'], [2851, 'expressway'], [4351, 'harbour'], [5987, 'harbour'], [5988, 'canal'], [7038, 'oldtown'], [8750, 'plaza'], [9700, 'plaza'], [9886, 'boulevard'], [10000 + 1500, 'market'], [-10, 'boulevard']])
    assert.equal(neonSector(metres), sector, `${metres} m`);
});

test('a finite race meets the same city every lap; an endless seed gives another city, and another each lap', () => {
  assert.deepEqual(neonChunkPlan(7), neonChunkPlan(7), 'deterministic');
  assert.deepEqual(neonChunkPlan(7 + LAP_CHUNKS), neonChunkPlan(7), 'the lap seam');
  assert.deepEqual(neonChunkPlan(-1), neonChunkPlan(LAP_CHUNKS - 1), 'the chunk behind the start line');
  assert.notDeepEqual(neonChunkPlan(1, 1001), neonChunkPlan(1, 2002));
  assert.notDeepEqual(neonChunkPlan(1, 1001), neonChunkPlan(1 + LAP_CHUNKS, 1001));
  const fixed = p => CENTRE.includes(p.piece) || p.piece.endsWith('_rail');
  for (const chunk of [6, 30, 54]) { // the rail viaduct, the expressway, the arch bridge
    assert.ok(neonChunkPlan(chunk).filter(fixed).length > 0, `chunk ${chunk} has landmarks`);
    assert.deepEqual(neonChunkPlan(chunk, 1001).filter(fixed), neonChunkPlan(chunk).filter(fixed), 'landmarks never move with the seed');
  }
});

test('no chunk asks for more of a piece than its pool holds, and every piece stands somewhere on the lap', () => {
  const seen = new Set();
  for (const seed of [undefined, 1, 77, 2002]) for (let chunk = 0; chunk < LAP_CHUNKS * 2; chunk++) {
    const counts = {};
    for (const p of neonChunkPlan(chunk, seed)) {
      counts[p.piece] = (counts[p.piece] ?? 0) + 1; seen.add(p.piece);
      for (const value of [p.along, p.offset, p.y, p.yaw]) assert.ok(Number.isFinite(value), p.piece);
      assert.ok(p.along >= -1 && p.along <= NEON_CHUNK_METRES + 1, `${p.piece} along ${p.along}`);
      assert.equal(p.span !== undefined, p.piece in NEON_TILE, `${p.piece} tiles`);
    }
    for (const [piece, count] of Object.entries(counts)) assert.ok(count <= NEON_PIECES[piece].cap, `${piece}: ${count} in chunk ${chunk}, seed ${seed}`);
  }
  assert.deepEqual([...seen].sort(), Object.keys(NEON_PIECES).sort());
});

test('nothing but the centre-line landmarks and the market kerb stands inside the kerbs, and building fronts keep a pavement', () => {
  for (const seed of [undefined, 5]) for (const p of lap(seed)) {
    if (CENTRE.includes(p.piece)) { assert.equal(p.offset, 0, p.piece); continue; }
    if (p.piece === 'kerb_redwhite') continue; // the road edge itself: its own test below
    assert.ok(Math.abs(p.offset) >= 13.2, `${p.piece} at ${p.offset} m, lap ${p.lap.toFixed(0)}`); // kerb outer edge 12.675 m
    if (p.piece in BUILDINGS) assert.ok(Math.abs(p.offset) - BUILDINGS[p.piece] >= 16.9, `${p.piece} front at lap ${p.lap.toFixed(0)}`);
    if (p.piece in BUILDINGS) near(p.yaw, -Math.sign(p.offset) * Math.PI / 2, `${p.piece} street side`);
  }
});

// The procedural road under the kits (classic-road-render.ts): white edge line 0.12 m wide at 11.5 m, kerb barrier
// 0.55 m wide and 0.76 m tall at 12.4 m. game.js keeps a car's centre within ROAD_LIMIT and its body within 1 m more.
const EDGE_LINE_OUTER = 11.5 + .12 / 2, BARRIER = [12.4 - .55 / 2, 12.4 + .55 / 2];
test('the market kerb is drawn once: on the road edge in front of the barrier, never on the pavement or under a car', () => {
  const kerbs = of(lap(), 'kerb_redwhite');
  assert.ok(kerbs.length > 0);
  for (const p of kerbs) { // the kit kerb is 1 m across (neon-city brief), its lip on the road side
    const inner = Math.abs(p.offset) - .5, outer = Math.abs(p.offset) + .5, where = `kerb at lap ${p.lap.toFixed(0)}`;
    assert.ok(inner >= EDGE_LINE_OUTER - 1e-6 && inner >= ROAD_LIMIT + 1, `${where}: clear of the edge line and the car (${inner})`);
    assert.ok(inner < BARRIER[0], `${where}: shows in front of the barrier, not doubled behind it (${inner})`);
    assert.ok(outer <= BARRIER[1], `${where}: ends inside the barrier, off the pavement (${outer})`);
    assert.ok(p.y > 0 && p.y <= .03, `${where}: just above the asphalt, so its 1 cm lip never fights it (${p.y})`);
  }
});

const parapets = (() => { // neon-landmarks.glb: the rail's concrete wall is 0.6 m wide; a lamp column (0.44 m) stands on it
  const top = {};
  for (const piece of ['expressway_rail', 'canal_bridge_rail']) {
    const mesh = landmarksGlb.scene.getObjectByName(`${piece}_lod1`), at = mesh.geometry.attributes.position, v = new Vector3();
    let y = -Infinity;
    for (let i = 0; i < at.count; i++) { v.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld); if (Math.abs(Math.abs(v.x) - .3) < .02) y = Math.max(y, v.y); }
    top[piece] = y;
  }
  return top;
})();
test('no street lamp stands over open water: on land on the pavement, on the expressway, the harbour corner and the canal bridge on the parapet wall', () => {
  const plan = lap(), rails = { expressway: 'expressway_rail', harbour: 'expressway_rail', canal: 'canal_bridge_rail' };
  assert.ok(of(plan, 'street_lamp').some(p => neonSector(p.lap) === 'harbour'), 'the harbour corner is lit');
  for (const p of of(plan, 'street_lamp')) {
    const where = `lamp at lap ${p.lap.toFixed(0)}`, rail = rails[neonSector(p.lap)];
    if (!rail) {
      assert.ok(p.lap < NEON_SHORE[0] || p.lap >= NEON_SHORE[1], `${where}: on land`);
      assert.ok(Math.abs(p.offset) > NEON_GROUND.inner && p.y === 0, `${where}: on the pavement`);
      continue;
    }
    const wall = of(plan, rail).find(r => Math.sign(r.offset) === Math.sign(p.offset) && Math.abs(r.lap - p.lap) <= r.span / 2);
    assert.ok(wall, `${where}: a parapet beside it`);
    assert.ok(Math.abs(Math.abs(p.offset) - Math.abs(wall.offset)) <= .3 - .22, `${where}: its column on the wall (${p.offset})`);
    assert.ok(Math.abs(p.y - parapets[rail]) <= .02, `${where}: stands on the wall top ${parapets[rail]}, not at ${p.y}`);
  }
});

test('N3, N7: the expressway, the harbour and the canal bridge stand over water; shops are the night market only', () => {
  const plan = lap(), wet = p => p.lap >= 2851 && p.lap < 7038, yard = p => p.lap >= 4351 && p.lap < 5594 && p.offset > 0;
  for (const p of plan) {
    if (p.piece in BUILDINGS || ['cherry_tree', 'railing', 'kerb_redwhite', 'traffic_light', 'sign_stack_a', 'billboard_a', 'billboard_b', 'sign_blade_a', 'sign_blade_b'].includes(p.piece))
      assert.ok(!wet(p) || p.lap < 2851.5, `${p.piece} over the water at ${p.lap.toFixed(0)}`);
    if (p.piece.startsWith('shop_market') || p.piece === 'kerb_redwhite') assert.equal(neonSector(p.lap), 'market', p.piece);
    if (p.piece.startsWith('skyline') && yard(p)) assert.ok(p.offset >= 170 && p.offset <= 240, 'the yard skyline stands on the yard land (reach 260)');
    else if (p.piece.startsWith('skyline') && wet(p)) assert.ok(Math.abs(p.offset) >= 300, 'the skyline stands across the water');
  }
  assert.ok(of(plan, 'shop_market_a').length + of(plan, 'shop_market_b').length >= 300, 'both sides of the 1571 m market street are lined');
  for (const side of [-1, 1]) for (const [shore, yaw] of [[NEON_SHORE[0], Math.PI / 2], [NEON_SHORE[1], -Math.PI / 2]]) {
    const quay = of(plan, 'canal_bank').filter(p => Math.sign(p.offset) === side && Math.abs(p.lap - shore) < 1e-6);
    assert.deepEqual(quay.map(p => Math.round(Math.abs(p.offset))).sort((a, b) => a - b), Array.from({ length: 12 }, (_, k) => 18 + 12 * k), `quay at ${shore}`);
    for (const p of quay) near(p.yaw, yaw, 'its +X faces the water');
  }
});

// Provisional sectors (owner decision 2026-11-15): no new GLB. The harbour reuses the expressway piers and the quay
// piece (6.5 m deep, x -3.5..3.0, +X to the water: assets-src/neon-landmarks/asset-brief.md); oldtown the city kit.
test('harbour: piers under the causeway, the quay promenade on the sea side, the container yard on land, parapets through its corner', () => {
  const plan = lap();
  const quay = side => of(plan, 'canal_bank').filter(p => Math.sign(p.offset) === side && Math.abs(Math.abs(p.offset) - 16.2) < 1e-6);
  assert.deepEqual(quay(-1).map(p => +p.lap.toFixed(3)), Array.from({ length: 103 }, (_, k) => 4357 + 12 * k), 'one quay piece per 12 m of the straight, 4351 to 5587');
  for (const p of quay(-1)) { near(p.yaw, Math.PI, 'its +X, the wall, faces the open water'); assert.ok(Math.abs(p.offset) - 3.5 >= 12.675, 'its promenade starts outside the kerb'); }
  assert.equal(quay(1).length, 0, 'the right of the straight is the yard: land, no quay wall');
  assert.deepEqual(NEON_YARD, [4351, 5594], 'the yard land runs the straight (neon-scenery.ts lays it)');
  for (const p of plan) if (neonSector(p.lap) === 'harbour' && p.lap >= 4352) {
    assert.ok(!(p.piece in BUILDINGS) && !['cherry_tree', 'railing', 'kerb_redwhite'].includes(p.piece), `${p.piece} on the quay at ${p.lap.toFixed(0)}`);
    if (p.piece === 'street_lamp') assert.ok(p.lap >= 5588, 'the quay has its own bollard lamps: street lamps only on the corner parapet');
    if (p.piece === 'expressway_rail') assert.ok(p.lap >= 5588, 'no parapet hides the water along the quay');
    // The corner's right looks 213-452 m over open water to the canal bridge: a tower there stood in the sea too.
    if (p.piece.startsWith('skyline')) assert.ok(p.offset > 0 && p.lap < NEON_YARD[1], `no tower in the open sea (${p.offset.toFixed(0)} m at ${p.lap.toFixed(0)})`);
  }
});

const neon = RACE_TRACKS.neon, RINGS = neon.ringLines.flat().map(([distance]) => distance);
/** Section signs stand 65 m before each section (classic-road-render.ts). */
const SIGNS = neon.sections.map(s => s.from - 65);
test('harbour landmarks: three gantries over the straight, containers along the yard quay, the ship moored under a boom', () => {
  for (const seed of [undefined, 4]) {
    const plan = lap(seed), gantries = of(plan, 'harbour_gantry'), stacks = of(plan, 'container_stack'), [ship] = of(plan, 'cargo_ship');
    assert.deepEqual(gantries.map(p => +p.lap.toFixed(3)), [4980, 5240, 5500], '260 m apart over the 1237 m straight');
    for (const g of gantries) {
      near(g.yaw, Math.PI, 'the boom over the water on the left'); near(g.y, 0, 'at road level');
      for (const d of [...RINGS, ...SIGNS]) assert.ok(Math.abs(d - g.lap) >= 40, `a ring or section sign at ${d}, ${g.lap - d} m from a gantry`);
    }
    assert.deepEqual(stacks.map(p => +p.lap.toFixed(3)), Array.from({ length: 41 }, (_, k) => 4372 + 30 * k), 'one per 30 m along the yard');
    stacks.forEach((p, k) => { near(p.offset, 27, 'land side, clear of the stair tower'); near(p.yaw, k % 2 ? Math.PI : 0, 'alternate ends'); });
    assert.equal(of(plan, 'cargo_ship').length, 1);
    near(ship.lap, 5560, 'ship'); near(ship.offset, -40, 'centre line 40 m out'); near(ship.y, -6, 'pivot at the waterline (the sea plane, classic-backdrop.ts)');
    assert.ok(Math.abs(ship.lap - 5500) <= 80.95, 'under the last boom');
  }
});

test('oldtown: on land, low blocks on a 20 m building line, a sign on most plots, trees, no tower, shop or billboard screen', () => {
  const old = lap().filter(p => neonSector(p.lap) === 'oldtown'), count = piece => old.filter(p => p.piece === piece).length;
  for (const p of old) {
    assert.ok(!p.piece.startsWith('tower_glass') && !p.piece.startsWith('shop_market') && !p.piece.endsWith('_rail') && p.piece !== 'expressway_pier', `${p.piece} at ${p.lap.toFixed(0)}`);
    if (p.piece in BUILDINGS) near(Math.abs(p.offset) - BUILDINGS[p.piece], 20, `${p.piece} building line`);
  }
  const blocks = count('block_retail_a') + count('block_office_b');
  assert.ok(blocks >= 70, `both sides are built (${blocks})`);
  assert.ok(count('sign_blade_a') + count('sign_blade_b') >= blocks * .75, 'signs on most plots');
  assert.ok(count('cherry_tree') >= 70, 'trees down both sides');
});

test('the oldtown reserved footprint holds only its stand-in, a square with a screen and trees; the harbour one is placed', () => {
  assert.deepEqual(NEON_RESERVED, { oldtown: { lap: 7655, offset: -42, along: 60, across: 40 } });
  assert.equal(neonSector(NEON_RESERVED.oldtown.lap), 'oldtown');
  const inside = (p, { lap: at, offset, along, across }) => Math.abs(p.lap - at) <= along / 2 && Math.abs(p.offset - offset) <= across / 2;
  for (const seed of [undefined, 3]) {
    const old = lap(seed).filter(p => inside(p, NEON_RESERVED.oldtown));
    assert.deepEqual([...new Set(old.map(p => p.piece))].sort(), ['billboard_a', 'cherry_tree']);
    assert.equal(old.filter(p => p.piece === 'billboard_a').length, 1);
  }
});

test('N5 and the landmarks contract: portals, rail segments, piers, parapets, arch, sculpture and footbridges at their lap positions', () => {
  const plan = lap(), at = piece => of(plan, piece).map(p => +p.lap.toFixed(3));
  assert.deepEqual(at('rail_portal'), [698, 902]);
  assert.deepEqual(of(plan, 'rail_portal').map(p => +p.yaw.toFixed(4)), [0, +Math.PI.toFixed(4)], 'the far portal faces back');
  assert.deepEqual(at('rail_segment'), Array.from({ length: 16 }, (_, k) => 711.875 + 11.75 * k));
  assert.deepEqual(at('expressway_pier'), Array.from({ length: 87 }, (_, k) => 2869 + 36 * k), 'under the expressway and the harbour');
  assert.deepEqual(at('canal_arch'), [6500]);
  assert.deepEqual(at('boulevard_footbridge'), [150, 330]);
  const [sculpture] = of(plan, 'plaza_sculpture');
  assert.equal(of(plan, 'plaza_sculpture').length, 1);
  near(sculpture.lap, 9400, 'sculpture'); assert.ok(sculpture.offset <= -30, 'at least 30 m left of the centre line');
  const run = (first, last) => Array.from({ length: (last - first) / 12 + 1 }, (_, k) => first + 12 * k);
  for (const [piece, runs] of [['expressway_rail', [[2857, 4345], [5594, 5978]]], ['canal_bridge_rail', [[5990, 7034]]]]) for (const side of [-1, 1]) {
    const row = of(plan, piece).filter(p => Math.sign(p.offset) === side);
    assert.deepEqual(row.map(p => +p.lap.toFixed(3)), runs.flatMap(([first, last]) => run(first, last)), `${piece} leaves no gap`);
    for (const p of row) { near(Math.abs(p.offset), 13.2, piece); near(p.yaw, side > 0 ? 0 : Math.PI, `${piece}: local -X faces the road`); assert.equal(p.span, 12); }
  }
});

test('the underpass and the sculpture court are kept clear', () => {
  for (const seed of [undefined, 9]) for (const p of lap(seed)) {
    const rail = p.piece === 'rail_portal' || p.piece === 'rail_segment';
    if (p.lap >= 690 && p.lap < 910 && !rail) assert.ok(Math.abs(p.offset) >= 30, `${p.piece} inside the rail embankment at ${p.lap.toFixed(0)}`);
    if (p.lap >= 9345 && p.lap < 9455 && p.offset < 0 && (p.piece in BUILDINGS || p.piece === 'cherry_tree')) assert.fail(`${p.piece} in the sculpture court`);
    if (Math.abs(p.lap - 150) < 8 || Math.abs(p.lap - 330) < 8) assert.ok(p.piece === 'boulevard_footbridge' || Math.abs(p.offset) >= 14 || p.span, `${p.piece} under a footbridge`);
  }
});

test('chunk window: one chunk behind, more ahead on High than Medium, nothing on Low', () => {
  assert.equal(neonChunkWindow(250, 'low'), null);
  const medium = neonChunkWindow(250, 'medium'), high = neonChunkWindow(250, 'high');
  assert.deepEqual([medium.first, high.first], [1, 1]);
  assert.ok(high.count > medium.count);
  assert.equal(neonChunkWindow(10, 'high').first, -1);
});
