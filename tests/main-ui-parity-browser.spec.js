import { test, expect } from './helpers/test.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/main-ui-contract.json', import.meta.url), 'utf8'));

// Main 2cd52d4 baseline: reviewed camera, intro, FPS, touch, minimap and release-video styles.
// Keep all element and stylesheet checks; physical-device approval is a separate gate.
test('Vue migration preserves the recorded element order, roles and CSS hooks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-button')).toBeVisible();
  const actual = await page.evaluate(ids => {
    const missing = ids.filter(id => !document.getElementById(id));
    const found = ids.filter(id => document.getElementById(id));
    return { missing, elements: found.map(id => {
      const element = document.getElementById(id);
      return { id, tag: element.tagName.toLowerCase(), classes: [...element.classList] };
    }), ordered: [...document.querySelectorAll('[id]')].map(el => el.id).filter(id => ids.includes(id)) };
  }, baseline.elements.map(item => item.id));
  expect(actual.missing).toEqual([]);
  expect(actual.ordered).toEqual(baseline.elements.map(item => item.id));
  for (let i = 0; i < baseline.elements.length; i++) {
    expect(actual.elements[i].tag, baseline.elements[i].id).toBe(baseline.elements[i].tag);
    for (const cls of baseline.elements[i].classes)
      expect(actual.elements[i].classes, baseline.elements[i].id).toContain(cls);
  }
});

test('stylesheet matches the reviewed main baseline with FPS, touch and minimap corrections', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url));
  const header = Buffer.from('blob ' + css.byteLength + '\0');
  const gitSha = createHash('sha1').update(header).update(css).digest('hex');
  expect(gitSha).toBe(baseline.cssBlob);
});
