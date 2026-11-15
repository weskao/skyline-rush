// Task 5b steps 5 to 7: the asset host loads the two Neon Downtown kits and swaps the procedural city for them only
// while both are in the scene (N3, N4, N5). Low, a failed load and a race without the authored loop keep today's Neon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createCoastAssets } from '../src/coast-assets.ts';
import { trackLook } from '../src/track-look.ts';

const scenery = { attachModel() {}, detachModel() {} };
const tick = () => new Promise(done => setTimeout(done, 0));
const quiet = async run => { const warn = console.warn; console.warn = () => {}; try { await run(); } finally { console.warn = warn; } };

function rig(failing = []) {
  const log = [], pending = {}, dataset = {};
  const cache = { load: id => { log.push(['load', id]); return new Promise(done => { pending[id] = () => done(failing.includes(id) ? { kind: 'fallback', id, fallback: 'procedural-scenery', reason: 'network' } : { kind: 'model', id, instance: () => id, release: () => log.push(['release', id]) }); }); } };
  const neon = { attachKit: (kit, source) => log.push(['attach', kit, source]), detachKit: kit => log.push(['detach', kit]), update: (...args) => log.push(['draw', ...args]), hide: () => log.push(['hide']), dispose: () => log.push(['dispose']) };
  const part = () => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); const group = new THREE.Group(); group.add(mesh); return { group, mesh }; };
  const city = { visible: true }, mountains = { material: { visible: true } }, tower = part(), roadside = part(), lamps = part().mesh;
  const assets = createCoastAssets({ scenery, cache, neon, dataset, city, mountains, towers: [tower.group], replaced: [roadside.group, lamps] });
  return {
    log, dataset, assets, route: { lap: 4000 },
    land: async (...ids) => { for (const id of ids) pending[id](); await tick(); },
    ops: name => log.filter(([op]) => op === name),
    /** city group, cones, towers, roadside boxes, lamps */
    shown: () => [city.visible, mountains.material.visible, tower.mesh.material.visible, roadside.mesh.material.visible, lamps.material.visible],
  };
}
const ALL = [true, true, true, true, true], NONE = [false, false, false, false, false];

test("Neon's look entry names the city kit and the landmark kit", () => {
  assert.equal(trackLook('neon').scenery, 'neon-city');
  assert.equal(trackLook('neon').landmarks, 'neon-landmarks');
  assert.equal(trackLook('coast').landmarks, undefined);
});

test('both kits are fetched once, only for Neon on Medium+ and only by a host that has the Neon layer', () => {
  const r = rig();
  r.assets.update('coast', 'high', false);
  r.assets.update('neon', 'low', false, 'track', false, r.route, 10);
  assert.deepEqual(r.ops('load').map(([, id]) => id), ['coast-scenery'], 'Low and other tracks load no kit');
  r.assets.update('neon', 'medium', false, 'track', false, r.route, 10);
  r.assets.update('neon', 'high', true, 'track', false, r.route, 10);
  assert.deepEqual(r.ops('load').map(([, id]) => id), ['coast-scenery', 'neon-city', 'neon-landmarks']);
  assert.deepEqual([r.dataset.neonCity, r.dataset.neonLandmarks], ['loading', 'loading']);
  r.assets.dispose();
  const loads = [], plain = createCoastAssets({ scenery, cache: { load: id => { loads.push(id); return new Promise(() => {}); } } });
  plain.update('neon', 'high', false);
  assert.deepEqual(loads, [], 'no Neon layer: nothing to draw the kits with');
  plain.dispose();
});

