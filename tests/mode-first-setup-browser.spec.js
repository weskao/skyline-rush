import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

// 10A UX-01: Choose Mode → Choose Track → Rules → Start on one screen, with real pointer/keyboard input.
async function closeMusicPrompt(page) {
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}
const PROGRESS_KEYS = ['skyline-rush-controls', 'skyline-rush-history', 'skyline-rush-unlocked', 'skyline-rush-best-tracks',
  'skyline-rush-medals', 'skyline-rush-stars', 'skyline-rush-mode-history-v1', 'skyline-rush-mode-bests-v1'];
const snapshot = page => page.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), PROGRESS_KEYS);

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`setup reads mode → track → rules → Start in DOM and focus order (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await closeMusicPrompt(page);
    const order = await page.evaluate(() => ['[data-race-mode="classic"]', '[data-track="coast"]', '#race-rules-row', '#start-button']
      .map(s => document.querySelector(s)).every((el, i, all) => i === 0 || (all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    expect(order).toBe(true);
    for (const selector of ['[data-race-mode="custom"]', '#rules-restore', '#start-button']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.height, selector).toBeGreaterThanOrEqual(viewport.width < 600 ? 36 : 34);
    }
    await expect(page.locator('#rules-restore')).toHaveCSS('min-height', '44px');
  });
}

test('rules row summarises, explains eligibility and restores defaults with real clicks', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await expect(page.locator('#mode-rules-summary')).toContainText('3 AI');
  await expect(page.locator('#mode-eligibility')).toHaveText('Counts for records, medals and unlocks');
  await page.locator('[data-race-mode="free"]').click();
  await expect(page.locator('#mode-eligibility')).toHaveText('Practice: no results are saved');
  await page.locator('[data-race-mode="stunt"]').click();
  await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
  await expect(page.locator('#mode-conflicts')).toContainText('Ghost replay');

  const before = await snapshot(page);
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  const rivals = page.locator('[data-race-rule="rivals"] + .custom-select');
  await rivals.getByRole('combobox').click();
  await rivals.getByRole('option', { name: '0', exact: true }).click();
  await expect(page.locator('#mode-rules-summary')).toContainText('0 AI');
  await expect(page.locator('#mode-conflicts')).toHaveText('No AI opponents, so difficulty has no effect');
  await expect(page.locator('[data-race-rule="difficulty"]')).toBeDisabled();
  await page.locator('[data-race-preset="traffic"]').click();
  await page.locator('#rules-restore').click();
  await expect(page.locator('#mode-rules-summary')).toContainText('3 AI');
  await expect(page.locator('#mode-conflicts')).toBeHidden();
  await expect(page.locator('[data-race-rule="difficulty"]')).toBeEnabled();
  expect(await snapshot(page), 'presets and Restore defaults never write progress, history or controls').toEqual(before);
  expect(errors).toEqual([]);
});

test('switching language live re-renders the rules row without changing mode or track ids', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('[data-race-mode="time"]').click();
  await page.locator('#locale-select').selectOption('zh-TW');
  await expect(page.locator('#mode-rules-summary')).toContainText('單人挑戰');
  await expect(page.locator('#race-rules-step')).toHaveText('3 · 規則');
  await expect(page.locator('#track-step')).toHaveText('2 · 賽道');
  await expect(page.locator('[data-race-mode="time"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#locale-select').selectOption('en');
  await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
});

test('keyboard alone can pick a mode, a track, restore rules and start', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('[data-race-mode="custom"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-race-mode="custom"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-track="coast"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#rules-restore').focus();
  await expect(page.locator('#rules-restore')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mode-rules-summary')).toContainText('3 AI');
  await page.locator('#start-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#intro')).toBeHidden({ timeout: ciTimeout(8000) });
});
