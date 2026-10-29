import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 13C audit gaps: every new mode leaves/restarts cleanly, keeps its HUD apart on four screens, and names its controls.
// Endless shows its contacts/milestone line instead of RACING, so wait on the phase.
const racing = page => expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
async function pickMode(page, mode) {
  await page.locator(`button[data-race-mode="${mode}"]`).click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode', mode);
}
async function useItemRules(page, rule) {
  await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-rule="itemRules"]').evaluate((node, rule) => { node.value = rule; node.dispatchEvent(new Event('change', { bubbles: true })); }, rule);
}

test.describe('new modes leave and restart like Classic', () => {
  for (const mode of ['gauntlet', 'checkpoint', 'stunt', 'elimination', 'endless', 'custom']) test(`${mode}: End race returns to track select and restart starts a fresh run`, async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await pickMode(page, mode);
    await page.locator('#start-button').click();
    await racing(page);
    await page.locator('.brand').click();
    await expect(page.locator('#leave-screen')).toBeVisible();
    await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('#intro')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-race-mode', mode);
    await page.locator('#start-button').click();
    await racing(page);
    await page.evaluate(() => { window.firstRace = window.gameplay.race; });
    await page.keyboard.press('Backspace');
    await expect.poll(() => page.evaluate(() => window.gameplay.race !== window.firstRace && window.gameplay.race.mode)).toBe(mode);
    await racing(page);
    expect(errors).toEqual([]);
  });
});

const MODE_HUDS = ['#item-slot', '#circuit-hud', '#checkpoint-hud', '#stunt-hud', '#elimination-hud', '#hazard-warning'];
const BLOCKS = ['.position-stat', '.leaderboard', '.race-route-map', '.race-progress', '.mode-indicator', '.speedometer',
  '.flight-telemetry', '.aero-tools', '#controls-button', '#pause-button', ...MODE_HUDS,
  ...['fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];
const SETUPS = {
  // Active items show the held-item slot and its USE button.
  custom: async page => { await useItemRules(page, 'active'); },
  checkpoint: async () => {}, stunt: async () => {}, elimination: async () => {}, circuit: async () => {}, endless: async () => {},
};

for (const [width, height, hasTouch] of [[1440, 900, false], [390, 844, true], [320, 740, true], [844, 390, true]]) {
  test.describe(`mode HUD ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch, isMobile: hasTouch });
    for (const [mode, setup] of Object.entries(SETUPS)) test(`${mode}: racing HUD blocks stay apart and on screen`, async ({ gameplayPage: page, context }) => {
      if (height < 380) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 62, right: 62, top: 0, bottom: 21 } });
      await pickMode(page, mode);
      await setup(page);
      await page.locator('#start-button').click();
      await racing(page);
      if (mode === 'custom') {
        await page.evaluate(() => { window.gameplay.race.player.heldItem = 'shield'; });
        await expect(page.locator('#item-slot')).toBeVisible();
      }
      const shown = { custom: '#item-slot', circuit: '#circuit-hud', checkpoint: '#checkpoint-hud', stunt: '#stunt-hud', elimination: '#elimination-hud' }[mode];
      if (shown) await expect(page.locator(shown)).toBeVisible();
      const boxes = await page.evaluate(selectors => selectors.flatMap(selector => {
        const el = document.querySelector(selector);
        if (!el || !el.checkVisibility()) return [];
        const { x, y, width, height } = el.getBoundingClientRect();
        return width && height ? [[selector, { x, y, width, height }]] : [];
      }), BLOCKS);
      const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      // Mode HUD rows sit inside .race-progress: they grow it, so the container stands in for them in the pair check.
      const blocks = boxes.filter(([name]) => !MODE_HUDS.includes(name));
      const overlaps = blocks.flatMap(([name, box], i) => blocks.slice(i + 1).filter(([, other]) => !apart(box, other)).map(([other]) => `${name} × ${other}`));
      expect(overlaps).toEqual([]);
      for (const [name, box] of boxes) {
        expect(box.x, `${name} off the left edge`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${name} off the right edge`).toBeLessThanOrEqual(width);
        expect(box.y + box.height, `${name} below the screen`).toBeLessThanOrEqual(height);
      }
      await page.screenshot({ path: `test-results/mode-hud-${mode}-${width}x${height}.png` });
    });
  });
}

test.describe('new-mode controls have accessible names', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('item rules, circuit laps, Event Lab buttons and USE are named', async ({ gameplayPage: page }) => {
    // Event Lab authors on the sprint routes, so open it from the home screen before Circuit swaps the route.
    await page.locator('[data-race-mode="eventlab"]').click();
    const dialog = page.locator('#event-lab-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('.lab-share > summary').click(); // Export/Import sit in a closed share section
    const buttons = dialog.locator('button');
    for (let i = 0; i < await buttons.count(); i++) await expect(buttons.nth(i)).toHaveAccessibleName(/\S/);
    await page.locator('#lab-close').click();
    await pickMode(page, 'custom');
    await page.locator('#race-mode-rules > summary').click();
    await expect(page.locator('[data-race-rule="itemRules"] + .custom-select [role="combobox"]')).toHaveAccessibleName(/item rules/i);
    await pickMode(page, 'circuit');
    await page.locator('#circuit-rules > summary').click();
    await expect(page.locator('#circuit-laps + .custom-select [role="combobox"]')).toHaveAccessibleName(/laps/i);
    await pickMode(page, 'custom');
    await useItemRules(page, 'active');
    await page.locator('#start-button').click();
    await racing(page);
    await page.evaluate(() => { window.gameplay.race.player.heldItem = 'shield'; });
    await expect(page.locator('#activate-item')).toBeEnabled();
    await expect(page.locator('#activate-item')).toHaveAccessibleName(/USE/);
  });
});
