import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { SPRINT_TIERS, sprintTier } from '../src/sprint-tier.ts';
import { GARAGE_SKINS, skinAccentHue } from '../src/garage-skin-catalog.ts';
import { DRIFT_TRAIL_STYLES, driftTrailIndex } from '../src/garage-drift-styles.ts';
import { garagePreset } from '../src/garage-camera.ts';

const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('the Garage preview offers every sprint tier above idle, in ladder order', async () => {
  const { PREVIEW_TIERS } = await import('../src/garage-preview-tier.ts');
  const ladder = Object.entries(SPRINT_TIERS).filter(([, row]) => row.level > 0)
    .sort((a, b) => a[1].level - b[1].level).map(([id]) => id);
  assert.deepEqual([...PREVIEW_TIERS], ladder);
});

test('each preview tier drives the inputs the shared ladder maps back to that tier', async () => {
  const { PREVIEW_TIERS, previewTierInputs, setGaragePreviewTier, garagePreviewTier } = await import('../src/garage-preview-tier.ts');
  const initial = garagePreviewTier();
  // Studio showed NITRO with BOOST before the control existed: that stays the first thing a player sees.
  assert.equal(initial, PREVIEW_TIERS.at(-1));
  try {
    for (const id of PREVIEW_TIERS) {
      setGaragePreviewTier(id);
      assert.equal(garagePreviewTier(), id);
      const { nitro, boost } = previewTierInputs();
      assert.equal(sprintTier(nitro, boost), id);
    }
    setGaragePreviewTier('idle');
    assert.equal(garagePreviewTier(), PREVIEW_TIERS.at(-1), 'idle shows no thruster: not a preview tier');
  } finally { setGaragePreviewTier(initial); }
});

test('the preview tier names no tier of its own: a new ladder row needs no edit here', () => {
  assert.doesNotMatch(source('garage-preview-tier.ts'), /['"](?:idle|boost|nitro|nitro-boost)['"]/);
  assert.doesNotMatch(source('garage-stage.ts'), /boosting:\s*true|nitroTime:\s*1\b/, 'the Studio driver follows the selected tier');
});

test('the Studio car burns the selected tier: BOOST without NITRO, NITRO with it', async () => {
  const { createGarageStage } = await import('../src/garage-stage.ts');
  const { setGaragePreviewTier, garagePreviewTier } = await import('../src/garage-preview-tier.ts');
  const initial = garagePreviewTier();
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 100);
  const nitro = [];
  stage.scene.traverse(object => { if (object.material?.uniforms?.nitroMix) nitro.push(object.material.uniforms.nitroMix); });
  assert.ok(nitro.length > 0);
  const burn = (id, time) => {
    setGaragePreviewTier(id);
    stage.update(camera, garagePreset('rear'), time, false);
    return Math.max(...nitro.map(uniform => uniform.value));
  };
  try {
    assert.equal(burn('boost', 1), 0);
    assert.equal(burn('nitro', 1.05), 1);
    assert.equal(burn('nitro-boost', 1.1), 1);
    assert.equal(burn('boost', 1.15), 0);
  } finally { setGaragePreviewTier(initial); stage.dispose(); }
});

test('a Garage skin is one catalog row: its card colour is a field of that row', () => {
  for (const skin of GARAGE_SKINS) {
    const hue = skin.category === 'drift-trail' ? DRIFT_TRAIL_STYLES[driftTrailIndex(skin.id)].hue : skin.hue;
    assert.equal(skinAccentHue(skin.id), hue, skin.id);
  }
  assert.doesNotMatch(source('garage-skin-catalog.ts'), /Record<SkinId, number>/, 'no second per-id colour table');
  // The cards and the tier control are data-driven: none of them names one thruster.
  for (const file of ['GarageSkinCatalog.vue', 'GarageSkinCardFace.vue', 'GaragePreviewTier.vue'])
    assert.doesNotMatch(source(file), /thruster-(?:basic|ion|plasma|void)/, file);
});
