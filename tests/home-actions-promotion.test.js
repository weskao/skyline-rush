import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('Garage takes Practice’s pinned Start position while Practice stays available after History', () => {
  const actions = app.match(/<div class="intro-actions">([\s\S]*?)<!-- Reserve space/)?.[1] ?? '';
  const primary = actions.match(/<div class="intro-primary">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.match(primary, /id="start-button"/);
  assert.match(primary, /id="garage-button"/);
  assert.doesNotMatch(primary, /id="practice-button"/);
  assert.ok(actions.indexOf('id="garage-button"') < actions.indexOf('data-open-history'));
  assert.ok(actions.indexOf('data-open-history') < actions.indexOf('id="practice-button"'));
});

test('Garage NEW treatment keeps a static highlight when animations are disabled', () => {
  const garage = app.match(/<button[^>]*id="garage-button"[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? '';
  assert.match(garage, /class="garage-new-tag"[^>]*>NEW<\/span>/);
  assert.match(css, /\.intro \.garage-button \{[^}]*background:/);
  assert.match(css, /@keyframes garage-highlight/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.intro \.garage-button, \.intro \.garage-new-tag \{ animation: none; \} \}/);
  assert.match(css, /\.vfx-comfort \.intro \.garage-button, \.vfx-comfort \.intro \.garage-new-tag \{ animation: none; \}/);
});

test('Garage NEW tag is a corner overlay on every device, above the rules row, below an open dropdown', () => {
  assert.doesNotMatch(css, /@media \(min-width: 1001px\) \{\s*\.intro \.garage-button \{ position: relative; \}/, 'corner pinning must not be desktop-only');
  assert.match(css, /\.intro \.garage-button \{[^}]*position: relative;/);
  const tag = css.match(/\.intro \.garage-new-tag \{([^}]*)\}/)?.[1] ?? '';
  assert.match(tag, /position: absolute; top: -9px; right: -9px;/);
  const z = Number(tag.match(/z-index: (\d+)/)?.[1]);
  const rowZ = Number(css.match(/\.race-mode-picker\.race-rules-row \{[^}]*z-index: (\d+)/)?.[1]);
  const openZ = Number(css.match(/^\.intro \.race-rules-row:has\(\[aria-expanded="true"\]\) \{ z-index: (\d+)/m)?.[1]);
  assert.ok(z > rowZ, 'tag above the rules row');
  assert.ok(openZ > z, 'open dropdown (any viewport) still covers the tag');
});
