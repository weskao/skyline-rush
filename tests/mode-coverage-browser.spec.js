import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { resizeTo } from './helpers/viewport.js';
// CI speed: each mode's three touch sizes (390x844, 320x740, 844x390) share one booted race and are resized in place; each size is
// also freshly booted in two of the six modes. Desktop stays a separate test (hasTouch/isMobile are fixed per browser context).

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

// Picks the mode, starts a race in it and waits until it is racing.
async function startModeRace(page, mode, setup) {
  await pickMode(page, mode);
  await setup(page);
  await page.locator('#start-button').click();
  await racing(page);
  if (mode === 'custom') await page.evaluate(() => { window.gameplay.race.player.heldItem = 'shield'; });
}

// Judges the racing HUD at the page's current size: no two blocks touch, every block stays on screen.
async function expectModeHudApart(page, mode, width, height) {
  const at = `${mode} ${width}x${height}`;
  if (mode === 'custom') {
    await expect(page.locator('#item-slot'), at).toBeVisible();
    // Measure the held-item row, not the empty slot: the longer status once wrapped USE onto a second row at 320 px.
    await expect(page.locator('#item-status'), at).toHaveText('ITEM READY · SHIELD');
  }
  const shown = { custom: '#item-slot', circuit: '#circuit-hud', checkpoint: '#checkpoint-hud', stunt: '#stunt-hud', elimination: '#elimination-hud' }[mode];
  if (shown) await expect(page.locator(shown), at).toBeVisible();
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
  expect(overlaps, at).toEqual([]);
  for (const [name, box] of boxes) {
    expect(box.x, `${at}: ${name} off the left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${at}: ${name} off the right edge`).toBeLessThanOrEqual(width);
    expect(box.y + box.height, `${at}: ${name} below the screen`).toBeLessThanOrEqual(height);
  }
  await page.screenshot({ path: `test-results/mode-hud-${mode}-${width}x${height}.png` });
}

// The desktop page has no touch; the three touch sizes share one booted page per mode (hasTouch/isMobile are per context).
// Each size is reached by a fresh boot in one of the modes (BOOT_AT cycles through them) and by an in-page resize in the rest.
const DESKTOP = [1440, 900];
const TOUCH_SIZES = [[390, 844], [320, 740], [844, 390]];
for (const [width, height] of [DESKTOP]) {
  test.describe(`mode HUD ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });
    for (const [mode, setup] of Object.entries(SETUPS)) test(`${mode}: racing HUD blocks stay apart and on screen`, async ({ gameplayPage: page }) => {
      await startModeRace(page, mode, setup);
      await expectModeHudApart(page, mode, width, height);
    });
  });
}
for (const [index, [mode, setup]] of Object.entries(SETUPS).entries()) {
  const boot = TOUCH_SIZES[index % TOUCH_SIZES.length];
  test.describe(`mode HUD touch ${boot[0]}x${boot[1]}`, () => {
    test.use({ viewport: { width: boot[0], height: boot[1] }, hasTouch: true, isMobile: true });
    test(`${mode}: racing HUD blocks stay apart and on screen at 390x844, 320x740 and 844x390`, async ({ gameplayPage: page }) => {
      test.setTimeout(ciTimeout(90_000));
      await startModeRace(page, mode, setup);
      for (const [width, height] of [boot, ...TOUCH_SIZES.filter(size => size !== boot)]) await test.step(`${width}x${height}`, async () => {
        await resizeTo(page, width, height);
        await expectModeHudApart(page, mode, width, height);
      });
    });
  });
}

test.describe('new-mode controls have accessible names', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('item rules, circuit laps, Event Lab buttons and USE are named', async ({ gameplayPage: page }) => {
    // Event Lab authors on the sprint routes, so open it from the home screen before Circuit swaps the route.
    await page.locator('button[data-race-mode="eventlab"]').click();
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
