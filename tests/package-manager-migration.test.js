import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('pnpm is the single package manager with a reproducible lockfile', () => {
  assert.equal(pkg.packageManager, 'pnpm@11.28.13');
  assert.ok(existsSync(new URL('../pnpm-lock.yaml', import.meta.url)));
  assert.ok(!existsSync(new URL('../package-lock.json', import.meta.url)));
  assert.match(read('pnpm-workspace.yaml'), /allowBuilds:/);
  assert.match(read('pnpm-workspace.yaml'), /esbuild:\s*true/);
});

test('browser tests build the trial release explicitly before Playwright', () => {
  assert.match(pkg.scripts['test:browser'], /node scripts\/build-garage-browser\.mjs && playwright test/);
  assert.equal(pkg.scripts['pretest:browser'], undefined);
});

test('CI uses pnpm cache and frozen lock installs, not npm install', () => {
  for (const path of ['.github/workflows/ci.yml', '.github/workflows/hud-original-artwork-visual.yml',
    '.github/workflows/store-png-generator.yml']) {
    const contents = read(path);
    assert.match(contents, /pnpm\/action-setup@v4/, path);
    assert.match(contents, /cache:\s*pnpm/, path);
    assert.match(contents, /pnpm install --frozen-lockfile/, path);
    assert.doesNotMatch(contents, /cache:\s*npm|npm ci/, path);
  }
});

test('the Makefile and local Playwright servers run pnpm', () => {
  assert.match(read('Makefile'), /PNPM := pnpm/);
  assert.match(read('Makefile'), /pnpm-lock\.yaml/);
  for (const path of ['playwright.config.js', 'playwright.cloud.config.js',
    'playwright.world-tour.config.js', 'scripts/build-garage-browser.mjs']) {
    assert.doesNotMatch(read(path), /\bnpm\b|\bnpx\b/, path);
  }
});
