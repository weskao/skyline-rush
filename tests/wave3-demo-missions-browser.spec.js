import { test, expect, openGarage } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  test('Wave3 missions connect to the real local demo port at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);await page.goto('/');
    await openGarage(page);
    const board=page.locator('.garage-mission-board');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-rewards-authority','local-demo');
    await expect(board.locator('.garage-mission-card')).toHaveCount(4);
    await expect(board.locator('.garage-period-card')).toHaveCount(8);
    await expect(board.locator('[data-trophy-id]')).toHaveCount(4);
    await expect(board.getByRole('button',{name:/claim demo reward|領取試玩獎勵/i})).toHaveCount(0);
    await expect(board).toContainText(/local, disposable|僅儲存在本機/i);
    const width=await board.evaluate(el=>el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(viewport.width);
  });
}
test('missing art and reduced-motion bilingual UTC fallback remain usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/feature-assets/garage-rewards-and-missions/raster/*.webp',route=>route.abort());
  await page.goto('/');await selectLocale(page,'zh-TW');
  await page.locator('#garage-button').click();
  const board=page.locator('.garage-mission-board');
  await expect(board.locator('.garage-period-heading + p')).toContainText('重設 00:00 UTC');
  await expect(board).toContainText('非正式成就');
  await expect(board.locator('.artwork-fallback').first()).toBeVisible();
  await expect(board.locator('progress').first()).toHaveAttribute('aria-label',/0 \/ 1/);
});

test.describe('mission reset schedule', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('reset dates use compact local copy and UTC even on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'));
    await page.goto('/');
    await page.locator('#garage-button').click();
    const notice = page.locator('.garage-period-heading + p');
    await expect(notice).toHaveText('Reset 00:00 UTC Daily Nov 15 Weekly Mon, Nov 16');
    await expect(notice.locator('time').nth(0)).toHaveAttribute('datetime', '2026-11-15T00:00:00.000Z');
    await expect(notice.locator('time').nth(1)).toHaveAttribute('datetime', '2026-11-16T00:00:00.000Z');
    expect(await notice.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);

    await page.locator('#garage-close').click();
    await selectLocale(page, 'zh-TW');
    await page.locator('#garage-button').click();
    await expect(notice).toHaveText('重設 00:00 UTC 每日 11/15 每週 11/16（週一）');
    expect(await notice.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});
