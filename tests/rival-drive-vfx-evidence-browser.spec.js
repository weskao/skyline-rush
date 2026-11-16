import fs from 'node:fs';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';
import { pausedRace } from './helpers/traffic-browser.js';
import { onTier, serveBefore, stage } from './helpers/rival-drive-browser.js';

// Evidence for the rival drive cues (src/rival-drive-vfx.ts), never in the gate (machine-specific captures and timings
// stay in the gitignored audits dir); BEFORE=<git ref> serves that ref's module:
//   RIVAL_VFX_EVIDENCE=<label> [BEFORE=<ref>] npx playwright test tests/rival-drive-vfx-evidence-browser.spec.js
const LABEL = process.env.RIVAL_VFX_EVIDENCE, OUT = 'docs/designs/3d-pipeline/audits/rival-drive-vfx';
const VIEWPORTS = { desktop: [{ width: 1440, height: 900 }, false], portrait: [{ width: 390, height: 844 }, true], landscape: [{ width: 844, height: 390 }, true] };

test.skip(!process.env.RIVAL_VFX_EVIDENCE, 'run with RIVAL_VFX_EVIDENCE=<label>');

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
