import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, Box3, BoxGeometry, MeshStandardMaterial, Color, Matrix4, Vector3, Quaternion } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { CARS } from '../src/car-catalog.ts';
import { createGarageModel } from '../src/garage-model.ts';

// A Freeze or EMP that slows a rival (game.js FREEZE_RIVAL_SPEED) shows on that rival's car as a status tint.
const shared = new MeshStandardMaterial({ color: '#c0392b' }); // one paint shared by every car, like makeCar may do
function car(x, length = 4.6) {
  const pose = new Group();
  pose.add(new Mesh(new BoxGeometry(2, 1.2, length), shared));
  pose.position.set(x, 0, -10);
  return pose;
}
function setup(t, rivals = 3) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const race = createRace('coast');
  race.phase = 'racing'; race.elapsed = 20;
  race.rivals.length = rivals;
  const vehicles = [car(0), ...race.rivals.map((_, i) => car(4 + i * 4, 4 + i))];
  vehicles.forEach(pose => scene.add(pose));
  const tint = scene.getObjectByName('Rival status tint');
  const frame = (dt = 0.05, options = {}, reducedMotion = false) => effects.update(race, dt, 0, false, reducedMotion, vehicles, { quality: 'high', ...options });
  return { effects, race, vehicles, tint, frame };
}
const colorOf = (tint, i) => { const c = new Color(); tint.getColorAt(i, c); return c; };
const lit = (tint, i) => { const c = colorOf(tint, i); return c.r + c.g + c.b; };

test('a Freeze tints every visible rival icy blue and leaves the shared car paint untouched', t => {
  const { race, tint, frame, vehicles } = setup(t);
  assert.ok(tint?.isInstancedMesh, 'one instanced tint for all rivals');
  frame();
  assert.equal(tint.visible, false, 'nothing to show before an item hits');
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame();
  assert.equal(tint.visible, true);
  for (let i = 0; i < 3; i++) {
    const c = colorOf(tint, i);
    assert.ok(c.b > c.r * 2 && c.b > 0.5, `rival ${i + 1} reads icy blue (${c.toArray()})`);
    // The shell sits on the rival and spans its own length (fitted per car).
    const m = new Matrix4(); tint.getMatrixAt(i, m);
    const p = new Vector3(), s = new Vector3(); m.decompose(p, new Quaternion(), s);
    assert.ok(Math.abs(p.x - vehicles[i + 1].position.x) < 1e-6 && s.z > (4 + i) / 2, `rival ${i + 1} shell fits its car`);
  }
  assert.equal(shared.color.getHexString(), 'c0392b', 'shared paint never mutated');
  assert.ok(vehicles.every(pose => pose.children[0].material === shared), 'car materials never swapped');
});

test('an EMP flickers a rival in a distinct colour; reduced motion keeps it steady', t => {
  const { race, tint, frame } = setup(t);
  race.rivals[1].empUntil = race.elapsed + 1.5;
  const samples = [];
  for (let i = 0; i < 20; i++) { frame(0.016); samples.push(lit(tint, 1)); }
  const c = colorOf(tint, 1);
  assert.ok(c.r > c.g && c.g > c.b * 3, `rival EMP reads warm yellow (${c.toArray()})`);
  assert.equal(lit(tint, 0), 0, 'only the EMP-hit rival');
  assert.ok(Math.max(...samples.slice(10)) - Math.min(...samples.slice(10)) > 0.3, 'flickers');
  const calm = setup(t);
  calm.race.rivals[1].empUntil = calm.race.elapsed + 1.5;
  const steady = [];
  for (let i = 0; i < 20; i++) { calm.frame(0.016, {}, true); steady.push(lit(calm.tint, 1)); }
  assert.ok(steady[19] > 0 && steady.every((v, i) => i === 0 || v >= steady[i - 1]), 'reduced motion: fades in, never flickers');
});

test('the tint fades out when the effect ends instead of snapping off', t => {
  const { race, tint, frame } = setup(t);
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame();
  const full = lit(tint, 0);
  race.player.effects.freeze = 0;
  frame(0.03);
  const fading = lit(tint, 0);
  assert.ok(fading > 0 && fading < full, `fading (${fading} of ${full})`);
  for (let i = 0; i < 40; i++) frame();
  assert.equal(tint.visible, false);
});

test('Low draws the tint only; Medium and up add the rim, all in one shader program', t => {
  const { race, tint, frame } = setup(t);
  race.player.effects.freeze = 2;
  frame(0.05, { quality: 'low' });
  assert.equal(tint.material.uniforms.rim.value, 0);
  const material = tint.material;
  frame(0.05, { quality: 'medium' });
  assert.ok(tint.material.uniforms.rim.value > 0);
  assert.equal(tint.material, material, 'quality changes a uniform, never the program');
});

