import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { gpuName, openTier, sampleFrameCost } from './helpers/frame-cost.js';

// Sprint exhaust cost (.claude/rules/sprint-plume.md): GPU-synced frame time (helpers/frame-cost.js) during a held NITRO
// on Coast for Low, Medium and High in the default look. rAF times are vsync-held and cannot show a plume's overdraw.
// Runs only with PLUME_BENCH=1, never in the gate; compare a `before` and an `after` label on the same machine:
//   PLUME_BENCH=1 LABEL=<x> VIEWPORT=844x390|1440x900 npx playwright test tests/sprint-plume-cost-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings).
const LABEL = process.env.LABEL ?? 'bench', SIZE = process.env.VIEWPORT ?? '1440x900', [width, height] = SIZE.split('x').map(Number);
const OUT = 'docs/designs/3d-pipeline/audits/sprint-plume';

test.skip(!process.env.PLUME_BENCH, 'run with PLUME_BENCH=1');
test.use({ viewport: { width, height }, launchOptions: { args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] } });

test(`${LABEL} ${SIZE}: held NITRO frame cost per quality tier`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(300000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const tier of ['low', 'medium', 'high']) {
    await openTier(page, gameplayURL, { quality: tier }, ciTimeout);
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
    await page.keyboard.down('KeyW');
    // NITRO top speed in the centre lane, ghosted through traffic, re-seeded every frame until the sample ends.
    await page.evaluate(() => {
      window.holdNitro = true;
      (async () => { const player = window.gameplay.race.player; while (window.holdNitro) { Object.assign(player, { x: 0, speed: 118, nitroTime: 30 }); player.effects.ghost = 5; await new Promise(requestAnimationFrame); } })();
    });
    await page.waitForTimeout(ciTimeout(2000)); // the sprint share and the camera settle
    rows.push({ tier, ...await sampleFrameCost(page, 6000) });
    await page.evaluate(() => { window.holdNitro = false; });
    await page.keyboard.up('KeyW');
  }
  const gpu = await gpuName(page);
  console.table(rows);
  fs.writeFileSync(`${OUT}/${LABEL}-${SIZE}.json`, JSON.stringify({ label: LABEL, viewport: SIZE, gpu, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
