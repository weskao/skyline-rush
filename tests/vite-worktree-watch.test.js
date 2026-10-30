import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../vite.config.js';

test('Vite ignores sibling worktrees while keeping this checkout live', () => {
  const ignored = config.server?.watch?.ignored ?? [];
  for (const [path, excluded] of [
    ['.claude/worktrees/sibling/index.html', true],
    ['.claude/worktrees/sibling/tsconfig.json', true],
    ['.claude/worktrees/sibling/src/main.js', true],
    ['index.html', false], ['tsconfig.json', false], ['src/main.js', false],
    ['.claude/rules/touch-input.md', false],
  ]) {
    const absolute = fileURLToPath(new URL('../' + path, import.meta.url));
    assert.equal(ignored.some(pattern => matchesGlob(absolute, pattern)), excluded, path);
  }
});
