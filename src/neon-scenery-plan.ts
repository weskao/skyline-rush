// Task 5b steps 5 to 7: where the Neon Downtown kits stand. Pure data and maths; the layer (neon-scenery.ts) turns
// placements into instance matrices. Sizes and pivots come from assets-src/neon-city/asset-brief.md and
// assets-src/neon-landmarks/asset-brief.md ("Integration contract"); nothing here moves the road or its collision.
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';

export const NEON_LAP = 10000;
const LAP_CHUNKS = 83;
/** 120 m nominal: a lap is 83 whole chunks, so a finite race meets the same city at the same place every time. */
export const NEON_CHUNK_METRES = NEON_LAP / LAP_CHUNKS;
export type NeonSector = 'boulevard' | 'underpass' | 'market' | 'expressway' | 'harbour' | 'canal' | 'oldtown' | 'plaza';
/** The eight sectors in lap order with their start in lap metres, from the legs of classic-road-routes.ts.
 *  PROVISIONAL (owner decision 2026-11-15, the lap grew from 4000 m to 10 000 m): `harbour` and `oldtown`, their
 *  names, shapes and dressing, stand only until the owner's concept art; they are drawn with the existing kits. */
export const NEON_SECTORS: readonly (readonly [number, NeonSector])[] = [[0, 'boulevard'], [650, 'underpass'], [1280, 'market'], [2851, 'expressway'], [4351, 'harbour'], [5988, 'canal'], [7038, 'oldtown'], [8750, 'plaza']];
/** The last corner dresses as the plaza; the run from it back to the line as the boulevard it joins. */
const HOME = 9886;
const lapOf = (metres: number): number => ((metres % NEON_LAP) + NEON_LAP) % NEON_LAP;
export const neonSector = (metres: number): NeonSector => lapOf(metres) >= HOME ? 'boulevard' : NEON_SECTORS.reduce((sector, [from, name]) => lapOf(metres) >= from ? name : sector, 'boulevard' as NeonSector);
/** N3, N7: the expressway, the harbour and the arch bridge stand over the water; every other sector is on land. The
 *  land ends at these two quay lines, 3 m before the first parapet and 3 m after the last. */
export const NEON_SHORE: readonly [number, number] = [2848, 7041];
const onWater = (sector: NeonSector): boolean => sector === 'expressway' || sector === 'harbour' || sector === 'canal';
/** The bridges' parapets run on this line. Their concrete wall is 0.6 m wide, its top 0.55 m up on the expressway
 *  and 0.25 m on the canal bridge (neon-landmarks.glb): the lamps there stand on it, not on the water outside. */
const PARAPET = 13.2, PARAPET_TOP: Partial<Record<NeonSector, number>> = { expressway: .55, canal: .25 };
/** Lap runs of the expressway parapet (the sweeper, then the harbour corner) and of the canal bridge's. */
const EXPRESSWAY_RAILS: readonly (readonly [number, number])[] = [[2857, 4351], [5594, 5988]], CANAL_RAILS: readonly [number, number] = [5990, 7038];
/** The harbour straight: a quay promenade each side instead of a parapet (canal_bank: 6.5 m deep, its inner edge
 *  just outside the kerb, its wall and bollard lamps to the open water), so no street lamp stands there. */
const QUAY: readonly [number, number] = [4357, 5588], QUAY_LINE = 16.2;
/** The market kerb lies on the road edge, its lip against the procedural white line (11.5 m, 0.12 m wide) and its
 *  back under the procedural barrier (classic-road-render.ts), so it reads as one kerb; 2 cm up off the asphalt. */
const KERB = 11.56 + .5, KERB_Y = .02;
/** The land beside the road: from just inside the kerbs' outer edge to `reach`, with a quay wall `depth` down.
 *  `tile`: metres per repeat of the pavement set (assets-src/neon-pavement/README.md). */
export const NEON_GROUND = { inner: 12.6, reach: 260, y: -.03, depth: 8, tile: 7.2 } as const;
/** The procedural tunnel section (tests/neon-parity.test.js) with the portals' 8 m forecourts, and the rail
 *  embankment's corner, where the blocks stand back. */
