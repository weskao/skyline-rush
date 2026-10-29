import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { createRace, stepRace } from '../src/game.js';
import { createCircuitScene } from '../src/circuit-scene.ts';
import { CIRCUIT_ID, CIRCUIT_LENGTH } from '../src/circuit-track.ts';
import { trackFrame, trackLocalPosition } from '../src/track-paths.ts';
import { routeMarker } from '../src/route-map.ts';
import { ghostAt, GHOST_RATE } from '../src/ghost.ts';

// 10B acceptance: nothing the player sees or races against jumps at a lap seam.
const seams = [CIRCUIT_LENGTH, 2 * CIRCUIT_LENGTH, 3 * CIRCUIT_LENGTH];
const around = seam => Array.from({ length: 41 }, (_, i) => seam - 1 + i * 0.05);
const gap = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
// Over 0.05 m of road, anything rendered relative to the car moves by well under 0.2 m.
const STEP_LIMIT = 0.2;
function continuous(label, sample) {
  for (const seam of seams) {
    const points = around(seam).map(sample);
    for (let i = 1; i < points.length; i++)
      assert.ok(gap(points[i - 1], points[i]) < STEP_LIMIT, `${label} jumps ${gap(points[i - 1], points[i]).toFixed(3)} m near ${seam}`);
  }
}

test('world props stay put relative to the car across every lap seam', () => {
  const scene = new Scene(), circuit = createCircuitScene(scene);
  const beacon = scene.getObjectByName('Harbor beacon');
  continuous('beacon', d => { circuit.update(d); scene.updateMatrixWorld(true); return beacon.getWorldPosition(new Vector3()).toArray(); });
});

test('rivals, Ghost and chase camera keep continuous positions across every lap seam', () => {
  continuous('rival 6 m ahead', d => trackLocalPosition(CIRCUIT_ID, d + 6, -2.5, 0, d));
  continuous('rival 6 m behind', d => trackLocalPosition(CIRCUIT_ID, d - 6, 7.5, 0, d));
  continuous('chase camera', d => trackLocalPosition(CIRCUIT_ID, d - 12, 0, 5, d));
  continuous('camera heading', d => trackFrame(CIRCUIT_ID, d - 12).forward.map(v => v * 10));
  // Ghost samples keep unwrapped distance, so interpolation never sweeps back across the loop.
  // One sample per 0.5 m around each seam; the Ghost runs 4 m ahead of the player.
  for (const seam of seams) {
    const first = seam - 3;
    const ghost = { time: 1, samples: Array.from({ length: 21 }, (_, i) => [first + i * 0.5, 2.5, 0]) };
    const at = d => { const g = ghostAt(ghost, (d + 4 - first) / 0.5 / GHOST_RATE); return trackLocalPosition(CIRCUIT_ID, g.distance, g.x, g.altitude, d); };
    const points = around(seam - 4).map(at);
    for (let i = 1; i < points.length; i++) assert.ok(gap(points[i - 1], points[i]) < STEP_LIMIT, `ghost jumps near ${seam}`);
    assert.ok(gap(at(seam - 4), [2.5 * trackFrame(CIRCUIT_ID, seam).right[0], 0, 2.5 * trackFrame(CIRCUIT_ID, seam).right[2]]) > 3, 'ghost drawn ahead, not on the car');
  }
});

test('the mini-route marker moves continuously through the start/finish line', () => {
  continuous('route marker', d => { const p = routeMarker(CIRCUIT_ID, d); return [p.x, p.y]; });
  for (const seam of seams) {
    const before = routeMarker(CIRCUIT_ID, seam - 1), after = routeMarker(CIRCUIT_ID, seam + 1);
    assert.ok(gap([before.x, before.y], [after.x, after.y]) > 0, `marker frozen at ${seam}`);
  }
});

for (const laps of [1, 3, 5]) test(`rivals also need exactly ${laps} valid laps to finish`, () => {
  const race = createRace(CIRCUIT_ID, { mode: 'circuit', laps });
  race.phase = 'racing'; race.pickups = []; race.rings = []; race.traffic = [];
  const finishedAt = {};
  while (race.phase === 'racing' && race.elapsed < 260 && Object.keys(finishedAt).length < race.rivals.length) {
    stepRace(race, {}, 1 / 60); // the player idles so every rival reaches its own finish
    for (const rival of race.rivals) {
      const driver = race.circuit.rivals[rival.name];
      if (driver.finishTime !== null && finishedAt[rival.name] === undefined) finishedAt[rival.name] = driver.completed;
      if (driver.finishTime === null) assert.ok(driver.completed < laps);
    }
  }
  assert.equal(Object.keys(finishedAt).length, race.rivals.length, 'every rival finishes');
  for (const rival of race.rivals) {
    const driver = race.circuit.rivals[rival.name];
    if (driver.finishTime === null) continue;
    assert.equal(finishedAt[rival.name], laps, rival.name);
    assert.equal(driver.lapTimes.length, laps, rival.name);
  }
});
