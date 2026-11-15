// Task 5b steps 10 and 11 (owner brief, 2026-11-15): each Neon Downtown sector past the boulevard has one authored
// ring line, and the seven read as one 10 km lap (docs/designs/3d-pipeline/phases/task-5b-neon-downtown.md, "Lap plan"). Authored lines are design
// (.claude/rules/ring-layout.md): the same on every seed, each its own PERFECT LINE, clear of the landmarks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace, startRace, stepRace, setLayoutSeed, RACE_TRACKS, MAX_SPEED } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { CLASSIC_THEMED_PLACEMENTS } from '../src/track-themes-classic.ts';
import { NEON_CHUNK_METRES, NEON_RESERVED, neonChunkPlan } from '../src/neon-scenery-plan.ts';

const SEEDS = [undefined, 1, 2, 3, 99];
const forSeeds = run => {
  try { for (const seed of SEEDS) { setLayoutSeed(seed === undefined ? undefined : () => seed); run(createRace('neon'), `seed ${seed}`); } } finally { setLayoutSeed(); }
};
// Lap metres of each line's stretch (its first ring - 40 m to its last + 40 m), and the landmarks it has to respect.
const STRETCH = { underpass: [680, 970], market: [1254, 1615], expressway: [2960, 3541], harbour: [4520, 5351], canal: [6340, 6661], oldtown: [7310, 8251], plaza: [9180, 9961] };
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

// Step 11, provisional sector: the long waterfront straight. The wind blows from the sea (dir 1: toward +x).
const WIND = RACE_TRACKS.neon.sections.find(s => s.type === 'crosswind');
test('harbour: one windward lane of rings through the crosswind, spaced for NITRO speed, ending on a charge ring', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.harbour);
  assert.ok(WIND && WIND.dir === 1 && WIND.to - WIND.from >= 600, 'a crosswind over the harbour straight');
  assert.ok(gates.length >= 7 && gates.every(g => g.length === 1), `${label}: ${gates.length} single rings`);
  assert.equal(gates.at(-1)[0].type, 'charge', `${label}: the burn ends on FLY fuel for the bridge`);
  assert.ok(gates.filter(([r]) => r.type === 'nitro').length >= 5, `${label}: the longest burn of the lap`);
  gates.forEach(([r], i) => {
    assert.equal(r.x, -7.5 * WIND.dir, `${label}: ring @${r.distance} in the windward lane`);
    assert.ok(fromRoad(r), `${label}: ring @${r.distance} taken from the road`);
    const gap = i ? r.distance - gates[i - 1][0].distance : 125;
    assert.ok(gap >= 110 && gap <= NITRO_SPEED * HALF_CHARGE, `${label}: ${gap} m to ring @${r.distance} (about one second at NITRO speed)`);
  });
  assert.ok(gates.filter(([r]) => r.distance >= WIND.from && r.distance < WIND.to).length >= gates.length - 1, `${label}: the line lies in the wind`);
  oneLine(gates, label, race);
}));

test('harbour: steering into the wind holds the lane and takes the whole line; a car that only goes straight is blown off it', () => forSeeds((race, label) => {
  const [from, to] = STRETCH.harbour, lane = -7.5;
  const drive = hold => {
    setLayoutSeed(label === 'seed undefined' ? undefined : () => Number(label.slice(5)));
    const run = createRace('neon'), car = run.player;
    startRace(run); run.phase = 'racing'; run.traffic = []; run.rivals = []; run.hazards = []; run.pickups = [];
    Object.assign(car, { distance: from - 60, x: lane, speed: MAX_SPEED, nitro: 1 });
    while (car.distance < to) stepRace(run, { throttle: true, laneAssist: false, steer: hold ? Math.max(-1, Math.min(1, (lane - car.x) * 0.6)) : 0, nitro: car.nitro >= 1 && car.nitroTime === 0 }, 1 / 60);
    return car.perfectLines;
  };
  assert.equal(drive(true), 1, `${label}: holding the lane takes the whole line`);
  assert.equal(drive(false), 0, `${label}: the wind takes a car that does not steer off the line`);
}));

