import { test, expect } from './helpers/test.js';

async function closeMusicPrompt(page) {
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}

test('solo Time Attack shows real 3D preview, starts, and hides unused opponents', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="time"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'time');
  await expect(page.locator('button[data-race-mode="time"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#mode-description')).toContainText('Solo best-time');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await page.screenshot({ path: 'test-results/race-mode-time-attack.png' });
  expect(errors).toEqual([]);
});

test('custom 0-opponent race still starts; Classic remains selectable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await expect(page.locator('#race-mode-rules')).toBeVisible();
  await page.locator('[data-race-rule="rivals"]').evaluate(select => {
    select.value = '0';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await expect(page.locator('#leaderboard .racer')).toHaveCount(1, { timeout: 15000 });
  await page.screenshot({ path: 'test-results/race-mode-custom-solo.png' });
  expect(errors).toEqual([]);
});

test('Free Drive starts immediately without a countdown and keeps its return path', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="free"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'free');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.screenshot({ path: 'test-results/race-mode-free-drive.png' });
  expect(errors).toEqual([]);
});

test('Obstacle Run uses the original world renderer with visible race state', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="gauntlet"]').click();
  await expect(page.locator('#mode-description')).toContainText('Dodge barriers');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await page.screenshot({ path: 'test-results/race-mode-obstacle-run.png' });
  expect(errors).toEqual([]);
});

test('solo HUD never displays a misleading four-player race rank', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('.position-stat > div > span').first()).toHaveText('');
  await expect(page.locator('.position-stat .stat-label')).toHaveText('Time Attack');
  await expect(page.locator('#leaderboard')).toBeHidden();
});

test('mobile game mode picker remains operable on phone portrait', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="gauntlet"]').click();
  await expect(page.locator('button[data-race-mode="gauntlet"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#start-button')).toBeInViewport();
  await page.screenshot({ path: 'test-results/race-mode-mobile-menu.png' });
  expect(errors).toEqual([]);
});


test('Custom Race sprint stage selector displays the first of three heats', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('[data-race-rule="stages"]').evaluate(select => {
    select.value = '3';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#start-button').click();
  await expect(page.locator('#sprint-stage')).toBeVisible();
  await expect(page.locator('#sprint-stage')).toHaveText('STAGE 1 / 3');
  expect(errors).toEqual([]);
});

test('Checkpoint Rush displays the real 3D course and dynamic gate HUD', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('button[data-race-mode="checkpoint"]').click();
  await expect(page.locator('#mode-description')).toContainText('glowing gates');
  await page.locator('#start-button').click();
  await expect(page.locator('#checkpoint-hud')).toBeVisible();
  await expect(page.locator('#checkpoint-hud')).toContainText('GATES 0/');
  await page.screenshot({ path: 'test-results/race-mode-checkpoint-rush.png' });
  expect(errors).toEqual([]);
});

test('Extreme Obstacle Run updates its intensity setting and warning system', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('button[data-race-mode="gauntlet"]').click();
  await expect(page.locator('#gauntlet-rules')).toBeVisible();
  await page.locator('#hazard-tier').evaluate(select => {
    select.value = 'extreme';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode','gauntlet');
  await page.screenshot({ path:'test-results/race-mode-gauntlet-extreme.png' });
  expect(errors).toEqual([]);
});

test('Clean Time Trial shows accessible rule toggle and clean driving HUD', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.locator('button[data-race-mode="time"]').click();
  await expect(page.locator('#time-trial-rules')).toBeVisible();
  await page.locator('#time-trial-rules > summary').click();
  await expect(page.locator('#clean-trial')).toBeVisible();
  await page.locator('#clean-trial').check();
  await page.locator('#start-button').click();
  await expect(page.locator('#clean-trial-hud')).toBeVisible();
  await expect(page.locator('#clean-trial-hud')).toContainText('CLEAN RUN');
  await page.screenshot({path:'test-results/race-mode-clean-time-attack.png'});
  expect(errors).toEqual([]);
});

test('Championship Cup honestly requires three previously unlocked tracks', async ({ page }) => {
  await page.goto('/');
  await page.locator('button[data-race-mode="cup"]').click();
  await expect(page.locator('button[data-race-mode="cup"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#start-button')).toBeDisabled();
  await expect(page.locator('#track-note')).toContainText('Unlock at least 3 tracks');
});

