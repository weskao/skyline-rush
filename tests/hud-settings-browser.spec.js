import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

// Race HUD options sit in the VFX panel; the speaker button opens audio only.
// Real clicks fail if another layer covers a control, so each one is clicked on every screen shape.
const DEVICES = [
  ['desktop', { width: 1440, height: 900 }, false],
  ['laptop', { width: 1280, height: 720 }, false],
  ['phone', { width: 390, height: 844 }, true],
  ['small-phone', { width: 320, height: 568 }, true],
  ['phone-landscape', { width: 844, height: 390 }, true],
  ['fold-cover', { width: 344, height: 882 }, true],
  ['fold-open', { width: 882, height: 1104 }, true],
  ['fold-open-landscape', { width: 1104, height: 882 }, true],
];

async function expectInside(control, viewport) {
  const box = await control.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

for (const [name, viewport, hasTouch] of DEVICES) test.describe(name, () => {
  test.use({ viewport, hasTouch, isMobile: hasTouch });
  for (const phase of ['ready', 'racing']) test(`${name} ${phase}: Race HUD is set from the VFX panel`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#settings-button').click();
    await expect(page.locator('#settings-panel')).toBeVisible();
    await expect(page.locator('#settings-panel input[name="hud-mode"]')).toHaveCount(0);
    await expect(page.locator('#settings-button')).toHaveAttribute('aria-label', 'Audio settings');
    await page.locator('#settings-button').click();
    if (phase === 'racing') {
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10_000) });
    }
    await page.locator('#vfx-panel > summary').click();
    const panel = page.locator('#vfx-panel');
    const click = async control => { await control.scrollIntoViewIfNeeded(); await expectInside(control, viewport); await control.click(); };
    await click(panel.getByRole('radio', { name: 'Competitive' }));
    await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'competitive');
    for (const [label, flag] of [['Show leaderboard', 'leaderboard'], ['Show minimap', 'map'], ['Show secondary stats', 'telemetry']]) {
      await click(panel.getByRole('checkbox', { name: label }));
      await expect(page.locator('body')).toHaveAttribute(`data-hud-${flag}-visible`, 'false');
    }
    for (const label of ['NITRO READY sound', 'NITRO READY animation']) {
      const box = panel.getByRole('checkbox', { name: label });
      await click(box);
      await expect(box).not.toBeChecked();
    }
    if (process.env.HUD_SHOT_DIR) await page.screenshot({ path: `${process.env.HUD_SHOT_DIR}/${name}-${phase}.png` });
    const reset = panel.getByRole('button', { name: 'Reset HUD to default' });
    // The native button face is white under the panel's light text: it showed as a blank box.
    expect(await reset.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await click(reset);
    await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'hybrid');
    await click(panel.getByRole('radio', { name: 'Immersive' }));
    expect(errors).toEqual([]);
  });
});
