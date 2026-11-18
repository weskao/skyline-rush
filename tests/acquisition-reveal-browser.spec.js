import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

test.use({ keepAcquisitionOpen: true, reducedMotion: 'reduce', viewport: { width: 844, height: 390 }, hasTouch: true });

async function finishCoast(page) {
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.evaluate(async () => {
    const { finishRace } = await import('/src/race-finish.js');
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length, speed: 65, score: race.length, collisions: 0 });
    finishRace(race, race.length - 8, 1 / 60);
  });
  await expect(page.locator('#race-overlay')).toBeVisible();
}

test('a real finish reveals the new track and paint together before returning focus to results', async ({ gameplayPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await finishCoast(page);
  expect(errors).toEqual([]);
  const reveal = page.locator('#acquisition-reveal');
  await expect(reveal).toBeVisible();
  await expect(reveal.getByRole('heading', { name: 'Neon Downtown' })).toBeVisible();
  await reveal.getByRole('button', { name: 'Aurora', exact: true }).click();
  await expect(reveal.getByRole('heading', { name: 'Aurora' })).toBeVisible();
  await expect(reveal.locator('.acquisition-art')).toHaveJSProperty('complete', true);
  await page.keyboard.press('Escape');
  await expect(reveal).toBeHidden();
  await expect(page.locator('#next-button')).toBeFocused();
  await page.locator('#next-button').click();
  await expect(page.locator('#race-overlay')).toBeHidden();
});

test('a mission claim and an equipment redemption reveal their receipts over Garage', async ({ gameplayPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const { createWave3RaceEventBridge, wave3DemoExperience } = await import('/src/wave3-race-events.ts');
    const bridge = createWave3RaceEventBridge(wave3DemoExperience, () => 'acquisition-test-coast');
    await bridge.finish({
      phase: 'finished', trackId: 'coast', mode: 'classic', elapsed: 80, length: 5_000,
      player: { driftPayout: null, longestCombo: 0 }, result: { time: 80, success: true, position: 1 },
    }, false);
  });

  await page.locator('#garage-button').tap();
  const garage = page.locator('#garage-screen');
  const reveal = page.locator('#acquisition-reveal');
  await garage.locator('[data-garage-section="missions"]').tap();
  const mission = garage.locator('[data-mission-id="mission-race:daily"]');
  await mission.getByRole('button', { name: /Claim demo reward/ }).tap();
  await expect(reveal.getByRole('heading')).toHaveText(/\+40 Demo coins/i);
  const proceed = reveal.getByRole('button', { name: 'Continue' });
  await expect(proceed).toBeInViewport();
  await expect(reveal.locator('.acquisition-stage')).toBeVisible();
  expect(await reveal.evaluate(dialog => dialog.getAnimations({ subtree: true }).length)).toBe(0);
  await proceed.tap();
  await expect(reveal).toBeHidden();
  await expect(garage).toBeVisible();
  await expect(mission).toHaveAttribute('data-mission-state', 'claimed');

  await garage.locator('[data-garage-section="store"]').tap();
  const store = garage.locator('[data-wave3-demo-store]');
  await store.locator('[data-demo-id="thruster-ion"]').tap();
  await store.getByRole('button', { name: 'Demo redeem', exact: true }).tap();
  await store.getByRole('button', { name: 'Confirm demo redeem' }).tap();
  await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
  await expect(reveal.locator('.acquisition-art')).toHaveJSProperty('naturalWidth', 288);
  await page.evaluate(() => history.back());
  await expect(reveal).toBeHidden();
  await expect(store).toBeVisible();
  await store.getByRole('button', { name: 'Demo Collection' }).tap();
  await expect(garage.locator('[data-wave3-demo-collection] [data-demo-id="thruster-ion"]')).toBeVisible();
});

test('the production reveal component queues batches, defers during a race, and restores keyboard focus', async ({ page, gameplayURL }) => {
  await page.goto(gameplayURL + 'tests/fixtures/acquisition-reveal.html');
  const reveal = page.locator('#acquisition-reveal');
  const opener = page.getByRole('button', { name: 'Present reward' });
  await page.evaluate(() => { document.body.dataset.phase = 'racing'; });
  await opener.click();
  await expect(reveal).toBeHidden();
  await page.evaluate(() => { document.body.dataset.phase = 'ready'; });
  await expect(reveal.getByRole('heading', { name: 'Vantaire GT' })).toBeVisible();
  const proceed = reveal.getByRole('button', { name: 'Continue' });
  await expect(proceed).toBeFocused();
  await reveal.getByRole('button', { name: 'Ion thruster' }).tap();
  await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
  await expect(proceed).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(reveal.getByRole('heading', { name: 'Collection token' })).toBeVisible();
  await expect(reveal.locator('.acquisition-emblem')).toBeVisible();
  await proceed.tap();
  await expect(reveal).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.tap();
  await expect(reveal).toBeHidden();
});
