// Task 5b step 10 (owner brief, 2026-11-15): each Neon Downtown sector has one authored ring line, and the five
// read as one lap (docs/designs/3d-pipeline/phases/task-5b-neon-downtown.md, "Lap plan"). Authored lines are design
// (.claude/rules/ring-layout.md): the same on every seed, each its own PERFECT LINE, clear of the landmarks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace, startRace, stepRace, setLayoutSeed, RACE_TRACKS, MAX_SPEED } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';

const SEEDS = [undefined, 1, 2, 3, 99];
const forSeeds = run => {
  try { for (const seed of SEEDS) { setLayoutSeed(seed === undefined ? undefined : () => seed); run(createRace('neon'), `seed ${seed}`); } } finally { setLayoutSeed(); }
};
// Lap metres of each line's stretch (its first ring - 40 m to its last + 40 m), and the landmarks it has to respect.
const STRETCH = { underpass: [680, 970], market: [1254, 1615], expressway: [2960, 3541], canal: [6340, 6661], plaza: [9180, 9961] };
const TUNNEL = [690, 910], ROOF = 4, CAR_HEIGHT = 1.2;
const ARCH = { from: 6433.5, to: 6566.5, crown: 6500, halfWidth: 13.5, height: 14 };
const SCULPTURE = 9400, FINISH = 10000, NITRO_SPEED = 118, HALF_CHARGE = 1.25; // s of NITRO a nitro ring pays

/** One gate per distance in [from, to): a full-width row is one gate. */
const gatesIn = (race, [from, to]) => Object.values(Object.groupBy(race.rings.filter(r => r.distance >= from && r.distance < to), r => r.distance));
const fromRoad = ring => Math.hypot(0, ring.altitude) < ring.radius; // a car on the surface, in the ring's lane, takes it
const oneLine = (gates, label, race) => {
  const [first] = gates[0], own = gates.flat();
  assert.ok(race.rings.every(r => own.includes(r) || r.group !== first.group), `${label}: the line shares its group with no other ring`);
  for (const gate of gates) for (const r of gate) assert.deepEqual([r.group, r.groupSize], [first.group, gates.length], `${label}: one PERFECT LINE of ${gates.length} gates @${r.distance}`);
};

test('rail underpass: a low ring line on the inside of the corner, then a NITRO ring at the exit', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.underpass), inside = gates.filter(([r]) => r.distance < TUNNEL[1]), after = gates.filter(([r]) => r.distance >= TUNNEL[1]);
  assert.ok(inside.length >= 3, `${label}: ${inside.length} rings under the roof`);
  for (const [r] of inside) {
    assert.ok(r.altitude + CAR_HEIGHT <= ROOF, `${label}: ring @${r.distance} fits under the 4 m roof`);
    assert.ok(r.x > 0, `${label}: ring @${r.distance} on the inside of the right-hander (x ${r.x})`);
    assert.notEqual(r.type, 'risk', `${label}: no free risk ring where the car cannot climb`);
  }
  assert.equal(after.length, 1, `${label}: one ring between the portal and the market`);
  const [exit] = after[0];
  assert.equal(exit.type, 'nitro', `${label}: the exit ring pays NITRO`);
  assert.ok(exit.distance - TUNNEL[1] <= 40 && fromRoad(exit), `${label}: right at the exit, taken from the road`);
  oneLine(gates, label, race);
}));

test('night market: the ring line swings from kerb to kerb across the traffic lanes', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.market), line = gates.map(([r]) => r);
  assert.ok(line.length >= 5 && gates.every(g => g.length === 1), `${label}: ${line.length} single rings`);
  line.forEach((r, i) => {
    assert.ok(fromRoad(r), `${label}: ring @${r.distance} taken from the road`);
    assert.equal(Math.abs(r.x), i % 2 ? 0 : 7.5, `${label}: ring ${i} @${r.distance} x ${r.x}: kerb, centre, kerb`);
    if (i >= 2 && i % 2 === 0) assert.equal(r.x, -line[i - 2].x, `${label}: kerb ring @${r.distance} on the other side`);
    if (i) assert.ok(r.distance - line[i - 1].distance <= 70, `${label}: ${r.distance - line[i - 1].distance} m to ring @${r.distance}`);
    assert.equal(r.type, i % 2 ? 'charge' : 'nitro', `${label}: NITRO at the kerbs, charge on the centre line`);
  });
  // No lane, and no line between lanes, takes the whole line: from one kerb ring to the next the car has to cross
  // more than a lane width (5 m), over the two middle traffic lanes.
  for (let x = -10; x <= 10; x += 0.5) assert.ok(line.some(r => Math.hypot(r.x - x, r.altitude) >= r.radius), `${label}: a car holding x ${x} takes the whole line`);
  const reach = Math.sqrt(line[0].radius ** 2 - line[0].altitude ** 2);
  assert.ok(2 * (7.5 - reach) > 5, `${label}: kerb to kerb asks for ${2 * (7.5 - reach)} m of steering`);
  oneLine(gates, label, race);
}));

