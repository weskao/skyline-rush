import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const landscape = '@media (max-height: 500px) and (orientation: landscape)';

// Last landscape-phone rule that styles .tutorial-copy wins the cascade.
const copyRules = css.split('\n').filter(line => line.startsWith(landscape) && /\.tutorial-copy\s*\{/.test(line));

test('phone-landscape coach card grows to fit its whole instruction and hint', () => {
  const last = copyRules.at(-1) ?? '';
  const copy = last.match(/\.tutorial-copy\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(copy, /overflow:\s*visible/, 'no inner scroll box');
  assert.doesNotMatch(copy, /max-height:\s*calc\(55dvh/, 'no 55dvh cap that clips Chinese/English copy');
});
