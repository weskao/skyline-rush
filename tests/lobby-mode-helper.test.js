// Phones fold the lobby mode list behind #lobby-modes-toggle, so a spec reaches a mode button through
// tests/helpers/home-lobby.js (.claude/rules/browser-test-stability.md).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

test('a browser spec that names a lobby mode button opens the Mode dropdown through the helper', () => {
  const dir = new URL('.', import.meta.url);
  const bare = readdirSync(dir).filter(name => name.endsWith('browser.spec.js')).filter(name => {
    const text = readFileSync(new URL(name, dir), 'utf8');
    return /button\[data-race-mode=/.test(text) && !/\b(clickLobbyOption|openLobbyModes)\(/.test(text);
  });
  assert.deepEqual(bare, []);
});
