// Coast full-scene step 1 (owner decision D3): the visible sky is each preset's Poly Haven lighting HDRI at a higher
// resolution on a dome mesh, with the sun disc and the directional light aligned to the HDRI sun. Low, other tracks,
// presets without an HDRI, pages without `?look=3d` and a failed load keep today's procedural sky.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { COAST_SUN_AZIMUTH, coastSkyFile, coastSkyWidth, coastSkyYaw, coastSunDirection, createCoastSky, createSkyDomeGeometry } from '../src/coast-sky.ts';
import { setLook3d } from '../src/look-gate.ts';
import { isLightSource } from '../src/wet-reflection.ts';

setLook3d(true);
const degrees = radians => radians * 180 / Math.PI;
const settle = () => new Promise(resolve => setImmediate(resolve));

/** Direction of the brightest texel of a shipped lighting HDRI, in the equirect convention PMREM samples it with. */
function hdriSun(file) {
  const buffer = readFileSync(new URL('../public/environments/' + file, import.meta.url));
  const { data, width, height } = new HDRLoader().setDataType(THREE.FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  let best = -1, at = 0;
  for (let i = 0; i < width * height; i++) {
    const luminance = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
    if (luminance > best) { best = luminance; at = i; }
  }
  const u = (at % width + 0.5) / width, v = (Math.floor(at / width) + 0.5) / height; // file row 0 is the zenith
  const latitude = (0.5 - v) * Math.PI, longitude = (u - 0.5) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude));
}

test('each variant records the sun of its own lighting HDRI, so the light and disc can follow it', () => {
  for (const [name, v] of Object.entries(COAST_ENV_VARIANTS)) {
    const sun = new THREE.Vector3(...v.sky.sunDirection);
    assert.ok(Math.abs(sun.length() - 1) < 1e-3, `${name}: unit vector`);
    assert.ok(sun.y > 0, `${name}: above the horizon`);
    assert.ok(v.sky.range >= 1 && v.sky.range <= 8, `${name}: decode range`);
    assert.ok(v.sky.gain > 0 && v.sky.gain <= 1 && v.sky.range * v.sky.gain >= v.bloom.threshold - 1e-9, `${name}: the sky's top end reaches the bloom threshold, its body stays under`);
  }
  for (const name of ['day', 'dusk']) { // the two skies with a visible sun disc
    const v = COAST_ENV_VARIANTS[name];
    assert.ok(degrees(new THREE.Vector3(...v.sky.sunDirection).angleTo(hdriSun(v.file))) < 1.5, `${name}: recorded sun is the HDRI's brightest texel`);
    assert.ok(v.sky.disc > 0, `${name}: has a sun disc`);
  }
  assert.ok(degrees(Math.asin(COAST_ENV_VARIANTS.dusk.sky.sunDirection[1])) < 10, 'the sunset sun sits near the sea horizon');
  assert.equal(COAST_ENV_VARIANTS.fog.sky.disc, 0, 'overcast: no disc');
});

test('one yaw per variant turns its HDRI sun to the same place over the sea, left of the driving direction', () => {
  assert.ok(COAST_SUN_AZIMUTH < -Math.PI / 2 && COAST_SUN_AZIMUTH > -Math.PI * 0.75, 'ahead (-z) and to the left (-x), inside the chase camera view');
  for (const [name, v] of Object.entries(COAST_ENV_VARIANTS)) {
    const world = coastSunDirection(name), hdri = new THREE.Vector3(...v.sky.sunDirection).normalize();
    assert.ok(Math.abs(Math.atan2(world.z, world.x) - COAST_SUN_AZIMUTH) < 1e-6, `${name}: azimuth`);
    assert.ok(Math.abs(world.y - hdri.y) < 1e-6 && Math.abs(world.length() - 1) < 1e-9, `${name}: the HDRI's own elevation is kept`);
    const turned = new THREE.Object3D(); turned.rotation.y = coastSkyYaw(name); turned.updateMatrixWorld();
    const viaMesh = hdri.clone().applyMatrix4(turned.matrixWorld);
    assert.ok(viaMesh.distanceTo(world) < 1e-6, `${name}: a mesh (or scene.environmentRotation) turned by the yaw agrees`);
  }
});