const UNDERPASS: readonly [number, number] = [682, 918], EMBANKMENT: readonly [number, number] = [650, 950];
/** Corners tight enough that 30 m plots on the inside (1 right, -1 left) would run into each other. */
const TIGHT: readonly (readonly [number, number, number])[] = [[663, 942, 1], [7038, 7338, 1], [7338, 7498, -1], [7498, 7813, 1], [7813, 8128, -1], [8128, 8288, 1], [8327, 8627, -1], [9607, 9886, 1]];
/** Where a landmark the owner's concept art will define is to stand (Blender, a later task): centre `lap` and
 *  `offset` from the centre line, `along` by `across` metres. Until then the existing kit stands in: a mole of
 *  quay pieces off the end of the harbour straight. */
export const NEON_RESERVED = { harbour: { lap: 5560, offset: -55.2, along: 40, across: 72 } } as const;
/** The oldtown square, on the footprint that was reserved for it: the clock tower's place. */
export const NEON_SQUARE = { lap: 7655, offset: -42, along: 60, across: 40 } as const;

export type NeonKit = 'city' | 'landmarks';
interface Piece { kit: NeonKit; /** Meshes `<piece>_lod0` .. `_lod<lods - 1>`. */ lods: number; /** Most placements in one chunk. */ cap: number;
  /** Chunks ahead of the car's that still draw LOD 0. */ near: number; /** Beyond them: the last LOD, or nothing. */ far: boolean;
  /** Lights the street: redrawn in the wet road's mirror pass (N6: one more draw, so not the unlit pieces). */ mirror: boolean }
const city = (lods: number, cap: number, mirror = true, near = 1, far = true): Piece => ({ kit: 'city', lods, cap, near, far, mirror });
const landmark = (cap: number, near = 1, mirror = false): Piece => ({ kit: 'landmarks', lods: 2, cap, near, far: true, mirror });
/** Street furniture: one draw (N6 draw-call cap), LOD 0 through the whole window with no far band, so it stands
 *  out there with the buildings instead of popping in a few hundred metres ahead of the car. */
const prop = (cap: number, mirror: boolean, lods = 2): Piece => city(lods, cap, mirror, 99, false);
export const NEON_PIECES = {
  tower_glass_a: city(3, 8), tower_glass_b: city(3, 8), block_retail_a: city(3, 8), block_office_b: city(3, 8),
  shop_market_a: city(3, 26), shop_market_b: city(3, 26), cherry_tree: prop(8, false, 3),
  sign_blade_a: prop(8, true), sign_blade_b: prop(8, true), sign_stack_a: prop(6, true), billboard_a: city(2, 8), billboard_b: city(2, 8),
  street_lamp: prop(6, true), traffic_light: prop(1, true), railing: prop(24, false), kerb_redwhite: prop(60, false),
  // The far skyline is always LOD 0: its LOD 1 switch is 600 m out, past the window.
  skyline_tower_a: city(2, 4, false, 99), skyline_tower_b: city(2, 4, false, 99), skyline_tower_c: city(2, 4, false, 99), skyline_spire: city(2, 4, false, 99),
  rail_portal: landmark(2, 2), rail_segment: landmark(11, 1, true), expressway_pier: landmark(4), expressway_rail: landmark(22, 1, true),
  canal_arch: landmark(1, 2, true), canal_bridge_rail: landmark(22, 1, true), canal_bank: landmark(24), plaza_sculpture: landmark(1, 2, true), boulevard_footbridge: landmark(1, 1, true),
  oldtown_gate: landmark(1, 2, true), lantern_span: landmark(8, 1, true), clock_tower: landmark(1, 2),
} as const satisfies Record<string, Piece>;
export type NeonPiece = keyof typeof NEON_PIECES;

/** `offset` is lateral metres from the centre line, positive on the driver's right. `yaw` is relative to the road
 *  heading: 0 puts the model's -Z along the driving direction. A tile (`span` metres of road) is stretched along its
 *  NEON_TILE axis to reach the next one, so a row has no gap on the outside of a corner. */
