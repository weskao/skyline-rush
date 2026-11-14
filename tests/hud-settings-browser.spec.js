import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { resizeTo } from './helpers/viewport.js';
// CI speed: laptop rides on the desktop page, and small-phone and fold-cover ride on the phone page, resized in place.

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

// One booted page per layout class, resized in place: every size still gets its own control-by-control click check.
// Fold/tablet/landscape layouts keep their own boot (a distinct layout class, not a plain resize).
const GROUPS = [
  [DEVICES[0], DEVICES[1]], // desktop, laptop (mouse)
  [DEVICES[2], DEVICES[3], DEVICES[5]], // phone, small-phone, fold-cover (portrait phones)
  [DEVICES[4]], // phone-landscape
  [DEVICES[6]], // fold-open
  [DEVICES[7]], // fold-open-landscape
];

async function expectInside(control, viewport) {
  const box = await control.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

// The speaker button opens audio only (no HUD mode there), at the page's current size.
async function expectAudioPanelOnly(page) {
  await page.locator('#settings-button').click();
  await expect(page.locator('#settings-panel')).toBeVisible();
  await expect(page.locator('#settings-panel input[name="hud-mode"]')).toHaveCount(0);
  await expect(page.locator('#settings-button')).toHaveAttribute('aria-label', 'Audio settings');
  await page.locator('#settings-button').click();
}

// Clicks every Race HUD control in the VFX panel at the page's current size, then leaves the page as it found it
// (panel closed, HUD back to hybrid) so the next size of the group starts from the same state.
async function setRaceHudFromVfxPanel(page, name, viewport, phase) {
  await page.locator('#vfx-panel > summary').click();
  const panel = page.locator('#vfx-panel');
  const click = async control => { await control.scrollIntoViewIfNeeded(); await expectInside(control, viewport); await control.click(); };
  await click(panel.getByRole('radio', { name: 'Competitive' }));
  await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'competitive');
  for (const [label, flag] of [['Show leaderboard', 'leaderboard'], ['Show minimap', 'map'], ['Show secondary stats', 'telemetry']]) {
    await click(panel.getByRole('checkbox', { name: label }));
    await expect(page.locator('body')).toHaveAttribute(`data-hud-${flag}-visible`, 'false');
  }
  for (const label of ['NITRO / BOOST ready sound', 'NITRO / BOOST ready animation']) {
    const box = panel.getByRole('checkbox', { name: label });
    await click(box);
    await expect(box).not.toBeChecked();
  }
  if (process.env.HUD_SHOT_DIR) await page.screenshot({ path: `${process.env.HUD_SHOT_DIR}/${name}-${phase}.png` });
  const reset = panel.getByRole('button', { name: 'Reset HUD to default' });
  // The native button face is white under the panel's light text: it showed as a blank box.
  expect(await reset.evaluate(node => getComputedStyle(node).backgroundColor), `${name} ${phase}`).toBe('rgba(0, 0, 0, 0)');
  await click(reset);
  await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'hybrid');
  await click(panel.getByRole('radio', { name: 'Immersive' }));
  // Back to the default for the next size, then fold the panel away.
  await click(reset);
  await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'hybrid');
  await page.locator('#vfx-panel > summary').click();
  await expect(panel).not.toHaveAttribute('open', '');
}

for (const group of GROUPS) {
  const [, first, hasTouch] = group[0];
  const names = group.map(([name]) => name).join(' + ');
  test.describe(names, () => {
    test.use({ viewport: first, hasTouch, isMobile: hasTouch });
    for (const phase of ['ready', 'racing']) test(`${names} ${phase}: Race HUD is set from the VFX panel`, async ({ page }) => {
      if (group.length > 1) test.setTimeout(ciTimeout(90_000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      for (const [index, [name, viewport]] of group.entries()) await test.step(`${name} ${viewport.width}x${viewport.height}`, async () => {
        if (index) await resizeTo(page, viewport.width, viewport.height);
        // The audio-only check is a ready-state fact and runs at every size in the ready test; racing keeps it at the boot size.
        if (phase === 'ready' || index === 0) await expectAudioPanelOnly(page);
        if (phase === 'racing' && index === 0) {
          await page.locator('#start-button').click();
          await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10_000) });
        }
        await setRaceHudFromVfxPanel(page, name, viewport, phase);
      });
      expect(errors).toEqual([]);
    });
  });
}