test('the dome is an upper hemisphere whose UVs sample the texture where the lighting HDRI has the same direction', () => {
  const geometry = createSkyDomeGeometry(), position = geometry.attributes.position, uv = geometry.attributes.uv;
  let below = 0, checked = 0;
  for (let i = 0; i < position.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(position, i);
    assert.ok(Math.abs(p.length() - 2400) < 0.01, 'a sphere about the origin, inside the procedural dome (2,500 m) and the 3,000 m far plane');
    p.normalize();
    const zenithAngle = Math.acos(THREE.MathUtils.clamp(p.y, -1, 1));
    if (p.y < -1e-6) { below++; assert.ok(Math.abs(uv.getY(i) - 1) < 1e-6, 'the skirt under the horizon repeats the horizon row'); }
    else assert.ok(Math.abs(uv.getY(i) - zenithAngle / (Math.PI / 2)) < 1e-5, 'v = 0 at the zenith (first KTX2 row), 1 at the horizon');
    if (Math.hypot(p.x, p.z) < 1e-3 || Math.abs(Math.abs(Math.atan2(p.z, p.x)) - Math.PI) < 1e-3) continue; // pole and seam
    assert.ok(Math.abs(uv.getX(i) - (Math.atan2(p.z, p.x) / (Math.PI * 2) + 0.5)) < 1e-5, 'u = atan2(z, x) / 2pi + 0.5');
    checked++;
  }
  assert.ok(checked > 500 && below > 0, 'a skirt closes the gap between the dome and the sea at the far plane');
  const rows = new Set(Array.from({ length: position.count }, (_, i) => Math.round(position.getY(i))));
  assert.ok(rows.has(0), 'one vertex row lies exactly on the horizon, so no triangle stretches the last texel row');
});

test('texture width per tier: 4K, and 8K only on Ultra where the GPU can hold it', () => {
  assert.equal(coastSkyWidth(false, 16384), 4096);
  assert.equal(coastSkyWidth(true, 16384), 8192);
  assert.equal(coastSkyWidth(true, 4096), 4096, 'a 4,096 px GPU limit keeps Ultra on 4K');
  for (const name of Object.keys(COAST_ENV_VARIANTS)) for (const width of [4096, 8192]) {
    assert.match(coastSkyFile(name, width).url, new RegExp(`^environments/sky/${COAST_ENV_VARIANTS[name].file.replace('_1k.hdr', '')}_sky_${width / 1024}k\\.ktx2$`));
  }
});

function rig({ fail = false } = {}) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 8, 4), new THREE.ShaderMaterial());
  const sun = new THREE.Mesh(new THREE.SphereGeometry(65, 8, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.35, 0.5), fog: false }));
  sun.position.set(-355, 88, -1600);
  const loads = [], pending = [], dataset = {};
  const load = url => { loads.push(url); return new Promise((resolve, reject) => pending.push(() => fail ? reject(new Error('404')) : resolve(new THREE.Texture()))); };
  const coastSky = createCoastSky({ sky, sun, load, maxTextureSize: 16384, dataset });
  const land = async () => { pending.splice(0).forEach(run => run()); await settle(); };
  return { sky, sun, loads, dataset, coastSky, land, dome: sky.children[0] };
}

test('Coast Medium+ shows the HDRI dome once its texture is in, hides the procedural sky and moves the disc to the HDRI sun', async () => {
  const r = rig();
  assert.ok(r.dome.isMesh && !r.dome.visible, 'the dome waits hidden under the procedural sky mesh (Sky Spiral hides both)');
  assert.equal(r.dome.material.isMeshBasicMaterial, true);
  assert.deepEqual([r.dome.material.side, r.dome.material.depthWrite, r.dome.material.fog, r.dome.frustumCulled], [THREE.BackSide, false, false, false]);
  assert.equal(isLightSource(r.dome), false, 'the wet road mirrors lights only: the sky is already in its env map');
  assert.ok(r.dome.material.map?.isDataTexture, 'a 1 px map from creation: the first shader warmup builds the textured program, before any GO');
  r.coastSky.update('coast', 'dusk', 'high', false);
  assert.deepEqual(r.loads, ['environments/sky/qwantani_sunset_puresky_sky_4k.ktx2']);
  assert.equal(r.dataset.coastSky, 'loading');
  assert.ok(r.sky.material.visible && !r.dome.visible, 'procedural sky until the texture lands');
  await r.land();
  const version = r.dome.material.version;
  r.coastSky.update('coast', 'dusk', 'high', false);
  const v = COAST_ENV_VARIANTS.dusk;
  assert.ok(r.dome.visible && r.dome.material.map?.isTexture && !r.dome.material.map.isDataTexture);
  assert.equal(r.dome.material.version, version, 'a texture swap: the material is never marked for a recompile');
  assert.equal(r.dome.material.map.wrapS, THREE.RepeatWrapping, 'no seam where u wraps');
  assert.equal(r.sky.material.visible, false, 'the procedural dome is not drawn; its mesh stays visible (world.js reads sky.visible)');
  assert.equal(r.sky.visible, true);
  assert.ok(Math.abs(r.dome.rotation.y - coastSkyYaw('dusk')) < 1e-9);
  assert.ok(Math.abs(r.dome.material.color.r - v.sky.range * v.sky.gain) < 1e-6, 'the material colour undoes the texture range and exposes the sky');
  assert.ok(degrees(r.sun.position.clone().normalize().angleTo(coastSunDirection('dusk'))) < 1e-3, 'disc on the HDRI sun');
  assert.ok(r.sun.position.length() < 2500 && r.sun.position.length() > 2000);
  assert.equal(r.dataset.coastSky, 'dusk:4096');
  assert.equal(r.loads.length, 1);
});