export interface NeonPlacement { piece: NeonPiece; along: number; offset: number; y: number; yaw: number; span?: number }
/** Modelled length of the tiling pieces and the local axis it lies on. */
export const NEON_TILE: Partial<Record<NeonPiece, { length: number; axis: 'x' | 'z' }>> = {
  railing: { length: 10, axis: 'x' }, kerb_redwhite: { length: 4, axis: 'x' },
  expressway_rail: { length: 12, axis: 'z' }, canal_bridge_rail: { length: 12, axis: 'z' },
};

/** Metres from a building's pivot to its street face (+Z in the kit). */
const FRONT = { tower_glass_a: 13.4, tower_glass_b: 10.2, block_retail_a: 7.5, block_office_b: 7.6, shop_market_a: 5.12, shop_market_b: 4.96 } as const;
const HALF_PI = Math.PI / 2, SKYLINE = ['skyline_tower_a', 'skyline_tower_b', 'skyline_tower_c', 'skyline_spire'] as const;
/** The sculpture's court: no street-line building or pavement tree on the left of the plaza straight here (`landmarks`
 *  dresses it). The oldtown square: no shop on the street line. */
const COURT: readonly [number, number] = [9340, 9460], SQUARE: readonly [number, number] = [NEON_SQUARE.lap - NEON_SQUARE.along / 2, NEON_SQUARE.lap + NEON_SQUARE.along / 2];
/** Oldtown (assets-src/neon-landmarks/asset-brief.md): the gate just after the canal bridge, its plinths clear of
 *  the quay; a lantern string every 24 m through the S-bends, ending before the rooftop shortcut (8290). */
const OLD_GATE = 7058, LANTERNS: readonly [number, number] = [7345, 8288], OLD_LINE = 17.5;
/** Its shop rows, bend by bend: [from, to, inside of the bend (1 right, -1 left, 0 straight)]. They end where the
 *  first plaza block (plot centre 8750, 12.3 m each way) begins. */
const OLD_STREET: readonly (readonly [number, number, number])[] = [[7066, 7338, 1], [7338, 7498, -1], [7498, 7813, 1], [7813, 8128, -1], [8128, 8288, 1], [8288, 8327, 0], [8327, 8627, -1], [8627, 8737, 0]];
/** Where each shop of those rows stands: [lap, side]. A shop takes the market's 9.27 m of frontage, measured where
 *  the row is tightest: at the fronts on the outside of a bend, at the backs (9.3 m behind) on the inside, so the
 *  shops neither run into each other nor leave bare paving between them. The road's curvature through each bend
 *  rises and falls as a half sine to 1/124 m (measured on the route; tests/neon-scenery-plan.test.js checks the
 *  gaps against it). What is left at the end of a row is spread along it. */
const OLD_SHOPS: readonly (readonly [number, number])[] = [-1, 1].flatMap(side => OLD_STREET.flatMap(([from, to, inside]) => {
  const ends = [0];
  for (;;) {
    const bend = side * inside * Math.sin(Math.PI * ends.at(-1)! / (to - from)) / 124; // toward this side when positive
    const next = ends.at(-1)! + NEON_CHUNK_METRES / 13 / (1 - bend * (bend > 0 ? OLD_LINE + 9.3 : OLD_LINE));
    if (next > to - from) break;
    ends.push(next);
  }
  const fit = (to - from) / ends.at(-1)!;
  return ends.slice(1).map((end, k) => [from + (end + ends[k]!) / 2 * fit, side] as const);
}));
/** The blocks of the straight after the rail tunnel, in plot order; the right side starts one on. */
const STRAIGHT = ['block_office_b', 'block_retail_a', 'tower_glass_b'] as const, PLOT = NEON_CHUNK_METRES / 4;
/** world.js stands the rooftop shortcut's section sign 65 m before it (8290), 17 m left of the centre line. */
const OLD_SIGN = 8225;
const within = (metres: number, [from, to]: readonly [number, number]): boolean => metres >= from && metres < to;

