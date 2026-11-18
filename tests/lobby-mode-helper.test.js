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

// Phones and folds also hide the Home track cards behind #lobby-tracks-toggle (the race-hud-overlap stacked-fold specs
// clicked [data-track] directly and timed out). A spec naming a Home track card reaches it through the chooser.
const ASSERT_ONLY = new Set([
  'frostbite-canyon-browser.spec.js', // counts the Coming Soon card, never clicks it
  'responsive-browser.spec.js', // waits on a card's route overview, never clicks it
]);
test('a browser spec that names a Home track card opens the track chooser first', () => {
  const dir = new URL('.', import.meta.url);
  const bare = readdirSync(dir).filter(name => name.endsWith('browser.spec.js') && !ASSERT_ONLY.has(name)).filter(name => {
    const text = readFileSync(new URL(name, dir), 'utf8');
    return /\[data-(?:upcoming-)?track=/.test(text) && !/\b(clickLobbyOption|openLobbyTracks)\(|lobby-tracks-toggle|track-chooser/.test(text);
  });
  assert.deepEqual(bare, []);
});
