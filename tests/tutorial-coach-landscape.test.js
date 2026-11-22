import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const landscape = '@media (max-height: 500px) and (orientation: landscape)';
const lastRule = selector => css.split('\n').filter(line => line.startsWith(landscape) && line.includes(selector)).at(-1) ?? '';

test('phone-landscape coach stays narrow without clipping long localized instructions', () => {
  const rule = lastRule('.tutorial-coach {');
  const coach = rule.match(/\.tutorial-coach\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(coach, /width:\s*min\(320px,\s*calc\(42vw\s*-\s*16px\)\)/, 'protect at least 58% of the road width');
  assert.match(coach, /max-height:\s*calc\(100dvh/, 'bound the coach above thumb controls');

  const last = lastRule('.tutorial-copy {');
  const copy = last.match(/\.tutorial-copy\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(copy, /overflow:\s*auto/, 'long English/Chinese lessons must scroll rather than clip or widen the card');
  assert.match(copy, /min-height:\s*0/, 'the flex item must be allowed to shrink within the card');
  assert.doesNotMatch(css, /width:\s*min\(520px,\s*calc\(58vw/, 'never restore the oversized coach');
});

test('compact coach preserves readable prompt and full-size action targets', () => {
  assert.match(css, /\.tutorial-coach:not\(\[hidden\]\)\s*\{\s*display:\s*flex/, 'the hidden state must not force the panel onscreen');
  assert.match(css, /\.tutorial-copy p\s*\{[^}]*font-size:\s*13px/, 'instructions remain at least 13px in compact mode');
  assert.match(css, /\.tutorial-actions button\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/, 'Skip and Exit retain 44px targets');
});
