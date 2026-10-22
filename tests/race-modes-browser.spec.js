import { test, expect } from '@playwright/test';

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
