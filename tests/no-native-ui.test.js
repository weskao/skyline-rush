import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// .claude/rules/no-native-ui.md: the game draws its own dialogs, pickers and search fields.
const BANNED = [
  [/(?:^|[^\w.$])(?:(?:window|globalThis|self)\.)?(?:alert|confirm|prompt)\s*\(/, 'native alert/confirm/prompt: use confirmDialog() (src/confirm-dialog.ts)'],
  [/type=["']search["']/, 'native search field: draw a styled text input'],
  [/<datalist/, 'native datalist popup: draw a page listbox'],
  [/<select\b[^>]*\bdata-native-select/, 'native <select> popup: let customSelect() (src/custom-select.ts) draw it'],
];
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
export const nativeUiHits = (source) => {
  const code = stripComments(source);
  return BANNED.filter(([pattern]) => pattern.test(code)).map(([, why]) => why);
};

test('the scanner flags the native confirm() the cloud menu used before', () => {
  assert.equal(nativeUiHits("if (!cloudUser || !confirm(t('cloud.deleteConfirm'))) return;").length, 1);
  assert.equal(nativeUiHits('window.alert("x")').length, 1);
  assert.deepEqual(nativeUiHits("await confirmDialog({ title }); answerConfirm(true); once.confirm(); // confirm() is native"), []);
});

test('no source file opens a native dialog, search field or picker', () => {
  const root = new URL('..', import.meta.url).pathname;
  const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(js|ts|vue|html)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
  const hits = [...files(join(root, 'src')), join(root, 'index.html')]
    .flatMap(path => nativeUiHits(readFileSync(path, 'utf8')).map(why => `${relative(root, path)}: ${why}`));
  assert.deepEqual(hits, []);
});