type Put = (piece: NeonPiece, lap: number, offset: number, yaw: number, y?: number) => void;
interface Chunk { r: () => number; put: Put; tile: (piece: NeonPiece, lap: number, offset: number, yaw: number, span: number, y?: number) => void;
  /** `count` evenly spaced lap positions in this chunk, with the sector each one is in. */
  row: (count: number, place: (lap: number, sector: NeonSector, index: number) => void) => void;
  /** Lap positions `pitch` apart from `from` to `to` that fall in this chunk. */
  every: (from: number, to: number, pitch: number, place: (lap: number) => void) => void;
  once: (lap: number, place: () => void) => void }

/** Close buildings, one per 30 m plot, and the night market's shops. `facing`: the kit's +Z, its street side, toward the road. */
function buildings({ r, put, row }: Chunk, side: number, facing: number): void {
  row(4, (lap, sector, i) => {
    if (onWater(sector) || sector === 'market' || (side < 0 && (within(lap, COURT) || within(lap, SQUARE)))) return;
    if (i % 2 && TIGHT.some(([from, to, inside]) => inside === side && within(lap, [from, to]))) return;
    const corner = within(lap, EMBANKMENT), line = corner ? 34 : 22, roll = r(), dressed = r(), extra = r(); // rolls drawn per plot so one choice never shifts the next
    if (sector === 'oldtown') return; // its shop rows: oldtown()
    if (sector === 'boulevard' && roll < .16) return put('billboard_a', lap, side * 27, -side * (HALF_PI - .6)); // an open plot: a screen turned to the oncoming driver
    const piece = sector === 'underpass' ? (corner ? 'block_office_b' : STRAIGHT[(Math.floor(lap / PLOT) + (side > 0 ? 1 : 0)) % 3]!)
      : sector === 'plaza' ? (roll < .45 ? 'tower_glass_a' : 'block_retail_a')
      : roll < .37 ? 'tower_glass_a' : roll < .58 ? 'tower_glass_b' : roll < .8 ? 'block_retail_a' : 'block_office_b';
    put(piece, lap, side * (line + FRONT[piece]), facing);
    if (corner) return;
    if (dressed < .6) put(sector === 'plaza' || dressed < .3 ? 'sign_blade_b' : 'sign_blade_a', lap - 6, side * (line - .75), facing);
    if (extra < .3 && piece !== 'tower_glass_a' && piece !== 'tower_glass_b') put('billboard_b', lap + 7, side * (line - .3), facing);
  });
  row(13, (lap, sector, i) => { // night market: a row of low shops with sign posts between them
    if (sector !== 'market') return;
    const piece = r() < .5 ? 'shop_market_a' : 'shop_market_b';
    put(piece, lap, side * (17 + FRONT[piece]), facing);
    if (i % 4 === 1) put('sign_stack_a', lap + 4.6, side * 15.6, facing);
  });
}

function furniture({ r, put, tile, row }: Chunk, side: number, facing: number): void {
  row(3, (lap, sector) => { // lamps: on the pavement, or on the bridges' parapet wall
    const wall = sector === 'harbour' ? (lap >= QUAY[1] ? PARAPET_TOP.expressway : null) : PARAPET_TOP[sector];
    if (wall !== null && !within(lap, UNDERPASS) && !within(lap, LANTERNS)) put('street_lamp', lap, side * (wall === undefined ? 15.2 : PARAPET), facing, wall ?? 0);
  });
  row(3, (lap, sector, i) => { // trees between the lamps; one per chunk in the narrow shop streets, none under the lanterns
    const at = lap + NEON_CHUNK_METRES / 6;
    if (onWater(sector) || sector === 'underpass' || (side < 0 && within(lapOf(at), COURT))) return;
    if (sector === 'market') { if (i === 1) put('cherry_tree', at, side * 15, r() * Math.PI * 2); return; }
    const yaw = r() * Math.PI * 2; // drawn for every plot, so thinning oldtown's trees never reshuffles what follows in the chunk
    if (sector !== 'oldtown') put('cherry_tree', at, side * 18.5, yaw);
    else if (i === 1 && !within(at, LANTERNS)) put('cherry_tree', at, side * 15, yaw);
  });
  row(12, (lap, sector) => { if (!onWater(sector) && !within(lap, UNDERPASS)) tile('railing', lap, side * 14.1, facing, NEON_CHUNK_METRES / 12); });
  row(30, (lap, sector) => { if (sector === 'market') tile('kerb_redwhite', lap, side * KERB, facing, NEON_CHUNK_METRES / 30, KERB_Y); });
  row(2, (lap, sector) => { // far skyline: behind the blocks on land, across the water elsewhere; sunk so it meets either
    put(SKYLINE[Math.floor(r() * SKYLINE.length)]!, lap, side * (onWater(sector) ? 320 + r() * 260 : 170 + r() * 70), facing, -6);
  });
}

