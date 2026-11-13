import test from 'node:test';
import assert from 'node:assert/strict';
import { Color, Euler, Vector3 } from 'three';
import { createCoastLook } from '../src/coast-look.ts';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { COAST_SUN_AZIMUTH, coastSkyYaw, coastSunDirection } from '../src/coast-sky.ts';
import { setLook3d } from '../src/look-gate.ts';

setLook3d(true); // the Phase 3 look (`?look=3d`); tests/look-gate.test.js covers the develop look without it

function rig() {
  const room = { id: 'room' }, textures = {}, loads = [];
  const envs = {
    get: name => textures[name],
    preload: names => { loads.push(...names); for (const n of names) textures[n] = { id: n }; return Promise.resolve(); },
  };
  const scene = { environment: room, environmentIntensity: 0.42 };
  const renderer = { toneMappingExposure: 1.12 };
  const lens = { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } } };
  const look = createCoastLook({ scene, renderer, lens, room, roomIntensity: 0.42, envs });
  return { room, scene, renderer, lens, loads, look };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Coast Medium+ swaps in the HDRI environment, exposure and grade once it is loaded', async () => {
  const { scene, renderer, lens, loads, look } = rig();
  look.update('coast', 'rain', 'high');
  await settle();
  const v = COAST_ENV_VARIANTS.rain;
  assert.deepEqual(loads, ['rain']);
  assert.equal(scene.environment.id, 'rain');
  assert.equal(scene.environmentIntensity, v.intensity);
  assert.equal(renderer.toneMappingExposure, v.exposure);
  assert.equal(lens.uniforms.saturation.value, v.grade.saturation);
  assert.equal(lens.uniforms.contrast.value, v.grade.contrast);
  assert.deepEqual(lens.uniforms.tint.value.toArray().map(x => +x.toFixed(2)), [...v.grade.tint]);
});

test('an unchanged key does no work per frame', async () => {
  const { loads, look } = rig();
  look.update('coast', 'day', 'high'); await settle();
  look.update('coast', 'day', 'high'); look.update('coast', 'day', 'high');
  assert.equal(loads.length, 1);
});

test('Low and non-Coast tracks keep RoomEnvironment and an identity grade; leaving Coast restores both', async () => {
  const { room, scene, lens, loads, look } = rig();
  look.update('coast', 'track', 'low');
  assert.equal(scene.environment, room);
  assert.deepEqual(loads, []);
  look.update('coast', 'track', 'high'); await settle();
  assert.equal(scene.environment.id, 'day');
  look.update('neon', 'track', 'high');
  assert.equal(scene.environment, room);
  assert.equal(scene.environmentIntensity, 0.42);
  assert.equal(lens.uniforms.saturation.value, 1);
  assert.equal(lens.uniforms.contrast.value, 1);
  assert.deepEqual(lens.uniforms.tint.value.toArray(), [1, 1, 1]);
});

test('a slow load never overrides a newer track or preset', async () => {
  const room = {}, textures = {}, releases = [];
  const envs = { get: n => textures[n], preload: names => new Promise(resolve => releases.push(() => { for (const n of names) textures[n] = { id: n }; resolve(); })) };
  const scene = { environment: room, environmentIntensity: 0.42 };
  const look = createCoastLook({ scene, renderer: { toneMappingExposure: 1 }, lens: { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color() } } }, room, roomIntensity: 0.42, envs });
  look.update('coast', 'day', 'high');
  look.update('neon', 'track', 'high');
  releases[0](); await settle();
  assert.equal(scene.environment, room, 'the stale day load must not land on neon');
});

test('a failed load leaves the current environment in place', async () => {
  const room = {};
  const envs = { get: () => undefined, preload: () => Promise.resolve() };
  const scene = { environment: room, environmentIntensity: 0.42 };
  const look = createCoastLook({ scene, renderer: { toneMappingExposure: 1.07 }, lens: { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color() } } }, room, roomIntensity: 0.42, envs });
  look.update('coast', 'day', 'high'); await settle();
  assert.equal(scene.environment, room);
});

