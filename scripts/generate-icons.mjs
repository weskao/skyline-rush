// Run after editing public/icons/app-icon.svg: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const directory = new URL('../public/icons/', import.meta.url);
const svg = await readFile(new URL('app-icon.svg', directory), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  for (const [name, size, systemMask] of [
    ['favicon-32', 32, false], ['apple-touch-icon', 180, true],
    ['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true],
  ]) {
    // iOS and Android need an opaque full-bleed image before applying their own corner mask.
    const source = systemMask ? svg.replace('rx="224"', 'rx="0"') : svg;
    const png = await page.evaluate(async ({ source, size }) => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(source)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { source, size });
    await writeFile(new URL(`${name}.png`, directory), Buffer.from(png, 'base64'));
    console.log(`${name}.png (${size}x${size})`);
  }
} finally {
  await browser.close();
}
