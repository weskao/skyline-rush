// Task 8c: Sky Spiral draws its own scene (sky-scene.js), so the shared sky dome and the KTX2 road swap never reached
// it: world.js hides the sky mesh the dome hangs under, and the classic road mesh that wears the road set.
// spiral-look.ts is their target on the helix course. The procedural fallback shares the same time of day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Color, DoubleSide, FogExp2, Mesh, MeshStandardMaterial, Object3D, Scene, Texture } from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createSpiralLook, SPIRAL_DAY } from '../src/spiral-look.ts';
import { createCoastAssets } from '../src/coast-assets.ts';
import { coastEnvPlan, COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { trackLook } from '../src/track-look.ts';
import { TRACK_PALETTES } from '../src/track-palettes.ts';
import { ROAD_UV_METRES, ROAD_UV_PERIOD } from '../src/geometry.ts';

const NIGHT = TRACK_PALETTES.spiral.fog, DENSITY = .0013;
const hex = color => `#${color.getHexString()}`;

/** The world's pieces as world.js builds them: the shared sky mesh with the Coast dome under it, the violet haze. */
function rig() {
  const scene = new Scene();
  scene.background = new Color(NIGHT);
  scene.fog = new FogExp2(NIGHT, DENSITY);
  const home = new Mesh(), dome = new Mesh(); // coast-sky.ts hangs a textured dome mesh
  dome.visible = false;
  home.add(dome);
  const course = createSkyScene(scene), parts = course.parts;
  return { scene, home, dome, course, parts, look: createSpiralLook({ parts, dome, home, scene, clock: { value: 0 } }) };
}

test('Sky Spiral has a look entry: the day sky on `track` and `day`, its road set on the helix, dry', () => {
  const look = trackLook('spiral');
  assert.deepEqual({ ...look.env }, { track: 'day', day: 'day' });
  assert.equal(look.helix, 'neon-asphalt');
  assert.equal(look.road, undefined, 'the classic road mesh is hidden on this course: nothing is loaded onto it');
  assert.deepEqual({ ...look.wetness }, {});
  assert.deepEqual(coastEnvPlan('spiral', 'track', 'medium'), { kind: 'hdri', variant: 'day' });
  assert.deepEqual(coastEnvPlan('spiral', 'track', 'low'), { kind: 'room' }, 'Low keeps the procedural scene');
  for (const preset of ['dusk', 'night', 'rain', 'fog', 'aurora']) assert.deepEqual(coastEnvPlan('spiral', preset, 'high'), { kind: 'room' }, preset);
});

test('the day dome hangs under the Sky Spiral course in place of its backdrop, and goes back', () => {
  const { home, dome, parts, look } = rig();
  assert.equal(parts.group.name, 'Sky Spiral 3D course');
  assert.equal(parts.backdrop.name, 'Sky Spiral backdrop');
  look.update('spiral', 'track', 'high');
  assert.equal(dome.parent, home, 'the sky texture is still loading: the backdrop stays');
  assert.equal(parts.backdrop.visible, true);
  dome.visible = true; // coast-sky.ts shows it once its texture is in
  look.update('spiral', 'track', 'high');
  assert.equal(dome.parent, parts.group, 'world.js hides the shared sky mesh on this course');
  assert.equal(parts.backdrop.visible, false);
  look.update('spiral', 'track', 'low');
  assert.equal(dome.parent, home, 'Low');
  assert.equal(parts.backdrop.visible, true);
  look.update('spiral', 'day', 'medium');
  assert.equal(dome.parent, parts.group);
  look.update('spiral', 'night', 'high');
  assert.equal(dome.parent, home, 'a preset without a sky keeps the backdrop');
  look.update('spiral', 'track', 'high');
  look.update('coast', 'track', 'high');
  assert.equal(dome.parent, home, 'Coast gets its dome back under the shared sky');
  assert.equal(parts.backdrop.visible, true);
  look.update('spiral', 'track', 'high');
  look.dispose();
  assert.equal(dome.parent, home, 'coast-sky.ts removes the dome from the shared sky on dispose');
  assert.equal(parts.backdrop.visible, true);
});

test('the day look clears the violet haze, and only its own', () => {
  const { scene, look } = rig();
  const state = () => [hex(scene.background), hex(scene.fog.color), scene.fog.density];
  const day = [SPIRAL_DAY.background, SPIRAL_DAY.fog, SPIRAL_DAY.density], night = [NIGHT, NIGHT, DENSITY];
  look.update('spiral', 'track', 'high');
  assert.deepEqual(state(), day);
  look.update('spiral', 'track', 'low');
  assert.deepEqual(state(), day, 'Low keeps the same clear air');
  look.update('spiral', 'night', 'low');
  assert.deepEqual(state(), night, 'an explicit night restores the procedural atmosphere');
  look.update('spiral', 'track', 'medium');
  // race-visuals.ts writes its own haze on a preset change, before this runs.
  scene.background.set('#ec9478'); scene.fog.color.set('#bb7f89'); scene.fog.density = .001;
  look.update('spiral', 'dusk', 'medium');
  assert.deepEqual(state(), ['#ec9478', '#bb7f89', .001], 'a preset without a sky keeps its haze');
  scene.background.set('#94b7c9'); scene.fog.color.set('#a3bdc8');
  look.update('spiral', 'day', 'medium');
  assert.deepEqual(state(), day, 'the day preset gets the same clear air as the default');
  scene.background.set(NIGHT); scene.fog.color.set(NIGHT); scene.fog.density = DENSITY; // back to `track`: its saved defaults
  look.update('spiral', 'track', 'medium');
  assert.deepEqual(state(), day);
  scene.background.set('#1b2e5a'); scene.fog.color.set('#304b73'); scene.fog.density = .0016; // photo mode, night style
  look.update('spiral', 'track', 'medium');
  assert.deepEqual(state(), ['#1b2e5a', '#304b73', .0016], 'a photo style is left alone');
  scene.background.set(SPIRAL_DAY.background); scene.fog.color.set(SPIRAL_DAY.fog); scene.fog.density = SPIRAL_DAY.density;
  scene.background.set('#946d87'); scene.fog.color.set('#946d87'); // the next track's block sets its colours, not the density
  look.update('canyon', 'track', 'medium');
  assert.deepEqual(state(), ['#946d87', '#946d87', DENSITY], 'the next track gets the shared density back, and its own colours');
  scene.fog.density = .0024;
  look.update('canyon', 'rain', 'medium');
  assert.equal(scene.fog.density, .0024, 'never another haze');
});

test('the procedural sky, road and tower share daylight on Low and when the detailed sky is unavailable', () => {
  const { course, parts, look } = rig();
  const { backdrop, landmark, road, trim } = parts;
  const tower = landmark.children[0].material;
  const before = [hex(road.material.color), hex(tower.color), hex(trim.beacons.color)];
  for (const [preset, quality] of [['track', 'low'], ['day', 'low'], ['track', 'high']]) {
    look.update('spiral', preset, quality);
    course.update(1850, quality);
    assert.equal(backdrop.visible, true);
    assert.equal(backdrop.material.uniforms.daylight?.value, 1, 'the cloud sea and daylight use the procedural shader');
    assert.notEqual(hex(road.material.color), before[0], 'the procedural road uses its daylight palette');
    assert.ok(tower.color.g > .5, 'the procedural tower is white');
    assert.equal(hex(trim.beacons.color), hex(trim.accent.color), 'blue beacons match the detailed look');
  }
  for (const preset of ['night', 'fog', 'rain']) {
    for (const quality of ['low', 'high']) {
      look.update('spiral', preset, quality);
      assert.equal(backdrop.material.uniforms.daylight.value, 0, preset);
      assert.deepEqual([hex(road.material.color), hex(tower.color), hex(trim.beacons.color)], before);
    }
  }
});

test("the day sky is Coast's, dome gain and bloom threshold included (rule item 15: no new sky to measure)", () => {
  const plan = coastEnvPlan('spiral', 'track', 'high');
  assert.equal(plan.variant, coastEnvPlan('coast', 'track', 'high').variant);
  assert.deepEqual(COAST_ENV_VARIANTS[plan.variant].bloom, { strength: .36, threshold: 1.15 });
});

/** The asset host with the Sky Spiral target, a road loader that records its files, and no model. */
function host({ fail = false } = {}) {
  const r = rig(), urls = [], dataset = {};
  const classic = { material: new MeshStandardMaterial({ name: 'procedural' }) };
  const assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {} }, cache: { load: () => new Promise(() => {}) }, spiral: r.look, dataset,
    road: { mesh: classic, load: file => { urls.push(file.url); return fail ? Promise.reject(new Error('offline')) : Promise.resolve(new Texture()); } },
  });
  const settle = async (...args) => { assets.update(...args); await new Promise(done => setTimeout(done, 0)); return assets.update(...args); };
  return { ...r, urls, dataset, classic, assets, settle };
}

