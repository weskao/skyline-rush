import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ITEM-12 unique item outlines: every active item the slot can hold has its own silhouette, and the
// slot shows exactly that one when item-ui.ts sets data-item.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const slot = read('../src/ItemSlot.vue');
const kinds = [...read('../src/active-items.ts').match(/const DURATIONS = \{([^}]*)\}/)[1].matchAll(/(\w+):/g)].map(m => m[1]);

test('every active item kind has its own distinct outline in the item slot', () => {
  assert.ok(kinds.length >= 5, `item kinds: ${kinds}`);
  const shapes = kinds.map(kind => {
    const svg = slot.match(new RegExp(`<svg class="item-${kind}"[^>]*>\\s*<path d="([^"]+)"`));
    assert.ok(svg, `${kind} has an outline`);
    return svg[1].replace(/\s+/g, ' ').trim();
  });
  assert.equal(new Set(shapes).size, kinds.length, 'no two items share an outline');
});

test('the slot shows only the held item\'s outline', () => {
  assert.match(slot, /\.item-icon svg \{[^}]*display: none/, 'outlines are hidden by default');
  const shown = slot.match(/((?:\.item-slot\[data-item="\w+"\] \.item-\w+,?\s*)+)\{ display: block; \}/);
  assert.ok(shown, 'a rule reveals the held item');
  const pairs = [...shown[1].matchAll(/data-item="(\w+)"\] \.item-(\w+)/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(pairs.map(([held]) => held).sort(), [...kinds].sort(), 'every kind is revealed');
  for (const [held, outline] of pairs) assert.equal(outline, held, `data-item="${held}" reveals its own outline`);
});
