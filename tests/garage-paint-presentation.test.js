import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { PAINTS } from '../src/appearance.ts';
import { createGarageStage } from '../src/garage-stage.ts';
import { createGaragePaintSweep } from '../src/garage-paint-shader.ts';
const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('all native 3x car-paint image assets are present and reusable by 1x UI cards', () => {
  const vue = read('GaragePanel.vue'), preview = read('GaragePaintPreview.vue');
  assert.match(vue, /GaragePaintPreview :id="id" :color="paint.paint"/);
  assert.match(preview, /<img/);
  assert.match(preview, /garage-paint-image/);
  assert.match(preview, /@3x\.webp/);
  assert.match(preview, /width="960"/);
  assert.match(preview, /height="510"/);
  assert.match(vue, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  for (const id of Object.keys(PAINTS)) {
    const path = new URL('../public/feature-assets/garage-vfx-skins/paint-cards/' + id + '@3x.webp', import.meta.url);
    assert.ok(existsSync(path), id + ' has an image');
    assert.ok(statSync(path).size > 10_000, id + ' is a substantive image, not a placeholder');
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('native image sweep follows Low/Medium/High, disabled VFX and reduced-motion preferences', () => {
  const preview = read('GaragePaintPreview.vue'), vfx = read('vfx-ui.ts');
  assert.match(vfx, /dataset.vfxQuality = visual.quality/);
  assert.match(vfx, /dataset.vfxEnabled = String\(visual.enabled\)/);
  for (const q of ['low', 'medium', 'high']) assert.ok(preview.includes('data-vfx-quality="' + q + '"'));
  assert.match(preview, /prefers-reduced-motion: reduce/);
  assert.match(preview, /garage-paint-sheen/);
  assert.doesNotMatch(preview, /<canvas|\.gif/i);
});

test('real 3D paint uses clearcoat material without extra car geometry, shader sweep disabled on Low and reduced motion', () => {
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  const car = stage.scene.children.find(child => child.userData.body);
  const body = car.userData.body, geometry = body.geometry, material = body.material;
  assert.ok(material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(material.clearcoat > 0.6, 'real clearcoat distinguishes the studio from a flat shader swatch');
  for (const paint of Object.values(PAINTS)) {
    stage.setPaint(paint);
    assert.equal(body.geometry, geometry);
    assert.equal(body.material, material);
    assert.equal(material.color.getHexString(), new THREE.Color(paint.paint).getHexString());
    assert.equal(material.metalness, paint.metalness);
    assert.equal(material.roughness, paint.roughness);
  }
  const shader = createGaragePaintSweep(new THREE.MeshPhysicalMaterial());
  shader.update(1, 'low', true, false);
  assert.equal(shader.uniforms.strength.value, 0);
  shader.update(2, 'medium', true, false);
  assert.ok(shader.uniforms.strength.value > 0);
  shader.update(3, 'high', true, false);
  assert.ok(shader.uniforms.strength.value > 0.1);
  shader.update(4, 'high', true, true);
  assert.equal(shader.uniforms.strength.value, 0);
  shader.update(5, 'high', false, false);
  assert.equal(shader.uniforms.strength.value, 0);
  assert.equal(shader.uniforms.sweep.value, 0, 'disabled motion resets sweep time');
  stage.dispose();
});

test('sweep modifies the 3D body fragment shader, not only a CSS overlay', () => {
  const material = new THREE.MeshPhysicalMaterial();
  const driver = createGaragePaintSweep(material);
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.garagePaintSweep, driver.uniforms.sweep);
  assert.match(shader.vertexShader, /vGaragePaintPosition/);
  assert.match(shader.fragmentShader, /garagePaintStrength/);
  assert.match(shader.fragmentShader, /exp\(/);
});