test('all or nothing: the procedural city, towers and roadside leave only once both kits are in the scene', async () => {
  const r = rig();
  r.assets.update('neon', 'high', false, 'track', false, r.route, 250);
  await r.land('neon-city');
  assert.equal(r.assets.update('neon', 'high', false, 'track', false, r.route, 250), true, 'the city kit joins: warm its programs');
  assert.deepEqual(r.ops('attach'), [['attach', 'city', 'neon-city']]);
  assert.deepEqual(r.shown(), ALL, 'half a kit never replaces the procedural scene');
  assert.equal(r.ops('draw').length, 0);
  assert.deepEqual(r.log.at(-1), ['hide']);
  await r.land('neon-landmarks');
  assert.equal(r.assets.update('neon', 'high', true, 'track', false, r.route, 250), false, 'never attach (and compile) after GO');
  assert.equal(r.dataset.neonLandmarks, 'waiting-for-race-end');
  assert.deepEqual(r.shown(), ALL);
  assert.equal(r.assets.update('neon', 'high', false, 'rain', false, r.route, 260, 77), true);
  assert.deepEqual(r.log.at(-1), ['draw', r.route, 260, 'high', 77], 'the layer follows the car on the authored loop, with the endless seed');
  assert.deepEqual(r.shown(), NONE, 'N3, N4, N5: kit city, no bridge towers, no box roadside or lamp posts');
  assert.deepEqual([r.dataset.neonCity, r.dataset.neonLandmarks], ['attached', 'attached']);
  assert.equal(r.assets.update('neon', 'high', true, 'track', false, r.route, 270), false, 'only once');
  assert.deepEqual(r.log.at(-1), ['draw', r.route, 270, 'high', undefined]);
  r.assets.dispose();
});

test('Low, another track and a race off the authored loop get the procedural Neon back', async () => {
  const r = rig();
  r.assets.update('neon', 'medium', false, 'track', false, r.route, 0);
  await r.land('neon-city', 'neon-landmarks');
  r.assets.update('neon', 'medium', false, 'track', false, r.route, 0);
  assert.deepEqual(r.shown(), NONE);
  for (const [why, args] of [['Low', ['neon', 'low', false, 'track', false, r.route, 0]], ['practice has no loop', ['neon', 'high', false, 'track', false, undefined, 0]], ['another track', ['canyon', 'high', false, 'track', false, r.route, 0]]]) {
    r.assets.update(...args);
    assert.deepEqual(r.shown().slice(1), ALL.slice(1), why);
    assert.deepEqual(r.log.at(-1), ['hide'], why);
    r.assets.update('neon', 'high', false, 'track', false, r.route, 0);
    assert.deepEqual(r.shown(), NONE, `back from: ${why}`);
  }
  r.assets.dispose();
  assert.deepEqual(r.shown().slice(1), ALL.slice(1), 'dispose hands the materials back');
  assert.deepEqual(r.ops('detach'), [['detach', 'landmarks'], ['detach', 'city']]);
  assert.deepEqual(r.log.slice(-5).map(([op]) => op), ['detach', 'release', 'detach', 'release', 'dispose'], 'each kit leaves the scene before the cache frees its GLB');
});

test('one kit failing to load keeps the whole procedural Neon', async () => {
  const r = rig(['neon-landmarks']);
  await quiet(async () => {
    r.assets.update('neon', 'high', false, 'track', false, r.route, 0);
    await r.land('neon-city', 'neon-landmarks');
    r.assets.update('neon', 'high', false, 'track', false, r.route, 0);
    r.assets.update('neon', 'high', false, 'track', false, r.route, 0);
  });
  assert.equal(r.dataset.neonLandmarks, 'fallback:network');
  assert.deepEqual(r.shown(), ALL);
  assert.equal(r.ops('draw').length, 0);
  r.assets.dispose();
});

test('Coast is untouched by the Neon layer: its scan hides the cones, city and towers, never the Neon roadside', async () => {
  const r = rig();
  r.assets.update('coast', 'high', false);
  await r.land('coast-scenery');
  r.assets.update('coast', 'high', false);
  assert.deepEqual(r.shown(), [false, false, false, true, true]);
  assert.equal(r.ops('draw').length, 0);
  r.assets.dispose();
});

test('world.js hands the scene, the procedural Neon parts and the route to the asset host without growing', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createWorldCoastAssets\(renderer, \{ scene, scenery: coastScenery, road, sky, sun, sea, seaLines, mountains, city, towers, replaced: \[classicScenery\.groups\.neon, poles, lamps, pillars, tunnelRoofs, tunnelWalls\] \}, canvas\.dataset\)/);
  assert.match(world, /coastAssets\?\.update\(trackId, visual\.quality, race\.phase === 'racing', visualPreset, visual\.ultra, curvedClassic \? classicRoute : undefined, distance, race\.endless \? race\.seed : undefined\)/);
});
