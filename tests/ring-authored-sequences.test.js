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
  [500, 2.5, 1.5], [560, 7.5, 1.5], [620, 7.5, 1.5], [680, 2.5, 1.5], [720, -2.5, 2.5], // rail underpass
  [790, -7.5, 2.5], [860, 0, 2.5], [930, 7.5, 2.5], [1000, 0, 2.5], [1070, -7.5, 2.5], // night market
  [1800, 7.5, 2.5], [1925, 7.5, 2.5], [2050, 7.5, 2.5], [2175, 7.5, 2.5], [2300, 7.5, 2.5], // expressway
  [2538, 0, 6.5], [2598, 0, 8], [2658, 0, 9.5], [2718, 0, 8.5], [2778, 0, 7.5], // canal bridge
  [3220, 2.5, 2.5], [3280, -2.5, 2.5], [3340, -7.5, 2.5], [3400, -7.5, 2.5], [3460, -7.5, 2.5], [3520, -2.5, 2.5], [3580, 2.5, 2.5],
  [3650, 2.5, 2.5], [3720, 7.5, 2.5], [3820, 2.5, 2.5], [3920, -7.5, 2.5], [3920, 7.5, 2.5], // Violet Plaza
];

test('Neon Downtown keeps its five sector ring lines in every race that reads the track layout', () => forSeeds(seed => {
  for (const config of [undefined, { mode: 'custom', themes: true }, { mode: 'gauntlet', layout: 'mixed' }, { mode: 'time' }]) {
    const { rings } = createRace('neon', config), hoops = mixedCourse('neon', RACE_TRACKS.neon, LANES, config ?? { mode: 'classic' })?.hoops ?? [];
    // The older authored rule wins: a mixed-Gauntlet hoop replaces any ring within 30 m (`withHoops`), so the hoop at
    // 2663 stands in for the canal crown ring and that line pays PERFECT LINE on its four other rings.
    const replaced = NEON_LINES.filter(([d]) => hoops.some(h => Math.abs(h.distance - d) <= 30));
    assert.deepEqual(replaced, config?.mode === 'gauntlet' ? [[2658, 0, 9.5]] : [], `seed ${seed} ${JSON.stringify(config)}`);
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
