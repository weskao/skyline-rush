// Coast full-scene step 2: under `?look=3d` on Medium+ the sea is a water surface that mirrors the sky dome on screen,
// glitters under that sky's sun, and foams where the placed rocks, cliffs and the arch meet it. Low, other tracks,
// pages without the gate, a failed load and a missing sky keep today's procedural sea and its sea lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createClassicBackdrop } from '../src/classic-backdrop.ts';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { coastChunkPlan, coastChunkWindow } from '../src/coast-scenery-glb.ts';
import { createCoastSea, createShoreMask, SHORE_MASK_METRES } from '../src/coast-sea.ts';
import { COAST_SEA_MANIFEST } from '../src/coast-sea-manifest.ts';
import { coastSunDirection } from '../src/coast-sky.ts';
import { setLook3d } from '../src/look-gate.ts';
import { KTX2_MAGIC, ktx2 } from './helpers/ktx2.js';

setLook3d(true);
const tick = () => new Promise(resolve => setImmediate(resolve));
const read = path => readFileSync(new URL('../' + path, import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

function rig({ load = () => Promise.resolve(new THREE.Texture()) } = {}) {
  const scene = new THREE.Scene();
  const { sea, seaLines } = createClassicBackdrop(scene, new THREE.BoxGeometry(1, 1, 1), () => {});
  const dome = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: new THREE.Texture() }));
  dome.material.color.setScalar(2.5); dome.rotation.y = .4; dome.visible = true;
  const origin = new THREE.Vector3(-30, 0, 900), dataset = {}, urls = [];
  const coastSea = createCoastSea({ sea, seaLines, dome, origin, dataset, load: url => { urls.push(url); return load(url); } });
  const water = sea.children[0];
  return { scene, sea, seaLines, dome, origin, dataset, urls, coastSea, water };
}

