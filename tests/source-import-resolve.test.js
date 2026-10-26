import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

test('all local runtime imports resolve to real source paths after JS-to-TS migration', () => {
  const root = new URL('../src/', import.meta.url);
  const missing = [];
  for (const name of readdirSync(root).filter(name => /\.(?:js|ts|vue)$/.test(name))) {
    const file = new URL(name, root);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b(?:from\s*|import\s*)['"]([.][^'"]+)['"]/g)) {
      const imported = match[1];
      if (!existsSync(new URL(imported, file))) missing.push(`${name}: ${imported}`);
    }
  }
  assert.deepEqual(missing, [], 'Every source module must use its real .ts/.js/.vue extension');
});
