import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

const key = 'skyline-rush-cup-progress-v1';
const tracks = ['coast', 'neon', 'canyon'];
const checkpoint = { version: 1, cup: { tracks, results: [{
  track: 'coast', time: 40, order: ['YOU', 'NOVA', 'ORBIT', 'APEX'],
  times: { YOU: 40, NOVA: 41, ORBIT: 42, APEX: 43 },
}] } };

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  test.describe(name, () => {
  test.use({ viewport, hasTouch: name === 'phone' });
  test(`${name}: Cup resumes the unfinished heat after reload without awarding career progress`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.addInitScript(({ key, checkpoint, tracks }) => {
      // Seed once so a reload exercises the real checkpoint writer.
      if (!sessionStorage.getItem('cup-test-seeded')) {
        localStorage.setItem('skyline-rush-unlocked', JSON.stringify(tracks));
        localStorage.setItem(key, JSON.stringify(checkpoint));
        sessionStorage.setItem('cup-test-seeded', '1');
      }
    }, { key, checkpoint, tracks });
    await page.goto('/');
    await page.locator('[data-race-mode="cup"]').click();
    await page.locator('#cup-rules > summary').click();
    await expect(page.locator('#cup-resume')).toBeVisible();
    await expect(page.locator('#cup-recovery-summary')).toContainText('2 / 3');
    if (name === 'desktop') expect(await page.locator('#intro').evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    await page.locator('#cup-resume').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/cup-recovery/${name}-recovery.png` });
    await page.locator('#cup-resume').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'cup');
    await expect(page.locator('#sprint-stage')).toHaveText('CUP HEAT 2 / 3');
    await expect(page.locator('[data-track="neon"]')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.locator('[data-race-mode="cup"]').click();
    await page.locator('#cup-rules > summary').click();
    await expect(page.locator('#cup-resume')).toBeVisible();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toEqual(checkpoint);
    expect(await page.evaluate(() => localStorage.getItem('skyline-rush-stars'))).toBeNull();
    if (name === 'desktop') {
      await page.locator('[data-race-mode="classic"]').click();
      await expect(page.locator('.intro-wordmark')).toBeVisible();
      await expect(page.locator('#intro-title')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
  });
}

test('saved Cup controls translate live and discard survives reload', async ({ page }) => {
  await page.addInitScript(({ key, checkpoint, tracks }) => {
    if (!sessionStorage.getItem('cup-test-seeded')) {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(tracks));
      localStorage.setItem(key, JSON.stringify(checkpoint));
      sessionStorage.setItem('cup-test-seeded', '1');
    }
  }, { key, checkpoint, tracks });
  await page.goto('/');
  await page.locator('[data-race-mode="cup"]').click();
  await page.locator('#cup-rules > summary').click();
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('#cup-resume')).toHaveText('繼續錦標賽');
  await expect(page.locator('#cup-recovery-summary')).toContainText('霓虹都會');
  await page.screenshot({ path: 'artifacts/cup-recovery/zh-TW-recovery.png' });
  await page.locator('#cup-discard').click();
  await expect(page.locator('#cup-recovery')).toHaveCount(0);
  await page.reload();
  await page.locator('[data-race-mode="cup"]').click();
  await page.locator('#cup-rules > summary').click();
  await expect(page.locator('#cup-recovery')).toHaveCount(0);
});

test('a saved Cup cannot unlock courses or enable the locked Cup start button', async ({ page }) => {
  await page.addInitScript(({ key, checkpoint }) => localStorage.setItem(key, JSON.stringify(checkpoint)), { key, checkpoint });
  await page.goto('/');
  await page.locator('[data-race-mode="cup"]').click();
  await page.locator('#cup-rules > summary').click();
  await expect(page.locator('#cup-recovery')).toHaveCount(0);
  await expect(page.locator('#start-button')).toBeDisabled();
});