/** Landmark rows (assets-src/neon-landmarks/asset-brief.md): local -X faces the road on both sides, so +X the water. */
function waterside({ put, tile, every, once }: Chunk, side: number): void {
  const rail = side > 0 ? 0 : Math.PI;
  for (const [from, to] of EXPRESSWAY_RAILS) every(from, to, 12, lap => tile('expressway_rail', lap, side * PARAPET, rail, 12));
  every(CANAL_RAILS[0], CANAL_RAILS[1], 12, lap => tile('canal_bridge_rail', lap, side * PARAPET, rail, 12));
  every(QUAY[0], QUAY[1], 12, lap => put('canal_bank', lap, side * QUAY_LINE, rail));
  for (let k = 0; k < 12; k++) { // the quays where the land ends: +X toward the water
    once(NEON_SHORE[0], () => put('canal_bank', NEON_SHORE[0], side * (18 + 12 * k), HALF_PI));
    once(NEON_SHORE[1], () => put('canal_bank', NEON_SHORE[1], side * (18 + 12 * k), -HALF_PI));
  }
}

function landmarks({ put, row, every, once }: Chunk): void {
  row(1, (lap, sector) => { if (sector === 'boulevard') put('traffic_light', lap + 40, -17, HALF_PI); }); // left side: its lenses face oncoming cars
  once(698, () => put('rail_portal', 698, 0, 0));
  once(902, () => put('rail_portal', 902, 0, Math.PI));
  every(711.875, 711.875 + 11.75 * 16, 11.75, lap => put('rail_segment', lap, 0, 0));
  every(2869, 5988, 36, lap => put('expressway_pier', lap, 0, 0)); // under the expressway and the harbour causeway
  once(6500, () => put('canal_arch', 6500, 0, 0));
  // The sculpture's court, the finale of the lap: three glass towers close it behind the sculpture, the middle one
  // set back, a screen in each gap between them and a row of trees down each side.
  once(9400, () => put('plaza_sculpture', 9400, -30, 0));
  for (const d of [-38, 0, 38]) once(9400 + d, () => put('tower_glass_a', 9400 + d, -(d ? 46 : 54) - FRONT.tower_glass_a, HALF_PI));
  for (const d of [-19, 19]) once(9400 + d, () => put('billboard_a', 9400 + d, -46, HALF_PI - .35));
  for (const d of [-27, 27]) once(9400 + d, () => { for (const offset of [-20, -31, -42]) put('cherry_tree', 9400 + d, offset, d + offset); });
  for (const lap of [150, 330]) once(lap, () => put('boulevard_footbridge', lap, 0, 0));
  // Stand-in on the reserved footprint: two rows of quay back to back make a mole.
  const mole = NEON_RESERVED.harbour.lap;
  for (const [shift, yaw] of [[-3.5, -HALF_PI], [3.5, HALF_PI]] as const) for (let k = 0; k < 6; k++) once(mole + shift, () => put('canal_bank', mole + shift, -(QUAY_LINE + 9 + 12 * k), yaw));
}

