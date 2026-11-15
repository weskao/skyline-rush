import { expect } from '@playwright/test';

/** Steps the Preview Studio ‹ angle › control to `angle` with real clicks (five presets, so at most five steps). */
export async function chooseGarageAngle(page, angle) {
  const name = page.locator('#garage-angle-name');
  for (let i = 0; i < 5 && await name.getAttribute('data-angle') !== angle; i++) {
    const before = await name.getAttribute('data-angle');
    await page.locator('#garage-angle-next').click();
    await expect(name).not.toHaveAttribute('data-angle', before ?? '');
  }
  await expect(name).toHaveAttribute('data-angle', angle);
}
