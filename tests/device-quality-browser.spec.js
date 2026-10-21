import { selectLocale } from './helpers/locale-browser.js';
import { test,expect } from '@playwright/test';

const constrained=page=>page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>2});
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>2});
});

test('first visit chooses Low for constrained device, explains it in either language, then never reopens',async({page})=>{
  await constrained(page);
  await page.goto('/');
  const banner=page.locator('#performance-notice');
  await expect(banner).toBeVisible();
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('low');
  await expect(page.locator('#performance-notice-text')).toContainText('Low');
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('#performance-notice-text')).toContainText('低');
  await page.reload();
  await expect(banner).toBeHidden();
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('low');
});
test('saved manual High takes precedence and suppresses automatic downgrade notice',async({page})=>{
  await constrained(page);
  await page.addInitScript(()=>localStorage.setItem('skyline-rush-vfx',
    JSON.stringify({quality:'high',preset:'extreme',enabled:true})));
  await page.goto('/');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('high');
  await expect(page.locator('#performance-notice')).toBeHidden();
});
test('high-capability fresh visitor keeps full graphics and sees no performance notice',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>12});
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>16});
  });
  await page.goto('/');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('high');
  await expect(page.locator('#performance-notice')).toBeHidden();
});
