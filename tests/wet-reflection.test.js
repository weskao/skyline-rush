import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { REFLECT_LAYER, createWetReflection, isLightSource, wetReflectionStrength } from '../src/wet-reflection.ts';

test('the lights-only reflection runs on High and Ultra when the road is wet, never on Medium, Low or dry', () => {
  assert.ok(wetReflectionStrength('high', 'rain') > 0);
  assert.ok(wetReflectionStrength('high', 'dusk') > 0);
  assert.ok(wetReflectionStrength('high', 'rain') > wetReflectionStrength('high', 'dusk'), 'rain soaks more than dusk');
  for (const [quality, preset] of [['medium', 'rain'], ['low', 'rain'], ['high', 'day'], ['high', 'track']])
    assert.equal(wetReflectionStrength(quality, preset), 0, `${quality} ${preset}`);
});

test('light sources are opaque unlit meshes: lamps, rail lights, windows, tail lights, the sun', () => {
  const mesh = material => new THREE.Mesh(new THREE.BoxGeometry(), material);
  assert.equal(isLightSource(mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 1.2, 1.7) }))), true);
  assert.equal(isLightSource(new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 4)), true);
  assert.equal(isLightSource(mesh(new THREE.MeshBasicMaterial({ transparent: true, opacity: .3 }))), false, 'ghosts and decals stay out');
  assert.equal(isLightSource(mesh(new THREE.MeshStandardMaterial())), false, 'lit surfaces come from the env map');
  assert.equal(isLightSource(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial())), false);
});

function fakeRenderer() {
  const calls = [];
  let target = 'scene-target';
  return {
    calls,
    getRenderTarget: () => target,
    setRenderTarget(next) { target = next; calls.push(['target', next]); },
    render(scene, camera) { calls.push(['render', camera.layers.mask, scene.background]); },
    clear() { calls.push(['clear']); },
    getDrawingBufferSize: v => v.set(1440, 900),
    autoClear: true, xr: { enabled: false }, shadowMap: { autoUpdate: true },
    state: { buffers: { depth: { setMask() {} } } },
  };
}

function chaseCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 3000);
  camera.position.set(0, 4, 9); camera.lookAt(0, 1, -20); camera.updateMatrixWorld();
  return camera;
}

test('the mirror pass renders only the light layer from below the road, into its own target, then restores', () => {
  const reflection = createWetReflection();
  const scene = new THREE.Scene(), background = new THREE.Color('#536879');
  scene.background = background;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  scene.add(lamp, body);
  reflection.tag(scene);
  assert.ok(lamp.layers.isEnabled(REFLECT_LAYER) && !body.layers.isEnabled(REFLECT_LAYER));

  const renderer = fakeRenderer(), camera = chaseCamera();
  reflection.setStrength(0.6);
  reflection.render(renderer, scene, camera, 0);
  const rendered = renderer.calls.find(c => c[0] === 'render');
  assert.equal(rendered[1], 1 << REFLECT_LAYER, 'lights only: the env map already reflects the sky and lit surfaces');
  assert.equal(rendered[2], null, 'black background: the pass adds light, never a sky colour');
  assert.equal(scene.background, background, 'background restored');
  assert.equal(renderer.getRenderTarget(), 'scene-target', 'main target restored');
  assert.equal(reflection.uniforms.reflectMap.value, reflection.target.texture);
  assert.deepEqual([reflection.target.width, reflection.target.height], [720, 450], 'half the drawing buffer');
  // A world point on the road projects inside the texture, mirrored lamp above it lands in the same column.
  const uv = new THREE.Vector4(0, 0, -20, 1).applyMatrix4(reflection.uniforms.reflectMatrix.value);
  assert.ok(Math.abs(uv.x / uv.w - 0.5) < 1e-6, `road centre maps to the texture centre column (${uv.x / uv.w})`);
  assert.ok(uv.y / uv.w > 0 && uv.y / uv.w < 1);
});

test('no pass at strength 0: Medium, dry presets and Low cost nothing', () => {
  const reflection = createWetReflection(), renderer = fakeRenderer();
  reflection.render(renderer, new THREE.Scene(), chaseCamera(), 0);
  assert.equal(renderer.calls.length, 0);
  assert.equal(reflection.uniforms.reflectStrength.value, 0);
});
