import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

test.use({ keepAcquisitionOpen: true, reducedMotion: 'reduce', viewport: { width: 844, height: 390 }, hasTouch: true });

async function finishCoast(page) {
  await page.locator('#start-button').click();
  await page.evaluate(() => { window.gameplay.race.countdown = .01; });
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
  const paint = reveal.getByRole('button', { name: 'Apply paint' });
  await expect(paint).toBeInViewport();
  await paint.tap();
  await expect(reveal.getByRole('button', { name: 'Paint applied' })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.gameplay.race.phase)).toBe('finished');
  await page.keyboard.press('Escape');
  await expect(reveal).toBeHidden();
  await expect(page.locator('#next-button')).toBeFocused();
  await page.locator('#next-button').click();
  await expect(page.locator('#race-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(async () => {
    const { loadCarPaint, equippedCar } = await import('/src/car-catalog.ts');
    return loadCarPaint(equippedCar(), ['aurora']);
  })).toBe('aurora');
});

test('selecting a newly earned track from the reveal returns to the lobby with that track selected', async ({ gameplayPage: page }) => {
  await page.setViewportSize({ width: 743, height: 340 });
  await finishCoast(page);
  const reveal = page.locator('#acquisition-reveal');
  const go = reveal.getByRole('button', { name: 'Go to track' });
  await expect(go).toBeInViewport();
  await go.tap();
  await expect(reveal).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', 'neon');
  await expect(page.locator('#lobby-tracks-toggle')).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('skyline-rush-last-track'))).toBe('neon');
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
  await expect(reveal.getByRole('button', { name: /Equip|Apply|Use now/ })).toHaveCount(0);
  await expect(reveal.locator('.acquisition-stage')).toBeVisible();
  expect(await reveal.evaluate(dialog => dialog.getAnimations({ subtree: true }).length)).toBe(0);
  await proceed.tap();
  await expect(reveal).toBeHidden();
  await expect(garage).toBeVisible();
  await expect(mission).toHaveAttribute('data-mission-state', 'claimed');

  await garage.locator('[data-garage-section="store"]').tap();
  const store = garage.locator('[data-wave3-demo-store]');
  await store.locator('[data-demo-offer="thruster-ion"]').getByRole('button', { name: /^Redeem / }).tap();
  await store.getByRole('button', { name: 'Confirm demo redeem' }).tap();
  await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
  await expect(reveal.locator('.acquisition-art')).toHaveJSProperty('naturalWidth', 288);
  const equip = reveal.getByRole('button', { name: 'Equip demo item' });
  await expect(equip).toBeInViewport();
  await equip.tap();
  await expect(reveal.getByRole('button', { name: 'Demo item equipped' })).toBeDisabled();
  await expect(garage.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-ion');
  await page.evaluate(() => history.back());
  await expect(reveal).toBeHidden();
  await expect(store).toBeVisible();
  await store.getByRole('button', { name: 'Demo Collection' }).tap();
  await expect(garage.locator('[data-wave3-demo-collection] [data-demo-id="thruster-ion"]')).toBeVisible();
});

