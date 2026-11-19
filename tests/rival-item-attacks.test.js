import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, mysteryEffect, stepRace } from '../src/game.js';
import { placeCourseCar } from '../src/course-race.ts';

const dt = 1 / 60;
function encounter({ mode = 'custom', itemRules = 'all', type = 'emp', track = 'coast', gap = 20, otherGap = 70 } = {}) {
  const race = createRace(track, { mode, itemRules, rivals: 2, traffic: 'off' });
  Object.assign(race, { phase: 'racing', elapsed: 13, traffic: [], pickups: [], props: [] });
  race.rivals.length = 2;
  const [attacker, other] = race.rivals;
  Object.assign(attacker, { distance: 200, x: -2.5, homeX: -2.5, speed: 60 });
  Object.assign(race.player, { distance: 200 + gap, x: 2.5, speed: 60 });
  Object.assign(other, { distance: 200 + otherGap, x: 7.5, homeX: 7.5, speed: 60 });
  const mysteryIndex = Array.from({ length: 100 }, (_, i) => i).find(i => mysteryEffect(race.seed, i) === 'freeze');
  const ring = { distance: 200.5, x: attacker.x, altitude: 0, radius: 2, group: 0, type, mysteryIndex };
  race.rings = [ring];
  if (race.course) {
    const edge = race.course.spec.graph.groundRoute[0];
    Object.assign(ring, { edgeId: edge, localS: ring.distance });
    for (const car of [race.player, attacker, other]) {
      placeCourseCar(race.course, car.id ?? 'YOU', edge, car.distance, car);
    }
  }
  return { race, ring, attacker, other };
}

function drive(race) {
  stepRace(race, { throttle: true }, dt);
}

for (const track of ['coast', 'dune-tempest']) {
  test(`AI EMP collected on ${track} halves player speed for 1.5 seconds within 30 metres`, () => {
    const { race, ring, attacker, other } = encounter({ track });
    drive(race);
    assert.equal(attacker.itemTakes, 1);
    assert.ok(ring.downUntil > race.elapsed, 'shared ring becomes unavailable');
    assert.ok(Math.abs(race.player.empUntil - race.elapsed - 1.5) < 1e-9);
    assert.equal(attacker.empUntil, undefined);
    assert.equal(other.empUntil, undefined);
    assert.ok(race.player.speed > 29 && race.player.speed < 31);
    const before = race.player.distance;
    drive(race);
    assert.ok(race.player.distance - before < 31 * dt, 'slowdown changes track movement');
    while (race.elapsed + dt < race.player.empUntil) drive(race);
    const slowedSpeed = race.player.speed;
    drive(race);
    assert.ok(race.player.empUntil <= race.elapsed, 'race clock expires the hit');
    assert.ok(race.player.speed >= 2 * slowedSpeed, 'only the timed speed penalty is lifted');
  });
}

test('AI saves EMP until any opponent enters range', () => {
  const { race, ring, attacker } = encounter({ gap: 60 });
  drive(race);
  assert.equal(attacker.itemTakes, 1);
  assert.ok(ring.downUntil > race.elapsed);
  assert.equal(race.player.empUntil, undefined);
  race.player.distance = attacker.distance + 15;
  drive(race);
  assert.ok(race.player.empUntil > race.elapsed);
  assert.equal(attacker.itemTakes, 1);
});

for (const settings of [{ mode: 'classic' }, { itemRules: 'active' }, { itemRules: 'all' }]) {
  test(`AI Freeze from a mystery ring hits every other driver in ${settings.mode ?? settings.itemRules}`, () => {
    const { race, ring, attacker, other } = encounter({ ...settings, type: 'mystery', gap: 100 });
    drive(race);
    assert.equal(attacker.itemTakes, 1);
    assert.ok(ring.downUntil > race.elapsed);
    assert.ok(Math.abs(race.player.freezeUntil - race.elapsed - 2) < 1e-9);
    assert.equal(other.freezeUntil, race.player.freezeUntil);
    assert.equal(attacker.freezeUntil, undefined);
    assert.ok(race.player.speed > 29 && race.player.speed < 31);
  });
}

test('a ring outside the collection radius or unavailable under the mode cannot trigger an attack', () => {
  for (const rules of ['off', 'classic', 'active']) {
    const { race, attacker } = encounter({ itemRules: rules });
    drive(race);
    assert.equal(attacker.itemTakes, 0);
    assert.equal(race.player.empUntil, undefined);
  }
  const { race, ring, attacker } = encounter();
  ring.x = 7.5;
  drive(race);
  assert.equal(attacker.itemTakes, 0);
  assert.equal(race.player.empUntil, undefined);
});

test('simultaneous Freeze and EMP hit once without multiplying the slowdown', () => {
  const { race, ring, other } = encounter({ otherGap: 0 });
  race.elapsed = 18; // both AI hop cycles are grounded for these rings
  race.rings.push({ ...ring, type: 'mystery', x: other.x });
  drive(race);
  assert.ok(race.player.empUntil > race.elapsed);
  assert.ok(race.player.freezeUntil > race.elapsed);
  assert.ok(race.player.speed > 29 && race.player.speed < 31, 'two hits still halve speed only once');
});