test('expressway: one lane of rings spaced for NITRO speed, ending on a charge ring before the bridge', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.expressway);
  assert.ok(gates.length >= 5 && gates.every(g => g.length === 1), `${label}: ${gates.length} single rings`);
  assert.equal(gates[0][0].type, 'nitro', `${label}: the burn opens on a NITRO ring`);
  assert.equal(gates[0][0].x, 7.5, `${label}: in the inside lane, where the shortcut corridor lets out`);
  assert.equal(gates.at(-1)[0].type, 'charge', `${label}: the burn ends on FLY fuel for the bridge`);
  gates.forEach(([r], i) => {
    assert.equal(r.x, gates[0][0].x, `${label}: ring @${r.distance} in the burn lane`);
    assert.ok(fromRoad(r), `${label}: ring @${r.distance} taken from the road`);
    const gap = i ? r.distance - gates[i - 1][0].distance : 125;
    assert.ok(gap >= 110 && gap <= NITRO_SPEED * HALF_CHARGE, `${label}: ${gap} m to ring @${r.distance} (about one second at NITRO speed)`);
  });
  oneLine(gates, label, race);
}));

test('expressway: one banked charge and the burn lane keep NITRO lit to the end of the line', () => forSeeds((race, label) => {
  const [from, to] = STRETCH.expressway, lane = gatesIn(race, STRETCH.expressway)[0][0].x, car = race.player;
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = []; race.hazards = []; race.pickups = [];
  Object.assign(car, { distance: from, x: lane, speed: MAX_SPEED, nitro: 1 });
  let dark = 0;
  while (car.distance < to) {
    stepRace(race, { throttle: true, laneAssist: true, steer: Math.max(-1, Math.min(1, (lane - car.x) * 0.6)), nitro: car.nitro >= 1 && car.nitroTime === 0 }, 1 / 60);
    if (car.distance > from + 30 && car.nitroTime === 0) dark++;
  }
  assert.ok(dark <= 2, `${label}: NITRO went out for ${dark} frames`);
  assert.equal(car.perfectLines, 1, `${label}: holding the lane takes the whole line`);
}));

test('canal bridge: air rings climb to a risk ring over the crown of the arch and come down the far side', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.canal), line = gates.map(([r]) => r), over = line.filter(r => r.distance >= ARCH.from && r.distance <= ARCH.to);
  assert.ok(line.length >= 5 && gates.every(g => g.length === 1), `${label}: ${line.length} single rings`);
  assert.ok(over.length >= 3, `${label}: ${over.length} rings over the bridge`);
  for (const r of line) {
    assert.ok(!fromRoad(r), `${label}: ring @${r.distance} needs FLY (altitude ${r.altitude})`);
    assert.ok(r.altitude + r.radius <= ARCH.height && Math.abs(r.x) + r.radius <= ARCH.halfWidth, `${label}: ring @${r.distance} inside the arch's clear opening`);
  }
  const crown = line.find(r => r.distance === ARCH.crown);
  assert.equal(crown?.type, 'risk', `${label}: a risk ring at the crown`);
  line.forEach((r, i) => {
    if (i) assert.ok(r.distance <= ARCH.crown ? r.altitude > line[i - 1].altitude : r.altitude < line[i - 1].altitude, `${label}: the line rises to the crown and falls after it @${r.distance}`);
  });
  oneLine(gates, label, race);
}));

