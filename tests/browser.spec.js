import { test, expect, chromium } from '@playwright/test';

const slow = process.env.CI ? 3 : 1; // CPU-only CI renders WebGL slowly; see playwright.config.js

// Where autoplay is blocked (CI runners), the music prompt appears after 600ms over the settings buttons.
const dismissMusicPrompt = async page => {
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

// Touch players default to slide steering; legacy button tests pin Buttons mode (and any other prefs) before the page loads.
const useControls = (page, prefs) => page.addInitScript(prefs => localStorage.setItem('skyline-rush-controls', JSON.stringify({ version: 1, ...prefs })), prefs);

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

test('airflow showcase, presets, views and boost coexist without shader errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.keyboard.press('v');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#speed')).toHaveText('0');
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="aeroMode"]').selectOption('downforce');
  await expect(page.locator('#aero-mode')).toHaveText('HIGH DOWNFORCE');
  for (const preset of ['realistic', 'extreme', 'cinematic']) await page.locator('[data-vfx="preset"]').selectOption(preset);
  for (const quality of ['low', 'medium', 'high']) await page.locator('[data-vfx="quality"]').selectOption(quality);
  for (const view of ['front', 'left', 'right', 'orbit', 'rear']) {
    await page.locator('[data-vfx="view"]').selectOption(view);
    await page.waitForTimeout(250);
  }
  await page.locator('#vfx-panel > summary').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'artifacts/aero-downforce.jpeg', quality: 70 });
  await page.getByRole('button', { name: 'Start race from showcase', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w'); await page.keyboard.down('Shift');
  await expect(page.locator('#boost-status')).toHaveText('THRUST ACTIVE');
  await expect.poll(async () => Number(await page.locator('#fuel-value').textContent())).toBeLessThan(98);
  await page.keyboard.press('v');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#boost-status')).toHaveText('THRUST ACTIVE');
  await page.keyboard.up('Shift');
  await expect(page.locator('#boost-status')).toHaveText('RECHARGING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await page.keyboard.press('r');
  await expect(page.locator('#fuel-value')).toHaveText('100');
  await expect(page.locator('#speed')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('starting with a VFX control focused hands the keyboard back to driving', async ({ page }) => {
  await page.goto('/');
  await dismissMusicPrompt(page);
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="preset"]').focus();
  // Safari and Firefox on macOS do not move focus to a clicked button.
  await page.locator('#start-button').evaluate(button => button.click());
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect(page.locator('#vfx-panel')).not.toHaveAttribute('open');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(20);
  await page.keyboard.down('d');
  await expect.poll(async () => parseFloat(await page.evaluate(() => document.body.style.getPropertyValue('--flight-bank')))).toBeLessThan(-2);
});

test('mobile VFX controls fit, persist and respect reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await dismissMusicPrompt(page);
  await page.locator('#airflow-toggle').click();
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="comfortable"]').check();
  await page.locator('[data-vfx="quality"]').selectOption('low');
  const panel = await page.locator('.vfx-settings').boundingBox();
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(360);
  expect(panel.y + panel.height).toBeLessThanOrEqual(780);
  await page.screenshot({ path: 'artifacts/aero-settings-mobile.jpeg', quality: 70 });
  await page.reload();
  await dismissMusicPrompt(page);
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('[data-vfx="comfortable"]')).toBeChecked();
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('low');
  await expect(page.locator('.speed-streaks')).toBeHidden();
  await page.locator('[data-vfx="enabled"]').uncheck();
  await expect(page.locator('#airflow-toggle')).toBeDisabled();
  await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#vfx-panel > summary').click();
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
});

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

const musicPrompt = page => page.getByRole('group', { name: 'Play background music?' });
// Playwright's autoplay behavior differs from a fresh visit, so emulate a browser that holds audio until a real gesture.
const blockAutoplay = () => {
  let gesture = false;
  for (const type of ['click', 'keydown']) window.addEventListener(type, () => { gesture = true; }, { capture: true });
  window.AudioContext = class extends AudioContext {
    constructor(...args) { super(...args); super.suspend(); }
    resume() { return gesture ? super.resume() : new Promise(() => {}); }
  };
};

