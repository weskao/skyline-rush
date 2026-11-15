import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('phone Studio entry text and shine stay inside the button in both locales', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const locale of ['en', 'zh-TW']) {
    await selectLocale(page, locale);
    await page.locator('#garage-button').click();
    const entry = page.locator('#garage-studio-open');
    await expect(entry).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const time of [0, 1200, 2400, 3200]) {
      const size = await entry.evaluate((el, time) => {
        for (const animation of el.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = time; }
        return { width: el.clientWidth, content: el.scrollWidth };
      }, time);
      expect(size.content, `${locale} shine at ${time} ms`).toBeLessThanOrEqual(size.width + 1);
    }
    await entry.click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    await page.locator('#garage-close').click();
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 740 }]) {
  test(`scenario 1 — Full-screen entry stays within safe viewport ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    // The BEFORE capture is the actual legacy Garage Home WebGL, never a generated mockup.
    const before = await page.locator('#garage-preview #world').screenshot();
    await test.info().attach(`garage-before-home-${viewport.width}x${viewport.height}.png`, { body: before, contentType: 'image/png' });
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const box = await page.locator('#garage-screen').boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 2);
    await expect(page.locator('#garage-close')).toBeInViewport();
    const preview = page.locator('#garage-preview');
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
    const bounds = JSON.parse((await preview.getAttribute('data-car-bounds')) ?? '{}');
    expect(bounds.maxX).toBeLessThan(0.94);
    expect(bounds.minX).toBeGreaterThan(-0.94);
    const shot = await page.locator('#garage-preview #world').screenshot();
    await test.info().attach(`garage-real-webgl-${viewport.width}x${viewport.height}`, { body: shot, contentType: 'image/png' });
    // The AFTER capture includes the real Vue controls so reviewers can compare against the GPT concept layouts.
    const fullStudio = await page.screenshot();
    await test.info().attach(`garage-after-studio-${viewport.width}x${viewport.height}.png`, { body: fullStudio, contentType: 'image/png' });
    const drawCalls = Number(await preview.getAttribute('data-draw-calls'));
    const triangles = Number(await preview.getAttribute('data-triangles'));
    expect(drawCalls).toBeGreaterThan(0);
    expect(triangles).toBeGreaterThan(0);
  });
}

test('scenario 2 — Orbit works with accessible camera buttons and drag', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.locator('[data-garage-angle="top"]').click();
  await expect(page.locator('[data-garage-angle="top"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#garage-reset').click();
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#garage-auto-rotate').click();
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#garage-preview').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#garage-zoom-in').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '0.850');
  await page.locator('#garage-zoom-out').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '0.977');
  await page.locator('#garage-preview').hover();
  await page.mouse.wheel(0, 100);
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '1.080');
});

test('Studio drag preserves the selected orbit mode when released', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: false })));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const preview = page.locator('#garage-preview');
  const orbit = page.locator('#garage-auto-rotate');
  const box = await preview.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (const view of ['preset', 'keyboard', 'orbit']) {
    if (view === 'preset') await page.locator('[data-garage-angle="side"]').click();
    else {
      await page.locator('#garage-reset').click();
      if (view === 'keyboard') await preview.press('ArrowLeft');
      else await orbit.click();
    }
    const autoRotate = String(view === 'orbit');
    await expect(orbit).toHaveAttribute('aria-pressed', autoRotate);
    const yaw = await preview.getAttribute('data-camera-yaw');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 50, y - 15);
    await expect(preview).not.toHaveAttribute('data-camera-yaw', yaw);
    await expect(orbit).toHaveAttribute('aria-pressed', 'false');
    const adjustedYaw = await preview.getAttribute('data-camera-yaw');
    await page.mouse.up();
    await expect(orbit).toHaveAttribute('aria-pressed', autoRotate);
    await expect(preview).toHaveAttribute('data-camera-yaw', adjustedYaw);
  }
});

for (const size of [{ width: 320, height: 740 }, { width: 667, height: 375 }]) {
  test(`Studio exposes the primary camera controls without scrolling at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.addInitScript(locale => {
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: false }));
      localStorage.setItem('skyline-rush-locale', locale);
    }, size.width === 320 ? 'zh-TW' : 'en');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    for (const control of ['garage-auto-rotate', 'garage-zoom-in', 'garage-zoom-out', 'garage-reset']) {
      const button = page.locator('#' + control);
      await expect(button).toBeInViewport({ ratio: .99 });
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('[data-garage-mode="flight"]').click();
    await page.locator('#garage-wing').click();
    await page.locator('#garage-auto-rotate').click();
    await page.locator('#garage-zoom-in').click();
    await page.locator('[data-garage-angle="side"]').click();
    const preview = page.locator('#garage-preview');
    await expect(preview).toHaveAttribute('data-camera-zoom', '0.850');
    await expect(page.locator('[data-garage-angle="side"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#garage-reset').click();
    await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'false');
    await expect(preview).toHaveAttribute('data-camera-zoom', '1.000');
    await expect(preview).toHaveAttribute('data-garage-mode', 'flight');
    await expect(preview).toHaveAttribute('data-garage-wing', 'true');
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Studio pinch keeps the adjusted zoom in a fixed view ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: false })));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    await page.locator('[data-garage-angle="front"]').click();
    const preview = page.locator('#garage-preview');
    const orbit = page.locator('#garage-auto-rotate');
    await expect(orbit).toHaveAttribute('aria-pressed', 'false');
    const box = await preview.boundingBox();
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height / 2);
    const left = { id: 1, x: x - 35, y };
    const right = { id: 2, x: x + 35, y };
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [left, { ...right, x: x + 55 }] });
    await expect(preview).toHaveAttribute('data-camera-zoom', '0.778');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(orbit).toHaveAttribute('aria-pressed', 'false');
    await expect(preview).toHaveAttribute('data-camera-zoom', '0.778');
    await expect(preview).toHaveAttribute('data-camera-yaw', '3.142');
  });
}

