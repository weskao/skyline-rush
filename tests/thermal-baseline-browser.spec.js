import { expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { openGarage } from './helpers/test.js';
import { clickLobbyOption } from './helpers/home-lobby.js';
import { thermalScenarios } from './fixtures/thermal-scenarios.js';
import { validateThermalRecord } from '../scripts/thermal-report.mjs';

test.use({ gameplaySearch: '?perf=deep&seed=12345' });

// Every registry scenario runs in the existing distributed CI browser suite.
// Use 32 measured ticks for smoke evidence; the opt-in CLI defaults to 180.
for (const scenario of thermalScenarios) test(`thermal scene: ${scenario.phase}/${scenario.id}`, async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(120000));
  await page.goto(gameplayURL + 'tests/fixtures/thermal-baseline.html?perf=deep&seed=12345');
  await page.waitForFunction(() => !!window.thermalRun);
  const frames = 32;
  const record = await page.evaluate(options => window.thermalRun(options), { ...scenario, frames });
  validateThermalRecord(record, scenario, frames);
  // CI-only software-WebGL evidence; do not attach local hardware data.
  if (process.env.CI) {
    const path = test.info().outputPath(`render-performance-thermal-${scenario.phase}-${scenario.id}.json`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ source: 'ci-software-webgl', sha: process.env.GITHUB_SHA ?? null,
      harness: 'fixed-step-scene-probe', ...record }, null, 2));
  }
});

const snapshot = page => page.locator('#perf-overlay').evaluate(el => JSON.parse(el.dataset.deep || '{}'));
const phase = (page, name) => expect.poll(async () => (await snapshot(page)).current).toBe(name + '/coast');

test('deep diagnostics observe Garage, Countdown and actual Results transitions', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  await phase(page, 'home');
  await openGarage(page);
  await phase(page, 'garage');
  await page.locator('#garage-close').click();
  await phase(page, 'home');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(async () => !!(await snapshot(page)).reports?.['countdown/coast']).toBe(true);
  await phase(page, 'racing');
  // Results state smoke only, not a continuous-driving benchmark.
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
  });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
  await phase(page, 'results');
});

test('deep diagnostics observe Photo mode independently of Paused', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  await phase(page, 'home');
  await clickLobbyOption(page, 'button[data-race-mode="free"]');
  await page.locator('#start-button').click();
  await phase(page, 'racing');
  await page.locator('#pause-button').click();
  await phase(page, 'paused');
  await page.locator('#photo-open').click();
  await phase(page, 'photo');
  await page.locator('#photo-close').click();
  await phase(page, 'paused');
});
