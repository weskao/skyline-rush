import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, MeshStandardMaterial, Matrix4, Vector3 } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { EMP_SHELL } from '../src/debuff/emp/emp-shell.ts';
import { EMP_EDGE_ARCS, arc, bolt, random } from '../src/debuff/emp/emp-arcs.ts';

// EMP reads as golden lightning crawling over the car, not a solid glowing car (user 2026-11-21, reference sheet):
// thin arcs in the shell, short discharges jumping off the body, edge arcs on screen. Nothing strobes.

const paint = new MeshStandardMaterial({ color: '#c0392b' });
function setup(t, rivals = 2) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = createRace('coast');
  race.phase = 'racing'; race.elapsed = 20; race.rivals.length = rivals;
  const vehicles = [0, ...race.rivals.map((_, i) => 4 + i * 4)].map(x => {
    const pose = new Group();
    pose.add(new Mesh(new BoxGeometry(2, 1.2, 4.6), paint));
    pose.position.set(x, 0, -10);
    scene.add(pose);
    return pose;
  });
  const discharges = scene.getObjectByName('EMP discharges'), cars = scene.getObjectByName('Rival status tint').count;
  const per = discharges.count / cars, player = cars - 1; // the player is the last car
  const frame = (dt = 0.05, options = {}, reducedMotion = false) => effects.update(race, dt, 0, false, reducedMotion, vehicles, { quality: 'high', ...options });
  return { scene, effects, race, vehicles, discharges, per, player, frame };
}
const m = new Matrix4(), p = new Vector3();
const shown = (mesh, from = 0, to = mesh.count) => {
  let n = 0;
  for (let i = from; i < to; i++) { mesh.getMatrixAt(i, m); if (p.setFromMatrixPosition(m).y > -1000) n++; }
  return n;
};


test('the shell draws thin anti-aliased arcs over a nearly clear body, never a solid glow', () => {
  const glsl = EMP_SHELL.glsl;
  assert.match(glsl, /fwidth\(/, 'arc width is measured in pixels: thin at any distance');
  assert.doesNotMatch(glsl, /floor\(time/, 'no stepped re-strike: the arcs writhe smoothly');
  const body = Number(glsl.match(/body\*([\d.]+)/)?.[1]);
  assert.ok(body > 0 && body <= 0.3, `the fill under the arcs stays faint (${body})`);
});

test('a rival EMP surges below three times a second instead of strobing, and the hit pops once', () => {
  let peaks = 0, low = Infinity, high = -Infinity, last = EMP_SHELL.flicker(0, 1), rising = false;
  for (let k = 1; k <= 1200; k++) { // 5 s at 240 Hz
    const v = EMP_SHELL.flicker(k / 240, 1);
    if (v < last && rising) peaks++;
    rising = v > last; last = v; low = Math.min(low, v); high = Math.max(high, v);
  }
  assert.ok(peaks <= 15, `${peaks} surges in 5 s`);
  assert.ok(low >= 0.5 && high <= 1, `the shell dims, never blacks out (${low}..${high})`);
  assert.ok(EMP_SHELL.pop(0) > 1 && EMP_SHELL.pop(0.2) === 1);
});

test('the screen-edge lightning is deterministic and keeps out of the centre of the view', () => {
  assert.deepEqual(bolt([0, 0], [10, 0], random(7)), bolt([0, 0], [10, 0], random(7)));
  assert.equal(arc([0, 0], [10, 10], 3, 2).length, 3, 'main arc + forks');
  assert.equal(EMP_EDGE_ARCS.length, 3, 'three sets take turns');
  for (const set of EMP_EDGE_ARCS) for (const d of set) {
    for (const [, x, y] of d.matchAll(/([\d.-]+) ([\d.-]+)/g)) {
      const dx = Math.abs(Number(x) - 50), dy = Math.abs(Number(y) - 50);
      assert.ok(dx > 28 || dy > 38, `arc point ${x},${y} intrudes on the centre`);
    }
  }
});

test('an EMP hit makes discharges jump off the body; they stop when it expires and a new hit restarts them', t => {
  const { race, discharges, per, frame, effects } = setup(t);
  assert.ok(discharges?.isInstancedMesh, 'one instanced discharge mesh for every car');
  const slots = car => [car * per, (car + 1) * per];
  frame();
  assert.equal(shown(discharges), 0, 'nothing before a hit');
  race.rivals[1].empUntil = race.elapsed + 1.5;
  let seen = 0;
  for (let i = 0; i < 30; i++) { frame(0.02); seen = Math.max(seen, shown(discharges, ...slots(1))); }
  assert.ok(seen >= 2, `discharges spark on the hit rival (${seen})`);
  assert.equal(shown(discharges, ...slots(0)), 0, 'only on the hit car');
  race.rivals[1].empUntil = 0;
  for (let i = 0; i < 20; i++) frame(0.02);
  assert.equal(shown(discharges), 0, 'they fade out after the EMP ends');
  race.rivals[1].empUntil = race.elapsed + 1.5;
  frame(0.02);
  assert.equal(shown(discharges, ...slots(1)), 0, 'the impact pulse comes first');
  let again = 0;
  for (let i = 0; i < 8; i++) { frame(0.02); again = Math.max(again, shown(discharges, ...slots(1))); }
  assert.ok(again > 0, 'a repeated hit fires them again right after its impact');
  effects.reset();
  assert.equal(shown(discharges), 0, 'reset parks every discharge');
});

test('pause holds the discharges where they are', t => {
  const { race, discharges, frame } = setup(t);
  race.rivals[0].empUntil = race.elapsed + 1.5;
  for (let i = 0; i < 6; i++) frame(0.02);
  const before = discharges.instanceMatrix.array.slice(), colors = discharges.instanceColor.array.slice();
  for (let i = 0; i < 5; i++) frame(0);
  assert.deepEqual(discharges.instanceMatrix.array, before);
  assert.deepEqual(discharges.instanceColor.array, colors);
});

test('Low keeps rivals to the soft tint and a couple of discharges on the player; reduced motion holds them still', t => {
  const { race, discharges, per, player: me, frame } = setup(t, 1);
  race.rivals[0].empUntil = race.player.empUntil = race.elapsed + 1.5;
  let rival = 0, player = 0;
  for (let i = 0; i < 30; i++) {
    frame(0.02, { quality: 'low' });
    rival = Math.max(rival, shown(discharges, 0, per)); player = Math.max(player, shown(discharges, me * per, (me + 1) * per));
  }
  assert.equal(rival, 0, 'Low: no discharges on rivals');
  assert.ok(player > 0 && player <= 2, `Low: a couple on the player (${player})`);
  for (let i = 0; i < 4; i++) frame(0.02, {}, true);
  const still = discharges.instanceMatrix.array.slice();
  for (let i = 0; i < 10; i++) frame(0.05, {}, true);
  assert.deepEqual(discharges.instanceMatrix.array, still, 'reduced motion: nothing jumps');
});

test('EMP over a Freeze still discharges, and dispose frees the discharge mesh', t => {
  const { race, discharges, per, frame, effects } = setup(t);
  race.rivals[0].freezeUntil = race.elapsed + 3;
  race.rivals[0].empUntil = race.elapsed + 1.5;
  let seen = 0;
  for (let i = 0; i < 30; i++) { frame(0.02); seen = Math.max(seen, shown(discharges, 0, per)); }
  assert.ok(seen > 0);
  let freed = 0;
  discharges.geometry.addEventListener('dispose', () => freed++);
  discharges.material.addEventListener('dispose', () => freed++);
  effects.dispose();
  assert.equal(freed, 2);
});