test('where autoplay is allowed, intro music starts on page load without a prompt', async ({ baseURL }) => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    await page.addInitScript(measureAudio);
    await page.goto(baseURL);
    await expect.poll(() => page.evaluate(() => window.audioLevel?.() ?? 0), { intervals: [50] }).toBeGreaterThan(0.001);
    await page.waitForTimeout(1000);
    await expect(musicPrompt(page)).toBeHidden();
  } finally {
    await browser.close();
  }
});

test('where autoplay is blocked, the start screen asks to play music', async ({ page }) => {
  await page.addInitScript(blockAutoplay);
  await page.addInitScript(measureAudio);
  await page.goto('/');
  await expect(musicPrompt(page)).toBeVisible();
  expect(await page.evaluate(() => window.audioLevel?.() ?? 0)).toBeLessThan(0.0001);
  await musicPrompt(page).getByRole('button', { name: 'Play music' }).click();
  await expect(musicPrompt(page)).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.audioLevel?.() ?? 0), { intervals: [50] }).toBeGreaterThan(0.001);
});

test('declining the music prompt turns music off and keeps sound effects on', async ({ page }) => {
  await page.addInitScript(blockAutoplay);
  await page.goto('/');
  await musicPrompt(page).getByRole('button', { name: 'Not now' }).click();
  await expect(musicPrompt(page)).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain('skyline-rush-music=off');
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await expect(audioSwitch(page, 'Music')).toHaveAttribute('aria-checked', 'false');
  await expect(audioSwitch(page, 'Sound effects')).toHaveAttribute('aria-checked', 'true');
});

test('a saved music-off choice skips the prompt', async ({ page }) => {
  await page.addInitScript(blockAutoplay);
  await page.addInitScript(() => { document.cookie = 'skyline-rush-music=off; Path=/'; });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(musicPrompt(page)).toBeHidden();
});

test('countdown lights, automatic accelerator and brake work without holding the gas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Auto accelerate', exact: true }).click();
  await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('.start-lights')).toBeVisible();
  await expect(page.locator('#speed')).toHaveText('0');
  await page.screenshot({ path: 'artifacts/countdown-polish.jpeg', quality: 70 });
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
  await page.screenshot({ path: 'artifacts/desktop-ready.jpeg', quality: 70 });
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
  await page.screenshot({ path: 'artifacts/desktop-flight.jpeg', quality: 70 });
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
    await page.screenshot({ path: 'artifacts/mobile-landscape.jpeg', quality: 70 });
  });
});

test('mobile: responsive layout and pointer controls support simultaneous driving and flight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.locator('#intro').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: 'artifacts/mobile-ready.jpeg', quality: 70 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const throttle = page.getByRole('button', { name: 'Accelerate', exact: true });
  const fly = page.getByRole('button', { name: 'Hold to fly', exact: true });
  await throttle.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await fly.dispatchEvent('pointerdown', { pointerId: 2 });
  await expect(page.locator('#flight-mode')).toHaveText('FLIGHT MODE');
  await page.screenshot({ path: 'artifacts/mobile-flight.jpeg', quality: 70 });
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
  test.setTimeout(120000 * slow);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(150);
  await page.keyboard.down('a');
  await page.waitForTimeout(220);
  await page.keyboard.up('a');
  await expect(page.locator('#skill-report')).toBeVisible({ timeout: 15000 * slow });
  await expect(page.locator('#skill-report')).toContainText('CLOSE PASS');
  await expect(page.locator('#skill-report')).toContainText('CHARGE FULL');
  await page.screenshot({ path: 'artifacts/close-pass-polish.jpeg', quality: 70 });
  await expect(page.locator('#race-status')).toHaveText('FINISHED', { timeout: 95000 * slow });
  await page.keyboard.up('w');
  await expect(page.locator('#distance')).toHaveText('5.00');
  await expect(page.locator('#result-stats')).toBeVisible();
  expect(await page.evaluate(() => Number(localStorage.getItem('skyline-rush-best')))).toBeGreaterThan(50);
  await page.screenshot({ path: 'artifacts/race-results.jpeg', quality: 70 });
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
  await page.screenshot({ path: 'artifacts/flight-immersive.jpeg', quality: 70 });
  // Sample inside the ~0.7s low-charge window before automatic landing begins.
  await expect.poll(async () => Number(await page.locator('#fuel-value').textContent()), { intervals: [50] }).toBeLessThan(13);
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
  await page.screenshot({ path: 'artifacts/collision-immersive.jpeg', quality: 70 });
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
    await useControls(page, { mode: 'buttons' });
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
    await page.screenshot({ path: 'artifacts/mobile-narrow.jpeg', quality: 70 });
  });
});

