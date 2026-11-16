// Task 5b steps 5 to 7: where the Neon Downtown kits stand, against the two asset briefs' integration contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { NEON_CHUNK_METRES, NEON_GROUND, NEON_LAP, NEON_PIECES, NEON_SECTORS, NEON_SHORE, NEON_SQUARE, NEON_TILE, NEON_YARD, neonChunkPlan, neonChunkWindow, neonSector } from '../src/neon-scenery-plan.ts';
import { NEON_LANDMARKS_NOT_PLACED } from '../src/model-manifest-neon.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { RACE_TRACKS } from '../src/game.js';
import { ROAD_LIMIT } from '../src/game.js';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { CLASSIC_THEMED_PLACEMENTS } from '../src/track-themes-classic.ts';
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
const CENTRE = ['rail_portal', 'rail_segment', 'expressway_pier', 'canal_arch', 'boulevard_footbridge', 'harbour_gantry', 'oldtown_gate'];
/** The oldtown square's footprint (NEON_SQUARE), grown by `margin` metres. */
const inSquare = (p, margin = 0) => Math.abs(p.lap - 7655) <= 30 + margin && Math.abs(p.offset + 42) <= 20 + margin;
/** The square's end terraces face into it, not the road. */
const terrace = p => p.piece.startsWith('shop_market') && inSquare(p, 12) && Math.abs(Math.sin(p.yaw)) < 1e-9;

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
    if (p.piece === 'lantern_span' && p.offset === 0) continue; // strung over the road: the oldtown landmarks test below
    assert.ok(Math.abs(p.offset) >= 13.2, `${p.piece} at ${p.offset} m, lap ${p.lap.toFixed(0)}`); // kerb outer edge 12.675 m
    if (p.piece in BUILDINGS) assert.ok(Math.abs(p.offset) - BUILDINGS[p.piece] >= 16.9, `${p.piece} front at lap ${p.lap.toFixed(0)}`);
    if (p.piece in BUILDINGS && !terrace(p)) near(p.yaw, -Math.sign(p.offset) * Math.PI / 2, `${p.piece} street side`);
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

