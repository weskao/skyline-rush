import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { plumeLook, sprayRate, thrusterGlow } from '../src/board-effects.ts';
import { coastEnvPlan } from '../src/coast-lighting.ts';
import { createContactShadow } from '../src/contact-shadow.ts';
import { createSprintVfx } from '../src/vfx-settings.ts';

function shadowCanvas(t) {
  const stops = [];
  const context = { createRadialGradient: () => ({ addColorStop: (at, color) => stops.push([at, color]) }), fillRect() {}, fillStyle: null };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  t.after(() => { delete globalThis.document; });
  return stops;
}
const sprintBlur = ultra => {
  const input = { phase: 'racing', nitro: true, boost: false, speed: 110, cap: 110, dt: 0.3, enabled: true, quality: 'high', reducedMotion: false, ultra };
  const vfx = createSprintVfx(); for (let i = 0; i < 3; i++) vfx.update(input);
  return vfx.update(input).blur;
};

test('Low keeps the lightweight track lighting, effects and shadow by default', t => {
  assert.deepEqual(plumeLook('low'), { tail: 0, stretch: 1 });
  assert.equal(thrusterGlow('low', true, true, 1), 0);
  assert.equal(sprayRate('low', 90), 0);
  assert.deepEqual(coastEnvPlan('coast', 'track', 'low'), { kind: 'room' });
  const stops = shadowCanvas(t), { shadow, update } = createContactShadow(new THREE.Scene());
  update(0, 'low');
  assert.equal(shadow.material.opacity, 0.6);
  assert.equal(shadow.geometry.parameters.width * shadow.scale.x, 5);
  assert.equal(shadow.geometry.parameters.height * shadow.scale.y, 8);
  assert.deepEqual(stops.slice(-2), [[0, 'rgba(0,0,0,0.8)'], [1, 'rgba(0,0,0,0)']]);
  update(0, 'medium');
  assert.equal(shadow.material.opacity, 0.75);
  assert.equal(shadow.geometry.parameters.width * shadow.scale.x, 3);
  assert.equal(shadow.geometry.parameters.height * shadow.scale.y, 5.8);
});

test('Medium and High choose the detailed rendering on a plain link', () => {
  for (const [quality, spray] of [['medium', 24], ['high', 48]]) {
    assert.deepEqual(plumeLook(quality), { tail: 1, stretch: 1.35 });
    assert.ok(thrusterGlow(quality, true, true, 0) > 0);
    assert.equal(sprayRate(quality, 90), spray);
    assert.deepEqual(coastEnvPlan('coast', 'track', quality), { kind: 'hdri', variant: 'day' });
    assert.deepEqual(coastEnvPlan('neon', 'track', quality), { kind: 'hdri', variant: 'nightRain' });
  }
});

test('Ultra adds lens blur on a plain link', () => {
  assert.ok(sprintBlur(true) > sprintBlur(false));
});