test.describe('phone game gestures', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('long press and simultaneous touches stay in the game and release cleanly', async ({ page, context }) => {
    await useControls(page, { mode: 'buttons' });
    await page.goto('/');
    const title = page.locator('h1');
    await expect(title).toHaveCSS('user-select', 'none');
    for (const type of ['contextmenu', 'dragstart']) {
      expect(await title.evaluate((element, type) => element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })), type)).toBe(false);
    }
    // Touch starts with AUTO on, which shows the gas as held; turn it off so the gas button reflects only the finger.
    await page.locator('#assist-button').tap();
    await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Start race' }).tap();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const gas = page.locator('[data-control="throttle"]');
    const left = page.locator('[data-control="left"]');
    const session = await context.newCDPSession(page);
    const point = async (locator, id) => {
      const box = await locator.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(56);
      return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const gasPoint = await point(gas, 1);
    const leftPoint = await point(left, 2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gasPoint] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gasPoint, leftPoint] });
    await expect(gas).toHaveClass(/is-held/);
    await expect(left).toHaveClass(/is-held/);
    await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(30);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [leftPoint] });
    await expect(left).not.toHaveClass(/is-held/);
    await expect(gas).toHaveClass(/is-held/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(gas).not.toHaveClass(/is-held/);
    expect(await page.evaluate(() => getSelection().toString())).toBe('');
    expect(await page.evaluate(() => [scrollX, scrollY, visualViewport.scale])).toEqual([0, 0, 1]);
    await page.screenshot({ path: 'artifacts/mobile-touch-controls.jpeg', quality: 70 });
    await session.detach();
  });
});

// Real touches: CDP Input.dispatchTouchEvent produces trusted pointer events, which the slide pad and ring/knob mirror listen to.
const touchDriver = async (page, context) => {
  const session = await context.newCDPSession(page);
  return (type, ...touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
};
const centerOf = async (locator, fy = 0.5) => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * fy };
};
const bank = page => page.evaluate(() => parseFloat(document.body.style.getPropertyValue('--flight-bank')));
const speedOf = async page => Number(await page.locator('#speed').textContent());
const startTouchRace = async page => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).tap();
  await expect(page.locator('#race-status')).toHaveText('RACING');
};
// Touch-down inside the pad, then drag by (dx, dy) in steps; the finger stays down.
const slideFrom = async (send, start, dx, dy) => {
  await send('touchStart', { id: 1, ...start });
  for (let i = 1; i <= 4; i++) await send('touchMove', { id: 1, x: start.x + dx * i / 4, y: start.y + dy * i / 4 });
};
const visibleBounds = page => page.locator('#touch-controls button, .touch-pad, .toolbar .icon-button, .toolbar .controls-button').evaluateAll(elements => elements
  .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
  .map(element => {
    const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
    return { name: element.getAttribute('aria-label') ?? element.className, pad: element.classList.contains('touch-pad'), left, right, top, bottom, width, height };
  }));

