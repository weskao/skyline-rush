import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, mysteryEffect } from '../src/game.js';
import { rivalCollects } from '../src/rival-items.ts';
import { spawnCatchUp, CATCH_UP } from '../src/catch-up-items.ts';

// User, 2026-11-07: a player well behind the leader in Classic or Cup finds a few extra rings and NITRO cans ahead,
// appearing beyond the draw range like any other ring (docs/superpowers/specs/2026-11-07-catch-up-items-design.md).
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

test('a Classic player 300 m behind gets extra rings and NITRO cans, added beyond the 900 m draw range', () => {
  const race = racing('tokyo'), spawned = trail(race, 300, 60);
  assert.ok(spawned.length >= 5, `spawned ${spawned.length}`);
  assert.ok(spawned.length <= CATCH_UP.maxItems);
  assert.ok(spawned.some(([i]) => i.type) && spawned.some(([i]) => i.tier === 'can'), 'both rings and cans');
  for (const [item, at] of spawned) {
    assert.ok(item.distance - at > 900, `added ${item.distance - at} m ahead`);
    assert.ok(item.distance < race.length - 100);
    assert.ok(!race.sections.some(s => item.distance >= s.from - 40 && item.distance <= s.to + 40), `@${item.distance} near a section`);
  }
  assert.ok(sorted(race.rings) && sorted(race.pickups), 'arrays stay sorted');
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
  const ring = race.rings.find(r => r.catchUp && r.type === 'nitro') ?? race.rings.find(r => r.catchUp), can = race.pickups.find(p => p.catchUp);
  const rival = { ...race.rivals[0], distance: Math.max(ring.distance, can.distance) + 1, x: ring.x, altitude: ring.altitude, itemTakes: 0 };
  rivalCollects(race, rival, Math.min(ring.distance, can.distance) - 1);
  assert.ok(!(ring.downUntil > race.elapsed) && !(can.downUntil > race.elapsed), 'rival took nothing');
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
