import test from 'node:test';
import assert from 'node:assert/strict';
import { Color } from 'three';
import { createCoastLook } from '../src/coast-look.ts';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';

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
