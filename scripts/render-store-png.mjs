/**
 * Store 3× PNGs use the already restored, audited 216×216 standalone WebP
 * artwork. Decode to an RGBA canvas and save losslessly; do not recolor,
 * upscale, re-crop, or generate a new style. The editable original masters
 * remain under docs/designs/garage-store-readiness/restored-source/.
 *
 * Run: node scripts/render-store-png.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const names = ['store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection'];
const folder = new URL('../public/feature-assets/garage-store-readiness/raster/', import.meta.url);
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 216, height: 216 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><body style="margin:0"><canvas width="216" height="216"></canvas></body></html>');
  for (const name of names) {
    const input = await readFile(new URL(name + '@3x.webp', folder));
    const base64 = input.toString('base64');
    const pngBase64 = await page.evaluate(async (webp) => {
      const canvas = document.querySelector('canvas');
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Store PNG canvas missing');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('2D canvas unavailable');
      ctx.clearRect(0, 0, 216, 216);
      const icon = new Image();
      icon.src = 'data:image/webp;base64,' + webp;
      await icon.decode();
      if (icon.naturalWidth !== 216 || icon.naturalHeight !== 216) {
        throw new Error('Store source must be independently authored at 216x216');
      }
      ctx.drawImage(icon, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, base64);
    await writeFile(new URL(name + '@3x.png', folder), Buffer.from(pngBase64, 'base64'));
    console.log('Lossless Store PNG', name, '216x216 RGBA, original WebP pixels preserved');
  }
} finally {
  await browser.close();
}
