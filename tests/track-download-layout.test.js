import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/track-chooser.css', import.meta.url), 'utf8');
test('game icon atlas uses actual generated WebP artwork and hover frames', () => {
  const bytes = readFileSync(new URL('../src/assets/track-pack-icons.webp', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.match(css, /track-pack-icons\.webp/);
  assert.match(css, /background-position:\s*100% 0/);
  assert.match(css, /background-position:\s*100% 100%/);
});
test('mobile chooser remains smaller than viewport in portrait and landscape', () => {
  assert.match(css, /height:\s*min\(78dvh,/);
  assert.match(css, /height:\s*min\(84dvh,/);
});
test('small visual glyph retains a 44px touch target', () => {
  assert.match(css, /\.track-pack-action::before\s*\{[^}]*width:\s*28px/s);
  assert.match(css, /\.track-pack-action\s*\{[^}]*width:\s*44px/s);
});