test('N3, N7: the expressway, the harbour and the canal bridge stand over water; shops are the night market and oldtown only', () => {
  const plan = lap(), wet = p => p.lap >= 2851 && p.lap < 7038, yard = p => p.lap >= 4351 && p.lap < 5594 && p.offset > 0;
  // The canal's glass towers stand on its far shore with the skyline, never in the water beside the bridge (their own test below).
  const farShore = p => p.piece.startsWith('tower_glass') && neonSector(p.lap) === 'canal' && Math.abs(p.offset) >= 300;
  for (const p of plan) {
    if (p.piece in BUILDINGS || ['cherry_tree', 'railing', 'kerb_redwhite', 'traffic_light', 'sign_stack_a', 'billboard_a', 'billboard_b', 'sign_blade_a', 'sign_blade_b'].includes(p.piece))
      assert.ok(!wet(p) || p.lap < 2851.5 || farShore(p), `${p.piece} over the water at ${p.lap.toFixed(0)}`);
    if (p.piece === 'kerb_redwhite') assert.equal(neonSector(p.lap), 'market', p.piece);
    if (p.piece.startsWith('shop_market')) assert.ok(['market', 'oldtown'].includes(neonSector(p.lap)), `${p.piece} at ${p.lap.toFixed(0)}`);
    if (p.piece.startsWith('skyline') && yard(p)) assert.ok(p.offset >= 170 && p.offset <= 240, 'the yard skyline stands on the yard land (reach 260)');
    else if (p.piece.startsWith('skyline') && wet(p)) assert.ok(Math.abs(p.offset) >= 300, 'the skyline stands across the water');
  }
  assert.ok(plan.filter(p => p.piece.startsWith('shop_market') && neonSector(p.lap) === 'market').length >= 300, 'both sides of the 1571 m market street are lined');
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
const route = classicRoadRoute('neon');
/** Degrees between the driver's heading at lap `from` and a placement. */
const bearing = (from, p) => {
  const [x, z] = route.point(from), [fx, fz] = route.point(from + 1), [px, pz] = route.point(p.lap, p.offset);
  return (Math.atan2(px - x, pz - z) - Math.atan2(fx - x, fz - z) + 3 * Math.PI) % (2 * Math.PI) / Math.PI * 180 - 180;
};
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

// Owner brief 2026-11-15: oldtown read like the boulevard (36 m office blocks, blade signs, a tree every 40 m), with
// bare paving on the inside of every bend, where half the 30 m plots are left out. It is now the kit's lowest pieces.
test('oldtown: timber shops on a 17.5 m line down both sides with no gap on the inside of a bend; no block, tower, neon sign, screen or market kerb', () => {
  // The first plaza block stands on the sector line (plot centre 8750, 12.3 m each way, its sign 6 m before it).
  const old = lap().filter(p => neonSector(p.lap) === 'oldtown' && p.lap < 8737), road = classicRoadRoute('neon'), WIDTH = 8.9; // shop_market_a: x -4.45..4.45
  for (const p of old) assert.ok(!/^(tower_glass|block_|sign_|billboard|kerb_|traffic_)/.test(p.piece) && !p.piece.endsWith('_rail') && p.piece !== 'expressway_pier', `${p.piece} at ${p.lap.toFixed(0)}`);
  for (const side of [-1, 1]) {
    const row = old.filter(p => p.piece in BUILDINGS && Math.sign(p.offset) === side && Math.abs(Math.abs(p.offset) - BUILDINGS[p.piece] - 17.5) < 1e-6).sort((a, b) => a.lap - b.lap);
    assert.ok(row.length >= 150 && row[0].lap < 7080 && row.at(-1).lap > 8725, `side ${side}: ${row.length} shops from the gate to the first plaza block`);
    for (let i = 1; i < row.length; i++) {
      const a = row[i - 1], b = row[i], where = `side ${side}, lap ${a.lap.toFixed(0)} to ${b.lap.toFixed(0)}`;
      if (side < 0 && a.lap < 7625 && b.lap > 7685) continue; // the square opens off the street
      const gap = line => { const [ax, az] = road.point(a.lap, side * line), [bx, bz] = road.point(b.lap, side * line); return Math.hypot(bx - ax, bz - az) - WIDTH; };
      assert.ok(gap(17.5) > -.4 && gap(17.5) < 3, `${where}: ${gap(17.5).toFixed(2)} m between the fronts`);
      assert.ok(gap(26.8) > -.6, `${where}: the backs run ${(-gap(26.8)).toFixed(2)} m into each other`);
    }
  }
  const trees = old.filter(p => p.piece === 'cherry_tree'), lamps = old.filter(p => p.piece === 'street_lamp');
  assert.ok(trees.length >= 10 && lamps.length >= 20, 'trees and lamps on the corners either side of the S-bends');
  for (const p of [...trees.filter(p => !inSquare(p)), ...lamps]) assert.ok(p.lap < 7338 || p.lap >= 8288, `${p.piece} under the lanterns at ${p.lap.toFixed(0)}`);
});

// world.js stands a section sign 65 m before each section, 17 m left of the centre line: a pole and an 8 m panel
// (13 to 21 m out, 4.25 to 5.75 m up). The rooftop shortcut's would otherwise stand half inside the 17.5 m shop row.
const SHORTCUT_SIGN = RACE_TRACKS.neon.sections.find(s => s.type === 'shortcut' && neonSector(s.from) === 'oldtown').from - 65;
// Owner brief 2026-11-16: the two shops stood 4 m back, a notch in the row. The row stays on its line and opens a lane for the panel.
test('oldtown: the rooftop shortcut sign stands in a lane between two shops of the unbroken row', () => {
  assert.equal(SHORTCUT_SIGN, 8225);
  const road = classicRoadRoute('neon'), [sx, sz] = road.point(SHORTCUT_SIGN, -17.5);
  for (const seed of [undefined, 1001]) {
    const row = lap(seed).filter(p => p.piece in BUILDINGS && p.offset < 0 && p.offset > -40 && Math.abs(p.lap - SHORTCUT_SIGN) < 15).sort((a, b) => a.lap - b.lap);
    for (const p of row) near(-p.offset - BUILDINGS[p.piece], 17.5, `shop at ${p.lap.toFixed(1)} on the street line`);
    const clear = row.map(p => { const [x, z] = road.point(p.lap, -17.5); return Math.hypot(x - sx, z - sz) - 4.45; });
    assert.ok(clear.every(d => d >= .5), `a shop front within half a metre of the panel: ${clear.map(d => d.toFixed(2))}`);
    assert.ok(Math.min(...clear) < 1.5, `the lane is a lane, not a gap: ${Math.min(...clear).toFixed(2)} m`);
  }
});

test('oldtown landmarks: the gate at the sector entry, a lantern string every 24 m through the S-bends, the clock tower on the square', () => {
  const plan = lap(), gates = of(plan, 'oldtown_gate'), towers = of(plan, 'clock_tower'), spans = of(plan, 'lantern_span').filter(p => p.offset === 0);
  assert.deepEqual(gates.map(p => [p.offset, p.yaw, p.y]), [[0, 0, 0]], 'one gate, on the centre line, yaw = heading');
  const [gate] = gates, [tower] = towers;
  assert.ok(gate.lap >= NEON_SHORE[1] + 3.5 + 2.71 && gate.lap <= 7038 + 30, `just after the canal bridge, its plinths clear of the quay (${gate.lap})`);
  assert.deepEqual(spans.map(p => +p.lap.toFixed(3)), Array.from({ length: 40 }, (_, k) => 7345 + 24 * k), 'the S-bends, 7338 to 8288');
  for (const p of spans) assert.deepEqual([p.yaw, p.y], [0, 0]);
  // Gameplay keeps its space: no straddling piece at a gameplay prop or over a shortcut corridor (tests/neon-parity.test.js).
  const props = CLASSIC_THEMED_PLACEMENTS.neon.filter(p => p.type !== 'cone'), shortcuts = RACE_TRACKS.neon.sections.filter(s => s.type === 'shortcut');
  for (const p of [gate, ...spans]) {
    for (const prop of props) assert.ok(Math.abs(prop.distance - p.lap) >= 10, `${p.piece} at ${p.lap} stands at ${prop.id}`);
    for (const s of shortcuts) assert.ok(p.lap < s.from || p.lap > s.to, `${p.piece} at ${p.lap} over the shortcut corridor`);
  }
  assert.equal(towers.length, 1);
  near(tower.yaw, Math.PI, 'its -X faces the road');
  assert.ok(inSquare(tower) && tower.lap > 7655 && tower.offset <= -30, `on the square, at its far end (${tower.lap}, ${tower.offset})`);
  // Owner brief 2026-11-16: 45 m out at the square's middle it stood at the edge of view and passed small.
  for (const [from, most] of [[7450, 20], [7550, 20], [7630, 45]]) assert.ok(Math.abs(bearing(from, tower)) <= most, `from ${from} the tower is ${bearing(from, tower).toFixed(0)} degrees off the heading`);
  for (const p of plan) { // nothing stands in a plinth (18.6 m out, 2.71 m deep), a pole (15.42 m out) or the tower (10.6 m square)
    if (p === gate || p === tower || p.piece === 'railing' || p.piece.startsWith('skyline')) continue;
    const front = Math.abs(p.offset) - (BUILDINGS[p.piece] ?? 0), where = `${p.piece} at lap ${p.lap.toFixed(0)}, ${p.offset} m`;
    assert.ok(Math.abs(p.lap - gate.lap) >= 7.5 || front >= 19 || front < 1, `${where}: in the gate`);
    if (p.piece !== 'lantern_span' && !inSquare(p, 14)) assert.ok(spans.every(span => Math.abs(p.lap - span.lap) >= 3) || front >= 16.5, `${where}: in a lantern pole`);
    assert.ok(Math.abs(p.lap - tower.lap) >= 7 || Math.abs(p.offset - tower.offset) >= 9, `${where}: in the clock tower`);
  }
});

test('the oldtown square is a place: the tower between two lantern strings and four trees, shop fronts on three sides, open to the street', () => {
  assert.deepEqual(NEON_SQUARE, { lap: 7655, offset: -42, along: 60, across: 40 });
  assert.equal(neonSector(NEON_SQUARE.lap), 'oldtown');
  for (const seed of [undefined, 3]) {
    const plan = lap(seed), inside = plan.filter(p => inSquare(p)), count = piece => inside.filter(p => p.piece === piece).length;
    assert.deepEqual([...new Set(inside.map(p => p.piece))].sort(), ['cherry_tree', 'clock_tower', 'lantern_span']);
    assert.deepEqual([count('clock_tower'), count('lantern_span'), count('cherry_tree')], [1, 2, 4]);
    const shops = plan.filter(p => p.piece.startsWith('shop_market') && inSquare(p, 12) && p.offset < -30);
    const back = shops.filter(p => !terrace(p)), ends = [Math.PI, 0].map(yaw => shops.filter(p => terrace(p) && Math.abs(Math.cos(p.yaw) - Math.cos(yaw)) < 1e-9));
    assert.ok(back.length >= 8, `${back.length} shops along the back`);
    for (const p of back) near(-p.offset - BUILDINGS[p.piece], 62, 'the back row fronts stand on the footprint edge, facing the road');
    assert.ok(ends[0].length >= 3 && ends[0].every(p => p.lap < 7625), 'the near terrace, fronts toward the square');
    assert.ok(ends[1].length >= 3 && ends[1].every(p => p.lap > 7685), 'the far terrace, fronts toward the oncoming driver');
    assert.ok(!plan.some(p => p.piece in BUILDINGS && p.offset < 0 && p.offset > -30 && Math.abs(p.lap - 7655) < 30), 'no shop between the street and the square');
    const [tower] = of(plan, 'clock_tower');
    for (const p of inside) if (p !== tower) assert.ok(Math.abs(p.lap - tower.lap) >= 5.3 + (p.piece === 'cherry_tree' ? 3.4 : .45) || Math.abs(p.offset - tower.offset) >= 5.3 + 3.4, `${p.piece} at ${p.lap.toFixed(0)} in the tower`);
    // Its street edge is a stone apron (the quay piece: promenade, amber bollards, its railing on the road side), not bare paving.
    const apron = of(plan, 'canal_bank').filter(p => p.lap > 7600 && p.lap < 7700);
    assert.deepEqual(apron.map(p => [+p.lap.toFixed(3), p.offset, p.yaw]), [7631, 7643, 7655, 7667, 7679].map(lap => [lap, -17.1, 0]));
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

test('the underpass and the footbridges are kept clear', () => {
  for (const seed of [undefined, 9]) for (const p of lap(seed)) {
    const rail = p.piece === 'rail_portal' || p.piece === 'rail_segment';
    if (p.lap >= 690 && p.lap < 910 && !rail) assert.ok(Math.abs(p.offset) >= 30, `${p.piece} inside the rail embankment at ${p.lap.toFixed(0)}`);
    if (Math.abs(p.lap - 150) < 8 || Math.abs(p.lap - 330) < 8) assert.ok(p.piece === 'boulevard_footbridge' || Math.abs(p.offset) >= 14 || p.span, `${p.piece} under a footbridge`);
  }
});

// Owner brief 2026-11-15: the sculpture stood small on a bare slab, 36 m out with nothing behind it.
test('the sculpture court is the finale of the lap: the sculpture 30 m out, glass towers closing the court behind it, screens between them, two rows of trees', () => {
  for (const seed of [undefined, 9]) {
    const court = lap(seed).filter(p => p.lap >= 9335 && p.lap < 9461 && p.offset < 0), count = piece => court.filter(p => p.piece === piece).length;
    const [sculpture] = court.filter(p => p.piece === 'plaza_sculpture');
    near(sculpture.offset, -30, 'sculpture');
    for (const p of court) {
      if (p.piece in BUILDINGS) assert.ok(p.piece === 'tower_glass_a' && -p.offset - BUILDINGS[p.piece] >= 44, `${p.piece} at ${p.lap.toFixed(0)}: the court stays open 44 m deep`);
      if (p !== sculpture && !p.piece.startsWith('skyline')) assert.ok(Math.abs(p.lap - 9400) >= 12 || p.offset > -16 || p.offset <= -50, `${p.piece} on or in front of the sculpture`);
    }
    assert.deepEqual([count('tower_glass_a'), count('billboard_a'), count('cherry_tree')], [3, 2, 6]);
  }
});

// Owner brief 2026-11-15: the straight after the tunnel (950 to 1280) was block_office_b on every plot of both sides.
test('the underpass straight is not one block repeated: three kinds a side, no two neighbours or facing plots alike, signs; the embankment corner keeps its set-back offices', () => {
  for (const seed of [undefined, 4]) {
    const plan = lap(seed), blocks = plan.filter(p => p.piece in BUILDINGS && neonSector(p.lap) === 'underpass');
    for (const p of blocks.filter(p => p.lap < 950)) { assert.equal(p.piece, 'block_office_b'); near(Math.abs(p.offset) - BUILDINGS[p.piece], 34, 'embankment line'); }
    const sides = [-1, 1].map(side => blocks.filter(p => p.lap >= 950 && Math.sign(p.offset) === side).sort((a, b) => a.lap - b.lap).map(p => p.piece));
    for (const row of sides) {
      assert.equal(row.length, 10, 'a block on every plot');
      assert.ok(new Set(row).size >= 3, `kinds: ${[...new Set(row)]}`);
      row.forEach((piece, i) => { if (i) assert.notEqual(piece, row[i - 1], `plot ${i} repeats its neighbour`); });
    }
    sides[0].forEach((piece, i) => assert.notEqual(piece, sides[1][i], `plot ${i}: the same block on both sides`));
    assert.ok(plan.some(p => p.piece.startsWith('sign_blade') && p.lap >= 950 && p.lap < 1280), 'signs on the straight');
  }
});

// Owner brief 2026-11-16, the plain stretches of the lap seen from the driver's seat. Placement and dressing only.
const tiles = (plan, side) => of(plan, 'railing').filter(p => Math.sign(p.offset) === side).map(p => [p.lap - p.span / 2, p.lap + p.span / 2]);
test('the street railing stops at the oldtown gate plinths and at the stone aprons, and runs on unbroken elsewhere', () => {
  const plan = lap(), [gate] = of(plan, 'oldtown_gate'), plinth = [gate.lap - 2.71 - .2, gate.lap + 2.71 + .2];
  for (const side of [-1, 1]) {
    const runs = tiles(plan, side);
    assert.ok(!runs.some(([a, b]) => b > plinth[0] + 1e-6 && a < plinth[1] - 1e-6), `side ${side}: a railing runs into a gate plinth`);
    for (const end of plinth) assert.ok(runs.some(([a, b]) => Math.abs(a - end) < 1e-6 || Math.abs(b - end) < 1e-6), `side ${side}: the railing meets the plinth at ${end}`);
  }
  for (const apron of of(plan, 'canal_bank').filter(p => Math.abs(p.offset + 17.1) < 1e-6)) {
    assert.ok(!tiles(plan, -1).some(([a, b]) => b > apron.lap - 6 + 1e-6 && a < apron.lap + 6 - 1e-6), `a street railing through the apron at ${apron.lap}`);
  }
  const length = side => tiles(plan, side).reduce((sum, [a, b]) => sum + b - a, 0);
  assert.ok(Math.abs(length(1) - length(-1) - 60 - 48) < 1e-6, 'the left gives up only the square and the court aprons (60 m and 48 m)');
});

test('beside the rooftop shortcut (8288 to 8737) the lantern strings run on along both pavements, clear of the corridor and the flight ceiling', () => {
  const plan = lap(), lamps = of(plan, 'street_lamp'), trees = of(plan, 'cherry_tree');
  for (const side of [-1, 1]) {
    const strings = of(plan, 'lantern_span').filter(p => Math.abs(p.offset - side * 16.2) < 1e-6);
    assert.ok(strings.length >= 9 && strings[0].lap < 8340 && strings.at(-1).lap > 8690, `side ${side}: ${strings.length} strings`);
    for (const p of strings) {
      near(Math.abs(p.yaw), Math.PI / 2, 'strung along the street');
      assert.ok(p.lap - 15.42 >= 8288 && p.lap + 15.42 <= 8737, `string at ${p.lap.toFixed(0)} leaves the street`);
      for (const pole of [p.lap - 15.42, p.lap + 15.42]) for (const q of [...lamps, ...trees].filter(q => Math.sign(q.offset) === side))
        assert.ok(Math.abs(q.lap - pole) >= (q.piece === 'cherry_tree' ? 3.6 : 2), `pole at ${pole.toFixed(0)} in a ${q.piece}`);
    }
    for (let i = 1; i < strings.length; i++) assert.ok(strings[i].lap - strings[i - 1].lap <= 42, 'no bare run between the strings');
  }
  // The corridor (x -7.5 m, 6 m up, 2.5 m tolerance) and the 13.2 m flight ceiling: the string's lowest lantern is 14 m up, 16 m out.
  for (const p of of(plan, 'lantern_span')) if (p.offset) assert.ok(Math.abs(p.offset) - .45 > 7.5 + 2.5 + 5, `string at ${p.offset}`);
});

test('the sculpture reads as the finale: half again its modelled size, a stone apron along the court with an opening on its axis', () => {
  for (const seed of [undefined, 9]) {
    const plan = lap(seed), [sculpture] = of(plan, 'plaza_sculpture');
    assert.equal(sculpture.scale, 1.5, 'a 22.6 m sculpture');
    assert.ok(Math.atan2(15.07 * sculpture.scale, Math.abs(9280 - sculpture.lap)) > .17, 'tall in the view from the plaza entry');
    assert.ok(-sculpture.offset - 7 * sculpture.scale >= 16, 'its plinth clear of the pavement');
    const apron = of(plan, 'canal_bank').filter(p => p.lap > 9300);
    assert.deepEqual(apron.map(p => [+p.lap.toFixed(3), p.offset, p.yaw]), [9346, 9358, 9442, 9454].map(lap => [lap, -17.1, 0]));
    for (const p of plan) if (p.scale !== undefined) assert.ok(p.piece === 'plaza_sculpture' || p.piece.startsWith('tower_glass') && neonSector(p.lap) === 'canal' && Math.abs(p.offset) >= 300, `only the sculpture and the canal's far-shore towers are scaled (${p.piece} at ${p.lap.toFixed(0)})`);
  }
});

// Closing audit 2026-11-16: the court's near tree row and the last pavement tree stood on the line from every lane to
// the plinth, so the lit rings and lower blades stayed hidden until the car was alongside (rule 19: check it from the seat).
test('the sculpture shows on the approach: from 200 m out no tree or screen stands between a lane and its plinth', () => {
  assert.ok(Math.abs(bearing(9200, { lap: 9400, offset: 0 })) < .5, 'the plaza straight is straight on the approach');
  for (const seed of [undefined, 9]) {
    const plan = lap(seed), [sculpture] = of(plan, 'plaza_sculpture');
    const dressing = plan.filter(p => (p.piece === 'cherry_tree' || p.piece.startsWith('billboard')) && p.offset < 0 && p.lap > 9300 && p.lap < sculpture.lap);
    assert.ok(dressing.filter(p => p.piece === 'cherry_tree').length >= 3, 'the court keeps its near trees');
    for (const from of [9200, 9250, 9300, 9340]) for (const lane of [-7.5, -2.5, 2.5, 7.5]) for (const p of dressing.filter(p => p.lap > from)) {
      const sight = lane + (sculpture.offset - lane) * (p.lap - from) / (sculpture.lap - from); // the line to the plinth's middle, at p's lap
      assert.ok(Math.abs(p.offset - sight) >= 3.4 + 2, `${p.piece} at ${p.lap.toFixed(0)}, ${p.offset} m: on the sightline from ${from}, lane ${lane} (${sight.toFixed(1)} m)`);
    }
  }
});

test('the underpass straight: each block kind has its own street front, so the shared podium never repeats unbroken', () => {
  for (const seed of [undefined, 4]) {
    const plan = lap(seed), dressing = { block_office_b: 'cherry_tree', block_retail_a: 'sign_stack_a', tower_glass_b: 'billboard_a' };
    const blocks = plan.filter(p => p.piece in dressing && p.lap >= 950 && p.lap < 1280 && Math.abs(p.offset) < 40);
    assert.ok(blocks.length >= 18);
    for (const b of blocks) assert.ok(plan.some(p => p.piece === dressing[b.piece] && Math.sign(p.offset) === Math.sign(b.offset) && Math.abs(p.lap - b.lap) <= 10 && Math.abs(p.offset) < 22),
      `${b.piece} at ${b.lap.toFixed(0)} has no ${dressing[b.piece]}`);
  }
});

// Closing audit entry 6 (2026-11-16): every podium on the straight was one painter's flat-headed glazed bays, in two
// colours (build.py's bay shape: 0.772 of the run open at eye height and 0.789 under the fascia on all three kinds),
// so the shopfront repeated down both sides however the blocks above and the street dressing differed.
test('the underpass straight: no three plots in a row on either side share one podium bay shape', () => {
  const { podium } = JSON.parse(readFileSync(new URL('../assets-src/neon-city/summary.json', import.meta.url), 'utf8'));
  const same = (a, b) => Math.abs(podium[a].low - podium[b].low) < .2 && Math.abs(podium[a].high - podium[b].high) < .2;
  for (const seed of [undefined, 4]) for (const side of [-1, 1]) {
    const row = lap(seed).filter(p => p.piece in podium && p.lap >= 950 && p.lap < 1280 && Math.abs(p.offset) < 40 && Math.sign(p.offset) === side).sort((a, b) => a.lap - b.lap);
    assert.ok(row.length >= 9, `${row.length} podiums on side ${side}`);
    for (let i = 2; i < row.length; i++) assert.ok(!same(row[i].piece, row[i - 1].piece) || !same(row[i].piece, row[i - 2].piece),
      `side ${side}, ${row[i - 2].lap.toFixed(0)} to ${row[i].lap.toFixed(0)} m: three ${podium[row[i].piece].cell}-shaped podiums in a row (${podium[row[i].piece].low} / ${podium[row[i].piece].high})`);
  }
});

test('the boulevard roofline: a screen on the roof of the low blocks that have no street screen', () => {
  const ROOF = { block_retail_a: 21.7, block_office_b: 36.2 };
  for (const seed of [undefined, 6]) {
    const plan = lap(seed), roofs = of(plan, 'billboard_a').filter(p => p.y > 0);
    assert.ok(roofs.length >= 8, `${roofs.length} rooftop screens`);
    for (const p of roofs) {
      assert.equal(neonSector(p.lap), 'boulevard');
      const block = plan.find(b => b.piece in ROOF && Math.abs(b.lap - p.lap) < 1e-6 && b.offset === p.offset);
      assert.ok(block && p.y === ROOF[block.piece], `screen at ${p.lap.toFixed(0)} on a roof`);
    }
  }
});

test('across the water the skyline has depth: two ranks, staggered heights and turned towers, still 300 m or more out', () => {
  const towers = lap().filter(p => p.piece.startsWith('skyline') && p.lap >= 2900 && p.lap < 4300);
  const heights = new Set(towers.map(p => Math.round(p.y / 10))), turns = new Set(towers.map(p => Math.round(Math.abs(p.yaw) / (Math.PI / 2))));
  assert.ok(towers.length >= 60, `${towers.length} towers along the expressway`);
  assert.ok(heights.size >= 5 && Math.min(...towers.map(p => p.y)) <= -50 && Math.max(...towers.map(p => p.y)) >= -12, 'sunk to staggered heights');
  assert.ok(turns.size >= 3, 'not every tower squares up to the road');
  for (const p of towers) assert.ok(Math.abs(p.offset) >= 300, `${p.offset}`);
});

// Concept frame 07 (canal arch bridge): a round glass tower with a cyan crown and warm window rows, a tower with
// magenta floor bands and a pink spire behind the canal. Measured before (night, 6350): the canal had only the far
// skyline, 320 to 580 m out and 23 to 58 % scene fog, 4.6 % magenta against the concept's 12 %.
test('canal: a rank of the teal and the magenta glass tower on the far shore, the pink and cyan skyline behind it', () => {
  for (const seed of [undefined, 7, 20261116]) {
    const canal = lap(seed).filter(p => neonSector(p.lap) === 'canal'), glass = canal.filter(p => p.piece.startsWith('tower_glass'));
    for (const side of [-1, 1]) {
      const rank = glass.filter(p => Math.sign(p.offset) === side);
      for (const piece of ['tower_glass_a', 'tower_glass_b']) assert.ok(rank.filter(p => p.piece === piece).length >= 5, `${piece} on side ${side}: ${rank.filter(p => p.piece === piece).length}`);
      for (const p of rank) {
        assert.ok(Math.abs(p.offset) >= 300 && Math.abs(p.offset) <= 360, `on the far shore, nearer than the skyline's far rank (${p.offset})`);
        assert.ok(p.scale >= 1.4 && p.scale <= 2.001 && p.y <= -6 && p.y >= -24, `the tall towers of the view, sunk like the skyline (x${p.scale}, ${p.y})`);
        near(p.yaw, -side * Math.PI / 2, 'its lit street face to the bridge');
        assert.ok(p.lap >= 5988 + 12 && p.lap <= 7038 - 8, `${p.lap}`);
      }
      const laps = rank.map(p => p.lap).sort((a, b) => a - b);
      for (let k = 1; k < laps.length; k++) assert.ok(laps[k] - laps[k - 1] >= 80, 'gaps between the towers: a skyline, not a wall');
    }
    assert.ok(new Set(glass.map(p => p.scale.toFixed(1))).size >= 4 && new Set(glass.map(p => Math.abs(p.offset))).size >= 3, 'staggered heights and depths');
    for (const p of canal) if (p.piece.startsWith('skyline')) assert.ok(Math.abs(p.offset) >= 300, 'the skyline keeps its two ranks behind them');
    assert.equal(canal.filter(p => p.piece === 'skyline_tower_a').length, 0, 'the warm plain tower is not part of the canal skyline');
    for (const piece of ['skyline_tower_b', 'skyline_tower_c', 'skyline_spire']) assert.ok(canal.some(p => p.piece === piece), piece);
    for (let chunk = 0; chunk < LAP_CHUNKS; chunk++) {
      const counts = {};
      for (const p of neonChunkPlan(chunk, seed)) counts[p.piece] = (counts[p.piece] ?? 0) + 1;
      for (const [piece, n] of Object.entries(counts)) assert.ok(n <= NEON_PIECES[piece].cap, `${piece} x${n} in chunk ${chunk}`);
    }
  }
  assert.ok(lap().every(p => !p.piece.startsWith('tower_glass') || !['expressway', 'harbour'].includes(neonSector(p.lap))), 'the canal only');
  assert.ok(lap().some(p => p.piece === 'skyline_tower_a' && neonSector(p.lap) === 'expressway'), 'the expressway keeps all four skyline kinds');
});

test('chunk window: one chunk behind, more ahead on High than Medium, nothing on Low', () => {
  assert.equal(neonChunkWindow(250, 'low'), null);
  const medium = neonChunkWindow(250, 'medium'), high = neonChunkWindow(250, 'high');
  assert.deepEqual([medium.first, high.first], [1, 1]);
  assert.ok(high.count > medium.count);
  assert.equal(neonChunkWindow(10, 'high').first, -1);
});
