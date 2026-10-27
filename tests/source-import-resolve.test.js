import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

test('all nested local runtime imports resolve to real source paths after JS-to-TS migration', () => {
  const root = new URL('../src/', import.meta.url);
  const missing = [];
  function visit(dir, prefix = '') {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = new URL(item.name + (item.isDirectory() ? '/' : ''), dir);
      const label = prefix + item.name;
      if (item.isDirectory()) {
        visit(path, label + '/');
        continue;
      }
      if (!item.isFile() || !/\.(?:js|ts|vue)$/.test(item.name)) continue;
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/\b(?:from\s*|import\s*)['"]([.][^'"]+)['"]/g)) {
        const imported = match[1];
        if (!existsSync(new URL(imported, path))) missing.push(`${label}: ${imported}`);
      }
    }
  }
  visit(root);
  assert.deepEqual(missing, [], 'Every nested source module must use its real .ts/.js/.vue extension');
});
