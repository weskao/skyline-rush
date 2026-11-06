import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

// All future cards must reuse the existing home WebGL, swipe, AIRFLOW and Garage/Studio
// controllers. This is deliberately a cross-map regression, not six private UI engines.
const previews = [
  'dune-tempest', 'monsoon-ruins', 'skyfall-archipelago',
  'volcanic-crown', 'stormline-megacity', 'frostbite-canyon',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast']));
    localStorage.setItem('skyline-rush-locale', 'en');
  });
  await page.goto('/');
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
});

test('the shared home carousel reaches all six new 3D environments without unlocking them', async ({ page }) => {
  test.setTimeout(ciTimeout(180_000));
  await page.locator('[data-track="cosmic"]').click();
  await expect(page.locator('[data-track="cosmic"]')).toHaveAttribute('aria-pressed', 'true');

  for (const id of previews) {
    // A trackpad's horizontal wheel is handled by the same shared paging controller
    // used for touch and pointer gestures; each completed gesture changes one card.
    await page.locator('#world').evaluate(canvas => {
      canvas.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaX: 140, deltaY: 0,
      }));
    });
    await expect(page.locator(`[data-upcoming-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(0);
    await expect(page.locator('#world')).toBeVisible();
    await expect(page.locator('#upcoming-scene')).toBeHidden();
    await expect(page.locator('#start-button')).toBeDisabled();
    await expect(page.locator('#start-button span')).toHaveText('COMING SOON');
    await page.waitForTimeout(210); // One wheel gesture must end before the next begins.
  }
});

test('each new map shares the same AIRFLOW switch and Garage-to-Studio car pose controls', async ({ page }) => {
  test.setTimeout(ciTimeout(180_000));
  const airflow = page.locator('#airflow-toggle');
  for (const id of previews) {
    await page.locator(`[data-upcoming-track="${id}"]`).click();
    await expect(page.locator('#world')).toBeVisible();
    const previous = await airflow.getAttribute('aria-pressed');
    await airflow.click();
    await expect(airflow).toHaveAttribute('aria-pressed', previous === 'true' ? 'false' : 'true');
    await airflow.click();
    await expect(airflow).toHaveAttribute('aria-pressed', previous);

    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    await page.locator('button[data-garage-mode="flight"]').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
    await page.locator('#garage-wing').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-wing', 'true');
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    await expect(page.locator('button[data-garage-mode="flight"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#garage-wing')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#garage-studio-back').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
    await page.locator('#garage-close').click();
    await expect(page.locator('#garage-screen')).toBeHidden();
    await expect(page.locator('#world')).toBeVisible();
    await expect(page.locator(`[data-upcoming-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
});
