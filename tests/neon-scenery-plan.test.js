// Task 5b steps 5 to 7: where the Neon Downtown kits stand, against the two asset briefs' integration contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NEON_CHUNK_METRES, NEON_LAP, NEON_PIECES, NEON_SHORE, NEON_TILE, neonChunkPlan, neonChunkWindow, neonSector } from '../src/neon-scenery-plan.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';

const LAP_CHUNKS = 33;
/** Every placement of one lap, with its lap position. */
const lap = seed => Array.from({ length: LAP_CHUNKS }, (_, chunk) => neonChunkPlan(chunk, seed).map(p => ({ ...p, lap: chunk * NEON_CHUNK_METRES + p.along }))).flat();
const of = (plan, piece) => plan.filter(p => p.piece === piece).sort((a, b) => a.lap - b.lap);
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
const BUILDINGS = { tower_glass_a: 13.4, tower_glass_b: 10.2, block_retail_a: 7.5, block_office_b: 7.6, shop_market_a: 5.12, shop_market_b: 4.96 }; // pivot to street face (neon-city brief)
const CENTRE = ['rail_portal', 'rail_segment', 'expressway_pier', 'canal_arch', 'boulevard_footbridge'];

test('the pieces are the modules of both manifests, with their LOD counts', () => {
  for (const [kit, id] of [['city', 'neon-city'], ['landmarks', 'neon-landmarks']]) {
    const nodes = MODEL_MANIFEST[id].nodes, pieces = Object.keys(NEON_PIECES).filter(piece => NEON_PIECES[piece].kit === kit);
    assert.deepEqual(pieces.sort(), nodes.filter(node => !/_lod\d$/.test(node)).sort(), id);
    for (const piece of pieces) assert.equal(NEON_PIECES[piece].lods, nodes.filter(node => node.startsWith(`${piece}_lod`)).length, piece);
  }
});

test('a lap is 33 whole chunks split into the six sectors of the loop', () => {
  near(NEON_CHUNK_METRES * LAP_CHUNKS, NEON_LAP, 'lap');
  for (const [metres, sector] of [[0, 'boulevard'], [442, 'boulevard'], [443, 'underpass'], [722, 'market'], [1657, 'expressway'], [2330, 'canal'], [2986, 'plaza'], [3700, 'plaza'], [3886, 'boulevard'], [4000 + 800, 'market'], [-10, 'boulevard']])
    assert.equal(neonSector(metres), sector, `${metres} m`);
});

