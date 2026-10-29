import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Two branches merging the same import leave a binding declared twice: tsc and node --test accept it,
// but the production build (Rollup) fails. Catch it here, where every merge runs first.
const files = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
  .filter(f => /\.(js|ts|vue)$/.test(f));
test('no source module imports the same binding twice', () => {
  const duplicates = [];
  for (const file of files) {
    const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    const seen = new Set();
    for (const [, clause] of source.matchAll(/^\s*import\s+(?:type\s+)?([^'";]+?)\s+from\s+['"][^'"]+['"]/gm)) {
      const names = [...clause.matchAll(/(?:^|[{,]\s*)(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?/g)].map(m => m[2] ?? m[1]);
      for (const name of names) {
        if (seen.has(name)) duplicates.push(`${file}: ${name}`);
        seen.add(name);
      }
    }
  }
  assert.deepEqual(duplicates, []);
});
