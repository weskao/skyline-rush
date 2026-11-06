import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// 3D pipeline Phase 1: same-settings renderer baseline (screenshots + renderer stats + ?perf frame time) so the
// r186 upgrade is compared against r180 instead of remembered. Runs only via THREE_BASELINE=1, never in the gate:
//   THREE_BASELINE=1 LABEL=r180 [VIEWPORT=desktop] npx playwright test tests/three-baseline-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings); the public evidence doc keeps only tables.
const LABEL = process.env.LABEL ?? 'baseline', VIEW = process.env.VIEWPORT ?? 'phone', SECONDS = +(process.env.RACE_SECONDS ?? 6);
const OUT = `docs/designs/3d-pipeline/audits/baseline/${LABEL}-${VIEW}`;
const TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const EFFECT_TRACKS = ['coast', 'spiral']; // NITRO + FLY/landing shots; every track still gets a road shot

test.skip(!process.env.THREE_BASELINE, 'run with THREE_BASELINE=1');
test.use(VIEW === 'desktop' ? { viewport: { width: 1440, height: 900 } }
  : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

test(`${LABEL} ${VIEW}: renderer baseline across Garage and all ten tracks`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout((SECONDS + 40) * 1000 * (TRACKS.length + 1));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const stats = () => page.evaluate(() => {
    const { renderer } = window.gameScene, { render, memory, programs } = renderer.info;
    return { drawCalls: render.calls, triangles: render.triangles, textures: memory.textures, geometries: memory.geometries, programs: programs.length };
  });
  const shot = (name, locator = page) => locator.screenshot({ path: `${OUT}/${name}.png` });
  const open = async () => {
    await page.evaluate(ids => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off'], ['unlocked', JSON.stringify(ids)]]) localStorage.setItem(`skyline-rush-${key}`, value);
    }, TRACKS);
    await page.goto(`${gameplayURL}?perf`);
    for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  };

  await open();
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
  await page.waitForTimeout(1500); // idle-camera settle
  await shot('garage', page.locator('#garage-preview #world'));
  const preview = page.locator('#garage-preview');
  const previewStats = await preview.evaluate(node => ({ drawCalls: +node.dataset.drawCalls, triangles: +node.dataset.triangles }));
  expect(previewStats.drawCalls).toBeGreaterThan(0);
  expect(previewStats.triangles).toBeGreaterThan(0);
  rows.push({ scenario: 'garage', ...await stats(), ...previewStats });
  expect(rows[0]).toMatchObject(previewStats);

  for (const track of TRACKS) {
    await open();
    await page.locator(`[data-track="${track}"]`).click();
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(SECONDS * 1000);
    const overlay = page.locator('#perf-overlay');
    const [p50, p95, fps] = ((await overlay.textContent()).match(/p50 ([\d.]+) ms · p95 ([\d.]+) ms · ([\d.]+) fps/) ?? []).slice(1).map(Number);
    await shot(`${track}-road`);
    rows.push({ scenario: `${track}-road`, p50, p95, fps, ...await stats() });
    if (EFFECT_TRACKS.includes(track)) {
      await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
      await page.waitForTimeout(800);
      await shot(`${track}-nitro`);
      rows.push({ scenario: `${track}-nitro`, ...await stats() });
      await page.evaluate(() => { document.activeElement?.blur(); window.gameplay.race.player.speed = 90; });
      await page.keyboard.down('Space');
      await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(.5);
      await shot(`${track}-fly`);
      rows.push({ scenario: `${track}-fly`, ...await stats() });
      await page.keyboard.up('Space');
      await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude), { timeout: ciTimeout(15000) }).toBe(0);
      await shot(`${track}-landed`);
      rows.push({ scenario: `${track}-landed`, ...await stats() });
    }
    await page.keyboard.up('KeyW');
  }
  console.table(rows);
  const three = JSON.parse(fs.readFileSync('node_modules/three/package.json', 'utf8')).version;
  fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify({ label: LABEL, viewport: VIEW, seconds: SECONDS, three, rows }, null, 2));
  expect(errors).toEqual([]);
});

test(`${LABEL} ${VIEW}: Garage Studio paint and glass baseline`, async ({ gameplayPage: page, gameplayURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(gameplayURL);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const preview = page.locator('#garage-preview');
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
  for (const angle of ['front', 'side', 'rear']) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
    await page.waitForTimeout(ciTimeout(700)); // settle the camera before the comparison shot
    await page.locator('#garage-preview #world').screenshot({ path: `${OUT}/studio-${angle}.png` });
  }
  expect(errors).toEqual([]);
});
