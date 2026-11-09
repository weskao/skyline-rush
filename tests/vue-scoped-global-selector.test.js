import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vue's scoped-CSS compiler drops everything after `:global(...)` in a compound selector:
// `:global(body[data-vfx-quality="low"]) .garage-art-sweep { display: none }` compiled to
// `body[data-vfx-quality=low] { display: none }` and blanked the whole page on Low VFX.
// Wrap the full selector in :global(...) or write `body[...] .x` without :global.
function vueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? vueFiles(join(dir, e.name)) : e.name.endsWith('.vue') ? [join(dir, e.name)] : []);
}

function truncatedGlobals(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const bad = [];
  for (let i = css.indexOf(':global('); i !== -1; i = css.indexOf(':global(', i + 1)) {
    let depth = 0, j = i + ':global'.length;
    for (; j < css.length; j++) {
      if (css[j] === '(') depth++;
      else if (css[j] === ')' && --depth === 0) break;
    }
    const next = css.slice(j + 1).match(/^\s*(.)/s)?.[1];
    if (next && !',{)'.includes(next)) bad.push(css.slice(i, css.indexOf('{', i)).trim());
  }
  return bad;
}

test('scoped styles never put selector text after :global(...)', () => {
  const offenders = vueFiles('src').flatMap(file => {
    const styles = [...readFileSync(file, 'utf8').matchAll(/<style\b[^>]*\bscoped\b[^>]*>([\s\S]*?)<\/style>/g)];
    return styles.flatMap(m => truncatedGlobals(m[1]).map(sel => `${file}: ${sel}`));
  });
  assert.deepEqual(offenders, []);
});

test('the scanner flags a truncated :global and accepts fully wrapped ones', () => {
  assert.equal(truncatedGlobals(':global(body.x) .y { display: none; }').length, 1);
  assert.deepEqual(truncatedGlobals('/* no :global() here */ body.x .y { display: none; }'), []);
  assert.deepEqual(truncatedGlobals(':global(.a:has(b:not([c])) h1), :global(#d[open]) { color: red; }'), []);
});
