import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, TRACK_NAMES, trackName, loadLocale, saveLocale } from '../src/i18n.js';
import { RACE_TRACKS } from '../src/game.js';

test('all track IDs have English and Traditional Chinese labels', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    for (const locale of SUPPORTED_LOCALES) assert.ok(trackName(id, locale).length > 0);
    assert.equal(trackName(id, 'en'), RACE_TRACKS[id].name);
  }
  assert.equal(TRACK_NAMES['zh-TW'].taipei, '台北古都');
  assert.equal(trackName('coast', 'zh-TW'), '海岸公路');
  assert.equal(trackName('cosmic', 'en'), 'Cosmic Orbit');
  assert.equal(trackName('coast', 'ja'), 'Coast');
});
test('locale preference validates and gracefully handles blocked storage', () => {
  const data = new Map();
  const store = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
  assert.equal(loadLocale(store), 'en');
  saveLocale('zh-TW', store);
  assert.equal(loadLocale(store), 'zh-TW');
  saveLocale('bogus', store);
  assert.equal(loadLocale(store), 'zh-TW');
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(loadLocale(blocked), 'en');
  assert.doesNotThrow(() => saveLocale('en', blocked));
});
