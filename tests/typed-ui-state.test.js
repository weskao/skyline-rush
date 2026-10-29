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
  assert.match(pkg.scripts['typecheck:vue'], /vue-tsc@3\.3\.13/, 'pin Vue SFC semantic type-checker');
});