for (const [width, height] of [[390, 844], [320, 740], [844, 390]]) {
  test.describe(`touch controls ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('slide pad steers by direction, releases straight and brakes on a downward pull', async ({ page, context }) => {
      const send = await touchDriver(page, context);
      await startTouchRace(page);
      const pad = page.locator('.touch-pad');
      const control = page.locator('#touch-controls');
      await expect(control).toHaveAttribute('data-steer-mode', 'slide');
      await expect(pad).toBeVisible();
      const start = await centerOf(pad, 0.3);
      await slideFrom(send, start, 45, 0);
      await expect.poll(() => bank(page)).toBeLessThan(-1); // --flight-bank is -steering * 5deg: right steer is negative
      const [ring, knob] = await Promise.all([page.locator('.pad-ring').boundingBox(), page.locator('.pad-knob').boundingBox()]);
      expect(knob.x + knob.width / 2 - (ring.x + ring.width / 2)).toBeGreaterThan(30);
      await send('touchEnd');
      await expect.poll(async () => Math.abs(await bank(page))).toBeLessThan(0.5);
      await slideFrom(send, start, -45, 0);
      await expect.poll(() => bank(page)).toBeGreaterThan(1);
      await send('touchEnd');
      await expect.poll(async () => Math.abs(await bank(page))).toBeLessThan(0.5);
      await expect(control).not.toHaveAttribute('data-pad-brake');
      await expect.poll(() => speedOf(page)).toBeGreaterThan(60);
      const before = await speedOf(page);
      await slideFrom(send, start, 0, 60);
      await expect(control).toHaveAttribute('data-pad-brake', 'true');
      await expect.poll(() => speedOf(page)).toBeLessThan(before - 10);
      await send('touchEnd');
      await expect(control).not.toHaveAttribute('data-pad-brake');
    });

    test('Controls panel switches mode, hand and size, persists them and can reset', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const control = page.locator('#touch-controls');
      const choose = (key, value) => page.locator(`[data-controls="${key}"][value="${value}"]`).check();
      const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')));
      const scale = () => control.evaluate(element => element.style.getPropertyValue('--touch-scale'));
      await page.goto('/');
      await dismissMusicPrompt(page);
      await page.locator('#controls-button').tap();
      await expect(page.locator('#controls-panel')).toBeVisible();
      await expect(control).toHaveAttribute('data-steer-mode', 'slide');
      await expect(control).toHaveAttribute('data-hand', 'left');
      expect(await scale()).toBe('1');
      await choose('mode', 'buttons');
      await expect(control).toHaveAttribute('data-steer-mode', 'buttons');
      await choose('hand', 'right');
      await expect(control).toHaveAttribute('data-hand', 'right');
      await choose('size', 'L');
      expect(await scale()).toBe('1.15');
      await page.locator('[data-controls="opacity"]').fill('0.6');
      await expect.poll(() => control.evaluate(element => element.style.getPropertyValue('--touch-opacity'))).toBe('0.6');
      expect(await stored()).toMatchObject({ mode: 'buttons', hand: 'right', size: 'L', opacity: 0.6, version: 1 });
      await page.reload();
      await expect(control).toHaveAttribute('data-steer-mode', 'buttons');
      await expect(control).toHaveAttribute('data-hand', 'right');
      expect(await scale()).toBe('1.15');
      await dismissMusicPrompt(page);
      await page.locator('#controls-button').tap();
      await expect(page.locator('[data-controls="mode"][value="buttons"]')).toBeChecked();
      await page.locator('#controls-reset').tap();
      await expect(control).toHaveAttribute('data-steer-mode', 'slide');
      await expect(control).toHaveAttribute('data-hand', 'left');
      expect(await stored()).toMatchObject({ mode: 'slide', hand: 'left', size: 'M', opacity: 0.9 });
      await choose('mode', 'buttons');
      await page.keyboard.press('Escape');
      await expect(page.locator('#controls-panel')).toBeHidden();
      await page.getByRole('button', { name: 'Start race' }).tap();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      await expect(page.locator('.touch-pad')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Steer left' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Steer right' })).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('corrupt saved controls fall back to the defaults without crashing', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('skyline-rush-controls', '{"mode": buttons'));
      await page.goto('/');
      const control = page.locator('#touch-controls');
      await expect(control).toHaveAttribute('data-steer-mode', 'slide');
      await expect(control).toHaveAttribute('data-hand', 'left');
      expect(await control.evaluate(element => element.style.getPropertyValue('--touch-scale'))).toBe('1');
      await page.getByRole('button', { name: 'Start race' }).tap();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      expect(errors).toEqual([]);
    });

    test('AUTO accelerator is on by default and the FLY button holds while the finger is down', async ({ page, context }) => {
      const send = await touchDriver(page, context);
      await page.goto('/');
      await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Start race' }).tap();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      await expect.poll(() => speedOf(page)).toBeGreaterThan(40); // no gas touch: AUTO is accelerating
      const fly = page.getByRole('button', { name: 'Hold to fly', exact: true });
      await send('touchStart', { id: 1, ...await centerOf(fly) });
      await expect(fly).toHaveAttribute('aria-pressed', 'true');
      await send('touchEnd');
      await expect(fly).toHaveAttribute('aria-pressed', 'false');
    });

    test('toggle FLY mode latches on a tap and releases on the next tap', async ({ page, context }) => {
      const send = await touchDriver(page, context);
      await useControls(page, { flyMode: 'toggle' });
      await startTouchRace(page);
      const fly = page.locator('[data-control="fly"]');
      await expect(fly).toHaveAttribute('aria-label', 'Tap to fly');
      const point = await centerOf(fly);
      await send('touchStart', { id: 1, ...point });
      await send('touchEnd');
      await expect(fly).toHaveAttribute('aria-pressed', 'true');
      await expect(fly).toHaveAttribute('aria-label', 'Tap to land');
      await page.waitForTimeout(300);
      await expect(fly).toHaveAttribute('aria-pressed', 'true');
      await send('touchStart', { id: 1, ...point });
      await send('touchEnd');
      await expect(fly).toHaveAttribute('aria-pressed', 'false');
      await expect(fly).toHaveAttribute('aria-label', 'Tap to fly');
    });

    // Drag 30px right inside the pad, let the bank settle, return |--flight-bank|, then lift the finger (race already running).
    const dragBank = async (page, send) => {
      await slideFrom(send, await centerOf(page.locator('.touch-pad'), 0.3), 30, 0);
      await page.waitForTimeout(500);
      const value = Math.abs(await bank(page));
      await send('touchEnd');
      return value;
    };
    const chooseInPanel = async (page, key, value) => {
      await dismissMusicPrompt(page);
      await page.locator('#controls-button').tap();
      await page.locator(`[data-controls="${key}"][value="${value}"]`).check();
      await page.keyboard.press('Escape');
      await expect(page.locator('#controls-panel')).toBeHidden();
    };
    const savedControls = page => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')));

    test('slide sensitivity radio changes how far a drag steers', async ({ page, context }) => {
      const send = await touchDriver(page, context);
      const measured = {};
      for (const lock of [40, 80]) {
        await page.goto('/');
        await chooseInPanel(page, 'fullLock', lock);
        expect(await savedControls(page)).toMatchObject({ fullLock: lock });
        await page.getByRole('button', { name: 'Start race' }).tap();
        await expect(page.locator('#race-status')).toHaveText('RACING');
        measured[lock] = await dragBank(page, send);
      }
      expect(measured[80], 'Low still steers').toBeGreaterThan(0.5);
      expect(measured[40]).toBeGreaterThan(measured[80] * 1.6);
    });

    test('seeded slide sensitivity steers less at Low than at High', async ({ context }) => {
      const measured = {};
      for (const fullLock of [40, 80]) {
        const page = await context.newPage();
        await useControls(page, { fullLock });
        await startTouchRace(page);
        measured[fullLock] = await dragBank(page, await touchDriver(page, context));
        await page.close();
      }
      expect(measured[80], 'Low still steers').toBeGreaterThan(0.5);
      expect(measured[40]).toBeGreaterThan(measured[80] * 1.6);
    });

    test('FLY behavior radio switches to toggle', async ({ page, context }) => {
      const send = await touchDriver(page, context);
      await page.goto('/');
      await chooseInPanel(page, 'flyMode', 'toggle');
      expect(await savedControls(page)).toMatchObject({ flyMode: 'toggle' });
      await page.getByRole('button', { name: 'Start race' }).tap();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      const fly = page.locator('[data-control="fly"]');
      await expect(fly).toHaveAttribute('aria-label', 'Tap to fly');
      await send('touchStart', { id: 1, ...await centerOf(fly) });
      await send('touchEnd');
      await expect(fly).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(300);
      await expect(fly).toHaveAttribute('aria-pressed', 'true');
    });

    test('right hand in Buttons mode mirrors the steering buttons', async ({ page }) => {
      const centerX = async name => {
        const box = await page.getByRole('button', { name, exact: true }).boundingBox();
        return box.x + box.width / 2;
      };
      for (const hand of ['left', 'right']) {
        await useControls(page, { mode: 'buttons', hand });
        await startTouchRace(page);
        await expect(page.locator('.touch-pad')).toBeHidden();
        const steer = hand === 'right' ? (x => x > width / 2) : (x => x < width / 2);
        const actions = hand === 'right' ? (x => x < width / 2) : (x => x > width / 2);
        for (const name of ['Steer left', 'Steer right']) expect(steer(await centerX(name)), `${hand} ${name}`).toBe(true);
        // Landscape centers the FLY/BOOST cluster between steering and pedals (it straddles the midline), so only portrait puts it wholly opposite the steering.
        for (const name of ['Brake', 'Accelerate', ...height > width ? ['Hold to fly', 'Hold to boost'] : []]) expect(actions(await centerX(name)), `${hand} ${name}`).toBe(true);
      }
    });

    test('slide pad covers the bottom 45% of the steering half', async ({ page }) => {
      await startTouchRace(page);
      await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', 'left');
      const box = await page.locator('.touch-pad').boundingBox();
      expect(Math.abs(box.height - height * 0.45)).toBeLessThanOrEqual(2);
      expect(Math.abs(box.y + box.height - height)).toBeLessThanOrEqual(2);
      expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
      expect(box.x + box.width).toBeLessThanOrEqual(width / 2);
    });

    test('handedness right mirrors the pad and the action buttons', async ({ page }) => {
      const actionCenters = async () => Object.fromEntries(await Promise.all(['Hold to fly', 'Hold to boost', 'Accelerate'].map(async name => {
        const box = await page.getByRole('button', { name, exact: true }).boundingBox();
        return [name, box.x + box.width / 2];
      })));
      for (const hand of ['left', 'right']) {
        await useControls(page, { hand });
        await startTouchRace(page);
        await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', hand);
        const box = await page.locator('.touch-pad').boundingBox();
        if (hand === 'right') {
          expect(box.x).toBeGreaterThanOrEqual(width / 2 - 1);
          expect(Math.abs(box.x + box.width - width)).toBeLessThanOrEqual(1);
        } else {
          expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
          expect(box.x + box.width).toBeLessThanOrEqual(width / 2);
        }
        for (const [name, x] of Object.entries(await actionCenters())) {
          if (hand === 'right') expect(x, `${hand} ${name}`).toBeLessThan(width / 2);
          else expect(x, `${hand} ${name}`).toBeGreaterThan(width / 2);
        }
      }
    });

    for (const mode of ['slide', 'buttons']) {
      test(`${mode} mode: every visible control stays onscreen with a 44px touch target`, async ({ page }) => {
        test.setTimeout(90000 * slow);
        for (const size of ['M', 'L']) {
          await useControls(page, { mode, size });
          await page.goto('/');
          await page.getByRole('button', { name: 'Start race' }).tap();
          await expect(page.locator('#touch-controls')).toBeVisible();
          const bounds = await visibleBounds(page);
          const touchButtons = bounds.filter(bound => !bound.pad && !/Auto|Audio|camera|Pause|Restart|Controls/i.test(bound.name));
          expect(touchButtons.map(bound => bound.name).sort(), `${mode} ${size}`).toEqual(mode === 'slide'
            ? ['Accelerate', 'Hold to boost', 'Hold to fly']
            : ['Accelerate', 'Brake', 'Hold to boost', 'Hold to fly', 'Steer left', 'Steer right']);
          expect(bounds.some(bound => bound.pad)).toBe(mode === 'slide');
          for (const bound of bounds) {
            const label = `${mode} ${size} ${bound.name}`;
            expect(bound.left, label).toBeGreaterThanOrEqual(0);
            expect(bound.top, label).toBeGreaterThanOrEqual(0);
            expect(bound.right, label).toBeLessThanOrEqual(width);
            expect(bound.bottom, label).toBeLessThanOrEqual(height);
            if (!bound.pad) {
              expect(bound.width, label).toBeGreaterThanOrEqual(44);
              expect(bound.height, label).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });
    }
  });
}
