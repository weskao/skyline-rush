// Task 5b steps 5 to 7: where the Neon Downtown kits stand, against the two asset briefs' integration contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { NEON_CHUNK_METRES, NEON_GROUND, NEON_LAP, NEON_PIECES, NEON_RESERVED, NEON_SECTORS, NEON_SHORE, NEON_SQUARE, NEON_TILE, neonChunkPlan, neonChunkWindow, neonSector } from '../src/neon-scenery-plan.ts';
import { NEON_LANDMARKS_NOT_PLACED } from '../src/model-manifest-neon.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { ROAD_LIMIT } from '../src/game.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
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
const CENTRE = ['rail_portal', 'rail_segment', 'expressway_pier', 'canal_arch', 'boulevard_footbridge', 'oldtown_gate'];
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
  const plan = lap(), wet = p => p.lap >= 2851 && p.lap < 7038;
  for (const p of plan) {
    if (p.piece in BUILDINGS || ['cherry_tree', 'railing', 'kerb_redwhite', 'traffic_light', 'sign_stack_a', 'billboard_a', 'billboard_b', 'sign_blade_a', 'sign_blade_b'].includes(p.piece))
      assert.ok(!wet(p) || p.lap < 2851.5, `${p.piece} over the water at ${p.lap.toFixed(0)}`);
    if (p.piece === 'kerb_redwhite') assert.equal(neonSector(p.lap), 'market', p.piece);
    if (p.piece.startsWith('shop_market')) assert.ok(['market', 'oldtown'].includes(neonSector(p.lap)), `${p.piece} at ${p.lap.toFixed(0)}`);
    if (p.piece.startsWith('skyline') && wet(p)) assert.ok(Math.abs(p.offset) >= 300, 'the skyline stands across the water');
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
test('harbour: piers under the causeway, a quay promenade both sides of the straight, parapets through its corner', () => {
  const plan = lap();
  for (const side of [-1, 1]) {
    const quay = of(plan, 'canal_bank').filter(p => Math.sign(p.offset) === side && Math.abs(Math.abs(p.offset) - 16.2) < 1e-6);
    assert.deepEqual(quay.map(p => +p.lap.toFixed(3)), Array.from({ length: 103 }, (_, k) => 4357 + 12 * k), 'one quay piece per 12 m of the straight, 4351 to 5587');
    for (const p of quay) { near(p.yaw, side > 0 ? 0 : Math.PI, 'its +X, the wall, faces the open water'); assert.ok(Math.abs(p.offset) - 3.5 >= 12.675, 'its promenade starts outside the kerb'); }
  }
  for (const p of plan) if (neonSector(p.lap) === 'harbour' && p.lap >= 4352) {
    assert.ok(!(p.piece in BUILDINGS) && !['cherry_tree', 'railing', 'kerb_redwhite'].includes(p.piece), `${p.piece} on the water at ${p.lap.toFixed(0)}`);
    if (p.piece === 'street_lamp') assert.ok(p.lap >= 5588, 'the quay has its own bollard lamps: street lamps only on the corner parapet');
    if (p.piece === 'expressway_rail') assert.ok(p.lap >= 5588, 'no parapet hides the water along the quay');
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
  near(tower.lap, 7655, 'tower'); near(tower.yaw, Math.PI, 'its -X faces the road');
  assert.ok(tower.offset <= -45 && inSquare(tower), `45 m or more out, on the square (${tower.offset})`);
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
  }
});

test('the reserved harbour footprint holds only its stand-in, a mole of quay pieces; the oldtown one is resolved', () => {
  assert.deepEqual(NEON_RESERVED, { harbour: { lap: 5560, offset: -55.2, along: 40, across: 72 } });
  assert.equal(neonSector(NEON_RESERVED.harbour.lap), 'harbour');
  const inside = (p, { lap: at, offset, along, across }) => Math.abs(p.lap - at) <= along / 2 && Math.abs(p.offset - offset) <= across / 2;
  for (const seed of [undefined, 3]) {
    const harbour = lap(seed).filter(p => inside(p, NEON_RESERVED.harbour));
    assert.deepEqual([...new Set(harbour.map(p => p.piece))], ['canal_bank']);
    assert.deepEqual(harbour.map(p => [+p.lap.toFixed(1), +p.offset.toFixed(1)]), [-3.5, 3.5].flatMap(shift => Array.from({ length: 6 }, (_, k) => [5560 + shift, -(25.2 + 12 * k)])).sort((a, b) => a[0] - b[0]), 'a mole 13 m wide from the quay 72 m out to sea');
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

test('chunk window: one chunk behind, more ahead on High than Medium, nothing on Low', () => {
  assert.equal(neonChunkWindow(250, 'low'), null);
  const medium = neonChunkWindow(250, 'medium'), high = neonChunkWindow(250, 'high');
  assert.deepEqual([medium.first, high.first], [1, 1]);
  assert.ok(high.count > medium.count);
  assert.equal(neonChunkWindow(10, 'high').first, -1);
});
