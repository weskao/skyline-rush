import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/track-chooser.css', import.meta.url), 'utf8');
test('per-map download/update icon is anchored to the bottom-right', () => {
  assert.match(css, /\.track-chooser \.track-select \.track-pack-action\s*\{[^}]*right:\s*6px;\s*bottom:\s*6px;/s);
});
test('mobile action stays 44px and remains in the bottom-right', () => {
  assert.match(css, /\.track-chooser \.track-select \.track-pack-action\s*\{[^}]*width:\s*44px;\s*height:\s*44px;\s*right:\s*5px;\s*bottom:\s*5px;/s);
});
test('track distance line leaves clearance for the bottom-right action', () => {
  assert.match(css, /\.track-chooser \.track-select \.track-card-select\s*>\s*span:last-child\s*\{[^}]*padding-inline-end:\s*44px/s);
});
