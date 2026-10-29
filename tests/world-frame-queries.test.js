import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// matchMedia() allocates a MediaQueryList per call; the renderer keeps one and reads its live .matches each frame.
test('the renderer creates its media queries once, never inside the frame loop', () => {
  const renderer = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(renderer, /matchMedia\([^)]*\)\)?\.matches/, 'a media query is built and read in the same expression');
  for (const query of renderer.matchAll(/matchMedia\(/g)) {
    const line = renderer.slice(renderer.lastIndexOf('\n', query.index) + 1, renderer.indexOf('\n', query.index));
    assert.match(line, /^ {2}const \w+ = matchMedia\(/, `media query outside world setup: ${line.trim()}`);
  }
});
