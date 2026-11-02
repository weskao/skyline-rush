import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  test(`Wave3 garage-rewards-and-missions read-only cards browse safely at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport); await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery=page.locator('#garage-art-source-garage-rewards-and-missions');
    await expect(gallery).toBeVisible();
    await expect(gallery).not.toHaveAttribute('open','');
    await gallery.locator('summary').click();
    const cards=gallery.locator('button[data-wave3-asset]');
    await expect(cards).toHaveCount(8);
    const picked=cards.nth(1), id=await picked.getAttribute('data-wave3-asset');
    await picked.click();
    await expect(picked).toHaveAttribute('aria-pressed','true');
    await expect(gallery.locator('[data-wave3-selected]')).toHaveAttribute('data-wave3-selected',id);
    await expect(gallery.locator('[data-wave3-description]')).not.toBeEmpty();
    await expect(gallery.getByRole('button',{name:/buy|claim|purchase|pay|領取|購買/i})).toHaveCount(0);
    const geometry=await picked.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('img')?.getBoundingClientRect();return{width:a.width,height:a.height,inside:b?b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom:true}});
    expect(geometry.height).toBeGreaterThanOrEqual(44); expect(geometry.inside).toBe(true);
    await picked.focus();await page.keyboard.press('Enter');await expect(picked).toHaveAttribute('aria-pressed','true');
    await test.info().attach(`wave3-garage-rewards-and-missions-${viewport.width}x${viewport.height}.png`,{body:await gallery.screenshot(),contentType:'image/png'});
  });
}
test('Wave3 garage-rewards-and-missions filters and locale switch keep all buttons nontransactional',async({page})=>{
  await page.goto('/');await page.locator('#garage-button').click();
  const gallery=page.locator('#garage-art-source-garage-rewards-and-missions');
  await gallery.locator('summary').click();
  await gallery.locator('[data-wave3-filter="trophy"]').click();
  await expect(gallery.locator('button[data-wave3-asset]')).toHaveCount(4);
  // Native modal dialogs block the toolbar; change language through the actual reachable UI.
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).not.toBeVisible();
  await selectLocale(page,'zh-TW');
  await page.locator('#garage-button').click();
  const localized=page.locator('#garage-art-source-garage-rewards-and-missions');
  await localized.locator('summary').click();
  await expect(localized.locator('[data-wave3-description]')).toContainText(/[一-龥]/);
  await expect(localized.getByRole('button',{name:/購買|領取|buy|claim/i})).toHaveCount(0);
});
