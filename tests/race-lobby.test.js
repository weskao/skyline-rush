import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { t, trackName } from '../src/i18n.ts';
import { lobbyDriverLabel, lobbyStartState } from '../src/mode-setup.ts';

const coast = { canRace: true, daily: false, mode: 'classic', unlocked: 1, cupCount: 3, previousTrackName: 'Coast', previewName: null };
const playable = { disabled: false, trackStatusKey: 'track.open', startLabelKey: 'start.race', accessNote: '' };
const cases = [
  ['unlocked Classic track starts without an access warning', {}, playable],
  ['locked Classic track points to the previous track', { canRace: false }, {
    disabled: true, trackStatusKey: 'track.locked', startLabelKey: 'track.locked',
    accessNote: 'Finish top 3 on Coast to unlock',
  }],
  ['Daily Challenge can start on a locked track', { canRace: false, daily: true }, playable],
  ['Coming Soon preview takes priority over the Daily unlock exception', { previewName: 'Dune Tempest', daily: true }, {
    disabled: true, trackStatusKey: 'lobby.preview', startLabelKey: 'track.comingSoon',
    accessNote: 'Dune Tempest is coming soon. Preview only — racing is not yet available.',
  }],
  ['Cup below the threshold stays disabled even on an unlocked track', { mode: 'cup', unlocked: 2 }, {
    disabled: true, trackStatusKey: 'track.open', startLabelKey: 'track.locked',
    accessNote: 'Unlock at least 3 tracks in Classic to enter the Cup',
  }],
  ['Cup can start when the unlocked track count reaches the threshold', { mode: 'cup', unlocked: 3 }, playable],
];
const english = (key, params) => t(key, params, 'en');

for (const [name, selection, expected] of cases) {
  test(name, () => {
    assert.deepEqual(lobbyStartState({ ...coast, ...selection }, english), expected);
  });
}

test('locked track and Cup access reasons remain visible together in Traditional Chinese', () => {
  const zh = (key, params) => t(key, params, 'zh-TW');
  const state = lobbyStartState({ ...coast, mode: 'cup', canRace: false, previousTrackName: trackName('coast', 'zh-TW') }, zh);
  assert.equal(state.disabled, true);
  assert.equal(state.accessNote, '須先於經典競速解鎖至少 3 條賽道才能參賽 在海岸公路跑進前三名即可解鎖');
});

test('Home uses the actual Classic, Custom and solo starting grids for its driver label', () => {
  assert.equal(lobbyDriverLabel(createRace('coast').rivals.length, false, english), '8 DRIVERS');
  assert.equal(lobbyDriverLabel(createRace('coast', { mode: 'custom', rivals: 2 }).rivals.length, false, english), '3 DRIVERS');
  assert.equal(lobbyDriverLabel(createRace('coast', { mode: 'time' }).rivals.length, false, english), 'SOLO');
  assert.equal(lobbyDriverLabel(createRace('coast').rivals.length, true, english), 'COMING SOON');
});
