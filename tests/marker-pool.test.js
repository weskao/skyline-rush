import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
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
// range must be drawn, with one draw per ring type or pickup tier and detail level.
test('D1: every ring and pickup within 900 m is drawn in instanced batches', t => {
  const { scene } = denseScene(t);
  const rings = scene.getObjectByName('Race rings'), pickups = scene.getObjectByName('Nitro pickups');
  assert.equal(drawnMarkers(rings).length, 40);
  assert.equal(drawnMarkers(pickups).length, 120);
  assert.ok(rings.children.filter(m => m.visible).length <= 5, 'ring draw calls');
  assert.ok(pickups.children.filter(m => m.visible).length <= 8, 'four pickup tiers with at most two geometry levels each');
  assert.ok([...rings.children, ...pickups.children].every(m => m.isInstancedMesh));
});

test('distant pickups cost fewer triangles and regain full detail as the car approaches', t => {
  const { scene, race, effects } = denseScene(t);
  const tiers = ['cell', 'can', 'tank', 'overcharge'];
  race.pickups = tiers.flatMap((tier, index) => [60 + index, 500 + index]
    .map(distance => ({ tier, distance, x: 0, altitude: 0 })));
  race.rings = [];
  effects.update(race, 0, 0, false, true);

  const group = scene.getObjectByName('Nitro pickups');
  const markers = drawnMarkers(group);
  assert.deepEqual(markers.map(marker => -marker.position.z), [60, 500, 61, 501, 62, 502, 63, 503]);
  const triangles = geometry => (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  const size = geometry => {
    geometry.computeBoundingBox();
    return geometry.boundingBox.getSize(new Vector3());
  };
  for (let index = 0; index < markers.length; index += 2) {
    const [near, far] = markers.slice(index, index + 2);
    assert.ok(triangles(far.geometry) <= 650, `${tiers[index / 2]} must fit the distant triangle budget`);
    assert.ok(triangles(near.geometry) > triangles(far.geometry) * 3, 'keep the near model detailed');
    assert.ok(far.material.emissive.equals(near.material.emissive), 'keep the tier glow');
    assert.deepEqual(far.scale.toArray(), near.scale.toArray(), 'keep the model scale');
    assert.ok(size(far.geometry).distanceTo(size(near.geometry)) < .15, 'keep the model silhouette dimensions');
  }
  assert.equal(scene.getObjectByName('Pickup aura').count, markers.length, 'every pickup keeps its halo');

  race.player.distance = 420;
  effects.update(race, 0, 420, false, true);
  assert.deepEqual(drawnMarkers(group).map(marker => marker.geometry), markers
    .filter((_, index) => index % 2 === 0).map(marker => marker.geometry));
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
