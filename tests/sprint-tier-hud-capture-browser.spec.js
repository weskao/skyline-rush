import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';

// Sprint-tier HUD evidence (docs/designs/sprint-tiers/DESIGN.md): real frames of BOOST, NITRO, NITRO with BOOST held
// and a x3 chain on a touch phone, plus what the HUD pass costs in each (updateUI in src/main.js, timed per call, and
// the browser's own style and layout time per second). Runs only with SPRINT_TIER_HUD_CAPTURE=1, never in the gate:
//   SPRINT_TIER_HUD_CAPTURE=1 [LABEL=before] PLAYWRIGHT_PORT=5245 npx playwright test tests/sprint-tier-hud-capture-browser.spec.js
// Output goes to $TMPDIR/sprint-tiers-captures/hud[/LABEL]: machine-specific, never committed.
const OUT = `${process.env.TMPDIR ?? os.tmpdir()}/sprint-tiers-captures/hud${process.env.LABEL ? `/${process.env.LABEL}` : ''}`.replace('//', '/');
const VIEWS = {
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
// Held BOOST is the Shift key (the touch button lights from the same input); NITRO and its chain are seeded.
const STEPS = [
  ['boost', { speed: 88, nitroTime: 0, nitroBurst: 0 }, true],
  ['nitro', { speed: 118, nitroTime: 30, nitroBurst: 1 }, false],
  ['nitro-boost', { speed: 118, nitroTime: 30, nitroBurst: 1 }, true],
  ['chain-x3', { speed: 118, nitroTime: 30, nitroBurst: 3 }, true],
];

test.skip(!process.env.SPRINT_TIER_HUD_CAPTURE, 'run with SPRINT_TIER_HUD_CAPTURE=1');
// The phone look, not the Low tier the suite starts on: Low turns the flames off.
test.use({ lowGraphics: false });
// File scope, so it also covers the gameplayPage fixture: a cold Vite load on a busy machine passed the 45 s default.
test.setTimeout(ciTimeout(240000));

async function race(page) {
  // Time the whole HUD pass where the frame loop calls it.
  await page.route(url => url.pathname === '/src/main.js', async route => {
    const response = await route.fetch();
    const source = await response.text(), anchor = 'function updateUI(now, input) {';
    if (!source.includes(anchor)) throw new Error('Missing updateUI anchor in main.js');
    await route.fulfill({ response, body: source
      .replace('let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };')
      .replace(anchor, 'function updateUI(now, input) { const t0 = performance.now(); try { return updateUITimed(now, input); } finally { window.hudCost?.push(performance.now() - t0); } }\nfunction updateUITimed(now, input) {') });
  });
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect(page.locator('#start-button')).toBeEnabled({ timeout: ciTimeout(90000) });
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(30000) });
  // Centre lane, ghosted, rivals behind, tank and NITRO kept full: only the sprint state differs between frames.
  await page.evaluate(() => {
    window.held = { speed: 88 };
    const tick = () => {
      const { player, rivals } = window.gameplay.race;
      Object.assign(player, { x: 0, fuel: 100, nitro: 3 }, window.held);
      player.effects.ghost = 5;
      // A busy machine stretches the four steps past the 5 km race: loop the middle of the course instead of finishing.
      if (player.distance > 3200) player.distance -= 2400;
      for (const rival of rivals) rival.distance = Math.min(rival.distance, player.distance - 80);
      requestAnimationFrame(tick);
    };
    tick();
  });
  await page.keyboard.down('w');
}

async function step(page, fields, boost) {
  await page.keyboard[boost ? 'down' : 'up']('Shift');
  await page.evaluate(held => { window.held = held; }, fields);
  await page.waitForTimeout(1200); // the flame's 0.3 s rise and the camera's sprint ease
}

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const p95 = values => [...values].sort((a, b) => a - b)[Math.floor(values.length * .95)] ?? 0;

for (const [view, device] of Object.entries(VIEWS)) for (const [locale, system] of [['en', 'en-US'], ['zh-TW', 'zh-TW']]) {
  test.describe(`${view} ${locale}`, () => {
    test.use({ ...device, locale: system });
    test('the four sprint steps', async ({ gameplayPage: page }) => {
      fs.mkdirSync(OUT, { recursive: true });
      const errors = [], cost = {};
      page.on('pageerror', error => errors.push(error.message));
      await race(page);
      const session = await page.context().newCDPSession(page);
      await session.send('Performance.enable');
      const metrics = async () => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
      for (const [name, fields, boost] of STEPS) {
        await step(page, fields, boost);
        await page.screenshot({ path: `${OUT}/${view}-${locale}-${name}.png` });
        const before = await metrics();
        const sample = await page.evaluate(async () => {
          window.hudCost = [];
          const frames = [], start = performance.now();
          let last = start;
          while (last - start < 3000) { const now = await new Promise(requestAnimationFrame); frames.push(now - last); last = now; }
          const hud = window.hudCost; window.hudCost = null;
          return { frames, hud, tier: document.body.dataset.sprintTier ?? null, chain: document.body.dataset.sprintChain ?? null,
            flightState: document.querySelector('#flight-state').textContent, nitroStatus: document.querySelector('#nitro-status').textContent,
            boostStatus: document.querySelector('#boost-status').textContent, speedCaption: document.querySelector('#speed-caption').textContent };
        });
        const after = await metrics();
        const perSecond = key => +(((after[key] - before[key]) / 3) * 1000).toFixed(2);
        cost[name] = {
          tier: sample.tier, chain: sample.chain, flightState: sample.flightState, nitroStatus: sample.nitroStatus, boostStatus: sample.boostStatus, speedCaption: sample.speedCaption,
          hudPassMs: { median: +median(sample.hud).toFixed(3), p95: +p95(sample.hud).toFixed(3), mean: +(sample.hud.reduce((a, b) => a + b, 0) / sample.hud.length).toFixed(3), calls: sample.hud.length },
          frameMs: { median: +median(sample.frames).toFixed(2), p95: +p95(sample.frames).toFixed(2) },
          styleMsPerSecond: perSecond('RecalcStyleDuration'), layoutMsPerSecond: perSecond('LayoutDuration'),
        };
      }
      await page.keyboard.up('Shift'); await page.keyboard.up('w');
      fs.writeFileSync(`${OUT}/${view}-${locale}.json`, JSON.stringify({ view, locale, cost, errors }, null, 2));
      expect(errors).toEqual([]);
    });
  });
}

test.describe('portrait en, Reduced Motion', () => {
  test.use({ ...VIEWS.portrait, reducedMotion: 'reduce' });
  test('the combined tier without flames', async ({ gameplayPage: page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await race(page);
    await step(page, STEPS[2][1], true);
    await page.screenshot({ path: `${OUT}/portrait-en-nitro-boost-reduced-motion.png` });
    await page.keyboard.up('Shift'); await page.keyboard.up('w');
  });
});
