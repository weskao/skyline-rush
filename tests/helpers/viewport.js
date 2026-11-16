// Resize a live page (and optionally its safe-area insets) and wait until the app has laid out at the new size.
// Folding a viewport matrix into one booted page saves an app boot per size: about 11 s each on the CPU-only CI runner.
export async function resizeTo(page, width, height, insets) {
  if (insets !== undefined) await (await page.context().newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: insets ?? {} });
  await page.setViewportSize({ width, height });
  await page.waitForFunction(([w, h]) => innerWidth === w && innerHeight === h, [width, height]);
  // Two frames: the resize handler runs on the first, the layout it causes is readable after the second.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