test('the wave texture is the build script output: pinned, linear UASTC with mips, generated in the repo', () => {
  const script = read(COAST_SEA_MANIFEST.script);
  assert.equal(sha256(script), COAST_SEA_MANIFEST.scriptSha256, 'build.py drifted: rerun it and update the manifest');
  assert.doesNotMatch(script.toString(), /\/Users\/|\/home\//, 'no personal paths');
  assert.deepEqual(COAST_SEA_MANIFEST.inputs, [], 'no third-party source: the script is the source');
  assert.ok(COAST_SEA_MANIFEST.creator.length > 0);
  const buffer = read(`public/${COAST_SEA_MANIFEST.url}`), h = ktx2(buffer);
  assert.equal(buffer.length, COAST_SEA_MANIFEST.bytes);
  assert.equal(sha256(buffer), COAST_SEA_MANIFEST.sha256);
  assert.ok(h.magic.equals(KTX2_MAGIC));
  assert.deepEqual([h.vkFormat, h.colorModel, h.supercompression], [0, 166, 2], 'UASTC + zstd');
  assert.deepEqual([h.width, h.height, h.levels, h.transfer], [1024, 1024, 11, 'linear']);
  assert.ok(buffer.length <= COAST_SEA_MANIFEST.budgets.downloadBytes);
});

test('the water mesh and its program exist from creation, hidden, so the first shader warmup builds it before GO', () => {
  const r = rig();
  assert.equal(r.water.material.isShaderMaterial, true);
  assert.equal(r.water.visible, false);
  assert.equal(r.water.geometry, r.sea.geometry, 'the same plane: no new vertices');
  assert.equal(r.water.material.uniforms.time, r.sea.material.uniforms.time, 'world.js already drives this clock (and stops it for reduced motion)');
  for (const name of ['waves', 'sky', 'shore']) assert.ok(r.water.material.uniforms[name].value.isTexture, `${name} has a texture before anything loads`);
  assert.deepEqual(r.urls, [], 'nothing is fetched until Coast Medium+ asks');
  assert.equal(r.scene.children.includes(r.water), false, 'a child of the sea, so the sea draw-order slot and world.js visibility still apply');
});

test('Low, other tracks, non-HDRI presets and pages without ?look=3d keep the procedural sea and fetch nothing', async () => {
  const r = rig();
  for (const [track, preset, quality] of [['coast', 'day', 'low'], ['neon', 'day', 'high'], ['coast', 'night', 'high']]) r.coastSea.update(track, preset, quality);
  setLook3d(false);
  r.coastSea.update('coast', 'day', 'high');
  setLook3d(true);
  await tick();
  assert.deepEqual(r.urls, []);
  assert.equal(r.water.visible, false);
  assert.ok(r.sea.material.visible && r.seaLines.material.visible);
  assert.equal(r.dataset.coastSea, 'procedural');
});

test('Coast Medium+ shows the water once its texture and the sky dome are up; it mirrors that sky and its sun', async () => {
  const r = rig();
  r.coastSea.update('coast', 'dusk', 'medium');
  assert.equal(r.dataset.coastSea, 'loading');
  assert.equal(r.water.visible, false, 'procedural sea while loading');
  assert.deepEqual(r.urls, [COAST_SEA_MANIFEST.url]);
  await tick();
  const version = r.water.material.version;
  r.coastSea.update('coast', 'dusk', 'medium');
  const u = r.water.material.uniforms;
  assert.equal(r.dataset.coastSea, 'water');
  assert.equal(r.water.visible, true);
  assert.equal(r.sea.material.visible, false, 'the procedural sea shader is not drawn under the water');
  assert.equal(r.seaLines.material.visible, false, 'the flat foam boxes are replaced by the foam in the water');
  assert.equal(u.sky.value, r.dome.material.map, 'the reflected sky is the dome texture on screen');
  assert.deepEqual([u.skyScale.value, u.skyYaw.value], [2.5, .4]);
  assert.ok(u.sunDirection.value.distanceTo(coastSunDirection('dusk')) < 1e-9, 'glitter sits under the sky dome sun');
  assert.deepEqual(u.offset.value.toArray(), [30, -900], 'waves stay fixed to the scenery as the world slides past the car');
  const duskSun = u.sunColor.value.clone();
  r.coastSea.update('coast', 'fog', 'medium');
  assert.ok(u.sunColor.value.r < duskSun.r * .2, 'an overcast sky has almost no sun to glitter');
  assert.equal(r.water.material.version, version, 'a preset change moves uniforms only: no recompile after GO');
  assert.deepEqual(r.urls, [COAST_SEA_MANIFEST.url], 'one texture for every preset and tier');
  r.dome.visible = false; // the sky fell back to the procedural dome
  r.coastSea.update('coast', 'fog', 'medium');
  assert.equal(r.water.visible, false, 'never a mirror of a sky that is not on screen');
  assert.ok(r.sea.material.visible && r.seaLines.material.visible);
  r.dome.visible = true;
  r.coastSea.update('neon', 'day', 'medium');
  assert.equal(r.water.visible, false, 'other tracks get their sea back');
  r.coastSea.dispose();
  assert.equal(r.sea.children.length, 0);
});

test('a failed texture load keeps the procedural sea', async () => {
  const warn = console.warn; console.warn = () => {};
  try {
    const r = rig({ load: () => Promise.reject(new Error('404')) });
    r.coastSea.update('coast', 'day', 'high');
    await tick();
    r.coastSea.update('coast', 'day', 'high');
    assert.equal(r.dataset.coastSea, 'fallback');
    assert.equal(r.water.visible, false);
    assert.ok(r.sea.material.visible && r.seaLines.material.visible);
  } finally { console.warn = warn; }
});

const texel = (mask, x, z) => {
  const size = mask.texture.image.width, scale = size / SHORE_MASK_METRES;
  return mask.texture.image.data[Math.floor((z - mask.rect.y) * scale) * size + Math.floor((x - mask.rect.x) * scale)];
};

test('the shore mask is full inside a footprint, fades over a few metres of water and follows the piece yaw', () => {
  const mask = createShoreMask();
  mask.begin(100, -400);
  assert.deepEqual([mask.rect.x, mask.rect.y, mask.rect.z], [100 - SHORE_MASK_METRES / 2, -400 - SHORE_MASK_METRES / 2, 1 / SHORE_MASK_METRES]);
  mask.stamp(100, -400, 30, 8, 0); // long along x
  const version = mask.texture.version;
  mask.end();
  assert.ok(mask.texture.version > version, 'uploaded once per placement pass');
  assert.equal(texel(mask, 100, -400), 255);
  assert.equal(texel(mask, 124, -400), 255, 'inside the long axis');
  assert.ok(texel(mask, 100, -412) > 0 && texel(mask, 100, -412) < 255, 'foam band just off the short side');
  assert.equal(texel(mask, 100, -430), 0, 'open water');
  mask.begin(100, -400);
  mask.stamp(100, -400, 30, 8, Math.PI / 2); // turned a quarter: long along z
  assert.equal(texel(mask, 100, -424), 255);
  assert.equal(texel(mask, 124, -400), 0);
  mask.begin(0, 0);
  mask.stamp(SHORE_MASK_METRES / 2, 0, 40, 40, 0); // on the edge of the mask
  const data = mask.texture.image.data, size = mask.texture.image.width;
  for (let i = 0; i < size; i++) assert.equal(data[i * size + size - 1], 0, 'the border stays empty: clamped lookups outside the mask read open water');
  assert.equal(texel(mask, 0, 0), 0, 'begin clears the previous pass');
});

const center = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const road = { point: (d, lane = 0) => [center(d) + lane, -d], heading: d => Math.atan((center(d + 1) - center(d - 1)) / 2) };
function fakeGlb() {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  for (const [name, x, z] of [['sea_arch', 20, 6], ['cliff_a', 30, 10], ['cliff_b', 24, 8], ['rock_a', 4, 4], ['rock_b', 2, 2], ['palm_a', 1, 1], ['palm_b', 1, 1], ['guard_rail', 12, .2]]) {
    root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(x, 2, z), material), { name }));
  }
  return root;
}

