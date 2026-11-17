import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// A dialog closes on an async history pop, so its exit animation must hold the last frame until then.
// dialogNavigation().leave does that once for every dialog: see .claude/rules/dialog-exit-animation.md.
const src = new URL('../src/', import.meta.url);
const read = name => readFileSync(new URL(name, src), 'utf8');

test('dialogs never chain their own exit animation into close', () => {
  const rogue = readdirSync(src).filter(name => /\.(js|ts|vue)$/.test(name) && name !== 'dialog-navigation.ts')
    .filter(name => { const text = read(name); return /dialogNavigation\(|\.showModal\(/.test(text) && /\.finished\b/.test(text); });
  assert.deepEqual(rogue, [], 'fade a dialog out with dialogNavigation().leave(keyframes, options), not animate().finished.then(close)');
});

test('the shared exit holds its last frame and releases it when the dialog closes', () => {
  const navigation = read('dialog-navigation.ts');
  assert.match(navigation, /fill: 'forwards'/);
  assert.match(navigation, /addEventListener\('close', \(\) => leaving\.splice\(0\)\.forEach\(animation => animation\.cancel\(\)\)\)/);
});
