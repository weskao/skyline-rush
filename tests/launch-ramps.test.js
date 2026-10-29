import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { launchImpulse } from '../src/launch-ramps.ts';
import * as lab from '../src/event-lab.ts';

const ALL = new Set(Object.keys(RACE_TRACKS));
const FPS = [30, 60, 120];
const finite = car => [car.distance, car.x, car.altitude, car.verticalSpeed, car.speed].every(Number.isFinite);

// Runs until the car lands again; returns the impulse at take-off and the airborne time.
function flight(race, dt) {
  let impulse = 0, air = 0;
  for (let t = 0; t < 8; t += dt) {
    const before = race.player.altitude;
    stepRace(race, { throttle: true }, dt);
    assert.ok(finite(race.player), `finite car state on ${race.trackId}`);
    if (before === 0 && race.player.altitude > 0 && !impulse) impulse = race.player.verticalSpeed;
    if (impulse) air += dt;
    if (impulse && race.player.altitude === 0) return { impulse, air };
  }
  return { impulse, air };
}
const ready = race => { startRace(race); race.phase = 'racing'; race.countdown = 0; return race; };

test('Sky Spiral launch sections keep their impulse and landing at 30/60/120 FPS', () => {
  const section = RACE_TRACKS.spiral.sections.find(s => s.type === 'launch');
  const results = FPS.map(fps => {
    const race = ready(createRace('spiral', { mode: 'custom', rivals: 0, traffic: 'off' }));
    Object.assign(race.player, { distance: section.to - 6, x: 0, speed: 50, altitude: 0, verticalSpeed: 0 });
    return flight(race, 1 / fps);
  });
  for (const { impulse, air } of results) {
    assert.ok(Math.abs(impulse - launchImpulse(50)) < 1.5, `Spiral impulse ${impulse}`);
    assert.ok(air > .5 && air < 8, `Spiral car lands (airborne ${air}s)`);
  }
  assert.ok(Math.max(...results.map(r => r.air)) - Math.min(...results.map(r => r.air)) < .25, 'airtime is frame-rate independent');
});

test('an authored ramp launches and lands the player on every track at 30/60/120 FPS while AI drives over it', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) {
    const base = () => createRace(trackId, { mode: 'custom', rivals: 1, traffic: 'off' });
    let document = null;
    for (let d = 400; !document && d < RACE_TRACKS[trackId].length - 400; d += 50) {
      try { document = lab.validateCourse({ version: 1, label: 'Ramp', trackId, seed: 1, modifier: 'standard', objects: [{ kind: 'ramp', distance: d, lane: 1 }] }, ALL, base().props); } catch {}
    }
    assert.ok(document, `a valid ramp spot exists on ${trackId}`);
    const airtimes = [];
    for (const fps of FPS) {
      const race = ready(lab.compileCourse(base(), document, ALL));
      const ramp = race.ramps[0];
      Object.assign(race.player, { distance: ramp.distance, x: ramp.x, speed: 50, altitude: 0, verticalSpeed: 0, cooldown: 0, collisions: 0 });
      const rival = race.rivals[0];
      Object.assign(rival, { distance: ramp.distance - 30, x: ramp.x, altitude: 0 });
      const { impulse, air } = flight(race, 1 / fps);
      assert.ok(Math.abs(impulse - launchImpulse(50)) < 1.5, `${trackId} ${fps} FPS impulse ${impulse}`);
      assert.equal(race.player.collisions, 0, `${trackId}: a ramp is never a wall`);
      assert.equal(rival.altitude || 0, 0, `${trackId}: rivals drive over ramps`);
      airtimes.push(air);
    }
    assert.ok(Math.max(...airtimes) - Math.min(...airtimes) < .25, `${trackId} airtime is frame-rate independent: ${airtimes}`);
  }
});
