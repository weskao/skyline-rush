import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// Teleports the running race over the line; rivalsFirst finishes all three rivals ahead (P4).
async function finishRace(page, { rivalsFirst = false } = {}) {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.evaluate(rivalsFirst => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    if (rivalsFirst) for (const rival of race.rivals) rival.finishTime = 1;
  }, rivalsFirst);
  await expect(page.locator('#race-overlay')).toBeVisible();
}
const unlock = async (page, tracks) => {
  await page.evaluate(tracks => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(tracks)), tracks);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
const loseContext = page => page.evaluate(() => {
  window.lostContext = document.querySelector('#world').getContext('webgl2').getExtension('WEBGL_lose_context');
  window.lostContext.loseContext();
});

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
  // The results stack is taller than a landscape phone, so the overlay must scroll to its buttons.
  ['phone landscape', { width: 844, height: 390 }, true],
]) test.describe(`result actions ${name}`, () => {
  test.use({ viewport, hasTouch });

  test('a restored graphics context clears the warning so results stay usable', async ({ gameplayPage: page }) => {
    await finishRace(page);
    await loseContext(page);
    await expect(page.locator('#error-message')).toBeVisible();
    await page.evaluate(() => window.lostContext.restoreContext());
    await expect(page.locator('#error-message')).toBeHidden();
    await page.locator('#again-button').click();
    await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  });

  test('race again reloads while the graphics context stays lost', async ({ gameplayPage: page }) => {
    await finishRace(page);
    await loseContext(page);
    await expect(page.locator('#error-message')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.locator('#again-button').click()]);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('#error-message')).toBeHidden();
  });

  test('a podium finish offers NEXT straight into the newly unlocked track', async ({ gameplayPage: page }) => {
    await finishRace(page);
    const next = page.locator('#next-button');
    await expect(next).toBeVisible();
    await expect(next).toContainText('Neon Downtown');
    await next.click();
    await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
    await expect(page.locator('.route-heading')).toHaveText('NEON DOWNTOWN');
    await expect(page.locator('#race-overlay')).toBeHidden();
  });

  test('NEXT stays hidden when the next track is still locked', async ({ gameplayPage: page }) => {
    await finishRace(page, { rivalsFirst: true });
    await expect(page.locator('#result-stats')).toContainText('4');
    await expect(page.locator('#next-button')).toBeHidden();
  });

  test('NEXT stays hidden once every track was already unlocked', async ({ gameplayPage: page }) => {
    await unlock(page, ['coast', 'neon', 'canyon', 'aurora', 'spiral']);
    await finishRace(page);
    await expect(page.locator('#next-button')).toBeHidden();
  });

  test('NEXT appears for the final unlock and hides on the last track', async ({ gameplayPage: page }) => {
    await unlock(page, ['coast', 'neon', 'canyon', 'aurora']);
    await page.locator('[data-track="aurora"]').click();
    await finishRace(page);
    await expect(page.locator('#next-button')).toContainText('Sky Spiral');
    await page.locator('#next-button').click();
    await expect(page.locator('.route-heading')).toHaveText('SKY SPIRAL');
    await page.evaluate(() => {
      const race = window.gameplay.race;
      race.phase = 'racing'; race.elapsed = 80;
      Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    });
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#next-button')).toBeHidden();
  });
});
