import { test, expect } from '@playwright/test';

const measureAudio = () => {
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    if (destination instanceof AudioDestinationNode) {
      const analyser = this.context.createAnalyser();
      connect.call(this, analyser);
      window.audioLevel = () => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
      };
    }
    return connect.call(this, destination, ...args);
  };
};
const audioSwitch = (page, name) => page.getByRole('switch', { name });

test('music and sound effects start on and each remember an off choice in a cookie', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'true');
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'true');
  await audioSwitch(page, 'Music').click();
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain('skyline-rush-music=off');
  await audioSwitch(page, 'Sound effects').click();
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain('skyline-rush-sound=off');
  await page.reload();
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'false');
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'false');
  await page.locator('#intro-title').click();
  await expect(page.locator('#settings-panel')).toBeHidden();
});

test('intro music plays after the first interaction and race music replaces it', async ({ page }) => {
  await page.addInitScript(measureAudio);
  await page.goto('/');
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await audioSwitch(page, 'Sound effects').click();
  await expect.poll(() => page.evaluate(() => window.audioLevel?.() ?? 0), { intervals: [50] }).toBeGreaterThan(0.001);
  await audioSwitch(page, 'Music').click();
  await expect.poll(() => page.evaluate(() => window.audioLevel())).toBeLessThan(0.0001);
  await audioSwitch(page, 'Music').click();
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(() => page.evaluate(() => window.audioLevel()), { intervals: [50] }).toBeGreaterThan(0.001);
});

test('countdown lights, automatic accelerator and brake work without holding the gas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Auto accelerate', exact: true }).click();
  await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('.start-lights')).toBeVisible();
  await expect(page.locator('#speed')).toHaveText('0');
  await page.screenshot({ path: 'artifacts/countdown-polish.png' });
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(80);
  await page.keyboard.down('s');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeLessThan(10);
  await page.keyboard.up('s');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(80);
  await page.keyboard.press('p');
  const distance = await page.locator('#distance').textContent();
  await page.waitForTimeout(250);
  await expect(page.locator('#distance')).toHaveText(distance);
  await page.keyboard.press('p');
  await page.keyboard.press('t');
  await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'false');
});

test('real audio output includes UI and countdown cues, then mutes and pauses cleanly', async ({ page }) => {
  await page.addInitScript(measureAudio);
  await page.addInitScript(() => { document.cookie = 'skyline-rush-music=off; Path=/'; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.audioLevel?.() ?? 0), { intervals: [20] }).toBeGreaterThan(0.001);
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'false');
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => page.evaluate(() => window.audioLevel())).toBeLessThan(0.0001);
  await audioSwitch(page, 'Sound effects').click();
  await expect.poll(() => page.evaluate(() => window.audioLevel())).toBeGreaterThan(0.001);
  await page.keyboard.press('p');
  await expect.poll(() => page.evaluate(() => window.audioLevel())).toBeLessThan(0.0001);
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await audioSwitch(page, 'Sound effects').click();
  await audioSwitch(page, 'Sound effects').click();
  await expect.poll(() => page.evaluate(() => window.audioLevel())).toBeLessThan(0.0001);
});

test('audio initialization failure leaves the silent game playable and retryable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    AudioContext.prototype.createBuffer = () => { throw new Error('Audio buffer unavailable'); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(30);
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'false');
  await audioSwitch(page, 'Sound effects').click();
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'false');
  await audioSwitch(page, 'Music').click();
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'false');
  expect(errors).toEqual([]);
});

test('desktop: start, drive, steer, fly, land, pause and restart through real controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The road is just the beginning.' })).toBeVisible();
  await expect(page.locator('canvas#world')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Audio settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Change camera' }).click();
  await expect(page.getByRole('button', { name: 'Change camera' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Change camera' }).click();
  await page.locator('#intro').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: 'artifacts/desktop-ready.png' });
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await page.getByRole('button', { name: 'Change camera' }).click();
  await page.getByRole('button', { name: 'Change camera' }).click();
  await page.keyboard.down('a');
  await page.waitForTimeout(250);
  await page.keyboard.up('a');
  await page.keyboard.down('Space');
  await expect(page.locator('#flight-mode')).toHaveText('FLIGHT MODE');
  await expect.poll(async () => parseFloat(await page.locator('#altitude').textContent())).toBeGreaterThan(3);
  await page.screenshot({ path: 'artifacts/desktop-flight.png' });
  await page.keyboard.up('Space');
  await expect(page.locator('#flight-mode')).toHaveText('ROAD MODE');
  await expect(page.locator('#altitude')).toHaveText('0.0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Take a breather.' })).toBeVisible();
  const distance = await page.locator('#distance').textContent();
  await page.waitForTimeout(300);
  await expect(page.locator('#distance')).toHaveText(distance);
  await page.getByRole('region', { name: 'Take a breather.' }).getByRole('button', { name: 'Resume race' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await page.getByRole('region', { name: 'Take a breather.' }).getByRole('button', { name: 'Resume race' }).click();
  await page.getByRole('button', { name: 'Restart race' }).click();
  await expect(page.locator('#speed')).toHaveText('0');
  await expect(page.locator('#fuel-value')).toHaveText('100');
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  expect(errors).toEqual([]);
});

