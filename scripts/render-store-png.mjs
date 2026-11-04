/**
 * Generate isolated, true-alpha 216px Store PNGs from the editable SVG masters.
 * No composite screenshots, text, price tags, checkouts, or externally loaded assets.
 * Run: node scripts/render-store-png.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const names = ['store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection'];
const colors = {
  'store-cart': [[30, 238, 255], [237, 72, 255]],
  'store-box': [[222, 73, 255], [62, 216, 255]],
  'store-bundle': [[255, 198, 51], [255, 55, 195]],
  'store-tag': [[255, 66, 205], [71, 204, 255]],
  'store-star': [[255, 203, 46], [255, 59, 181]],
  'store-collection': [[39, 250, 209], [85, 111, 255]],
};
const base = new URL('../docs/designs/garage-store-readiness/restored-source/', import.meta.url);
const output = new URL('../public/feature-assets/garage-store-readiness/raster/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 216, height: 216 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><body style="margin:0"><canvas width="216" height="216"></canvas></body></html>');
  for (const name of names) {
    const svg = await readFile(new URL(name + '.svg', base), 'utf8');
    const base64 = Buffer.from(svg).toString('base64');
    const png = await page.evaluate(async ({ base64, palette }) => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, 216, 216);
      const icon = new Image();
      icon.src = 'data:image/svg+xml;base64,' + base64;
      await icon.decode();
      ctx.drawImage(icon, 0, 0, 216, 216);
      const data = ctx.getImageData(0, 0, 216, 216);
      // Preserve the original self-contained silhouette and alpha.
      // Gentle cyan/magenta/gold reflectance restores vivid illustrated finishes
      // lost when the original composite was isolated into simple editable masters.
      for (let y = 0; y < 216; y++) for (let x = 0; x < 216; x++) {
        const p = (y * 216 + x) * 4;
        if (data.data[p + 3] <= 16) continue;
        const stripe = 0.5 + 0.5 * Math.sin(x * 0.115 - y * 0.077 + Math.cos(y * 0.063) * 2);
        const glint = Math.sin(x * 0.27 + y * 0.14) * 10 + Math.cos(x * 0.08 - y * 0.21) * 8;
        for (let channel = 0; channel < 3; channel++) {
          const primary = palette[0][channel], secondary = palette[1][channel];
          const reflect = primary * stripe + secondary * (1 - stripe);
          const original = data.data[p + channel];
          const result = original * 0.50 + reflect * 0.50 + glint;
          data.data[p + channel] = Math.max(0, Math.min(255, result));
        }
      }
      ctx.putImageData(data, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { base64, palette: colors[name] });
    await writeFile(new URL(name + '@3x.png', output), Buffer.from(png, 'base64'));
    console.log('Generated', name + '@3x.png', '216x216 true RGBA');
  }
} finally {
  await browser.close();
}
