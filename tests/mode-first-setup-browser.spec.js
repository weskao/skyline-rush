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
    const order = await page.evaluate(() => ['button[data-race-mode="classic"]', '[data-track="coast"]', '#race-rules-row', '#start-button']
      .map(s => document.querySelector(s)).every((el, i, all) => i === 0 || (all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    expect(order).toBe(true);
    for (const selector of ['button[data-race-mode="custom"]', '#rules-restore', '#start-button']) {
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
  await page.locator('button[data-race-mode="free"]').click();
  await expect(page.locator('#mode-eligibility')).toHaveText('Practice: no results are saved');
  await page.locator('button[data-race-mode="stunt"]').click();
  await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
  await expect(page.locator('#mode-conflicts')).toContainText('Ghost replay');

  const before = await snapshot(page);
  await page.locator('button[data-race-mode="custom"]').click();
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
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#locale-select').selectOption('zh-TW', { force: true }); // the drawn custom select mirrors this native one, as in i18n-browser.spec.js
  await expect(page.locator('#mode-rules-summary')).toContainText('單人挑戰');
  await expect(page.locator('#race-rules-step')).toHaveText('3 · 規則');
  await expect(page.locator('#track-step')).toHaveText('2 · 賽道');
  await expect(page.locator('button[data-race-mode="time"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#locale-select').selectOption('en', { force: true });
  await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
});

test('keyboard alone can pick a mode, a track, restore rules and start', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('button[data-race-mode="custom"]')).toHaveAttribute('aria-pressed', 'true');
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

test('unsupported combinations are explained in the rules row, in English and zh-TW', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="circuit"]').click();
  await expect(page.locator('#mode-conflicts')).toContainText('Laps run only on Harbor Circuit');
  await page.locator('button[data-race-mode="elimination"]').click();
  await expect(page.locator('#mode-conflicts')).toContainText('Elimination always races 3 AI opponents');
  await page.locator('#locale-select').selectOption('zh-TW', { force: true });
  await expect(page.locator('#mode-conflicts')).toContainText('淘汰賽固定與 3 名 AI 對手競速');
  await page.locator('button[data-race-mode="circuit"]').click();
  await expect(page.locator('#mode-conflicts')).toContainText('圈數只適用於港灣環道');
  await page.locator('button[data-race-mode="classic"]').click();
  await expect(page.locator('#mode-conflicts')).toBeHidden();
});

// WCAG relative luminance contrast of an element's text against the panel behind it (alpha composited over the dark scene).
const contrast = (page, selector) => page.locator(selector).evaluate(el => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  let node = el, bg = null;
  while (node && !bg) { const c = rgb(getComputedStyle(node).backgroundColor); if (c.length === 4 ? c[3] > 0 : c.length === 3) bg = c; node = node.parentElement; }
  const [r, g, b, a = 1] = bg ?? [0, 0, 0, 0];
  const behind = [0, 9, 22]; // darkest scene tone under the translucent panel
  const panel = [r, g, b].map((v, i) => v * a + behind[i] * (1 - a));
  const [l1, l2] = [lum(rgb(getComputedStyle(el).color)), lum(panel)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
});

test('setup controls show a visible keyboard focus ring and readable contrast', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="time"]').click();
  for (const selector of ['#race-rules-step', '#mode-rules-summary', '#mode-eligibility']) expect(await contrast(page, selector), selector).toBeGreaterThanOrEqual(4.5);
  await page.locator('button[data-race-mode="elimination"]').click();
  expect(await contrast(page, '#mode-conflicts'), '#mode-conflicts').toBeGreaterThanOrEqual(4.5);
  for (const [from, to] of [['button[data-race-mode="classic"]', 'button[data-race-mode="custom"]'], ['#rules-restore', null]]) {
    await page.locator(from).focus();
    if (to) await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== 'none', visible: document.activeElement.matches(':focus-visible') }; });
    if (to) expect(ring.visible, `${to} reached by keyboard`).toBe(true);
    expect(ring.outline || ring.shadow, `${to ?? from} focus ring`).toBe(true);
  }
});

for (const [name, viewport, safe] of [['phone notch', { width: 390, height: 844 }, { top: 59, right: 0, bottom: 34, left: 0 }],
  ['landscape notch', { width: 844, height: 390 }, { top: 0, right: 47, bottom: 21, left: 47 }]]) {
  test.describe(name, () => {
  test.use({ viewport, hasTouch: true });
  test(`${name}: mode tabs, rules row and Start stay inside the safe area and work by touch`, async ({ page }) => {
    await page.goto('/');
    await closeMusicPrompt(page);
    await page.evaluate(values => { for (const [side, value] of Object.entries(values)) document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`); }, safe);
    for (const selector of ['button[data-race-mode="classic"]', '#rules-restore', '#start-button']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      const box = await page.locator(selector).boundingBox();
      expect(box.x, `${selector} left`).toBeGreaterThanOrEqual(safe.left);
      expect(box.x + box.width, `${selector} right`).toBeLessThanOrEqual(viewport.width - safe.right);
    }
    await page.locator('button[data-race-mode="stunt"]').tap();
    await expect(page.locator('button[data-race-mode="stunt"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
  });
  });
}

test('reduced motion: the setup flow works with no running intro animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('#rules-restore').click();
  await expect(page.locator('#mode-rules-summary')).toContainText('3 AI');
  const running = await page.locator('#race-rules-row').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
  expect(running).toBe(0);
});

test('returning home by reload (the brand link) keeps the mode the player raced, like the track', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.evaluate(() => localStorage.setItem('skyline-rush-guide-seen', '1')); // skip the first-Start practice
  await page.reload();
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="stunt"]').click();
  await page.locator('[data-track="coast"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#intro')).toBeHidden({ timeout: ciTimeout(8000) });
  await page.goto('/'); // what the brand link does
  await closeMusicPrompt(page);
  await expect(page.locator('button[data-race-mode="stunt"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#mode-rules-summary')).toContainText('Solo run');
});

// The rules row sits above Start, so its dropdowns open over the Start row and the Daily card: every option must
// be the topmost element where the player clicks it (a blurred panel is its own stacking context).
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['landscape', { width: 844, height: 390 }], ['phone', { width: 390, height: 844 }]]) {
  test(`every rules-row dropdown option is clickable above Start (${name})`, async ({ page }) => {
    test.setTimeout(ciTimeout(60000));
    await page.setViewportSize(viewport);
    await page.goto('/');
    await closeMusicPrompt(page);
    let checked = 0;
    for (const mode of ['circuit', 'custom', 'time', 'gauntlet']) {
      await page.locator(`[data-race-mode="${mode}"]`).click();
      for (const summary of await page.locator('#race-rules-row details:not([open]) > summary').filter({ visible: true }).all()) await summary.click();
      for (const combobox of await page.locator('#race-rules-row .custom-select [role="combobox"]').filter({ visible: true }).all()) {
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        const covered = await page.evaluate(() => [...document.querySelectorAll('#race-rules-row .custom-select [role="listbox"]:not([hidden]) [role="option"]')].flatMap(option => {
          option.scrollIntoView({ block: 'nearest' });
          const r = option.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return option.contains(hit) ? [] : [`${option.textContent} under ${hit?.id || hit?.className || hit?.tagName}`];
        }));
        expect(covered, `${mode}: ${await combobox.getAttribute('aria-labelledby') ?? 'dropdown'}`).toEqual([]);
        checked++;
        await page.keyboard.press('Escape');
      }
    }
    expect(checked, 'rules dropdowns checked').toBeGreaterThan(3);
  });
}