test('Cup length cannot bypass locked tracks with Enter',async({page})=>{
 await page.goto('/');
 await page.locator('button[data-race-mode="cup"]').click();
 await page.locator('#cup-length').evaluate(select=>{
   select.value='5';select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await expect(page.locator('#track-note')).toContainText('Unlock at least 5 tracks');
 await expect(page.locator('#start-button')).toBeDisabled();
 await page.keyboard.press('Enter');
 await expect(page.locator('body')).toHaveAttribute('data-phase','ready');
});

test('Free Drive shows live, zeroed practice telemetry without showing rival rank', async ({ page }) => {
  const errors = [];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="free"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#practice-hud')).toBeVisible();
  await expect(page.locator('#practice-hud')).toContainText('AIR');
  await expect(page.locator('#practice-hud')).toContainText('TRICKS');
  await expect(page.locator('#practice-hud')).toContainText('COMBO');
  await expect(page.locator('#leaderboard')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Stunt Attack offers a timed score challenge with live arcade feedback', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="stunt"]').click();
  await expect(page.locator('#stunt-rules')).toBeVisible();
  await page.locator('#stunt-duration').evaluate(select => {
    select.value='180';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#start-button').click();
  await expect(page.locator('#stunt-hud')).toBeVisible();
  await expect(page.locator('#stunt-hud')).toContainText('COMBO');
  await expect(page.locator('#stunt-hud')).toContainText('HEAT 1');
  expect(errors).toEqual([]);
});

test('Stunt Attack displays its score HUD in a real desktop WebGL screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="stunt"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#stunt-hud')).toBeVisible();
  await page.screenshot({ path:'test-results/race-mode-stunt-attack.png' });
});
test('1920x1080 intro fits without clipping and VFX remains reachable after music consent', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await closeMusicPrompt(page);
  const overflow = await page.locator('#intro').evaluate(el => el.scrollHeight - el.clientHeight);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('#vfx-panel')).toHaveAttribute('open','');
  await page.screenshot({ path:'test-results/race-mode-layout-desktop.png' });
});

test('completed Custom setup appears as a recent preset without touching unlocks', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('#start-button').click();
  await page.reload();
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await expect(page.locator('#recent-custom')).toBeVisible();
  await page.locator('#recent-custom > summary').click();
  const preset=page.locator('#recent-custom-runs button').first();
  await expect(preset).toContainText('Coast');
  await preset.click();
  await expect(page.locator('[data-track="coast"]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'test-results/race-mode-recent-custom.png'});
});

test('Checkpoint Rush shows directional guidance and perfect gate counter', async ({ page }) => {
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="checkpoint"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#checkpoint-hud')).toBeVisible();
  await expect(page.locator('#checkpoint-hud')).toContainText('PERFECT 0');
  await expect(page.locator('#checkpoint-hud')).toContainText('NEXT');
  await page.screenshot({path:'test-results/race-mode-checkpoint-guidance.png'});
});

test('Custom active power-ups show a safe accessible item slot',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-rule="activeItems"]').check();
  await page.locator('#start-button').click();
  await expect(page.locator('#item-slot')).toBeVisible();
  await expect(page.locator('#item-status')).toContainText('EMPTY');
  await expect(page.locator('#activate-item')).toBeDisabled();
  await page.screenshot({path:'test-results/race-mode-active-items.png'});
  expect(errors).toEqual([]);
});

test('Elimination mode shows a live knockout countdown in actual WebGL',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="elimination"]').click();
  await expect(page.locator('#mode-description')).toContainText('knocked out');
  await page.locator('#start-button').click();
  await expect(page.locator('#elimination-hud')).toBeVisible();
  await expect(page.locator('#elimination-hud')).toContainText('KNOCKOUT');
  await page.screenshot({path:'test-results/race-mode-elimination.png'});
  expect(errors).toEqual([]);
});

test('Custom hazards toggle off, then render with safe physics and warning UI', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-rule="hazards"]').evaluate(select => {
    select.value = 'extreme';
    select.dispatchEvent(new Event('change',{ bubbles:true }));
  });
  await expect(page.locator('[data-race-rule="hazards"]')).toHaveValue('extreme');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode','custom');
  await expect(page.locator('body')).toHaveAttribute('data-phase',/countdown|racing/);
  await page.screenshot({path:'test-results/race-mode-custom-obstacles.png'});
  expect(errors).toEqual([]);
});

test('paused Free Drive supports orbit, lighting and local PNG export', async ({ page }) => {
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/');
  await closeMusicPrompt(page);
  await page.locator('button[data-race-mode="free"]').click();
  await page.locator('#start-button').click();
  await page.locator('#pause-button').click();
  await expect(page.locator('#photo-open')).toBeVisible();
  await page.locator('#photo-open').click();
  await expect(page.locator('#photo-screen')).toBeVisible();
  await page.locator('#photo-orbit').fill('135');
  await page.locator('#photo-fov').fill('45');
  await page.locator('#photo-sky').evaluate(select=>{
    select.value='sunset';select.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.screenshot({path:'test-results/race-mode-photo-studio.png'});
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#photo-save').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^skyline-rush-coast-.*\.png$/);
  await expect(page.locator('#photo-status')).toContainText('PNG prepared');
  await page.locator('#photo-close').click();
  await expect(page.locator('#photo-screen')).not.toBeVisible();
  expect(errors).toEqual([]);
});
