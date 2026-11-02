import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createRace, startRace, stepRace } from '../src/game.js';
import { ITEM_RESPAWN } from '../src/rival-items.ts';
import { createEffects } from '../src/effects.js';
import { drawnMarkers } from '../src/marker-pool.js';

// Stage 2 (user, 2026-11-02): a ring or pickup taken by any car disappears and comes back ITEM_RESPAWN s later.
function racing() {
  const race = createRace('coast');
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = [];
  return race;
}
const step = (race, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) stepRace(race, { throttle: true }, 1 / 60); };

test('R3: respawn lasts between 2 and 3 seconds', () => {
  assert.ok(ITEM_RESPAWN >= 2 && ITEM_RESPAWN <= 3);
});

test('R3: a taken pickup is gone for ITEM_RESPAWN seconds, then can be taken again', () => {
  const race = racing(), pickup = race.pickups.find(p => p.tier === 'can');
  Object.assign(race.player, { distance: pickup.distance - 0.5, x: pickup.x, speed: 30 });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(pickup.taken, true);
  assert.ok(Math.abs(pickup.downUntil - (race.elapsed + ITEM_RESPAWN)) < 1e-9, 'gone until');
  const nitro = race.player.nitro;
  pickup.taken = false; // as if another car had taken it: only presence decides
  Object.assign(race.player, { distance: pickup.distance - 0.5, x: pickup.x });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.nitro, nitro, 'not collectible while gone');
  step(race, ITEM_RESPAWN);
  Object.assign(race.player, { distance: pickup.distance - 0.5, x: pickup.x });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.ok(race.player.nitro > nitro, 'back after the respawn');
});

test('R3: a ring that is gone cannot be passed until it respawns', () => {
  const race = racing(), ring = race.rings.find(r => r.row === undefined && r.type === 'charge');
  ring.downUntil = race.elapsed + ITEM_RESPAWN;
  const through = () => { Object.assign(race.player, { distance: ring.distance - 0.5, x: ring.x, altitude: ring.altitude, speed: 30, verticalSpeed: 0 }); stepRace(race, { throttle: true }, 1 / 60); };
  through();
  assert.equal(race.player.rings, 0, 'gone');
  step(race, ITEM_RESPAWN);
  through();
  assert.equal(race.player.rings, 1, 'respawned');
  assert.ok(ring.downUntil > race.elapsed, 'taking it starts a new respawn');
});

test('R3: the renderer hides a ring or pickup while it is gone and shows it again after', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = racing();
  t.after(() => effects.dispose());
  race.rings = [{ type: 'nitro', radius: 4.8, x: 0, altitude: 2.5, distance: race.player.distance + 100, group: 0 }];
  race.pickups = [{ tier: 'cell', x: 0, altitude: 0, distance: race.player.distance + 100 }];
  const drawn = () => { effects.update(race, 0.016, 0, false, false); return drawnMarkers(scene.getObjectByName('Race rings')).length + drawnMarkers(scene.getObjectByName('Nitro pickups')).length; };
  assert.equal(drawn(), 2);
  race.rings[0].downUntil = race.pickups[0].downUntil = race.elapsed + ITEM_RESPAWN;
  assert.equal(drawn(), 0, 'gone');
  race.elapsed += ITEM_RESPAWN;
  assert.equal(drawn(), 2, 'respawned');
});
