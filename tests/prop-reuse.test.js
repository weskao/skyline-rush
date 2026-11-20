// .claude/rules/prop-reuse.md: one builder per species in assets-src/props/, catalogued, never copied into a kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../assets-src/', import.meta.url));
const shared = join(assets, 'props');
const builders = readdirSync(shared).filter(f => f.endsWith('.py'));
const pyFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === '__pycache__' ? [] : pyFiles(join(dir, e.name))) : e.name.endsWith('.py') ? [join(dir, e.name)] : []);

test('prop-reuse: every shared builder lists its knobs, variant nodes and the courses that use it', () => {
  assert.ok(builders.length > 0, 'assets-src/props/ holds the shared builders');
  for (const file of builders) {
    const doc = readFileSync(join(shared, file), 'utf8').match(/^"""([\s\S]*?)"""/)?.[1] ?? '';
    for (const heading of ['Knobs', 'Variant nodes:', 'Used by:']) assert.ok(doc.includes(heading), `${file}: docstring lacks "${heading}"`);
  }
});

test('prop-reuse: no kit defines its own copy of a shared builder', () => {
  const names = builders.flatMap(file => [...readFileSync(join(shared, file), 'utf8').matchAll(/^def ([a-z]\w*)\(/gm)].map(m => m[1]));
  for (const path of pyFiles(assets).filter(p => !p.startsWith(shared))) {
    const src = readFileSync(path, 'utf8');
    for (const name of names) assert.ok(!new RegExp(`^def ${name}\\(`, 'm').test(src), `${relative(assets, path)} redefines ${name}: import it from assets-src/props/`);
  }
});
