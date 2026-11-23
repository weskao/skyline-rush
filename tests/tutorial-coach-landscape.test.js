import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const vue = readFileSync(new URL('../src/TutorialCoach.vue', import.meta.url), 'utf8');
const landscape = '@media (max-height: 500px) and (orientation: landscape)';
const landscapeCSS = css.slice(css.lastIndexOf(landscape));
const finalLayer = css.slice(css.indexOf('Tutorial coaching (final layer)'));

test('phone-landscape coach stays a narrow top banner without clipping long localized instructions', () => {
  const vars = landscapeCSS.match(/body\[data-tutorial\]\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(vars, /--coach-top:\s*max\(8px,\s*var\(--safe-top\)\)/, 'use the free strip above the road');
  assert.match(vars, /--coach-width:\s*min\(300px,\s*calc\(36vw\s*-\s*8px\)\)/, 'protect the road and both HUD rails');
  assert.match(vars, /--coach-max-height:\s*calc\(48dvh/, 'bound the coach above thumb controls');
  const copy = finalLayer.match(/\.tutorial-copy\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(copy, /overflow:\s*auto/, 'long English/Chinese lessons must scroll rather than clip or widen the card');
  assert.match(copy, /min-height:\s*0/, 'the flex item must be allowed to shrink within the card');
  assert.match(landscapeCSS, /\.tutorial-celebration \{ display: none; \}/, 'a single completion panel');
});

test('compact coach preserves readable prompt and full-size action targets', () => {
  assert.match(css, /\.tutorial-coach:not\(\[hidden\]\)\s*\{\s*display:\s*flex/, 'the hidden state must not force the panel onscreen');
  assert.match(css, /\.tutorial-copy p\s*\{[^}]*font-size:\s*13px/, 'instructions remain at least 13px in compact mode');
  assert.match(css, /\.tutorial-actions button\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/, 'Skip and Exit retain 44px targets');
  // The practice note shares the 44px button row instead of adding a line under the lesson copy.
  assert.match(vue, /<header class="tutorial-heading"><div class="tutorial-heading-text"><strong id="tutorial-title">[^<]*<\/strong><small id="tutorial-assist"/);
});

test('live cue and pass toast share one centred slot below the coach on every device', () => {
  const slots = [...finalLayer.matchAll(/body\[data-tutorial\] :is\(\.tutorial-cue, \.tutorial-pass\)\s*\{([^}]*)\}/g)].map(m => m[1]);
  const [slot, ...overrides] = slots;
  assert.match(slot ?? '', /top:\s*calc\(var\(--tutorial-coach-bottom/, 'directly below the card');
  assert.match(slot ?? '', /left:\s*50%/);
  assert.match(slot ?? '', /transform:\s*translateX\(-50%\)/);
  // Orientation overrides may only restyle the toast, never move it sideways (it once sat at left: 79% in landscape).
  for (const rule of overrides) assert.doesNotMatch(rule, /\b(left|right|top|transform)\s*:/, rule);
});

test('phones fold the card to its title row while a toast is up, keeping the instruction announced', () => {
  const fold = finalLayer.slice(finalLayer.indexOf('@media (max-width: 760px) and (min-height: 501px), (max-height: 500px) and (orientation: landscape)'));
  const folded = '.tutorial-coach:has(~ :is(.tutorial-cue, .tutorial-pass))';
  assert.ok(fold.includes(`${folded} .tutorial-meter { display: none; }`), 'progress folds away on both phone orientations');
  const copy = fold.match(/\.tutorial-copy \{([^}]*)\}/)?.[1] ?? '';
  // Visually hidden, never display:none: the role=status instruction must keep announcing a new lesson.
  assert.match(copy, /clip-path:\s*inset\(50%\)/);
  assert.doesNotMatch(copy, /display:\s*none/);
});
