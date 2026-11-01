import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { drawnMarkers } from '../src/marker-pool.js';

function denseScene(t) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = createRace();
  t.after(() => effects.dispose());
  race.phase = 'racing'; race.player.speed = 60;
  const types = ['charge', 'nitro', 'slipstream', 'risk', 'mystery'], tiers = ['cell', 'can', 'tank', 'overcharge'];
  race.rings = Array.from({ length: 40 }, (_, i) => ({ type: types[i % 5], radius: 4.8, x: (i % 4) * 5 - 7.5, altitude: 2.5, distance: 100 + i * 20, group: 0 }));
  race.pickups = Array.from({ length: 120 }, (_, i) => ({ tier: tiers[i % 4], x: (i % 4) * 5 - 7.5, altitude: 0, distance: 100 + i * 6 })); // all within the 900 m view
  effects.update(race, 0.016, 0, false, false);
  return { scene, race, effects };
}

// Denser layouts put far more rings and pickups in view than the old 7 + 40 mesh pools held: every one in
// range must be drawn, with one draw call per material (5 ring types, 4 pickup tiers), never one per marker.
test('D1: every ring and pickup within 900 m is drawn through one instanced draw per material', t => {
  const { scene } = denseScene(t);
  const rings = scene.getObjectByName('Race rings'), pickups = scene.getObjectByName('Nitro pickups');
  assert.equal(drawnMarkers(rings).length, 40);
  assert.equal(drawnMarkers(pickups).length, 120);
  assert.ok(rings.children.filter(m => m.visible).length <= 5, 'ring draw calls');
  assert.ok(pickups.children.filter(m => m.visible).length <= 4, 'pickup draw calls');
  assert.ok([...rings.children, ...pickups.children].every(m => m.isInstancedMesh));
});

// Every material within 900 m used to draw even when all its markers were off-screen (behind a bend, past
// the camera), which cancelled the instancing win on winding routes like Tokyo. Each frame's bound covers
// exactly the markers in use, so the renderer culls a material with nothing on screen and never a live one.
test('D1: each pool is frustum-culled by a bound recomputed from this frame\'s markers', t => {
  const { scene, race, effects } = denseScene(t);
  const meshes = () => [...scene.getObjectByName('Race rings').children, ...scene.getObjectByName('Nitro pickups').children].filter(m => m.visible);
  const covers = () => {
    for (const mesh of meshes()) {
      assert.equal(mesh.frustumCulled, true, mesh.name);
      for (const marker of drawnMarkers(mesh.parent).filter(m => m.material === mesh.material))
        assert.ok(mesh.boundingSphere.distanceToPoint(marker.position) <= 0, `${mesh.name} bound holds its marker`);
    }
  };
  covers();
  for (const pickup of race.pickups) pickup.x += 6;
  race.player.distance = 50;
  effects.update(race, 0.016, 50, false, false);
  covers();
});

// WebKit builds a pipeline only on a real draw: each pool keeps one parked instance for the first-frame warmup.
test('D1: a pool with nothing in range still carries one parked instance for shader warmup', t => {
  const { scene, race, effects } = denseScene(t);
  race.rings = []; race.pickups = [];
  effects.update(race, 0.016, 0, false, false);
  for (const mesh of [...scene.getObjectByName('Race rings').children, ...scene.getObjectByName('Nitro pickups').children]) {
    assert.equal(mesh.visible, false, mesh.name);
    assert.ok(mesh.count >= 1, mesh.name + ' keeps an instance to warm up');
  }
});
