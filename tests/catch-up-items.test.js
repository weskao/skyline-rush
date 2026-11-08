import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, mysteryEffect } from '../src/game.js';
import { rivalCollects } from '../src/rival-items.ts';
import * as catchUp from '../src/catch-up-items.ts';
const { spawnCatchUp, CATCH_UP } = catchUp;
import { ROW_ALTITUDE } from '../src/ring-layout.ts';

// User, 2026-11-07: a player well behind the leader in Classic or Cup finds only extra rings ahead,
// weighted NITRO 60%, charge 20%, slipstream 20%, beyond the normal draw range
// (docs/superpowers/specs/2026-11-07-catch-up-items-design.md).
const racing = (id, options) => { const race = createRace(id, options); startRace(race); race.phase = 'racing'; race.countdown = 0; return race; };
const extras = race => [...race.rings, ...race.pickups].filter(item => item.catchUp);
// Holds the leader `gap` m ahead while the player drives at 60 m/s, calling the spawner every 0.1 s.
function trail(race, gap, seconds, from = 400) {
  const spawnedAt = [];
  for (let t = 0; t < seconds; t += 0.1) {
    race.elapsed += 0.1;
    race.player.distance = from + race.elapsed * 60;
    race.rivals.forEach((rival, i) => { rival.distance = race.player.distance + (i ? -20 : gap); });
    const before = new Set(extras(race));
    spawnCatchUp(race);
    for (const item of extras(race)) if (!before.has(item)) spawnedAt.push([item, race.player.distance]);
    if (race.player.distance > race.length) break;
  }
  return spawnedAt;
}
const sorted = items => items.every((item, i) => !i || items[i - 1].distance <= item.distance);

test('a Classic player 300 m behind gets extra rings, added beyond the 900 m draw range', () => {
  const race = racing('tokyo'), spawned = trail(race, 300, 60);
  assert.ok(spawned.length >= 5, `spawned ${spawned.length}`);
  assert.ok(spawned.length <= catchUp.catchUpSettings(race.length).maxItems);
  assert.ok(spawned.every(([item]) => item.type && item.altitude === ROW_ALTITUDE), 'all catch-up items are rings at the row altitude');
  for (const [item, at] of spawned) {
    assert.ok(item.distance - at > 900, `added ${item.distance - at} m ahead`);
    assert.ok(item.distance < race.length - 100);
    assert.ok(!race.sections.some(s => item.distance >= s.from - 40 && item.distance <= s.to + 40), `@${item.distance} near a section`);
  }
  assert.ok(sorted(race.rings) && sorted(race.pickups), 'arrays stay sorted');
});

test('NITRO is the majority of catch-up rings across five Classic tracks', () => {
  const spawned = ['tokyo', 'coast', 'neon', 'canyon', 'alpine']
    .flatMap(id => trail(racing(id), 300, 90).map(([item]) => item));
  assert.ok(spawned.length >= 30, `spawned ${spawned.length}`);
  const nitro = spawned.filter(item => item.type === 'nitro').length;
  const charge = spawned.filter(item => item.type === 'charge').length;
  const slipstream = spawned.filter(item => item.type === 'slipstream').length;
  assert.ok(nitro / spawned.length >= 0.5, `NITRO ${nitro}/${spawned.length}`);
  assert.ok(charge < nitro, `charge ${charge}, NITRO ${nitro}`);
  assert.ok(slipstream < nitro, `slipstream ${slipstream}, NITRO ${nitro}`);
});

test('help scales with the gap and stays off under 150 m or in the lead', () => {
  assert.equal(trail(racing('tokyo'), 100, 60).length, 0, '100 m behind');
  assert.equal(trail(racing('tokyo'), -200, 60).length, 0, 'leading');
  assert.ok(trail(racing('tokyo'), 300, 40).length > trail(racing('tokyo'), 170, 40).length, 'more help further behind');
});

test('once on, help stays on until the gap is back under 50 m', () => {
  const race = racing('tokyo');
  trail(race, 300, 15);
  assert.ok(trail(race, 80, 30).length > 0, 'still behind 80 m');
  assert.equal(trail(race, 30, 40).length, 0, 'caught up');
});

test('only Classic (not the Daily challenge) and Cup get catch-up items', () => {
  assert.ok(trail(racing('tokyo', { mode: 'cup' }), 300, 60).length > 0, 'cup');
  for (const options of ['double-traffic', { mode: 'custom', rivals: 7 }, { mode: 'time' }, { mode: 'elimination' }, { mode: 'free' }]) {
    assert.equal(trail(racing('tokyo', options), 300, 60).length, 0, JSON.stringify(options));
  }
});

test('the same race and inputs add the same items', () => {
  const layout = race => extras(race).map(i => [i.distance, i.x, i.altitude, i.type ?? i.tier]);
  const a = racing('tokyo'), b = racing('tokyo');
  trail(a, 300, 60); trail(b, 300, 60);
  assert.deepEqual(layout(a), layout(b));
});