test('a hidden rival gets no tint', t => {
  const { race, tint, frame, vehicles } = setup(t);
  vehicles[2].visible = false;
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame();
  assert.equal(lit(tint, 1), 0);
  assert.ok(lit(tint, 0) > 0);
});

// Game feel (user 2026-11-17): Freeze grows ice crystals that shatter on thaw; EMP fires a shockwave and sparks.
const shardsOf = scene => scene.getObjectByName('Rival freeze shards');
const shownInstances = (mesh, from = 0, to = mesh.count) => {
  const m = new Matrix4(), p = new Vector3();
  let n = 0;
  for (let i = from; i < to; i++) { mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m); if (p.y > -1000) n++; }
  return n;
};
const liveParticles = scene => { let n = 0; scene.traverse(o => { if (o.isPoints) n += o.geometry.attributes.alpha.array.filter(a => a > 0).length; }); return n; };

test('a Freeze grows ice crystals on each frozen rival, and they shatter outward on thaw', t => {
  const { race, frame, effects, vehicles, tint } = setup(t);
  const scene = vehicles[0].parent;
  const shards = shardsOf(scene);
  assert.ok(shards?.isInstancedMesh, 'one instanced shard mesh');
  const per = shards.count / tint.count;
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame();
  assert.equal(shards.visible, true);
  for (let r = 0; r < 3; r++) assert.equal(shownInstances(shards, r * per, (r + 1) * per), per, `rival ${r + 1} wears its crystals`);
  const m = new Matrix4(), before = new Vector3(), after = new Vector3(), car = vehicles[1].position;
  shards.getMatrixAt(0, m); before.setFromMatrixPosition(m);
  race.player.effects.freeze = 0;
  for (let i = 0; i < 6; i++) frame(0.03);
  shards.getMatrixAt(0, m); after.setFromMatrixPosition(m);
  assert.ok(after.distanceTo(car) > before.distanceTo(car) + 0.3, 'a thawed crystal flies off the car');
  for (let i = 0; i < 30; i++) frame();
  assert.equal(shownInstances(shards), 0, 'the shatter clears');
  effects.reset();
});

test('Low keeps the soft tint only: no ice crystals', t => {
  const { race, frame, vehicles } = setup(t);
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame(0.05, { quality: 'low' });
  assert.equal(shownInstances(shardsOf(vehicles[0].parent)), 0);
});

test('an EMP hit fires an expanding shockwave and spits sparks; the shell tells the shader which status and how long', t => {
  const { race, frame, tint, vehicles } = setup(t);
  const scene = vehicles[0].parent;
  const wave = scene.getObjectByName('Rival status shockwave');
  assert.ok(wave?.isInstancedMesh);
  const sparksBefore = liveParticles(scene);
  race.rivals[1].empUntil = race.elapsed + 1.5;
  const m = new Matrix4(), s = new Vector3(), scales = [];
  for (let i = 0; i < 4; i++) { frame(0.03); wave.getMatrixAt(1, m); m.decompose(new Vector3(), new Quaternion(), s); scales.push(s.x); }
  assert.ok(scales[3] > scales[0] * 1.5, `the shockwave expands (${scales})`);
  assert.ok(liveParticles(scene) > sparksBefore + 5, 'sparks fly');
  const status = tint.geometry.attributes.status;
  assert.equal(status.getX(1), 1, 'EMP kind');
  assert.ok(status.getY(1) > 0.05, 'age since the hit drives the hit flash and arcs');
  for (let i = 0; i < 30; i++) frame();
  wave.getMatrixAt(1, m); assert.ok(new Vector3().setFromMatrixPosition(m).y < -1000, 'the wave parks after it fades');
});

