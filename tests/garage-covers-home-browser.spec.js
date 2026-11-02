import { test, expect } from './helpers/test.js';

// iPhone Home Screen app: the home screen (START RACE) flashed through the full-screen Garage and Preview Studio
// every few seconds. The covered home kept rendering its infinite animations (START sheen, Garage pulse);
// WebKit could present those layers over the dialog. Nothing outside the dialog may render while it is open.
const coveredPainters = page => page.evaluate(() => {
  const garage = document.querySelector('#garage-screen');
  const outside = el => el instanceof Element && !garage.contains(el);
  const visible = el => getComputedStyle(el).visibility !== 'hidden';
  const animated = document.getAnimations()
    .map(animation => animation.effect?.target)
    .filter(target => outside(target) && visible(target))
    .map(target => target.id || target.className || target.tagName);
  // .brand sets its own `visibility: visible` on short landscape screens, which inherited hiding cannot reach.
  const home = ['#start-button', '#intro', '.topbar', '.brand', '.bottomline']
    .filter(selector => visible(document.querySelector(selector)));
  return { animated: [...new Set(animated)], home };
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Garage and Preview Studio never render the covered home screen ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#start-button')).toBeVisible();
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    // The START sheen starts after a 1.4 s delay; wait past it so a running animation is caught.
    await page.waitForTimeout(1600);
    expect(await coveredPainters(page)).toEqual({ animated: [], home: [] });
    await expect(page.locator('#garage-preview #world')).toBeVisible();

    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    expect(await coveredPainters(page)).toEqual({ animated: [], home: [] });
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    await page.locator('#garage-studio-back').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');

    // Real click on the close control: the hidden home must not intercept it, and it must come back.
    await page.locator('#garage-close').click();
    await expect(page.locator('#garage-screen')).not.toHaveAttribute('open');
    await expect(page.locator('#start-button')).toBeVisible();
    await expect(page.locator('#garage-button')).toBeFocused();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).not.toHaveAttribute('data-phase', 'ready');
  });
}
