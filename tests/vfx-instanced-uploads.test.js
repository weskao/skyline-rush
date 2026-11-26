import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { gpuUploadShadow } from './helpers/gpu-upload-shadow.js';

// Instanced race VFX (pickup halos, status shells, shockwaves, EMP discharges, freeze shards, pickup markers) upload
// nothing while hidden and only the drawn instances while shown, and what the GPU draws always equals the CPU pose.
const paint = new MeshStandardMaterial();
const car = x => { const pose = new Group(); pose.add(new Mesh(new BoxGeometry(2, 1.2, 4.6), paint)); pose.position.set(x, 0, -10); return pose; };
const instanced = mesh => [mesh.instanceMatrix, mesh.instanceColor,
  ...Object.values(mesh.geometry.attributes).filter(a => a.isInstancedBufferAttribute)].filter(Boolean);

function checkFrame(meshes, gpu, label) {
  for (const mesh of meshes) {
    const attributes = instanced(mesh), bytes = gpu.sync(attributes), name = `${label} ${mesh.name || mesh.parent?.name}`;
    if (!mesh.visible) { assert.equal(bytes, 0, `${name}: hidden, uploads nothing`); continue; }
    for (const a of attributes) {
      const drawn = mesh.count * a.itemSize;
      assert.deepEqual([...gpu.read(a).subarray(0, drawn)], [...a.array.subarray(0, drawn)], `${name}: GPU matches every drawn instance`);
    }
    if (mesh.name === 'Pickup aura') assert.ok(bytes <= mesh.count * (16 + 3) * 4, `${name}: ${bytes} B for ${mesh.count} halos`);
  }
}

test('instanced race VFX upload nothing while hidden and only drawn instances while shown', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = createRace('coast');
  race.phase = 'racing'; race.elapsed = 20; race.rivals.length = 3;
  const vehicles = [car(0), ...race.rivals.map((_, i) => car(4 + i * 4))];
  vehicles.forEach(pose => scene.add(pose));
  const meshes = [];
  scene.traverse(object => { if (object.isInstancedMesh) meshes.push(object); });
  const gpu = gpuUploadShadow(), frame = () => {
    race.elapsed += 0.05; race.player.distance += 3;
    effects.update(race, 0.05, 0, false, false, vehicles, { quality: 'high' });
  };
  meshes.forEach(mesh => gpu.sync(instanced(mesh)));
  for (let i = 0; i < 6; i++) { frame(); checkFrame(meshes, gpu, `calm ${i}`); }
  race.rivals[1].empUntil = race.elapsed + 1; race.player.effects.freeze = 1;
  let shown = 0;
  for (let i = 0; i < 60; i++) {
    frame(); checkFrame(meshes, gpu, `status ${i}`);
    shown += meshes.filter(m => m.visible && /status|EMP|freeze/i.test(m.name)).length;
  }
  assert.ok(shown > 0, 'the status layers were exercised');
});
