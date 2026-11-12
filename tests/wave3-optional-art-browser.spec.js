import { test, expect } from './helpers/test.js';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  test('A-05 empty collection displays native alpha art and stops effects on VFX Off '+viewport.width, async ({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('[data-wave3-open-store]').click();
    await page.getByRole('button',{name:'Demo Collection'}).click();
    const collection=page.locator('[data-wave3-demo-collection]');
    const image=collection.locator('.collection-empty-art img');
    await expect(image).toHaveAttribute('src',/demo-collection-empty@3x\.webp$/);
    await expect(image).toHaveJSProperty('naturalWidth',288);
    await expect(image).toHaveJSProperty('naturalHeight',288);
    await expect(collection.locator('.collection-count strong')).toHaveText('0');
    await expect(collection.locator('.collection-empty')).toContainText(/empty/i);
    const scan=collection.locator('.collection-empty-scan');
    await expect(scan).toHaveCSS('animation-name',/wave3-collection-scan/);
    await page.evaluate(()=>{document.body.dataset.vfxEnabled='false';});
    await expect(scan).toHaveCSS('display','none');
  });
}
test('A-05 fallback preserves empty-copy and motion accessibility',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/demo-collection-empty@3x.webp',route=>route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('[data-wave3-open-store]').click();
  await page.getByRole('button',{name:'Demo Collection'}).click();
  const collection=page.locator('[data-wave3-demo-collection]');
  // A-05 intentionally ships only WebP: a failed image must keep readable copy, not request a deleted PNG.
  await expect(collection.locator('.collection-empty-art img')).toHaveCount(0);
  await expect(collection.locator('.collection-empty-art .artwork-fallback')).toBeVisible();
  await expect(collection.locator('.collection-empty-art .artwork-fallback')).toHaveAttribute('role', 'img');
  await expect(collection.locator('.collection-empty-scan')).toHaveCSS('animation-name','none');
  await expect(collection.locator('.collection-empty')).toContainText(/empty/i);
});