test('the scenery layer stamps every rock, cliff and arch that stands in the water, and nothing else', () => {
  const kit = createCoastScenery(new THREE.Scene()), log = [];
  const sink = { begin: (x, z) => log.push(['begin', x, z]), stamp: (...args) => log.push(['stamp', ...args]), end: () => log.push(['end']) };
  kit.attachModel(fakeGlb(), sink);
  kit.update(road, 300, 'high');
  const window = coastChunkWindow(300, 'high');
  let wet = 0;
  for (let c = window.first; c < window.first + window.count; c++) wet += coastChunkPlan(c).filter(p => !/palm|rail/.test(p.piece)).length;
  const stamps = log.filter(([op]) => op === 'stamp');
  assert.equal(log[0][0], 'begin');
  assert.equal(log.at(-1)[0], 'end');
  assert.equal(stamps.length, wet);
  assert.ok(wet > 10);
  const [x, z] = road.point((window.first + window.count / 2) * 120);
  assert.deepEqual(log[0].slice(1), [x, z], 'the mask is centred on the chunk window');
  for (const [, sx, sz, halfX, halfZ, yaw] of stamps) {
    for (const value of [sx, sz, halfX, halfZ, yaw]) assert.ok(Number.isFinite(value));
    assert.ok(Math.hypot(sx - x, sz - z) < SHORE_MASK_METRES / 2, 'inside the mask');
    assert.ok(halfX >= 1 * 2.5 - 1e-9 && halfX <= 15 * 2.4 + 1e-9, 'the GLB footprint times the placement scale');
  }
  const count = log.length;
  kit.update(road, 301, 'high');
  assert.equal(log.length, count, 'restamped only when the chunk window moves');
  kit.dispose();
});