test('the production reveal component queues batches, defers during a race, and restores keyboard focus', async ({ page, gameplayURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameplayURL + 'tests/fixtures/acquisition-reveal.html');
  const reveal = page.locator('#acquisition-reveal');
  const opener = page.getByRole('button', { name: 'Present reward' });
  await page.evaluate(() => { document.body.dataset.phase = 'racing'; });
  await opener.click();
  await expect(reveal).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.revealCues)).toEqual([]);
  await page.evaluate(() => { document.body.dataset.phase = 'ready'; });
  await expect(reveal.getByRole('heading', { name: 'Vantaire GT' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.revealCues)).toEqual([['acquisition-car', true]]);
  const proceed = reveal.getByRole('button', { name: 'Continue' });
  await expect(proceed).toBeFocused();
  expect((await proceed.boundingBox()).width).toBeGreaterThanOrEqual((await reveal.boundingBox()).width - 32);
  await reveal.getByRole('button', { name: 'Ion thruster' }).tap();
  await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
  await reveal.getByRole('button', { name: 'Ion thruster' }).tap();
  await reveal.getByRole('button', { name: 'Aurora' }).tap();
  await expect(reveal.getByRole('heading', { name: 'Aurora' })).toBeVisible();
  await reveal.getByRole('button', { name: 'Ion thruster' }).tap();
  await expect.poll(() => page.evaluate(() => window.revealCues.map(([name]) => name))).toEqual([
    'acquisition-car', 'acquisition-stop', 'acquisition-equipment-thruster', 'acquisition-stop',
    'acquisition-paint', 'acquisition-stop', 'acquisition-select',
  ]);
  await expect(proceed).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(reveal.getByRole('heading', { name: 'Collection token' })).toBeVisible();
  await expect(reveal.locator('.acquisition-emblem')).toBeVisible();
  await proceed.tap();
  await expect(reveal).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.tap();
  await expect(reveal).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.revealCues.slice(-3))).toEqual([
    ['acquisition-stop', true], ['acquisition-item', true], ['acquisition-stop', true],
  ]);
});

test('earning the 18th career star reveals Vantaire GT once and makes it selectable', async ({ gameplayPage: page, gameplayURL }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('skyline-rush-stars')) {
      const stars = { coast: 2, neon: 3, canyon: 3, aurora: 3, spiral: 3, taipei: 3 };
      localStorage.setItem('skyline-rush-stars', JSON.stringify(stars));
    }
  });
  await page.goto(gameplayURL);
  await page.locator('#garage-button').click();
  const gt = page.locator('#garage-screen [data-car="crimson-gt"]');
  await expect(gt).toHaveAttribute('data-car-access', 'locked');
  await expect(gt).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('17 / 18 Career stars')).toBeVisible();
  await page.locator('#garage-close').click();

  await finishCoast(page);
  const reveal = page.locator('#acquisition-reveal');
  await expect(reveal.getByRole('heading', { name: 'Vantaire GT' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-stars')).coast)).toBe(3);
  await reveal.getByRole('button', { name: 'Drive this car' }).click();
  await expect(reveal.getByRole('button', { name: 'Car selected' })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-car')))).toBe('crimson-gt');
  await reveal.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#choose-track').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(reveal).toBeHidden();
  await page.locator('#garage-button').click();
  await expect(gt).toHaveAttribute('data-car-access', 'owned');
  await expect(gt).toHaveAttribute('aria-pressed', 'true');
  await expect(reveal).toBeHidden();
});

test('an apparel action can retry a failed apply and plays a single confirmation when it succeeds', async ({ page, gameplayURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameplayURL + 'tests/fixtures/acquisition-reveal.html?zh');
  await page.evaluate(async () => {
    const { presentAcquisition } = await import('/src/acquisition-reveal.ts');
    let attempts = 0;
    presentAcquisition({ id: 'apparel', items: [{
      id: 'helmet', kind: 'clothing', status: 'earned', name: { en: 'Helmet', 'zh-TW': '安全帽' },
      action: { kind: 'wear', apply: async () => ++attempts > 1 },
    }] });
  });
  const reveal = page.locator('#acquisition-reveal');
  const wear = reveal.getByRole('button', { name: '立即穿戴' });
  const icon = wear.locator('img[data-collectible-icon]');
  await expect(icon).toHaveAttribute('data-collectible-icon', 'clothing');
  await expect(icon).toHaveJSProperty('naturalWidth', 72);
  await wear.tap();
  await expect(reveal.getByRole('status')).toHaveText('目前無法套用此獎勵。');
  await wear.tap();
  const equipped = reveal.getByRole('button', { name: '已穿戴' });
  await expect(equipped).toBeDisabled();
  await expect(equipped.locator('img')).toHaveAttribute('data-collectible-icon', 'check');
  await equipped.press('Enter');
  await expect.poll(() => page.evaluate(() => window.revealCues.map(([name]) => name))).toEqual([
    'acquisition-clothing', 'action-unavailable', 'equip-confirmed',
  ]);
});
