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
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  assert.equal(pkg.devDependencies['vue-tsc'], '3.3.13', 'pin Vue SFC semantic type-checker');
  assert.equal(lock.packages['node_modules/vue-tsc'].version, pkg.devDependencies['vue-tsc']);
  assert.match(pkg.scripts['typecheck:vue'], /\bvue-tsc\b.*--noEmit.*--project tsconfig\.json/);
});
test('typecheck installs keep the lockfile, so an upstream partial publish cannot break CI', () => {
  // 2026-11-06: playwright@1.65.0 shipped before playwright-core@1.65.0; --package-lock=false re-resolved
  // "@playwright/test": "^1.56.0" to it and every CI typecheck failed with ETARGET.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of ['typecheck:ts', 'typecheck:vue']) {
    assert.doesNotMatch(pkg.scripts[name], /--package-lock=false/, `${name} must install against package-lock.json`);
    // No install at all is fine once the tools are devDependencies (vue-tsc, @types/three); any install must stay --no-save.
    if (/\bnpm install\b/.test(pkg.scripts[name])) assert.match(pkg.scripts[name], /--no-save/, `${name} must not rewrite package.json or the lockfile`);
  }
});