test('Violet Plaza: the ring arc bows toward the sculpture, then leads to a slipstream gate before the line', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.plaza), line = gates.map(([r]) => r), apex = line.findIndex(r => r.distance === SCULPTURE);
  assert.ok(apex >= 2, `${label}: a ring beside the sculpture, at least two leading in`);
  assert.equal(line[apex].x, -7.5, `${label}: the apex is on the sculpture's side of the road`);
  const back = line.findIndex((r, i) => i > apex && r.x > 0);
  assert.ok(line[0].x > 0 && back > apex, `${label}: the arc starts and ends right of the centre line`);
  for (let i = 1; i <= back; i++) {
    assert.ok(i <= apex ? line[i].x <= line[i - 1].x : line[i].x >= line[i - 1].x, `${label}: the arc bows out to the sculpture and back @${line[i].distance}`);
  }
  line.forEach((r, i) => {
    assert.ok(fromRoad(r), `${label}: ring @${r.distance} taken from the road`);
    if (i) assert.ok(r.distance - line[i - 1].distance <= 110, `${label}: ${r.distance - line[i - 1].distance} m to ring @${r.distance}`);
  });
  const last = gates.at(-1);
  assert.ok(last.length === 4 && last.every(r => r.row && r.type === 'slipstream'), `${label}: the line ends in a full-width slipstream gate`);
  assert.ok(FINISH - last[0].distance <= 100, `${label}: within 100 m of the finish line`);
  oneLine(gates, label, race);
}));

test('the five lines are the same on every seed, and no random ring sits inside one', () => {
  const layouts = [];
  forSeeds(race => layouts.push(Object.values(STRETCH).flatMap(stretch => race.rings.filter(r => r.distance >= stretch[0] && r.distance < stretch[1]))
    .map(r => [r.distance, r.x, r.altitude, r.radius, r.type, r.groupSize])));
  for (const layout of layouts) assert.deepEqual(layout, layouts[0]);
  // 30 single rings and the finish row of 4: nothing else in the five stretches.
  assert.equal(layouts[0].length, RACE_TRACKS.neon.ringLines.flat().length + 3, 'only authored rings in the five stretches');
});

// Fault (2026-11-15, the 10 km lap): with five lines in 10 km instead of 4 km a random ring 40 m before a line, in a
// far lane or the air, cost the first ring of that line on most seeds. A random ring now keeps 100 m (LINE_LEAD).
test('no random ring sits in the 100 m before a line: the car has time to line up for its first ring', () => forSeeds((race, label) => {
  for (const line of RACE_TRACKS.neon.ringLines) {
    const first = line[0][0], lead = race.rings.filter(r => r.distance >= first - 100 && r.distance < first);
    assert.deepEqual(lead.map(r => r.distance), [], `${label}: before the line at ${first} m`);
  }
}));

test('a clean lap of the bot takes every ground line whole; the bridge line needs FLY fuel in hand', () => {
  const race = createRace('neon'), car = race.player, bot = { boost: false, climb: false };
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = [];
  for (let steps = 0; race.phase === 'racing' && steps < 36000; steps++) stepRace(race, botInput(race, bot), 1 / 60);
  for (const [name, stretch] of Object.entries(STRETCH)) {
    const gates = gatesIn(race, stretch), taken = gates.filter(gate => gate.some(r => r.hit)).length;
    assert.equal(taken, gates.length, `${name}: the bot took ${taken} of ${gates.length} gates`);
  }
});

test('the highlight lines are Neon only: every other track keeps its ring layout', () => {
  const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
  const rings = Object.fromEntries(Object.keys(RACE_TRACKS).filter(id => id !== 'neon').map(id => {
    const race = createRace(id);
    return [id, [race.rings.length, sha(race.rings.map(r => [r.distance, r.x, r.altitude, r.radius, r.type]))]];
  }));
  assert.deepEqual(rings, {
    coast: [121, '1f623acf6557f0a6'], canyon: [77, '8eadcc0388f59da2'], aurora: [64, '25a422ed04e374ce'], spiral: [92, '6ed9d0b0efee3185'],
    taipei: [70, '80364872412e3905'], tokyo: [49, '88b5bafb2ffbfc8c'], alpine: [43, '68f4d3ead42d4638'], coastal: [55, 'dc06fefb829a982a'], cosmic: [66, '16e3ca5db9d78a9b'],
  });
});
