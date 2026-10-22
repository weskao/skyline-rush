import { test, expect } from '@playwright/test';

// The served index.html names a newer entry script than the running page: the app reloads once and then stops,
// even though the server keeps answering with the same "newer" page (a stuck edge cache).
test('a newer served build reloads the intro once, never in a loop', async ({ page }) => {
  let fetches = 0;
  await page.route('**/', async route => {
    const response = await route.fetch();
    if (route.request().resourceType() !== 'fetch') return route.fulfill({ response });
    fetches++;
    const body = (await response.text()).replace(/assets\/index-[^"]+\.js/, 'assets/index-NEWBUILD.js');
    return route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.waitForEvent('load'); // the reload the stale check triggers
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect.poll(() => fetches).toBeGreaterThanOrEqual(2); // the reloaded page checked again…
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => fetches).toBeGreaterThanOrEqual(3); // …and so did the resume
  expect(await page.evaluate(() => sessionStorage.getItem('skyline-rush-reloaded-for'))).toBe('/assets/index-NEWBUILD.js');
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1); // no further reload after the first
});
