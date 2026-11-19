import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('first paint declares the startup heading and gates the lobby before loading JavaScript', () => {
  const body = html.slice(html.indexOf('<body'));
  assert.match(body, /id="startup"[\s\S]*<h1 id="startup-title"/);
  assert.match(body, /id="startup"[\s\S]*id="app" inert[\s\S]*type="module"/);
  assert.match(body, /id="startup-enter"[^>]*hidden/);
});

test('the opening has a decorative road layer and the progress lights keep their status text', () => {
  assert.match(html, /class="startup-road" aria-hidden="true"/);
  assert.match(html, /id="startup-status" role="status"/);
});