test('rivals ignore catch-up items and a catch-up ring never completes a PERFECT LINE', () => {
  const race = racing('tokyo');
  trail(race, 300, 60);
  const ring = race.rings.find(r => r.catchUp && r.type === 'nitro');
  assert.ok(ring, 'a catch-up NITRO ring exists');
  const rival = { ...race.rivals[0], distance: ring.distance + 1, x: ring.x, altitude: ring.altitude, itemTakes: 0 };
  rivalCollects(race, rival, ring.distance - 1);
  assert.ok(!(ring.downUntil > race.elapsed), 'rival took nothing');
  Object.assign(race.player, { distance: ring.distance - 1, x: ring.x, altitude: ring.altitude, speed: 30 });
  const lines = race.player.perfectLines;
  stepRace(race, { throttle: true }, 0.1);
  assert.ok(ring.hit, 'player takes it');
  assert.equal(race.player.perfectLines, lines);
});

test('existing mystery rings keep their effect after items are inserted', () => {
  const race = racing('coast');
  const effects = race.rings.map((r, i) => r.type === 'mystery' ? mysteryEffect(race.seed, r.mysteryIndex ?? i) : null);
  const mystery = race.rings.filter(r => r.type === 'mystery');
  trail(race, 300, 60, 200);
  for (const r of mystery) assert.equal(mysteryEffect(race.seed, r.mysteryIndex ?? race.rings.indexOf(r)), effects[race.rings.filter(x => !x.catchUp).indexOf(r)]);
});

test('stepRace runs the spawner: a Classic player held far behind finds catch-up items', () => {
  const race = racing('tokyo');
  for (let i = 0; i < 400; i++) {
    for (const rival of race.rivals) rival.distance = race.player.distance + 300;
    stepRace(race, { throttle: true }, 0.05);
  }
  assert.ok(extras(race).length > 0);
});

test('catch-up tuning derives limits, timing and distance thresholds from total course length', () => {
  assert.equal(typeof catchUp.catchUpSettings, 'function', 'length-aware tuning must be exposed by shared catch-up code');
  const short = catchUp.catchUpSettings(racing('neon').length);
  const reference = catchUp.catchUpSettings(racing('canyon').length);
  const long = catchUp.catchUpSettings(racing('cosmic').length);
  const future = catchUp.catchUpSettings(12000);
  assert.equal(reference.maxItems, CATCH_UP.maxItems, '6 km reference track keeps 12-item baseline');
  assert.equal(reference.fastest, CATCH_UP.fastest);
  assert.equal(reference.slowest, CATCH_UP.slowest);
  assert.ok(short.maxItems < reference.maxItems && reference.maxItems < long.maxItems && long.maxItems < future.maxItems, 'item budget scales with each real or future course');
  assert.ok(short.fastest < reference.fastest && reference.fastest < long.fastest, 'spawn cadence scales with length');
  assert.ok(short.slowest < reference.slowest && reference.slowest < long.slowest);
  assert.ok(short.on < reference.on && reference.on < long.on, 'gap thresholds scale with length');
  assert.ok(short.off < reference.off && reference.off < long.off);
  assert.ok(short.full < reference.full && reference.full < long.full);
  for (const rules of [short, reference, long, future]) {
    assert.ok(rules.ahead > 900, 'a catch-up ring stays outside the 900 m draw range');
    assert.equal(rules.clearance, CATCH_UP.clearance, 'section clearance is a physical safety minimum');
    assert.equal(rules.spacing, CATCH_UP.spacing, 'existing-item spacing is a physical safety minimum');
    assert.ok(rules.maxItems >= 0);
  }
  assert.equal(catchUp.catchUpSettings(900).maxItems, 0, 'a course shorter than the safe lookahead cannot spawn bonus rings');
  assert.equal(catchUp.catchUpSettings(Number.NaN).maxItems, 0, 'invalid lengths fail closed');
});

test('future 12 km race uses its length for extra-ring budget and keeps all placements safe', () => {
  const race = racing('tokyo');
  race.length = 12000; // future-course simulation: no track-ID-specific tuning
  race.sections = []; race.rings = []; race.pickups = [];
  const spawned = trail(race, 300, 240, 0), rules = catchUp.catchUpSettings(race.length);
  assert.ok(spawned.length > CATCH_UP.maxItems, 'future long tracks must not stop at the old 12-ring cap');
  assert.ok(spawned.length <= rules.maxItems, 'long tracks obey their own limit');
  for (const [item, playerDistance] of spawned) {
    assert.ok(item.distance - playerDistance > 900 && item.distance <= race.length - 100, 'safe lookahead and finish reserve');
    assert.ok(item.type && item.altitude === ROW_ALTITUDE, 'all spawned items remain road-reachable rings');
  }
});
