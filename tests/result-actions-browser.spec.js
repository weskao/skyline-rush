import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// Teleports the running race over the line; rivalsFirst finishes all three rivals ahead (P4).
async function finishRace(page, { rivalsFirst = false, racing = 'RACING' } = {}) {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText(racing);
  await page.evaluate(rivalsFirst => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    if (rivalsFirst) for (const rival of race.rivals) rival.finishTime = 1;
  }, rivalsFirst);
  await expect(page.locator('#race-overlay')).toBeVisible();
}
const loseContext = page => page.evaluate(() => {
  window.lostContext = document.querySelector('#world').getContext('webgl2').getExtension('WEBGL_lose_context');
  window.lostContext.loseContext();
});

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
  // Landscape splits results into summary | actions (tests/overlay-landscape-fit-browser.spec.js checks no scrolling).
  ['phone landscape', { width: 844, height: 390 }, true],
]) test.describe(`result actions ${name}`, () => {
  test.use({ viewport, hasTouch });

  // WebGL context handling does not depend on the viewport: one phone run each.
  if (name === 'phone') test('a restored graphics context clears the warning so results stay usable', async ({ gameplayPage: page }) => {
    await finishRace(page);
    await loseContext(page);
    await expect(page.locator('#error-message')).toBeVisible();
    await page.evaluate(() => window.lostContext.restoreContext());
    await expect(page.locator('#error-message')).toBeHidden();
    await page.locator('#again-button').click();
    await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  });

  if (name === 'phone') test('race again reloads while the graphics context stays lost', async ({ gameplayPage: page }) => {
    await finishRace(page);
    await loseContext(page);
    await expect(page.locator('#error-message')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.locator('#again-button').click()]);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('#error-message')).toBeHidden();
  });

  test('Race again is a full touch target on pause and results', async ({ gameplayPage: page }) => {
    test.skip(!hasTouch, 'mouse layouts keep the compact link');
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.locator('#pause-button').click();
    await expect(page.locator('#again-button')).toBeVisible();
    expect((await page.locator('#again-button').boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.locator('#resume-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.evaluate(() => { const race = window.gameplay.race; race.elapsed = 80; Object.assign(race.player, { distance: race.length - 10, speed: 60 }); });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#again-button')).toBeVisible();
    expect((await page.locator('#again-button').boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  });

  // Podium NEXT is viewport-independent; its unlock/hidden logic lives in race-results.test.js.
  if (name === 'phone') test('a podium finish offers NEXT straight into the newly unlocked track', async ({ gameplayPage: page }) => {
    await finishRace(page);
    const trophy = page.locator('#result-stats .result-trophy-art');
    await expect(trophy).toBeVisible();
    await expect(trophy).toHaveAttribute('src', /trophy-gold@3x\.webp$/);
    await expect(trophy).toHaveJSProperty('naturalWidth', 288);
    await expect(trophy).toHaveJSProperty('naturalHeight', 288);
    await expect(trophy).toHaveAttribute('width', '96');
    await expect(trophy).toHaveAttribute('height', '96');
    // The .52s reward-podium-reveal scales the art in; judge its settled 1x size, not a mid-animation frame.
    await expect.poll(async () => (await trophy.boundingBox()).width).toBe(96);
    await expect(page.locator('#result-stats')).toContainText('Placement badge (display only)');
    const next = page.locator('#next-button');
    await expect(next).toBeVisible();
    await expect(next).toContainText('Neon Downtown');
    await next.click();
    await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
    await expect(page.locator('.route-heading')).toHaveText('NEON DOWNTOWN');
    await expect(page.locator('#race-overlay')).toBeHidden();
  });

  // The hidden-NEXT DOM binding is identical in every viewport; landscape also asserts the stacked results.
  if (name === 'phone landscape') test('NEXT stays hidden when the next track is still locked', async ({ gameplayPage: page }) => {
    await finishRace(page, { rivalsFirst: true });
    await expect(page.locator('#result-stats')).toContainText('4');
    await expect(page.locator('#result-stats .result-trophy-art')).toHaveCount(0);
    await expect(page.locator('#next-button')).toBeHidden();
  });
});

// CPU-only renderers can take longer than 250 ms per frame; such frames must still advance the race to its results.
test('a race still reaches its results when every frame is slow', async ({ gameplayPage: page }) => {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => { const end = performance.now() + 300; while (performance.now() < end); callback(time); });
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
  });
  await expect(page.locator('#race-overlay')).toBeVisible();
});