test('scenario 3 — Paint migration preserves original entitlement after preview and close', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#garage-button').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('aria-pressed', 'true');
});

test('scenario 4 — Browser back releases Studio without trapping race controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.goBack();
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
  await page.goBack();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).not.toHaveAttribute('data-phase', 'ready');
});

test('studio design — paint states and default restoration reflect actual ownership', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
  await expect(page.locator('[data-paint="obsidian"]')).toHaveAttribute('data-state', 'locked');
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await page.locator('#garage-restore-default').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-preview #world')).toBeVisible();
});

// Regression: the showroom is announced in the selected language, not as an English-only aria label.
test('garage showroom accessible label follows the active locale', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen .garage-visual')).toHaveAttribute('aria-label', '3D 車輛展示間');
  await page.locator('#garage-close').click();
  await selectLocale(page, 'en');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen .garage-visual')).toHaveAttribute('aria-label', '3D vehicle showroom');
});

test('restoring default paint persists an equipped owned finish across close and reopen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-stars', JSON.stringify({ coast: 3 }));
    localStorage.setItem('skyline-rush-paint', JSON.stringify('aurora'));
  });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="aurora"]')).toHaveAttribute('data-state', 'equipped');
  await page.locator('#garage-restore-default').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-paint')))).toBe('pearl');
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#garage-button').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
});

test('locked paint state is announced in active language without pretending it is owned', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="obsidian"]')).toHaveAttribute('aria-label', /未解鎖/);
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await expect(page.locator('#garage-restore-default')).toBeVisible();
});

test('camera remains in frame across all preset angles and zoom boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const preview = page.locator('#garage-preview');
  for (const angle of ['front', 'rear', 'side', 'top', 'cinematic']) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    for (let i = 0; i < 7; i++) await page.locator('#garage-zoom-in').click();
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
    for (let i = 0; i < 9; i++) await page.locator('#garage-zoom-out').click(); // 0.75 × 1.15⁹ ≥ 2.4 (8 clicks stop at 2.294)
    await expect(preview).toHaveAttribute('data-camera-zoom', '2.400'); // far enough for the full exhaust trail
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
  }
});

test('Studio entry advertises itself with a sheen and glow, and stills under Reduced Motion', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const entry = page.locator('#garage-studio-open');
  await expect(entry).toBeVisible();
  const animations = () => entry.evaluate(node => [getComputedStyle(node).animationName, getComputedStyle(node, '::after').animationName]);
  await expect.poll(animations).toEqual(['garage-entry-glow', 'garage-entry-sheen']);
  // The shared heading-button rule once repainted it flat #1b3044 over the accent gradient.
  expect(await entry.evaluate(node => getComputedStyle(node).backgroundImage)).toContain('linear-gradient'); // settled: static stylesheet
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(animations).toEqual(['none', 'none']);
});
