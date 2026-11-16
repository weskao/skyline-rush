import { expect } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';
import { pausedRace } from './helpers/traffic-browser.js';
import { RIVAL_CUE_RANGE } from '../src/rival-cues.ts';

// Rival NITRO/BOOST drive cues (src/rival-drive-vfx.ts) in the real race scene. Evidence (machine-specific captures and
// timings stay in the gitignored audits dir), with BEFORE=<git ref> serving that ref's rival-drive-vfx.ts:
//   RIVAL_VFX_EVIDENCE=<label> [BEFORE=<ref>] npx playwright test tests/rival-drive-vfx-browser.spec.js
const LABEL = process.env.RIVAL_VFX_EVIDENCE, OUT = 'docs/designs/3d-pipeline/audits/rival-drive-vfx';
const VIEWPORTS = { desktop: [{ width: 1440, height: 900 }, false], portrait: [{ width: 390, height: 844 }, true], landscape: [{ width: 844, height: 390 }, true] };

const onTier = (page, quality) => page.addInitScript(quality => // after pausedRace's High seed: init scripts run on its goto
  localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality, preset: 'cinematic', enabled: true })), quality);

// The old module's body under the current module's Vite-resolved imports (the old file imports a subset of them).
const serveBefore = async page => {
  if (!process.env.BEFORE) return;
  const old = ts.transpileModule(execFileSync('git', ['show', `${process.env.BEFORE}:src/rival-drive-vfx.ts`], { encoding: 'utf8' }),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  await page.route(url => url.pathname === '/src/rival-drive-vfx.ts', async route => {
    const response = await route.fetch(), imports = (await response.text()).split('\n').filter(line => line.startsWith('import '));
    await route.fulfill({ response, body: [...imports, ...old.split('\n').filter(line => !line.startsWith('import '))].join('\n') });
  });
};

// Rival 0 on BOOST and rival 1 on NITRO just ahead of the paused player, rival 2 on BOOST beyond the cue range,
// the rest out of view; resolves with each rival's flame after two drawn frames.
const stage = (page, allBoost = false) => page.evaluate(async ([range, allBoost]) => {
  const { player, rivals } = window.gameplay.race;
  rivals.forEach((rival, i) => {
    const near = allBoost || i < 2;
    rival.distance = player.distance + (near ? 16 + i * 6 : i === 2 ? range + 40 : 5000);
    rival.x = allBoost ? (i % 3 - 1) * 3 : i === 0 ? -2.6 : 2.6;
    rival.boosting = allBoost || i !== 1; rival.nitroTime = !allBoost && i === 1 ? 5 : 0;
  });
  for (let f = 0; f < 3; f++) await new Promise(requestAnimationFrame);
  return window.gameScene.scene.children.filter(o => o.userData.driveCue).map(o => {
    const { flame, trail } = o.userData.driveCue;
    return { flame: flame.visible, scale: flame.scale.x, opacity: flame.material.opacity, trail: trail.visible };
  });
}, [RIVAL_CUE_RANGE, allBoost]);

test.describe('rival drive cues', () => {
  test.skip(!!LABEL, 'evidence run');
  test('High: BOOST draws a smaller, dimmer NITRO flame near the player, none beyond the cue range', async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(90000));
    await serveBefore(page);
    await pausedRace(page, gameplayURL, 'coast');
    const [boost, nitro, far] = await stage(page);
    expect(nitro).toMatchObject({ flame: true, trail: true });
    expect(boost).toMatchObject({ flame: true, trail: false });
    expect(boost.scale).toBeLessThan(nitro.scale * 0.8);
    expect(boost.opacity).toBeLessThan(nitro.opacity);
    expect(far.flame).toBe(false);
  });
  test('Low: BOOST keeps the tail light only, no flame', async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(90000));
    await serveBefore(page);
    await onTier(page, 'low');
    await pausedRace(page, gameplayURL, 'coast');
    const [boost, nitro] = await stage(page);
    expect(boost.flame).toBe(false); expect(nitro.flame).toBe(false);
  });
});

test.describe('evidence', () => {
  test.skip(!LABEL, 'run with RIVAL_VFX_EVIDENCE=<label>');
  for (const [name, [viewport, hasTouch]] of Object.entries(VIEWPORTS)) for (const quality of ['low', 'high']) test.describe(`${name} ${quality}`, () => {
    test.use({ viewport, hasTouch });
    test('capture: one rival on BOOST, one on NITRO', async ({ gameplayPage: page, gameplayURL }) => {
      test.setTimeout(ciTimeout(120000));
      await serveBefore(page);
      await onTier(page, quality);
      await pausedRace(page, gameplayURL, 'coast');
      await stage(page);
      await page.evaluate(() => { document.querySelector('#race-overlay').style.visibility = 'hidden'; });
      fs.mkdirSync(OUT, { recursive: true });
      await page.locator('#world').screenshot({ path: `${OUT}/${LABEL}-${name}-${quality}.png` });
    });
  });
  for (const quality of ['low', 'high']) test(`frame cost: every rival on BOOST, ${quality}`, async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(120000));
    await serveBefore(page);
    await onTier(page, quality);
    await pausedRace(page, gameplayURL, 'coast');
    await stage(page, true);
    const rows = [];
    for (let i = 0; i < 3; i++) rows.push(await sampleFrameCost(page, 3000));
    const result = { label: LABEL, quality, gpu: await gpuName(page), rows };
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(`${OUT}/${LABEL}-frame-cost-${quality}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  });
});