test('a finite race meets the same city every lap; an endless seed gives another city, and another each lap', () => {
  assert.deepEqual(neonChunkPlan(7), neonChunkPlan(7), 'deterministic');
  assert.deepEqual(neonChunkPlan(7 + LAP_CHUNKS), neonChunkPlan(7), 'the lap seam');
  assert.deepEqual(neonChunkPlan(-1), neonChunkPlan(LAP_CHUNKS - 1), 'the chunk behind the start line');
  assert.notDeepEqual(neonChunkPlan(1, 1001), neonChunkPlan(1, 2002));
  assert.notDeepEqual(neonChunkPlan(1, 1001), neonChunkPlan(1 + LAP_CHUNKS, 1001));
  const fixed = p => CENTRE.includes(p.piece) || p.piece.endsWith('_rail');
  assert.deepEqual(neonChunkPlan(14, 1001).filter(fixed), neonChunkPlan(14).filter(fixed), 'landmarks never move with the seed');
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

test('nothing but the centre-line landmarks stands inside the kerbs, and building fronts keep a pavement', () => {
  for (const seed of [undefined, 5]) for (const p of lap(seed)) {
    if (CENTRE.includes(p.piece)) { assert.equal(p.offset, 0, p.piece); continue; }
    assert.ok(Math.abs(p.offset) >= 13.2, `${p.piece} at ${p.offset} m, lap ${p.lap.toFixed(0)}`); // kerb outer edge 12.675 m
    if (p.piece in BUILDINGS) assert.ok(Math.abs(p.offset) - BUILDINGS[p.piece] >= 16.9, `${p.piece} front at lap ${p.lap.toFixed(0)}`);
    if (p.piece in BUILDINGS) near(p.yaw, -Math.sign(p.offset) * Math.PI / 2, `${p.piece} street side`);
  }
});

test('N3, N7: the expressway and the canal bridge stand over water; shops are the night market only', () => {
  const plan = lap(), wet = p => p.lap >= 1657 && p.lap < 2986;
  for (const p of plan) {
    if (p.piece in BUILDINGS || ['cherry_tree', 'railing', 'kerb_redwhite', 'traffic_light', 'sign_stack_a', 'billboard_a', 'billboard_b', 'sign_blade_a', 'sign_blade_b'].includes(p.piece))
      assert.ok(!wet(p) || p.lap < 1657.5, `${p.piece} over the water at ${p.lap.toFixed(0)}`);
    if (p.piece.startsWith('shop_market') || p.piece === 'kerb_redwhite') assert.equal(neonSector(p.lap), 'market', p.piece);
    if (p.piece.startsWith('skyline') && wet(p)) assert.ok(Math.abs(p.offset) >= 300, 'the skyline stands across the water');
  }
  assert.ok(of(plan, 'shop_market_a').length + of(plan, 'shop_market_b').length >= 150, 'both sides of the market street are lined');
  for (const side of [-1, 1]) for (const [shore, yaw] of [[NEON_SHORE[0], Math.PI / 2], [NEON_SHORE[1], -Math.PI / 2]]) {
    const quay = of(plan, 'canal_bank').filter(p => Math.sign(p.offset) === side && Math.abs(p.lap - shore) < 1e-6);
    assert.deepEqual(quay.map(p => Math.round(Math.abs(p.offset))).sort((a, b) => a - b), Array.from({ length: 12 }, (_, k) => 18 + 12 * k), `quay at ${shore}`);
    for (const p of quay) near(p.yaw, yaw, 'its +X faces the water');
  }
});

test('N5 and the landmarks contract: portals, rail segments, piers, parapets, arch, sculpture and footbridges at their lap positions', () => {
  const plan = lap(), at = piece => of(plan, piece).map(p => +p.lap.toFixed(3));
  assert.deepEqual(at('rail_portal'), [478, 682]);
  assert.deepEqual(of(plan, 'rail_portal').map(p => +p.yaw.toFixed(4)), [0, +Math.PI.toFixed(4)], 'the far portal faces back');
  assert.deepEqual(at('rail_segment'), Array.from({ length: 16 }, (_, k) => 491.875 + 11.75 * k));
  assert.deepEqual(at('expressway_pier'), Array.from({ length: 19 }, (_, k) => 1675 + 36 * k));
  assert.deepEqual(at('canal_arch'), [2658]);
  assert.deepEqual(at('boulevard_footbridge'), [150, 330]);
  const [sculpture] = of(plan, 'plaza_sculpture');
  assert.equal(of(plan, 'plaza_sculpture').length, 1);
  near(sculpture.lap, 3400, 'sculpture'); assert.ok(sculpture.offset <= -30, 'at least 30 m left of the centre line');
  for (const [piece, first, last] of [['expressway_rail', 1663, 2323], ['canal_bridge_rail', 2336, 2984]]) for (const side of [-1, 1]) {
    const row = of(plan, piece).filter(p => Math.sign(p.offset) === side);
    assert.deepEqual(row.map(p => +p.lap.toFixed(3)), Array.from({ length: (last - first) / 12 + 1 }, (_, k) => first + 12 * k), `${piece} leaves no gap`);
    for (const p of row) { near(Math.abs(p.offset), 13.2, piece); near(p.yaw, side > 0 ? 0 : Math.PI, `${piece}: local -X faces the road`); assert.equal(p.span, 12); }
  }
});

test('the underpass and the sculpture court are kept clear', () => {
  for (const seed of [undefined, 9]) for (const p of lap(seed)) {
    const rail = p.piece === 'rail_portal' || p.piece === 'rail_segment';
    if (p.lap >= 470 && p.lap < 690 && !rail) assert.ok(Math.abs(p.offset) >= 30, `${p.piece} inside the rail embankment at ${p.lap.toFixed(0)}`);
    if (p.lap >= 3345 && p.lap < 3455 && p.offset < 0 && (p.piece in BUILDINGS || p.piece === 'cherry_tree')) assert.fail(`${p.piece} in the sculpture court`);
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