test('the helix ribbon wears the look\'s road set on Medium and above, laid outside a race and warmed before GO', async t => {
  t.mock.method(console, 'warn', () => {});
  const { parts, urls, dataset, classic, assets, settle } = host();
  const procedural = parts.road.material, classicRoad = classic.material;
  assets.update('spiral', 'low', false);
  assert.deepEqual(urls, [], 'Low fetches nothing');
  assert.equal(await settle('spiral', 'high', true), false, 'never swapped in a race');
  assert.equal(parts.road.material, procedural);
  assert.equal(assets.update('spiral', 'high', false), true, 'the new program is warmed before GO');
  const asphalt = parts.road.material;
  assert.notEqual(asphalt, procedural);
  assert.equal(asphalt.name, 'spiral_asphalt');
  assert.equal(asphalt.side, DoubleSide, 'the deck is seen from below across the rising helix, as the procedural one is');
  assert.ok(asphalt.map && asphalt.normalMap && asphalt.roughnessMap);
  assert.equal(urls.length, 3);
  for (const url of urls) assert.match(url, /^materials\/neon-asphalt\/asphalt_\w+_2k\.ktx2$/);
  assert.equal(dataset.spiralRoad, 'high');
  assert.equal(classic.material, classicRoad, 'the hidden classic road is not dressed');
  assert.equal(assets.update('spiral', 'high', false), false, 'only once');
  let freed = false;
  asphalt.addEventListener('dispose', () => { freed = true; });
  assets.update('spiral', 'low', true);
  assert.equal(parts.road.material, asphalt, 'a quality change waits for the race end');
  assets.update('spiral', 'low', false);
  assert.equal(parts.road.material, procedural, 'Low keeps the procedural road');
  assert.equal(dataset.spiralRoad, 'procedural');
  assert.equal(freed, true, 'the set left behind is freed');
  await settle('spiral', 'medium', false);
  assert.match(urls.at(-1), /_1k\.ktx2$/);
  await settle('coast', 'medium', false);
  assert.equal(parts.road.material, procedural, 'another track');
  assert.equal(classic.material.name, 'coast_asphalt', 'Coast is unchanged');
  await settle('spiral', 'medium', false);
  assets.dispose();
  assert.equal(parts.road.material, procedural);
});

