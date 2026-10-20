import { test, expect } from '@playwright/test';

test('installed apps receive decodable icons and launch inside the deployed site', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveCount(1);
  // black-translucent lets iOS standalone draw under the status bar and then
  // drop that same height as an unpaintable band at the bottom (WebKit 313800).
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black');
  const manifestURL = await manifestLink.evaluate(link => link.href);
  const response = await page.request.get(manifestURL);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/json|manifest/);
  const manifest = await response.json();
  expect(manifest.name).toBe('Skyline Rush');
  expect(manifest.display).toBe('standalone');
  const site = new URL('./', page.url()).href;
  for (const key of ['id', 'start_url', 'scope']) {
    expect(new URL(manifest[key], manifestURL).href).toBe(site);
  }
  for (const size of ['192x192', '512x512']) {
    expect(manifest.icons.some(icon => icon.sizes === size && icon.purpose === 'any')).toBe(true);
  }
  expect(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(true);
  const icons = manifest.icons.map(icon => ({ ...icon, src: new URL(icon.src, manifestURL).href }));
  for (const [rel, sizes] of [['apple-touch-icon', '180x180'], ['icon', '32x32']]) {
    const link = page.locator(`link[rel="${rel}"][sizes="${sizes}"]`);
    await expect(link).toHaveCount(1);
    icons.push({ src: await link.evaluate(node => node.href), sizes, purpose: rel });
  }
  for (const icon of icons) {
    expect(icon.src.startsWith(site)).toBe(true);
    const imageResponse = await page.request.get(icon.src);
    expect(imageResponse.ok()).toBe(true);
    expect(imageResponse.headers()['content-type']).toBe('image/png');
    const pixels = await page.evaluate(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const alpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];
      return { size: `${canvas.width}x${canvas.height}`, center: alpha(canvas.width / 2, canvas.height / 2),
        corners: [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]].map(([x, y]) => alpha(x, y)) };
    }, icon.src);
    expect(pixels.size).toBe(icon.sizes);
    expect(pixels.center).toBe(255);
    // Apple and Android apply their own masks; desktop icons carry rounded transparent corners.
    expect(pixels.corners).toEqual(Array(4).fill(['maskable', 'apple-touch-icon'].includes(icon.purpose) ? 255 : 0));
  }
  const cdp = await page.context().newCDPSession(page);
  const parsed = await cdp.send('Page.getAppManifest');
  expect(parsed.errors).toEqual([]);
  expect(JSON.parse(parsed.data).name).toBe('Skyline Rush');
});
