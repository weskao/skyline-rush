import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { detectLocale, trackName, t, onLocaleChange, setLocale, getLocale, resolveInitialLocale } from '../src/i18n.ts';

test('typed locale service preserves English/Traditional Chinese fallback and avoids duplicate JS', () => {
  assert.equal(detectLocale(['fr', 'zh-Hant']), 'zh-TW');
  assert.equal(detectLocale(['en-US', 'zh-HK']), 'en');
  assert.equal(trackName('tokyo', 'zh-TW'), '東京夜行');
  assert.equal(trackName('tokyo', 'ja'), 'Tokyo Afterdark');
  assert.equal(t('not.in.catalog'), 'not.in.catalog');
  const storage = { getItem() { return null; }, setItem() {} };
  assert.equal(resolveInitialLocale(storage, ['zh-TW']), 'zh-TW');
  assert.equal(existsSync(new URL('../src/i18n.js', import.meta.url)), false);
});

test('typed locale event subscription keeps the original nonreactive callback semantics', () => {
  setLocale('en');
  const observed = [];
  const dispose = onLocaleChange(locale => observed.push(locale));
  try {
    setLocale('zh-TW');
    setLocale('zh-TW');
    assert.equal(getLocale(), 'zh-TW');
    assert.deepEqual(observed, ['zh-TW']);
  } finally { dispose(); setLocale('en'); }
});