test('the incoming status shell tracks the player pose and clears on finish', t => {
  const { race, tint, frame, vehicles } = setup(t, 1);
  const playerIndex = tint.count - 1;
  race.player.effects.freeze = 2;
  frame();
  assert.equal(lit(tint, playerIndex), 0, 'outgoing Freeze leaves the player clear');
  const rivalTint = lit(tint, 0);
  race.player.effects.freeze = 0;
  race.player.freezeUntil = 22;
  vehicles[0].position.x = -3;
  frame();
  assert.ok(colorOf(tint, playerIndex).b > 0.15, 'incoming Freeze shows on the player');
  assert.ok(lit(tint, 0) < rivalTint, 'rival fades separately');
  const matrix = new Matrix4();
  tint.getMatrixAt(playerIndex, matrix);
  assert.equal(new Vector3().setFromMatrixPosition(matrix).x, -3);
  race.player.empUntil = race.rivals[0].empUntil = 21.5;
  frame(.05, { quality: 'low' }, true);
  const empColor = colorOf(tint, playerIndex);
  const rivalEMP = colorOf(tint, 0);
  assert.ok(empColor.r > empColor.g && empColor.g > empColor.b * 3, 'player EMP is warm yellow at Low quality');
  assert.ok(Math.abs(empColor.r / empColor.b - rivalEMP.r / rivalEMP.b) < 1e-6, 'player and rival shell share the same hue');
  const waves = vehicles[0].parent.getObjectByName('Rival status shockwave');
  for (const index of [0, playerIndex]) {
    const wave = colorOf(waves, index);
    assert.ok(wave.r > wave.g && wave.g > wave.b * 3, 'player and rival shockwaves share the warm yellow hue');
  }
  race.phase = 'finished';
  frame();
  assert.equal(lit(tint, playerIndex), 0);
});

test('Low shows a few ice crystals on the nearby player while rivals keep the lightweight shell', t => {
  const { race, tint, frame, vehicles } = setup(t);
  const shards = shardsOf(vehicles[0].parent);
  const playerStart = shards.count - shards.count / tint.count;
  race.player.freezeUntil = race.elapsed + 2;
  race.player.effects.freeze = 2;
  for (let i = 0; i < 10; i++) frame(0.05, { quality: 'low' });
  assert.equal(shownInstances(shards, 0, playerStart), 0);
  const playerShards = shownInstances(shards, playerStart);
  assert.ok(playerShards > 0 && playerShards < shards.count / tint.count);
});

test('the player shares the outward thaw animation and honors reduced motion', t => {
  const { race, tint, frame, vehicles } = setup(t);
  const shards = shardsOf(vehicles[0].parent);
  const playerStart = shards.count - shards.count / tint.count;
  const matrix = new Matrix4(), point = new Vector3();
  const crystalDistance = () => {
    shards.getMatrixAt(playerStart, matrix);
    return point.setFromMatrixPosition(matrix).distanceTo(vehicles[0].position);
  };
  for (const calm of [false, true]) {
    race.player.freezeUntil = race.elapsed + 2;
    for (let i = 0; i < 10; i++) frame(0.05, {}, calm);
    assert.equal(shownInstances(shards, playerStart), shards.count / tint.count);
    const frozen = crystalDistance();
    race.player.freezeUntil = 0;
    for (let i = 0; i < 6; i++) frame(0.03, {}, calm);
    if (calm) assert.equal(crystalDistance(), frozen, 'crystals shrink in place');
    else assert.ok(crystalDistance() > frozen + 0.3, 'crystals fly off the car');
    for (let i = 0; i < 30; i++) frame(0.05, {}, calm);
    assert.equal(shownInstances(shards, playerStart), 0);
  }
});

test('the player shell refits across the selectable catalog, an unlisted model and the fallback', async t => {
  const { race, tint, frame, vehicles: [player] } = setup(t, 0);
  const keep = new Group();
  player.add(keep);
  const host = { name: 'home', car: player, scene: player.parent, keep };
  race.player.freezeUntil = race.elapsed + 2;
  const matrix = new Matrix4(), scale = new Vector3();
  const playerWidth = () => {
    frame();
    tint.getMatrixAt(tint.count - 1, matrix);
    return scale.setFromMatrixScale(matrix).x;
  };
  const fallback = playerWidth();
  const models = [...Object.values(CARS).map(car => car.model), 'future-model'];
  for (const [index, id] of models.entries()) {
    const mesh = new Mesh(new BoxGeometry(3 + index, 1.2, 5), shared);
    const dataset = {};
    const model = createGarageModel({ id, dataset, compile: async () => {},
      cache: { load: async () => ({ kind: 'model', instance: () => mesh, release() {} }) } });
    model.sync(true, 'high', host, 'drive');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mesh.parent, player, `${id} uses the same race-car host`);
    const width = new Box3().setFromObject(mesh).getSize(new Vector3()).x;
    assert.ok(Math.abs(playerWidth() - width * .6) < 1e-5, `${id} fits the currently rendered model`);
    race.player.empUntil = race.elapsed + 1;
    assert.ok(Math.abs(playerWidth() - width * .6) < 1e-5, `${id} EMP shares the model fit`);
    race.player.empUntil = 0;
    model.dispose();
    assert.equal(playerWidth(), fallback, `${id} returns to the procedural fit when removed`);
  }
});
