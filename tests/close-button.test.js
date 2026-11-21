import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Every panel closes through src/CloseButton.vue: one round × instead of per-panel "Close" text buttons.
// Labelled acknowledgements/navigation are not close buttons and keep their words.
const LABELLED_ACTIONS = new Set(['photo-close', 'guide-close']);
const src = new URL('../src/', import.meta.url);
const markup = [
  ...readdirSync(src).filter(name => name.endsWith('.vue') && name !== 'CloseButton.vue').map(name => [`src/${name}`, readFileSync(new URL(name, src), 'utf8')]),
  ['index.html', readFileSync(new URL('../index.html', import.meta.url), 'utf8')],
];

test('close buttons are never hand-rolled outside CloseButton.vue', () => {
  const rogue = markup.flatMap(([file, text]) => [...text.matchAll(/<button\b[^>]*\b(?:id|class)="([^"]*close[^"]*)"/g)]
    .map(match => match[1]).filter(name => !LABELLED_ACTIONS.has(name)).map(name => `${file}: ${name}`));
  assert.deepEqual(rogue, []);
});

test('the shared close button has a default × and keeps panel-specific artwork accessible', () => {
  const component = readFileSync(new URL('CloseButton.vue', src), 'utf8');
  assert.match(component, /defineProps<\{ label: string \}>/);
  assert.match(component, /:aria-label="label"[^>]*><slot>×<\/slot><\/button>/);
  const garage = readFileSync(new URL('GaragePanel.vue', src), 'utf8');
  assert.match(garage, /<CloseButton id="garage-close"[^>]*><CollectibleIcon name="close" \/><\/CloseButton>/);
  const uses = markup.flatMap(([, text]) => [...text.matchAll(/<CloseButton\b[^>]*>/g)].map(match => match[0]));
  assert.ok(uses.some(use => use.includes('id="guide-cancel"')), 'the first-start dialog has its accessible close control');
  assert.ok(uses.some(use => use.includes('id="leave-close"')), 'the leave-race dialog has its accessible close control');
  for (const use of uses) assert.match(use, /\blabel=|:label=/, use);
});

test('all visible cross glyph buttons reuse the shared garage component', () => {
  const rogue = markup.flatMap(([file, source]) => [...source.matchAll(/>\s*[×✕✖]\s*<\/button>/g)]
    .map(() => file));
  assert.deepEqual(rogue, [], 'standalone × buttons must use CloseButton.vue');
});
