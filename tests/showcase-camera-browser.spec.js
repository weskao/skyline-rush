import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';

test('ready screen offers a discoverable camera dock across all tracks',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#showcase-camera-dock')).toBeVisible();
  for(const id of Object.keys(RACE_TRACKS)){
    await page.locator(`[data-track="${id}"]`).click();
    await expect(page.locator('#showcase-camera-dock')).toBeVisible();
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view',/front|rear|left|right|orbit|drive/);
  }
});

test('home camera cycles independently of AIRFLOW and follows language changes',async({page})=>{
  await page.goto('/');
  const dock=page.locator('#showcase-camera-dock');
  await expect(dock).toHaveAttribute('data-view','drive');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed','false');
  await page.locator('#showcase-camera-next').click();
  await expect(dock).toHaveAttribute('data-view','front');
  await expect(page.locator('#showcase-camera-name')).toContainText('Front');
  await page.locator('#showcase-camera-prev').click();
  await expect(dock).toHaveAttribute('data-view','drive');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed','false');
});

for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  test(`home camera dock stays interactive at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#showcase-camera-next')).toBeVisible();
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view','front');
  });
}