test('a road set that fails to load keeps the procedural helix road', async t => {
  t.mock.method(console, 'warn', () => {});
  const { parts, dataset, assets, settle } = host({ fail: true }), procedural = parts.road.material;
  assert.equal(await settle('spiral', 'high', false), false);
  assert.equal(parts.road.material, procedural);
  assert.equal(dataset.spiralRoad, 'fallback');
});

test('the helix ribbon carries road UVs: u across the deck, one repeat per ROAD_UV_METRES along it', () => {
  const { course, parts } = rig(), uv = parts.road.geometry.attributes.uv;
  const row = i => [...uv.array.slice(i * 4, i * 4 + 4)];
  course.update(0);
  assert.deepEqual(row(0), [0, 0, 1, 0]);
  assert.ok(Math.abs(row(3)[1] - 30 / ROAD_UV_METRES) < 1e-5 && row(3)[3] === row(3)[1], 'v is the distance along the road');
  const version = uv.version;
  course.update(4);
  assert.equal(uv.version, version, 'rewritten only when the 10 m sector changes');
  // Endless: v restarts by whole repeats, so it stays small for float32 and the texture never jumps.
  const far = ROAD_UV_PERIOD * 40 + 500;
  course.update(far, 'high', true);
  assert.ok(uv.version > version);
  const v0 = row(0)[1], v1 = row(1)[1];
  assert.ok(v0 >= 0 && v0 < ROAD_UV_PERIOD / ROAD_UV_METRES + 20, `v stays small (${v0})`);
  assert.ok(Math.abs(v1 - v0 - 10 / ROAD_UV_METRES) < 1e-4);
  assert.ok(Math.abs((v0 * ROAD_UV_METRES - (Math.floor((far - 140) / 10) * 10)) / ROAD_UV_PERIOD % 1) < 1e-3, 'offset by whole periods');
});

test('world.js hands the Sky Spiral course to the asset host without growing', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createWorldCoastAssets\(renderer, \{ scene, [^}]+, spiral: skyScene\.parts \}, canvas\.dataset\)/);
  const host = readFileSync(new URL('../src/coast-assets.ts', import.meta.url), 'utf8');
  assert.match(host, /createSpiralLook\(\{ parts: targets\.spiral, dome: sky\.dome, home: targets\.sky, scene: targets\.scene, clock: targets\.sea\.material\.uniforms\.time! \}\)/);
});
