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
/** Where the two landmarks the owner's concept art will define are to stand (Blender, a later task): centre `lap`
 *  and `offset` from the centre line, `along` by `across` metres. Until then the existing kit stands in: a mole of
 *  quay pieces off the end of the harbour straight, an open square with a screen and trees in oldtown. */
export const NEON_RESERVED = { harbour: { lap: 5560, offset: -55.2, along: 40, across: 72 }, oldtown: { lap: 7655, offset: -42, along: 60, across: 40 } } as const;

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
  shop_market_a: city(3, 26), shop_market_b: city(3, 26), cherry_tree: prop(6, false, 3),
  sign_blade_a: prop(8, true), sign_blade_b: prop(8, true), sign_stack_a: prop(6, true), billboard_a: city(2, 8), billboard_b: city(2, 8),
  street_lamp: prop(6, true), traffic_light: prop(1, true), railing: prop(24, false), kerb_redwhite: prop(60, false),
  // The far skyline is always LOD 0: its LOD 1 switch is 600 m out, past the window.
  skyline_tower_a: city(2, 4, false, 99), skyline_tower_b: city(2, 4, false, 99), skyline_tower_c: city(2, 4, false, 99), skyline_spire: city(2, 4, false, 99),
  rail_portal: landmark(2, 2), rail_segment: landmark(11, 1, true), expressway_pier: landmark(4), expressway_rail: landmark(22, 1, true),
  canal_arch: landmark(1, 2, true), canal_bridge_rail: landmark(22, 1, true), canal_bank: landmark(24), plaza_sculpture: landmark(1, 2, true), boulevard_footbridge: landmark(1, 1, true),
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
/** The sculpture's court: no building or tree on the left of the plaza straight here. The oldtown square: no building. */
const COURT: readonly [number, number] = [9340, 9460], SQUARE: readonly [number, number] = [7625, 7685];
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
    const line = within(lap, EMBANKMENT) ? 34 : sector === 'oldtown' ? 20 : 22, roll = r(), dressed = r(), extra = r(); // rolls drawn per plot so one choice never shifts the next
    if (sector === 'boulevard' && roll < .16) return put('billboard_a', lap, side * 27, -side * (HALF_PI - .6)); // an open plot: a screen turned to the oncoming driver
    const piece = sector === 'underpass' ? 'block_office_b' : sector === 'oldtown' ? (roll < .5 ? 'block_retail_a' : 'block_office_b')
      : sector === 'plaza' ? (roll < .45 ? 'tower_glass_a' : 'block_retail_a')
      : roll < .37 ? 'tower_glass_a' : roll < .58 ? 'tower_glass_b' : roll < .8 ? 'block_retail_a' : 'block_office_b';
    put(piece, lap, side * (line + FRONT[piece]), facing);
    if (sector === 'underpass') return;
    const signs = sector === 'oldtown' ? .9 : .6; // the old streets hang a sign on nearly every front
    if (dressed < signs) put(sector === 'plaza' || dressed < signs / 2 ? 'sign_blade_b' : 'sign_blade_a', lap - 6, side * (line - .75), facing);
    if (extra < .3 && sector !== 'oldtown' && piece !== 'tower_glass_a' && piece !== 'tower_glass_b') put('billboard_b', lap + 7, side * (line - .3), facing);
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
    if (wall !== null && !within(lap, UNDERPASS)) put('street_lamp', lap, side * (wall === undefined ? 15.2 : PARAPET), facing, wall ?? 0);
  });
  row(3, (lap, sector, i) => { // trees between the lamps; one per chunk in the narrow market street
    const at = lap + NEON_CHUNK_METRES / 6;
    if (onWater(sector) || sector === 'underpass' || (side < 0 && within(lapOf(at), COURT))) return;
    if (sector !== 'market') put('cherry_tree', at, side * (side < 0 && within(at, SQUARE) ? 34 : 18.5), r() * Math.PI * 2); // in the square they stand back
    else if (i === 1) put('cherry_tree', at, side * 15, r() * Math.PI * 2);
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
  once(9400, () => put('plaza_sculpture', 9400, -36, 0));
  for (const lap of [150, 330]) once(lap, () => put('boulevard_footbridge', lap, 0, 0));
  // Stand-ins on the reserved footprints: two rows of quay back to back make a mole; a screen faces the old square.
  const mole = NEON_RESERVED.harbour.lap, square = NEON_RESERVED.oldtown;
  for (const [shift, yaw] of [[-3.5, -HALF_PI], [3.5, HALF_PI]] as const) for (let k = 0; k < 6; k++) once(mole + shift, () => put('canal_bank', mole + shift, -(QUAY_LINE + 9 + 12 * k), yaw));
  once(square.lap, () => put('billboard_a', square.lap, square.offset, HALF_PI - .6));
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