test('Ultra asks for 8K; switching preset swaps the texture without a new program; overcast parks the disc', async () => {
  const r = rig();
  r.coastSky.update('coast', 'day', 'high', true); await r.land();
  assert.deepEqual(r.loads, ['environments/sky/kloofendal_48d_partly_cloudy_puresky_sky_8k.ktx2']);
  r.coastSky.update('coast', 'day', 'high', true);
  const day = r.dome.material.map;
  r.coastSky.update('coast', 'fog', 'high', true);
  assert.ok(r.sky.material.visible && !r.dome.visible, 'never the day sky under fog lighting: procedural until fog lands');
  await r.land();
  r.coastSky.update('coast', 'fog', 'high', true);
  assert.ok(r.dome.visible && r.dome.material.map !== day);
  assert.ok(r.sun.scale.x < 0.01, 'no disc in an overcast sky');
});

test('Low, other tracks, presets without an HDRI and pages without ?look=3d load nothing and keep the procedural sky', async () => {
  const r = rig();
  r.coastSky.update('coast', 'day', 'low', false);
  r.coastSky.update('neon', 'day', 'high', false);
  r.coastSky.update('coast', 'night', 'high', false);
  setLook3d(false);
  r.coastSky.update('coast', 'day', 'high', false);
  setLook3d(true);
  assert.deepEqual(r.loads, []);
  assert.ok(r.sky.material.visible && !r.dome.visible);
});

test('leaving the HDRI sky restores the procedural dome and the disc exactly; dispose frees the textures', async () => {
  const r = rig(), before = [r.sun.position.toArray(), r.sun.scale.toArray(), r.sun.material.color.toArray()];
  r.coastSky.update('coast', 'dusk', 'high', false); await r.land();
  r.coastSky.update('coast', 'dusk', 'high', false);
  assert.notDeepEqual(r.sun.position.toArray(), before[0]);
  r.coastSky.update('canyon', 'track', 'high', false);
  assert.ok(r.sky.material.visible && !r.dome.visible);
  assert.deepEqual([r.sun.position.toArray(), r.sun.scale.toArray(), r.sun.material.color.toArray()], before, 'Canyon shows the same disc as before');
  assert.equal(r.dataset.coastSky, 'procedural');
  r.coastSky.update('coast', 'dusk', 'high', false);
  assert.ok(r.dome.visible, 'back on Coast: the loaded texture is reused');
  assert.equal(r.loads.length, 1);
  let disposed = 0; r.dome.material.map.addEventListener('dispose', () => disposed++);
  r.coastSky.dispose();
  assert.equal(disposed, 1);
  assert.ok(r.sky.material.visible && r.sky.children.length === 0);
  assert.deepEqual(r.sun.position.toArray(), before[0]);
});

test('a failed load keeps the procedural sky and says so', async () => {
  const r = rig({ fail: true }), warn = console.warn; console.warn = () => {};
  try {
    r.coastSky.update('coast', 'day', 'high', false); await r.land();
    r.coastSky.update('coast', 'day', 'high', false);
    assert.ok(r.sky.material.visible && !r.dome.visible);
    assert.equal(r.dataset.coastSky, 'fallback:day');
    assert.equal(r.loads.length, 1, 'no retry storm per frame');
  } finally { console.warn = warn; }
});
