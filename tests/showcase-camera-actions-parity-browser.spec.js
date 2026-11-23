import { test, expect, openGarage, waitForWorldFrame } from './helpers/test.js';

// One DOM dock is moved between Home and Garage. Its controls must look the same in either host,
// even when the surrounding layout needs a different width or position.
async function cameraAppearance(page) {
  return page.locator('#showcase-camera-dock .showcase-camera-actions').evaluate(actions => {
    const css = node => getComputedStyle(node);
    const appearance = button => {
      const s = css(button);
      const arrow = button.querySelector('svg.showcase-camera-chevron');
      return {
        width: s.width, height: s.height, padding: s.padding,
        background: s.backgroundImage, backgroundColor: s.backgroundColor,
        border: s.borderTop, radius: s.borderRadius, shadow: s.boxShadow,
        color: s.color, display: s.display,
        arrow: arrow?.outerHTML ?? null,
      };
    };
    const label = css(actions.querySelector('#showcase-camera-name'));
    return {
      inset: {
        left: css(actions).paddingLeft,
        right: css(actions).paddingRight,
        border: css(actions).borderTopWidth,
      },
      gap: css(actions).gap,
      justify: css(actions).justifyContent,
      align: css(actions).alignItems,
      label: { color: label.color, fontSize: label.fontSize, fontWeight: label.fontWeight, lineHeight: label.lineHeight },
      arrows: [...actions.querySelectorAll('button')].map(appearance),
    };
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`Home camera actions match Garage and use redrawn vector arrows at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const dock = page.locator('#showcase-camera-dock');
    await expect(dock).toBeVisible();
    await expect(dock.locator('.showcase-camera-chevron')).toHaveCount(2);
    await page.mouse.move(1, 1); // Avoid comparing a hovered button with an unhovered one.
    const home = await cameraAppearance(page);
    // The landscape rail and portrait panel keep their compact inset.
    expect(parseFloat(home.inset.left)).toBeGreaterThanOrEqual(3);
    if (viewport.width !== 1440) expect(parseFloat(home.inset.left)).toBeLessThanOrEqual(5);
    expect(home.inset.left).toBe(home.inset.right);
    expect(home.inset.border).toBe('1px');
    await expect(dock).toHaveCSS('border-top-width', '0px');
    await waitForWorldFrame(page);
    await page.screenshot({ path: info.outputPath(`camera-home-${viewport.width}.png`), animations: 'disabled' });
    if (viewport.width === 1440) {
      const layout = await dock.evaluate(node => {
        const bounds = node.getBoundingClientRect();
        const actions = node.querySelector('.showcase-camera-actions');
        const frame = actions.getBoundingClientRect();
        const [prev, label, next] = [...actions.children].map(child => child.getBoundingClientRect());
        return {
          fits: frame.left >= bounds.left - 1 && frame.right <= bounds.right + 1
            && frame.left >= 0 && frame.right <= innerWidth && actions.scrollWidth <= actions.clientWidth,
          inset: Math.min(prev.left - frame.left, frame.right - next.right, prev.top - frame.top, frame.bottom - prev.bottom),
          gap: Math.min(label.left - prev.right, next.left - label.right),
        };
      });
      expect(layout.fits).toBe(true);
      expect(layout.inset).toBeGreaterThanOrEqual(6);
      expect(layout.gap).toBeGreaterThanOrEqual(6);
      await page.locator('#showcase-camera-next').click();
      await expect(dock).toHaveAttribute('data-view', 'front');
      await page.locator('#showcase-camera-prev').click();
      await expect(dock).toHaveAttribute('data-view', 'drive');
    }

    await openGarage(page);
    await expect(page.locator('#garage-screen #showcase-camera-dock')).toBeVisible();
    await page.mouse.move(1, 1);
    const garage = await cameraAppearance(page);
    expect(home).toEqual(garage);
    await page.screenshot({ path: info.outputPath(`camera-garage-${viewport.width}.png`), animations: 'disabled' });

    const actions = page.locator('#showcase-camera-dock .showcase-camera-actions');
    const frame = await actions.boundingBox();
    for (const id of ['#showcase-camera-prev', '#showcase-camera-next']) {
      const bounds = await page.locator(id).boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(frame.x - 1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    }
    await page.locator('#showcase-camera-next').click();
    await expect(dock).toHaveAttribute('data-view', 'front');
    await page.locator('#showcase-camera-prev').click();
    await expect(dock).toHaveAttribute('data-view', 'drive');
  });
}
