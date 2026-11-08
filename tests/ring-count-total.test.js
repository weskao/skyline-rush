import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, setLayoutSeed } from '../src/game.js';

// Bug (2026-11-08): a PERFECT LINE group counted more rings than it holds (6/5), so clearing every ring never paid it.
// Authored hoops (Sky Spiral's themed hoops, the mixed Gauntlet's barricade hoops) were laid in group 0, the same
// group as the first random ring line; their hits added to that line's count past its groupSize.
const RACES = [
  ['spiral', { mode: 'free', themes: true }],
  ['spiral', { mode: 'gauntlet', themes: true }],
  ['aurora', { mode: 'gauntlet', layout: 'mixed' }],
  ['canyon', { mode: 'gauntlet', layout: 'mixed' }],
  // Hoops drop ring gates within 30 m after groups are sized: coast seed 24 left group 0 with 4 rings of groupSize 5.
  ['coast', { mode: 'gauntlet', layout: 'mixed' }, [24]],
];

// One ring per gate (a full-width row pays once per car), in race order.
const gatesOf = rings => rings.filter((ring, i) => !ring.row || rings.findIndex(o => o.row && o.distance === ring.distance) === i);

// Drives the player through every gate, one step each, and reports what the race paid.
function driveAll(trackId, config, seed) {
  setLayoutSeed(() => seed);
  const race = createRace(trackId, config);
  setLayoutSeed();
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = []; race.hazards = [];
  const gates = gatesOf(race.rings);
  for (const ring of gates) {
    Object.assign(race.player, { distance: ring.distance - 0.5, x: ring.x, altitude: ring.altitude, speed: 30, verticalSpeed: 0, fall: null });
    stepRace(race, { throttle: true }, 1 / 60);
  }
  return { race, gates };
}

test('every PERFECT LINE group counts only its own rings, so clearing every ring pays every ring line once', () => {
  for (const [trackId, config, seeds = [1, 7, 99]] of RACES) for (const seed of seeds) {
    const { race, gates } = driveAll(trackId, config, seed), car = race.player, label = `${trackId} ${JSON.stringify(config)} seed ${seed}`;
    assert.equal(car.rings, gates.length, `${label}: every gate collected once`);
    const sizes = new Map();
    for (const ring of gates) sizes.set(ring.group, (sizes.get(ring.group) ?? 0) + 1);
    for (const ring of gates) if (ring.groupSize !== undefined) assert.ok(car.groupHits[ring.group] <= ring.groupSize,
      `${label}: group ${ring.group} counted ${car.groupHits[ring.group]}/${ring.groupSize} rings`);
    for (const [group, size] of sizes) assert.equal(car.groupHits[group], size, `${label}: group ${group} hits ${car.groupHits[group]}/${size}`);
    for (const ring of gates) if (ring.groupSize !== undefined && ring.groupSize !== Infinity) assert.equal(ring.groupSize,
      sizes.get(ring.group), `${label}: group ${ring.group} sized ${ring.groupSize} but holds ${sizes.get(ring.group)} gates`);
    const lines = new Set(gates.filter(ring => ring.groupSize !== Infinity).map(ring => ring.group)); // hoops form no PERFECT LINE
    assert.ok(lines.size < sizes.size, `${label}: race has authored hoops`);
    assert.equal(car.perfectLines, lines.size, `${label}: one PERFECT LINE per cleared ring line`);
  }
});
