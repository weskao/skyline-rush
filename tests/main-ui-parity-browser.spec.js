import { test, expect } from './helpers/test.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/main-ui-contract.json', import.meta.url), 'utf8'));

// Strict main bd71ac8 baseline plus the intentional cda325e camera layout, 034f0de phone intro scroll-edge, mid-race VFX row, What's New video clip and gradient bar, phone AIRFLOW telemetry strip, Photo Studio responsive panel every-device race HUD spacing and keyboard-only focus ring corrections, and the user-approved 10A mode-first order (mode → track → rules row → Start). Shared result wrapping and feature-specific additions are recorded in the fixture.
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

test('main CSS contract remains byte-identical while Wave 1 NITRO and Wave 2 Foldable append overrides', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const wave1 = '\n/* NITRO availability is read from the engine';
  const wave2 = '\n/* Foldable viewport segments:';
  expect(css).toContain(wave1);
  expect(css).toContain(wave2);
  const main = Buffer.from(css.slice(0, css.indexOf(wave1)), 'utf8');
  const header = Buffer.from('blob ' + main.byteLength + '\0');
  const gitSha = createHash('sha1').update(header).update(main).digest('hex');
  expect(gitSha).toBe(baseline.cssBlob);
  const nitro = css.slice(css.indexOf(wave1), css.indexOf(wave2));
  for (const state of ['charging', 'ready', 'active', 'disabled']) {
    expect(nitro).toContain(`data-nitro-state="${state}"`);
  }
  const fold = css.slice(css.indexOf(wave2));
  expect(fold).toContain('data-fold-axis="vertical"');
  expect(fold).toContain('data-fold-axis="horizontal"');
});
