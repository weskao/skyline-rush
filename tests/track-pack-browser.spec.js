import { expect, test, waitForHome } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ startupSeen: false });

test('track chooser installs a versioned visual pack once, then reuses it after reload', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true }));
  });
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const card = page.locator('#lobby-track-options [data-track="coast"]');
  const download = page.locator('#lobby-track-options [data-pack-for="coast"]');
  await card.click();
  await expect(card).toHaveAttribute('data-pack-state', 'missing', { timeout: ciTimeout(10000) });
  await expect(download).toBeVisible();
  await expect(page.locator('#track-choose-pack-version')).toContainText('v1.0.0');
  await download.click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('track-download-mobile.png'), animations: 'disabled', scale: 'css' });
  const cachedImage = await card.locator('.track-preview img').getAttribute('src');
  await page.context().setOffline(true);
  let offlineCached = false;
  try {
    offlineCached = await page.evaluate(async url => {
      try { return (await fetch(url)).ok; } catch { return false; }
    }, cachedImage);
  } finally { await page.context().setOffline(false); }
  expect(offlineCached).toBe(true);

  await page.reload();
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeDisabled();
  await page.locator('#track-choose-confirm').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#world')).toBeVisible({ timeout: ciTimeout(20000) });
  await expect(page.locator('#world')).toHaveAttribute('data-race-load-ms', /^\d+\.\d$/);
});

test('track download indicator stays legible on a wide chooser', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true })));
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  await expect(page.locator('#track-choose-pack-version')).toBeVisible();
  const buttons = page.locator('#lobby-track-options .track-card-select');
  await expect(buttons.first()).toHaveAttribute('data-pack-state', /^(checking|missing|ready|update|unavailable)$/);
  await expect(page.locator('#track-choose-confirm')).toBeVisible();
  await expect(page.locator('#lobby-track-options [data-pack-for="coast"]')).toBeVisible({ timeout: ciTimeout(12000) });
  await page.screenshot({ path: testInfo.outputPath('track-download-desktop.png'), animations: 'disabled', scale: 'css' });
});

test('each track owns a separate circular download action and download-all skips cached packs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true })));
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const select = page.locator('#lobby-track-options [data-track="neon"]');
  const action = page.locator('#lobby-track-options [data-pack-for="neon"]');
  await expect(action).toBeVisible({ timeout: ciTimeout(12000) });
  await action.click();
  await expect(select).not.toHaveAttribute('aria-pressed', 'true');
  await expect(action).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute('data-pack-progress', '100');
  const all = page.locator('#track-choose-download-all');
  await expect(all).toBeVisible();
  await all.click();
  await expect(page.locator('#track-choose-pack-summary')).toContainText('16/16', { timeout: ciTimeout(45000) });
  await expect(all).toBeDisabled();
  await expect(page.locator('#lobby-track-options .track-pack-action')).toHaveCount(16);
});

test('update and retry states use the refresh glyph, not the download glyph', async ({ page }) => {
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const action = page.locator('#lobby-track-options [data-pack-for="coast"]');
  await expect(action).toBeVisible({ timeout: ciTimeout(12000) });
  await action.evaluate(node => { node.dataset.packState = 'update'; });
  await expect.poll(() => action.locator('.track-pack-update-glyph').evaluate(node => getComputedStyle(node).display)).toBe('block');
  await expect.poll(() => action.locator('.track-pack-download-glyph').evaluate(node => getComputedStyle(node).display)).toBe('none');
});

test('old downloaded map opens mandatory update dialog and cannot enter until updated', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true })));
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.evaluate(async () => {
    const base = new URL(document.baseURI);
    const key = new URL('.skyline-packs/coast/low/track', base);
    await (await caches.open('skyline-rush:track-pack-receipts:v1')).put(key.href, new Response(JSON.stringify({ version: '0.9.0', signature: 'old-release' })));
  });
  await page.locator('#start-button').click();
  const gate = page.locator('#track-required-update');
  await expect(gate).toBeVisible({ timeout: ciTimeout(10000) });
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('#track-update-cancel').click();
  await expect(gate).toBeHidden();
  await page.locator('#start-button').click();
  await expect(gate).toBeVisible();
  await page.locator('#track-update-now').click();
  await expect(gate).toBeHidden({ timeout: ciTimeout(15000) });
  await expect(page.locator('#intro')).toBeHidden({ timeout: ciTimeout(20000) });
});

