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
