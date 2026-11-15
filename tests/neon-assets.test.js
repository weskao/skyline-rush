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

/** A host with a road and a Neon layer; texture fetches whose URL matches `failing` reject. */
function paving(failing = /^$/) {
  const urls = [], paved = [], dataset = {};
  const neon = { attachKit() {}, detachKit() {}, update() {}, hide() {}, dispose() {}, pave: material => paved.push(material) };
  const road = { mesh: { material: new THREE.MeshStandardMaterial() }, load: file => { urls.push(file.url); return failing.test(file.url) ? Promise.reject(new Error('offline')) : Promise.resolve(new THREE.Texture()); } };
  const assets = createCoastAssets({ scenery, cache: { load: () => new Promise(() => {}) }, neon, road, dataset });
  return { paved, dataset, assets, road, ground: () => urls.filter(url => url.includes('neon-pavement')).sort() };
}

test('the Neon land wears the pavement set at the road tier: fetched on Medium+, laid outside a race, wet with the road', async () => {
  assert.equal(trackLook('neon').ground, 'neon-pavement');
  assert.equal(trackLook('coast').ground, undefined);
  const r = paving();
  r.assets.update('coast', 'high', false); r.assets.update('neon', 'low', false);
  assert.deepEqual(r.ground(), [], 'Coast and Low fetch no pavement');
  r.assets.update('neon', 'high', true);
  await tick();
  assert.deepEqual(r.ground(), ['basecolor', 'normal', 'packed'].map(map => `materials/neon-pavement/pavement_${map}_2k.ktx2`));
  assert.equal(r.assets.update('neon', 'high', true), false);
  assert.deepEqual(r.paved, [], 'never a new program after GO');
  assert.equal(r.assets.update('neon', 'high', false), true, 'the pavement program is warmed before GO');
  assert.equal(r.paved.length, 1);
  assert.equal(r.dataset.neonGround, 'high');
  const pavement = r.paved[0], shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  assert.notEqual(pavement, r.road.mesh.material, 'its own set, not the asphalt');
  pavement.onBeforeCompile(shader, null);
  r.assets.update('neon', 'high', true, 'night');
  assert.equal(shader.uniforms.wetness.value, 0, 'dry at night');
  r.assets.update('neon', 'high', true, 'track');
  assert.ok(shader.uniforms.wetness.value >= .7, 'soaked on the rainy default');
  assert.equal(r.assets.update('neon', 'high', false), false, 'laid once');
  let freed = false; pavement.addEventListener('dispose', () => { freed = true; });
  r.assets.update('canyon', 'high', false);
  assert.equal(r.paved.at(-1), null, 'another track: the bare paving back');
  assert.ok(freed, 'and the set is released');
  assert.equal(r.dataset.neonGround, 'procedural');
  r.assets.dispose();
});

test('a pavement set that cannot load keeps the bare paving and the asphalt road', async () => {
  const r = paving(/neon-pavement/);
  await quiet(async () => { r.assets.update('neon', 'medium', false); await tick(); r.assets.update('neon', 'medium', false); });
  assert.deepEqual(r.paved, []);
  assert.equal(r.dataset.neonGround, 'fallback');
  assert.deepEqual([r.dataset.coastRoad, r.dataset.coastRoadSet], ['medium', 'neon-asphalt']);
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
