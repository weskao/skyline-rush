import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));

test('Vue 3 and TypeScript own the UI typecheck, independent of the legacy JS subset', () => {
  const config = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  assert.equal(config.compilerOptions.strict, true);
  assert.ok(config.include.includes('src/**/*.ts'));
  assert.ok(config.include.includes('src/**/*.vue'));
  const result = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.json', '--noEmit'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('shared TypeScript contracts reject invalid race and track fixtures', () => {
  const result = spawnSync(process.execPath, [compiler, '-p', 'tests/type-fixtures/invalid-typescript-tsconfig.json', '--noEmit'], { encoding: 'utf8' });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout, /TS2322/);
  assert.match(result.stdout, /invalid-typescript\.ts/);
});

test('Vue app and panel scripts use actual TypeScript', () => {
  for (const path of ['App.vue', 'GaragePanel.vue', 'GuidePanel.vue', 'ReleaseNotesPanel.vue', 'TutorialCoach.vue', 'SettingsPanel.vue', 'ControlsPanel.vue']) {
    const file = readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
    assert.match(file, /<script setup lang="ts">/, path + ' should use script setup TypeScript');
  }
});
