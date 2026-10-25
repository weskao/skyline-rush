import test from 'node:test';
import assert from 'node:assert/strict';
import { googleAccountFields } from '../src/cloud-account.js';

test('Google account fields save a bounded name and email without credentials', () => {
  const payload = googleAccountFields({
    uid: 'player-a', displayName: '  Player A  ', email: 'PLAYER@GMAIL.COM',
    photoURL: 'https://example.test/avatar', accessToken: 'private-token', password: 'secret',
  });
  assert.deepEqual(payload, { displayName: 'Player A', email: 'PLAYER@GMAIL.COM' });
});

test('missing name and email do not erase a previously saved value', () => {
  assert.deepEqual(googleAccountFields({ uid: 'player-a', displayName: null, email: undefined }), {});
});

test('invalid or oversized Google account fields are not persisted', () => {
  assert.deepEqual(googleAccountFields({
    uid: 'player-a', displayName: 'x'.repeat(201), email: 'x'.repeat(321),
  }), {});
});
