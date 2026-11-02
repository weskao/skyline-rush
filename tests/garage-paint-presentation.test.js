import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { PAINTS } from '../src/appearance.ts';
import { createGarageStage } from '../src/garage-stage.ts';
const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('six paint options render recognisable vehicle surfaces instead of tiny swatches', () => {
  const markup = read('GaragePanel.vue'), preview = read('GaragePaintPreview.vue');
  assert.match(markup, /GaragePaintPreview :id="id" :color="paint.paint"/);
  assert.match(preview, /class="paint-car-shell"/);
  assert.match(preview, /min-height: 92px/);
  assert.doesNotMatch(markup, /<i :style="\{ backgroundColor: paint.paint \}"/);
  assert.match(markup, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('paint animation respects existing quality, disabled VFX and reduced-motion', () => {
  const preview = read('GaragePaintPreview.vue'), vfx = read('vfx-ui.ts');
  assert.match(vfx, /dataset.vfxQuality = visual.quality/);
  assert.match(vfx, /dataset.vfxEnabled = String\(visual.enabled\)/);
  assert.match(preview, /body\[data-vfx-quality="medium"\]/);
  assert.match(preview, /body\[data-vfx-quality="high"\]/);
  assert.match(preview, /body\[data-vfx-quality="low"\]/);
  assert.match(preview, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(preview, /<canvas|\.gif/i);
});

test('each real 3D Garage paint applies its own gloss without changing car geometry', () => {
  const stage = createGarageStage(new THREE.Texture());
  const car = stage.scene.children.find(child => child.userData.body);
  const body = car.userData.body, geometry = body.geometry, material = body.material;
  for (const paint of Object.values(PAINTS)) {
    stage.setPaint(paint);
    assert.equal(body.material, material);
    assert.equal(body.geometry, geometry);
    assert.equal(material.color.getHexString(), new THREE.Color(paint.paint).getHexString());
    assert.equal(material.metalness, paint.metalness);
    assert.equal(material.roughness, paint.roughness);
  }
  stage.dispose();
});