test('generated WebP atlas switches hover/update frames without resizing touch target', async ({ page }) => {
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const action = page.locator('#lobby-track-options [data-pack-for="coast"]');
  await expect(action).toBeVisible({ timeout: ciTimeout(12000) });
  const frame = () => action.evaluate(node => {
    const style = getComputedStyle(node, '::before');
    return { image: style.backgroundImage, position: style.backgroundPosition, size: getComputedStyle(node).width };
  });
  await expect.poll(async () => (await frame()).image).toContain('track-pack-icons');
  await expect.poll(async () => (await frame()).position).toBe('0% 0%');
  const originalSize = (await frame()).size;
  await action.hover();
  await expect.poll(async () => (await frame()).position).toBe('100% 0%');
  await action.evaluate(node => { node.dataset.packState = 'update'; });
  await expect.poll(async () => (await frame()).position).toBe('100% 100%');
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await frame()).position).toBe('0% 100%');
  expect((await frame()).size).toBe(originalSize);
});

test('download controls preserve mobile sightlines and accessible touch area', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1024, 768], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    const measured = await page.evaluate(() => {
      const dialog = document.querySelector('#track-chooser').getBoundingClientRect();
      const action = document.querySelector('#lobby-track-options [data-pack-for="coast"]').getBoundingClientRect();
      const footer = document.querySelector('.track-chooser-footer').getBoundingClientRect();
      return { dialog: { top: dialog.top, bottom: dialog.bottom, height: dialog.height },
        action: { width: action.width, height: action.height }, footerBottom: footer.bottom };
    });
    expect(measured.dialog.height, `chooser obstruction at ${width}x${height}`).toBeLessThanOrEqual(height * .86 + 1);
    expect(measured.dialog.top, `game background hidden at ${width}x${height}`).toBeGreaterThanOrEqual(0);
    expect(measured.footerBottom, `footer clipped at ${width}x${height}`).toBeLessThanOrEqual(height + 1);
    expect(measured.action.width, `touch area width at ${width}x${height}`).toBeGreaterThanOrEqual(44);
    expect(measured.action.height, `touch area height at ${width}x${height}`).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath(`track-download-compact-${width}x${height}.png`), animations: 'disabled', scale: 'css' });
  }
});

test('per-track icon stays bottom-right without covering distance on desktop and phones', async ({ page }) => {
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const action = page.locator('#lobby-track-options [data-pack-for="coast"]');
  await expect(action).toBeVisible({ timeout: ciTimeout(12000) });
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('#lobby-track-options [data-track="coast"]');
      const button = card.parentElement.querySelector('.track-pack-action');
      const distance = card.querySelector(':scope > span:last-child');
      const c = card.getBoundingClientRect(), b = button.getBoundingClientRect();
      const d = distance.getBoundingClientRect();
      return { right: c.right - b.right, bottom: c.bottom - b.bottom, width: b.width, height: b.height,
        availableDistanceRight: d.right - parseFloat(getComputedStyle(distance).paddingRight), actionLeft: b.left };
    });
    expect(geometry.right, `right gap at ${width}x${height}`).toBeGreaterThanOrEqual(0);
    expect(geometry.right, `right gap at ${width}x${height}`).toBeLessThanOrEqual(10);
    expect(geometry.bottom, `bottom gap at ${width}x${height}`).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom, `bottom gap at ${width}x${height}`).toBeLessThanOrEqual(10);
    expect(geometry.width).toBeGreaterThanOrEqual(44);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.availableDistanceRight, `distance overlaps icon at ${width}x${height}`)
      .toBeLessThanOrEqual(geometry.actionLeft + 1);
  }
});