// Step 11, provisional sector: four linked S-bends, left 7338, right 7498, left 7813, right 8128 to 8288.
test('oldtown: the ring line weaves with the S-bends, a NITRO ring where each swing ends, clear of the gate', () => forSeeds((race, label) => {
  const gates = gatesIn(race, STRETCH.oldtown), line = gates.map(([r]) => r), road = classicRoadRoute('neon');
  const turn = d => Math.sign(road.heading(d + 5) - road.heading(d - 5)), right = turn(800); // the underpass corner turns right
  assert.ok(line.length >= 10 && gates.every(g => g.length === 1), `${label}: ${line.length} single rings`);
  assert.ok(line[0].distance >= 7338 && line.at(-1).distance <= 8288, `${label}: inside the S-bends`);
  line.forEach((r, i) => {
    assert.ok(fromRoad(r), `${label}: ring @${r.distance} taken from the road`);
    assert.equal(r.type === 'nitro', Math.abs(r.x) === 7.5, `${label}: ring @${r.distance}: NITRO at the kerb where a swing ends`);
    assert.ok(Math.abs(r.distance - 7813) >= 60, `${label}: ring @${r.distance} clear of the swinging gate at 7813`);
    if (!i) return;
    const gap = r.distance - line[i - 1].distance, swing = r.x - line[i - 1].x;
    assert.ok(Math.abs(swing) === 5 && gap >= 70 && gap <= 170, `${label}: one lane over in ${gap} m to ring @${r.distance}`);
    // A fast car runs wide: the swing goes to the outside of the bend the ring sits in, never against the push.
    assert.equal(Math.sign(swing), turn(r.distance) === right ? -1 : 1, `${label}: ring @${r.distance} swings with its bend`);
  });
  assert.ok(new Set(line.filter(r => r.type === 'nitro').map(r => r.x)).size === 2, `${label}: a NITRO ring at both kerbs`);
  assert.ok(RACE_TRACKS.neon.sections.some(s => s.type === 'shortcut' && s.x < 0 && s.from >= line.at(-1).distance && s.from - line.at(-1).distance <= 100), `${label}: the line lets out into the rooftop corridor`);
  oneLine(gates, label, race);
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

test('the seven lines are the same on every seed, and no random ring sits inside one', () => {
  assert.equal(RACE_TRACKS.neon.ringLines.length, 7);
  const layouts = [];
  forSeeds(race => layouts.push(Object.values(STRETCH).flatMap(stretch => race.rings.filter(r => r.distance >= stretch[0] && r.distance < stretch[1]))
    .map(r => [r.distance, r.x, r.altitude, r.radius, r.type, r.groupSize])));
  for (const layout of layouts) assert.deepEqual(layout, layouts[0]);
  // 48 single rings and the finish row of 4: nothing else in the seven stretches.
  assert.equal(layouts[0].length, RACE_TRACKS.neon.ringLines.flat().length + 3, 'only authored rings in the seven stretches');
});

// Fault (2026-11-15, the 10 km lap): with five lines in 10 km instead of 4 km a random ring 40 m before a line, in a
// far lane or the air, cost the first ring of that line on most seeds. A random ring now keeps 100 m (LINE_LEAD).
test('no random ring sits in the 100 m before a line: the car has time to line up for its first ring', () => forSeeds((race, label) => {
  for (const line of RACE_TRACKS.neon.ringLines) {
    const first = line[0][0], lead = race.rings.filter(r => r.distance >= first - 100 && r.distance < first);
    assert.deepEqual(lead.map(r => r.distance), [], `${label}: before the line at ${first} m`);
  }
}));

// Fault (2026-11-15): a random ring up in the air or in the far lane 100 to 250 m before a line still cost its first
// ring (a gliding car sinks slowly; crossing the road takes 1.6 s). Random rings on the approach now lead into it.
const LANES = [-7.5, -2.5, 2.5, 7.5];
test('the approach: a random ring in the 300 m before a line is on the road, in the lane of the line\'s first ring', () => forSeeds((race, label) => {
  let led = 0;
  for (const line of RACE_TRACKS.neon.ringLines) {
    const [first, x] = line[0], lane = LANES.reduce((best, l) => Math.abs(l - x) < Math.abs(best - x) ? l : best);
    for (const r of race.rings.filter(r => r.distance >= first - 300 && r.distance < first - 100)) {
      led++;
      assert.ok(fromRoad(r) && r.altitude <= 2.5, `${label}: ring @${r.distance} before the line at ${first} is ${r.altitude} m up`);
      if (!r.row) assert.equal(r.x, lane, `${label}: ring @${r.distance} leads into the line at ${first}`);
      assert.notEqual(r.type, 'risk', `${label}: no free risk ring on the road`);
    }
  }
  assert.ok(led >= 7, `${label}: ${led} approach rings`);
}));

/** Lap metres of the harbour hero pieces as placed (src/neon-scenery-plan.ts). */
const HARBOUR_LANDMARKS = Array.from({ length: 83 }, (_, chunk) => neonChunkPlan(chunk).filter(p => p.piece === 'harbour_gantry' || p.piece === 'cargo_ship')
  .map(p => chunk * NEON_CHUNK_METRES + p.along)).flat();
// Step 11: no stretch of the lap longer than 600 m without a ring line, a section, a gameplay prop or a landmark.
test('nothing for more than 600 m never happens: lines, sections, props and landmarks cover the lap', () => {
  const track = RACE_TRACKS.neon, spans = [
    ...track.ringLines.map(line => [line[0][0], line.at(-1)[0]]), ...track.sections.map(s => [s.from, s.to]),
    ...CLASSIC_THEMED_PLACEMENTS.neon.map(p => [p.distance, p.distance]),
    ...[150, 330, 698, 902, 6500, SCULPTURE, NEON_RESERVED.oldtown.lap].map(d => [d, d]), // footbridges, portals, arch, sculpture, stand-in
    ...HARBOUR_LANDMARKS.map(d => [d, d]), // the harbour gantries and ship
  ].sort((a, b) => a[0] - b[0]);
  let reach = spans[0][0], worst = [spans[0][0] + track.length - Math.max(...spans.map(s => s[1])), 'the finish line'];
  for (const [from, to] of spans) { if (from - reach > worst[0]) worst = [from - reach, `${reach} to ${from}`]; reach = Math.max(reach, to); }
  assert.ok(worst[0] <= 600, `${worst[0]} m empty: ${worst[1]}`);
});

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