/** Oldtown: the kit's lowest, oldest pieces. Timber shops in an unbroken row down both sides, the gate, the lantern
 *  strings and, on the square, the clock tower between two more strings and four trees, shop fronts on three sides. */
function oldtown({ put, every, once }: Chunk): void {
  const shop = (k: number) => k * 5 % 7 < 4 ? 'shop_market_a' : 'shop_market_b'; // a fixed mix: no run longer than two
  OLD_SHOPS.forEach(([lap, side], k) => once(lap, () => {
    if (side < 0 && lap > SQUARE[0] - 4 && lap < SQUARE[1] + 4) return;
    const recess = side < 0 && Math.abs(lap - OLD_SIGN) < 5.5 ? 4 : 0; // clear of the sign's 8 m panel, 13 to 21 m out
    put(shop(k), lap, side * (OLD_LINE + recess + FRONT[shop(k)]), -side * HALF_PI);
  }));
  once(OLD_GATE, () => put('oldtown_gate', OLD_GATE, 0, 0));
  every(LANTERNS[0], LANTERNS[1], 24, lap => put('lantern_span', lap, 0, 0));
  const { lap: at, offset, across } = NEON_SQUARE, back = -offset + across / 2;
  once(at, () => {
    put('clock_tower', at, -45, Math.PI); // its -X faces the road
    for (const d of [-18, 18]) put('lantern_span', at + d, offset, 0);
    for (const d of [-10, 10]) for (const o of [-30, -57]) put('cherry_tree', at + d, o, d + o);
    for (let k = 0; k < 10; k++) put(shop(k), at - 26 + 6 * k, -(back + FRONT[shop(k)]), HALF_PI); // the back row faces the road
    for (let k = 0; k < 4; k++) { // an end terrace each side, fronts to the square
      put(shop(k + 1), at - 34, -(32 + 9 * k), Math.PI);
      put(shop(k), at + 35, -(32 + 9 * k), 0);
    }
  });
}

export function neonChunkPlan(chunk: number, seed?: number): NeonPlacement[] {
  const lapChunk = ((chunk % LAP_CHUNKS) + LAP_CHUNKS) % LAP_CHUNKS, base = lapChunk * NEON_CHUNK_METRES, end = base + NEON_CHUNK_METRES;
  const out: NeonPlacement[] = [];
  const tools: Chunk = {
    r: seededRng(seed ?? 0, 'neon-kit-v1:' + (seed === undefined ? lapChunk : chunk)),
    put: (piece, lap, offset, yaw, y = 0) => { out.push({ piece, along: lap - base, offset, y, yaw }); },
    tile: (piece, lap, offset, yaw, span, y = 0) => { out.push({ piece, along: lap - base, offset, y, yaw, span }); },
    row: (count, place) => { for (let i = 0; i < count; i++) { const lap = base + (i + .5) * NEON_CHUNK_METRES / count; place(lap, neonSector(lap), i); } },
    every: (from, to, pitch, place) => { for (let lap = from + Math.max(0, Math.ceil((base - from) / pitch)) * pitch; lap < Math.min(to, end); lap += pitch) place(lap); },
    once: (lap, place) => { if (within(lap, [base, end])) place(); },
  };
  for (const side of [-1, 1]) {
    const facing = -side * HALF_PI;
    buildings(tools, side, facing); furniture(tools, side, facing); waterside(tools, side);
  }
  landmarks(tools);
  oldtown(tools);
  return out;
}

export interface NeonWindow { first: number; count: number }
const AHEAD: Readonly<Record<Exclude<VfxQuality, 'low'>, number>> = { medium: 4, high: 6 };
export const NEON_MAX_CHUNKS = 2 + AHEAD.high;
/** One chunk behind the car, AHEAD chunks in front; Low keeps the procedural city. */
export function neonChunkWindow(distance: number, quality: VfxQuality): NeonWindow | null {
  if (quality === 'low') return null;
  return { first: Math.floor(distance / NEON_CHUNK_METRES) - 1, count: 2 + AHEAD[quality] };
}
