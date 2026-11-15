import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, setLayoutSeed, RACE_TRACKS, LANES } from '../src/game.js';
import { mixedCourse } from '../src/gauntlet-course.ts';

// User, 2026-11-07: the deliberately authored ring and reward sequences are design, not random layout. Changing one
// needs the user's approval first (.claude/rules/ring-layout.md); re-rolling the random rings must never move them.
const AUTHORED_HOOPS = {
  spiral: [[1100, 2.5, 6], [1700, -2.5, 6], [2200, 2.5, 6], [3450, -2.5, 6], [4350, 0, 6]],
  cosmic: [[3800, -2.5, 5], [3920, 2.5, 7], [4040, -2.5, 9], [7350, 2.5, 5], [7470, -2.5, 7], [7590, 2.5, 9]],
};
const SEEDS = [undefined, 1, 2, 3, 99];
const forSeeds = run => {
  try { for (const seed of SEEDS) { setLayoutSeed(seed === undefined ? undefined : () => seed); run(seed); } } finally { setLayoutSeed(); }
};
const has = (rings, [distance, x, altitude]) => rings.some(r => r.distance === distance && r.x === x && r.altitude === altitude);

test('Sky Spiral and Cosmic Orbit keep their authored hoop sequences in every themed race', () => forSeeds(seed => {
  for (const [id, hoops] of Object.entries(AUTHORED_HOOPS)) {
    const { rings } = createRace(id, { mode: 'custom', themes: true });
    for (const hoop of hoops) assert.ok(has(rings, hoop), `${id} seed ${seed} hoop ${hoop}`);
  }
}));

// Owner brief, 2026-11-15: one ring line per Neon Downtown sector (src/neon-ring-lines.ts), [distance, x, altitude];
// a full-width row is listed by its outer rings.
const NEON_LINES = [
  [720, 2.5, 1.5], [780, 7.5, 1.5], [840, 7.5, 1.5], [900, 2.5, 1.5], [940, -2.5, 2.5], // rail underpass
  [1294, -7.5, 2.5], [1364, 0, 2.5], [1434, 7.5, 2.5], [1504, 0, 2.5], [1574, -7.5, 2.5], // night market
  [3000, 7.5, 2.5], [3125, 7.5, 2.5], [3250, 7.5, 2.5], [3375, 7.5, 2.5], [3500, 7.5, 2.5], // expressway
  [4560, -7.5, 2.5], [4685, -7.5, 2.5], [4810, -7.5, 2.5], [4935, -7.5, 2.5], [5060, -7.5, 2.5], [5185, -7.5, 2.5], [5310, -7.5, 2.5], // harbour
  [6380, 0, 6.5], [6440, 0, 8], [6500, 0, 9.5], [6560, 0, 8.5], [6620, 0, 7.5], // canal bridge
  [7350, -2.5, 2.5], [7420, 2.5, 2.5], [7490, 7.5, 2.5], [7570, 2.5, 2.5], [7650, -2.5, 2.5], [7730, -7.5, 2.5], [7900, -2.5, 2.5], [7980, 2.5, 2.5],
  [8060, 7.5, 2.5], [8140, 2.5, 2.5], [8210, -2.5, 2.5], // oldtown
  [9220, 2.5, 2.5], [9280, -2.5, 2.5], [9340, -7.5, 2.5], [9400, -7.5, 2.5], [9460, -7.5, 2.5], [9520, -2.5, 2.5], [9580, 2.5, 2.5],
  [9650, 2.5, 2.5], [9720, 7.5, 2.5], [9820, 2.5, 2.5], [9920, -7.5, 2.5], [9920, 7.5, 2.5], // Violet Plaza
];

test('Neon Downtown keeps its seven sector ring lines in every race that reads the track layout', () => forSeeds(seed => {
  for (const config of [undefined, { mode: 'custom', themes: true }, { mode: 'gauntlet', layout: 'mixed' }, { mode: 'time' }]) {
    const { rings } = createRace('neon', config), hoops = mixedCourse('neon', RACE_TRACKS.neon, LANES, config ?? { mode: 'classic' })?.hoops ?? [];
    // The older authored rule wins: a mixed-Gauntlet hoop replaces any ring within 30 m (`withHoops`). On the 10 km lap
    // (2026-11-15) the hoops stand at 2112, 4055, 5478, 6858 and 8138: the last one stands in for the oldtown ring at
    // 8140 (on the 4 km lap the hoop at 2663 stood in for the canal crown ring).
    const replaced = NEON_LINES.filter(([d]) => hoops.some(h => Math.abs(h.distance - d) <= 30));
    assert.deepEqual(replaced, hoops.length ? [[8140, 2.5, 2.5]] : [], `seed ${seed} ${JSON.stringify(config)}`);
    for (const spot of NEON_LINES) if (!replaced.includes(spot)) assert.ok(has(rings, spot), `seed ${seed} ${JSON.stringify(config)} ring ${spot}`);
  }
}));

test('a mixed Gauntlet keeps every hoop over its barricades', () => forSeeds(seed => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const config = { mode: 'gauntlet', layout: 'mixed' }, { hoops } = mixedCourse(id, RACE_TRACKS[id], LANES, config), { rings } = createRace(id, config);
    assert.ok(hoops.length > 0, id);
    for (const hoop of hoops) assert.ok(has(rings, [hoop.distance, hoop.x, hoop.altitude]), `${id} seed ${seed} hoop @${hoop.distance}`);
  }
}));

test('every shortcut corridor keeps its reward line: cells every 60 m and a tank halfway', () => forSeeds(seed => {
  for (const [id, track] of Object.entries(RACE_TRACKS)) for (const s of track.sections.filter(s => s.type === 'shortcut')) {
    const { pickups } = createRace(id), on = (d, tier) => pickups.some(p => p.distance === d && p.x === s.x && p.altitude === s.altitude && p.tier === tier);
    for (let d = s.from + 30; d < s.to; d += 60) assert.ok(on(d, 'cell'), `${id} seed ${seed} cell @${d}`);
    assert.ok(on((s.from + s.to) / 2, 'tank'), `${id} seed ${seed} tank`);
  }
}));
