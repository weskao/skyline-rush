import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createRace } from '../src/game.js';
import { createAeroVFX, REAR_PORTS } from '../src/aero-vfx.js';
import { thrusterGlow } from '../src/board-effects.ts';
import { vfxSettings } from '../src/vfx-settings.ts';

test('thruster glow (§8.1 panel 3): bright discs in flight, a faint idle glow racing, none on Low or off the grid', () => {
  assert.equal(thrusterGlow('low', true, true, 1), 0, 'Low keeps the unlit nozzles');
  assert.equal(thrusterGlow('high', false, true, 0), 0, 'no glow before GO');
  const idle = thrusterGlow('medium', true, false, 0), flying = thrusterGlow('medium', true, true, 0);
  assert.ok(idle > 0 && idle < flying, 'idle glows less than flight');
  assert.ok(flying >= .8);
  assert.ok(thrusterGlow('high', true, false, 1) >= flying, 'boost lights them as brightly as flight');
});

function fixture(quality) {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace();
  race.phase = 'racing'; race.player.speed = 80; race.player.altitude = 6;
  const options = vfxSettings({ quality });
  const discs = REAR_PORTS.map((_, i) => scene.getObjectByName(`Thruster glow ${i + 1}`));
  const update = () => vfx.update(race, .05, new Vector3(), options, false);
  return { discs, update, race };
}

test('one glow disc per rear port: shared program, uniform-driven, no NaN path', () => {
  const { discs, update } = fixture('high');
  assert.ok(discs.every(Boolean), 'a disc behind every port');
  discs.forEach((disc, i) => assert.ok(Math.abs(disc.position.x - REAR_PORTS[i].position[0]) < 1e-6));
  assert.equal(new Set(discs.map(d => d.material)).size, 1, 'one material: one program, compiled by the warmup');
  const frag = discs[0].material.fragmentShader;
  assert.doesNotMatch(frag, /\b(pow|exp)\s*\(/, 'no pow/exp: no NaN texels into bloom');
  for (let i = 0; i < 40; i++) update();
  assert.ok(discs.every(d => d.visible), 'glowing in flight');
  assert.ok(discs[0].material.uniforms.glow.value > .7);
});

test('Low hides the glow discs (the current nozzles stay as they were)', () => {
  const { discs, update } = fixture('low');
  for (let i = 0; i < 40; i++) update();
  assert.ok(discs.every(d => !d.visible));
});
