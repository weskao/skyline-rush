import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, Texture } from 'three';
import { createNitroFlame, FLAME_CYCLES, NITRO_FLAME_PATH, nitroFlame } from '../src/nitro-flame-texture.ts';

// Guards the loader half of the shared contract in docs/designs/nitro-flame/DESIGN.md: a texture at once (neutral 1 x 1
// until the image arrives), tiling, mipmaps, linear data, and one home for the path.
function tiles(texture, name) {
  assert.equal(texture.wrapS, RepeatWrapping, `${name} wraps around the tube`);
  assert.equal(texture.wrapT, RepeatWrapping, `${name} tiles along the flow`);
  assert.equal(texture.minFilter, LinearMipmapLinearFilter, `${name} is mipmapped`);
  assert.equal(texture.magFilter, LinearFilter, name);
  assert.equal(texture.generateMipmaps, true, name);
  assert.equal(texture.colorSpace, NoColorSpace, `${name} is data, not colour`);
}

test('the flame texture is a neutral 1 x 1 at once, so a trail drawn before or without the image is not broken', () => {
  const { uniform } = createNitroFlame(() => {}, '/');
  assert.ok(uniform.value.isDataTexture);
  assert.deepEqual([uniform.value.image.width, uniform.value.image.height], [1, 1]);
  assert.deepEqual([...uniform.value.image.data].slice(0, 3), [128, 128, 128]);
  tiles(uniform.value, 'the fallback');
});

test('the image is requested once, from the base URL, and replaces the fallback in the same uniform', () => {
  const calls = [], image = new Texture();
  const flame = createNitroFlame((url, onLoad) => calls.push({ url, onLoad }), '/skyline-rush/'), uniform = flame.uniform;
  assert.equal(calls.length, 0, 'nothing is fetched until a trail asks');
  flame.request(); flame.request();
  assert.deepEqual(calls.map(call => call.url), [`/skyline-rush/${NITRO_FLAME_PATH}`]);
  assert.ok(uniform.value.isDataTexture, 'the fallback stays until the image arrives');
  calls[0].onLoad(image);
  assert.equal(flame.uniform, uniform, 'materials keep their uniform: a value swap, no new program');
  assert.equal(uniform.value, image);
  tiles(image, 'the image');
});

test('a load that never answers, or no browser at all, keeps the fallback', () => {
  const stuck = createNitroFlame(() => {}, '/');
  stuck.request();
  assert.ok(stuck.uniform.value.isDataTexture);
  nitroFlame.request(); // node: no document, no loader
  assert.ok(nitroFlame.uniform.value.isDataTexture);
});

test('the shader accounts for at most this many light-dark cycles along the flow per channel', () => {
  assert.deepEqual(Object.keys(FLAME_CYCLES).sort(), ['b', 'g', 'r']);
  for (const [channel, cycles] of Object.entries(FLAME_CYCLES)) assert.ok(cycles >= 1, channel);
});

test('one home for the texture: only the loader names its path, only the unlocked trail imports the loader', () => {
  const sources = fs.readdirSync('src', { recursive: true }).filter(file => /\.(js|ts|vue)$/.test(file)).map(file => file.replaceAll('\\', '/'));
  const holding = pattern => sources.filter(file => pattern.test(fs.readFileSync(`src/${file}`, 'utf8')));
  assert.match(NITRO_FLAME_PATH, /^feature-assets\/garage-vfx-skins\/nitro-flame\/flame-noise\.png$/, 'inside the tree the locked build removes');
  assert.deepEqual(holding(/nitro-flame\/|flame-noise/), ['nitro-flame-texture.ts']);
  assert.deepEqual(holding(/nitro-flame-texture/), ['garage-nitro-trail.js'], 'the locked bundle never references the texture');
});