test.describe('touch landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('rotating a phone keeps the driving controls visible', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start race' }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.getByRole('button', { name: 'Accelerate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hold to fly', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(page.locator('#countdown')).toBeHidden();
    await page.screenshot({ path: 'artifacts/mobile-landscape.png' });
  });
});

test('mobile: responsive layout and pointer controls support simultaneous driving and flight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.locator('#intro').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: 'artifacts/mobile-ready.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const throttle = page.getByRole('button', { name: 'Accelerate', exact: true });
  const fly = page.getByRole('button', { name: 'Hold to fly', exact: true });
  await throttle.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await fly.dispatchEvent('pointerdown', { pointerId: 2 });
  await expect(page.locator('#flight-mode')).toHaveText('FLIGHT MODE');
  await page.screenshot({ path: 'artifacts/mobile-flight.png' });
  await fly.dispatchEvent('pointercancel', { pointerId: 2 });
  await throttle.dispatchEvent('pointerup', { pointerId: 1 });
  await expect(page.locator('#flight-mode')).toHaveText('ROAD MODE');
  await expect(page.locator('#altitude')).toHaveText('0.0');
});

test('WebGL initialization failure offers an actionable error', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('WebGL');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeDisabled();
});

test('a page preserved for back navigation keeps its renderer, animation and inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(30);
});

test('a complete 5 km sprint reaches results, saves a best time and can race again', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(150);
  await page.keyboard.down('a');
  await page.waitForTimeout(220);
  await page.keyboard.up('a');
  await expect(page.locator('#skill-report')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#skill-report')).toContainText('CLOSE PASS');
  await expect(page.locator('#skill-report')).toContainText('CHARGE FULL');
  await page.screenshot({ path: 'artifacts/close-pass-polish.png' });
  await expect(page.locator('#race-status')).toHaveText('FINISHED', { timeout: 95000 });
  await page.keyboard.up('w');
  await expect(page.locator('#distance')).toHaveText('5.00');
  await expect(page.locator('#result-stats')).toBeVisible();
  expect(await page.evaluate(() => Number(localStorage.getItem('skyline-rush-best')))).toBeGreaterThan(50);
  await page.screenshot({ path: 'artifacts/race-results.png' });
  await page.getByRole('button', { name: 'Race again' }).click();
  await expect(page.locator('#distance')).toHaveText('0.00');
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
});

test('flight HUD explains ascent, descent, touchdown and recharging', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(110);
  await page.keyboard.down('Space');
  await expect(page.locator('#flight-state')).toHaveText(/ASCENDING|CRUISE/);
  await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeGreaterThan(3);
  await page.screenshot({ path: 'artifacts/flight-immersive.png' });
  await expect.poll(async () => Number(await page.locator('#fuel-value').textContent())).toBeLessThan(13);
  await page.keyboard.up('Space');
  await expect(page.locator('#flight-state')).toHaveText('DESCENDING');
  expect(await page.locator('#flight-instruction').textContent()).toContain('HOLD SPACE');
  await expect(page.locator('#flight-state')).toHaveText('TOUCHDOWN');
  await expect(page.locator('#flight-state')).toHaveText('READY TO FLY');
  await expect(page.locator('#fuel-caption')).toContainText('RECHARG');
});

test('guardrail collision shows impact feedback and recovers without blocking controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(110);
  await page.keyboard.down('d');
  await expect(page.locator('#impact-report')).toBeVisible();
  await expect(page.locator('#impact-report')).toContainText('GUARDRAIL');
  await page.keyboard.up('d');
  await page.screenshot({ path: 'artifacts/collision-immersive.png' });
  await expect(page.locator('#impact-report')).toBeHidden();
  const speed = Number(await page.locator('#speed').textContent());
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(speed + 10);
  expect(errors).toEqual([]);
});

test('reduced motion keeps flight instructions while hiding nonessential speed streaks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#flight-state')).toBeVisible();
  await expect(page.locator('.speed-streaks')).toHaveCSS('display', 'none');
});

test.describe('narrow touch screen', () => {
  test.use({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true });
  test('all six controls remain onscreen with usable touch targets', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start race' }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const bounds = await page.locator('#touch-controls button, .toolbar .icon-button').evaluateAll(buttons => buttons.map(button => {
      const { left, right, width, height } = button.getBoundingClientRect();
      return { left, right, width, height };
    }));
    expect(bounds).toHaveLength(11);
    for (const bound of bounds) {
      expect(bound.left).toBeGreaterThanOrEqual(0);
      expect(bound.right).toBeLessThanOrEqual(320);
      expect(bound.width).toBeGreaterThanOrEqual(44);
      expect(bound.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: 'artifacts/mobile-narrow.png' });
  });
});
