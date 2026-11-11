import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  test('Wave3 missions connect to the real local demo port at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);await page.goto('/');
    await page.locator('#garage-button').click();
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
  await page.route('**/feature-assets/garage-rewards-and-missions/raster/*.png',route=>route.abort());
  await page.goto('/');await selectLocale(page,'zh-TW');
  await page.locator('#garage-button').click();
  const board=page.locator('.garage-mission-board');
  await expect(board).toContainText('每日重設');
  await expect(board).toContainText('每週重設（週一）');
  await expect(board).toContainText('非正式成就');
  await expect(board.locator('.artwork-fallback').first()).toBeVisible();
  await expect(board.locator('progress').first()).toHaveAttribute('aria-label',/0 \/ 1/);
});