test('world.js drives the look from the race visual preset and tier, and disposes it', async () => {
  const { readFileSync } = await import('node:fs');
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createCoastLook\(\{[^}]*lens[^}]*room: environment\.texture/);
  assert.match(world, /coastLook\.update\(trackId, visualPreset, visual\.quality\)/);
  assert.match(world, /coastLook\.dispose\(\)/);
});

test('Coast Medium+ tunes bloom for the light blades and matches the sun to the HDRI; leaving Coast restores both', async () => {
  const room = { id: 'room' }, textures = {};
  const envs = { get: n => textures[n], preload: names => { for (const n of names) textures[n] = { id: n }; return Promise.resolve(); } };
  const scene = { environment: room, environmentIntensity: 0.42 }, renderer = { toneMappingExposure: 1.12 };
  const lens = { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } } };
  const sun = { color: new Color('#ffb88a'), intensity: 1.8 }; // world.js set Coast's palette sun
  const look = createCoastLook({ scene, renderer, lens, room, roomIntensity: 0.42, envs, sun });
  assert.equal(look.bloomStrength(0.3), 0.3, 'before the HDRI lands world.js keeps its own bloom');
  look.update('coast', 'rain', 'high'); await settle();
  const v = COAST_ENV_VARIANTS.rain;
  assert.equal(look.bloomStrength(0.3), v.bloom.strength, 'world.js adds boost feedback on top of the variant strength');
  assert.equal(look.bloomThreshold(1.1), v.bloom.threshold);
  assert.equal(sun.color.getHexString(), new Color(v.sun.color).getHexString());
  assert.equal(sun.intensity, v.sun.intensity);
  look.update('coast', 'rain', 'low');
  assert.deepEqual([look.bloomThreshold(1.1), sun.intensity, sun.color.getHexString()], [1.1, 1.8, 'ffb88a'], 'Coast Low: the palette sun and bloom come back');
  assert.equal(look.bloomStrength(0.3), 0.3);
  look.update('coast', 'dusk', 'high'); await settle();
  sun.color.set('#9fb4ff'); sun.intensity = 0.8; // world.js track block: Neon's palette, set before coastLook.update
  look.update('neon', 'track', 'high');
  assert.deepEqual([look.bloomThreshold(1.1), sun.intensity, sun.color.getHexString()], [1.1, 0.8, '9fb4ff'], 'another track keeps the sun its block just set');
});

test('the key light and the environment turn with the sky dome to the HDRI sun; Coast Low and other tracks get them back', async () => {
  const room = { id: 'room' }, textures = {};
  const envs = { get: n => textures[n], preload: names => { for (const n of names) textures[n] = { id: n }; return Promise.resolve(); } };
  const scene = { environment: room, environmentIntensity: 0.42, environmentRotation: new Euler() };
  const lens = { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } } };
  const sun = { color: new Color('#ffb88a'), intensity: 1.8, position: new Vector3(-170, 100, -190) }; // upcoming-lighting.ts
  const look = createCoastLook({ scene, renderer: { toneMappingExposure: 1.12 }, lens, room, roomIntensity: 0.42, envs, sun });
  for (const name of ['dusk', 'day']) {
    look.update('coast', name, 'high'); await settle();
    assert.ok(sun.position.clone().normalize().distanceTo(coastSunDirection(name)) < 1e-6, `${name}: the light shines from the HDRI sun`);
    assert.ok(Math.abs(Math.atan2(sun.position.z, sun.position.x) - COAST_SUN_AZIMUTH) < 1e-6);
    assert.ok(Math.abs(sun.position.length() - Math.hypot(170, 100, 190)) < 1e-6, 'same distance: only the direction changes');
    assert.equal(scene.environmentRotation.y, coastSkyYaw(name), 'reflections and image-based light turn with the dome');
  }
  look.update('coast', 'dusk', 'low');
  assert.deepEqual([sun.position.toArray(), scene.environmentRotation.y], [[-170, 100, -190], 0], 'Coast Low: the palette light and the unturned room');
  look.update('coast', 'rain', 'high'); await settle();
  sun.position.set(-400, 230, 260); // world.js track block: a World Tour sun, set before coastLook.update
  look.update('coastal', 'track', 'high');
  assert.deepEqual([sun.position.toArray(), scene.environmentRotation.y], [[-400, 230, 260], 0], 'another track keeps its own light; no room is left turned');
});
