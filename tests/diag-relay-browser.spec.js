import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

// Boots its own VITE_DIAG=1 dev server: the shared config serves the production preview, which has no relay by design.
const port = Number(process.env.DIAG_RELAY_PORT || 5191);
const base = `http://127.0.0.1:${port}`;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
let server, dir;

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE });
test.setTimeout(ciTimeout(120000));

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'diag-relay-'));
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { env: { ...process.env, VITE_DIAG: '1', DIAG_LOG_DIR: dir }, stdio: 'ignore' });
  await expect.poll(() => fetch(base).then(response => response.ok, () => false), { timeout: ciTimeout(60000) }).toBe(true);
});
test.afterAll(() => { server?.kill(); rmSync(dir, { recursive: true, force: true }); });

const entries = () => readdirSync(dir).flatMap(name => readFileSync(join(dir, name), 'utf8').trim().split('\n')).map(line => JSON.parse(line));
const kinds = () => new Set(entries().map(entry => entry.kind));

test('a phone diag session streams device, beat, input, console and pagehide entries to the Mac within a second', async ({ page }) => {
  await page.goto(base);
  await expect.poll(() => kinds().has('beat'), { timeout: ciTimeout(15000) }).toBe(true);
  const device = entries().find(entry => entry.kind === 'device');
  expect([device.device, device.os, device.browser]).toEqual(['iPhone', 'iOS 18.1', 'Safari 18.1']);
  expect([device.viewport.width, device.viewport.height, device.viewport.dpr, device.touchPoints > 0]).toEqual([390, 844, 3, true]);
  expect(device.webgl).toHaveProperty('available');
  expect(device.session).toMatch(/^[0-9a-f]{12}$/);
  expect(device.peer).toMatch(/127\.0\.0\.1|::1/);

  await page.touchscreen.tap(195, 420);
  await page.evaluate(() => console.error('relay probe'));
  const sent = Date.now();
  await expect.poll(() => entries().some(entry => entry.kind === 'console' && entry.message === 'relay probe'), { timeout: ciTimeout(1500), intervals: [100] }).toBe(true);
  expect(Date.now() - sent).toBeLessThan(ciTimeout(1500));
  expect(entries().some(entry => entry.kind === 'input' && /touchstart/.test(entry.line))).toBe(true);

  // The big panel no longer covers the game; a top-layer badge reports the real connection instead.
  await expect(page.locator('#error-message')).toBeHidden();
  const badge = page.locator('#diag-status');
  await expect(badge).toHaveText('DIAG ● 連線中');
  await expect.poll(() => badge.evaluate(node => node.matches(':popover-open') && getComputedStyle(node).pointerEvents)).toBe('none');
  await page.route('**/__diag/log', route => route.abort());
  await expect(badge).toHaveText(/^DIAG ✕ 中斷 \ds · network$/, { timeout: ciTimeout(5000) });
  await page.unroute('**/__diag/log');
  await expect(badge).toHaveText('DIAG ● 連線中', { timeout: ciTimeout(5000) });

  await page.goto('about:blank'); // pagehide flushes through sendBeacon
  await expect.poll(() => entries().some(entry => entry.kind === 'lifecycle' && entry.message.startsWith('pagehide')), { timeout: ciTimeout(5000) }).toBe(true);
});

test('the relay refuses a wrong token and cross-origin posts', async ({ page }) => {
  await page.goto(base);
  const status = await page.evaluate(() => fetch('/__diag/log', { method: 'POST', body: JSON.stringify({ token: 'guess', session: 's', entries: [{ kind: 'x' }] }) }).then(r => r.status));
  expect(status).toBe(403);
  const crossOrigin = await fetch(`${base}/__diag/log`, { method: 'POST', headers: { origin: 'http://evil.example' }, body: '{}' });
  expect(crossOrigin.status).toBe(403);
  expect((await fetch(`${base}/__diag/log`)).status).toBe(405);
});
