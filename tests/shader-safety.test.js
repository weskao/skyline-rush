import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry } from 'three';
import { createEffects } from '../src/effects.js';
import { createAeroVFX } from '../src/aero-vfx.js';

// GLSL pow(x, y) is undefined for x < 0; interpolated varyings overshoot [0,1] by an ulp at triangle edges,
// and the resulting NaN pixel is spread by the bloom blur into a full black frame.
test('every VFX shader clamps pow() bases so edge pixels cannot produce NaN black frames', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  createEffects(scene, () => 0);
  createAeroVFX(scene, vehicle);
  const shaders = new Set();
  scene.traverse(object => { if (object.material?.isShaderMaterial) shaders.add(object.material.fragmentShader); });
  assert.ok(shaders.size >= 5);
  const unguarded = [...shaders].flatMap(source => source.split(/\bpow\(/).slice(1)).filter(arg => !/^(max\(0\.,|clamp\()/.test(arg));
  assert.deepEqual(unguarded.map(arg => `pow(${arg.slice(0, 30)}`), []);
});
