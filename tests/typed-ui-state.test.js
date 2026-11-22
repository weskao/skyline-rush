import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('all five reactive UI state modules use native TypeScript implementations', () => {
  for (const name of ['garage-view-state', 'guide-view-state', 'release-view-state', 'tutorial-coach-state', 'control-panels-view-state']) {
    assert.ok(existsSync(new URL(`../src/${name}.ts`, import.meta.url)), name + ' must be TypeScript');
    assert.ok(!existsSync(new URL(`../src/${name}.js`, import.meta.url)), name + ' must not keep an untyped duplicate');
  }
});
test('Vue template semantic checking uses vue-tsc, not only transpilation', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
  assert.equal(pkg.devDependencies['vue-tsc'], '3.3.13', 'pin Vue SFC semantic type-checker');
  assert.ok(lock.includes(`vue-tsc@${pkg.devDependencies['vue-tsc']}`), 'pnpm lock must pin the Vue type checker');
  assert.match(pkg.scripts['typecheck:vue'], /\bvue-tsc\b.*--noEmit.*--project tsconfig\.json/);
});
test('typecheck installs keep the lockfile, so an upstream partial publish cannot break CI', () => {
  // 2026-11-06: an unlocked Playwright install re-resolved dependencies while publishing was incomplete;
  // "@playwright/test": "^1.56.0" to it and every CI typecheck failed with ETARGET.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of ['typecheck:ts', 'typecheck:vue']) {
    assert.doesNotMatch(pkg.scripts[name], /\b(?:npm|pnpm)\s+(?:install|add|dlx)\b/, `${name} must not change dependencies during typecheck`);
  }
});
