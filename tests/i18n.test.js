import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SUPPORTED_LOCALES, TRACK_NAMES, trackName, loadLocale, saveLocale,
  CATALOGS, interpolate, detectLocale, resolveInitialLocale, getLocale, setLocale, onLocaleChange, t,
  formatNumber, formatDate, applyDocumentLocale, applyI18n,
} from '../src/i18n.ts';
import { UI } from '../src/locales/ui.ts';
import { GAME } from '../src/locales/game.ts';
import { RACE_TRACKS } from '../src/game.js';
import { strayEnglish } from './helpers/i18n-english.js';

test('FPS is an allowed technical acronym, while ordinary English still needs translation', () => {
  assert.deepEqual(strayEnglish('30 FPS / 60 FPS'), []);
  assert.deepEqual(strayEnglish('自動 FPS settings'), ['settings']);
});

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

const memStore = (init = {}) => {
  const data = new Map(Object.entries(init));
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

test('detectLocale maps any zh* tag to zh-TW and everything else to en', () => {
  for (const tag of ['zh-TW', 'zh-HK', 'zh-Hant', 'zh-CN', 'zh-Hans', 'zh']) assert.equal(detectLocale([tag]), 'zh-TW', tag);
  // Case-insensitive, underscore separators (Android/POSIX style) and script subtags.
  for (const tag of ['ZH-tw', 'zh_TW', 'zh-Hant-TW']) assert.equal(detectLocale([tag]), 'zh-TW', tag);
  for (const tag of ['EN-gb', 'en_US']) assert.equal(detectLocale([tag]), 'en', tag);
  assert.equal(detectLocale(['ja-JP', 'zh-TW']), 'zh-TW', 'unsupported tags are skipped, not decisive');
  assert.equal(detectLocale(['ja-JP']), 'en');
  assert.equal(detectLocale(['fr-FR']), 'en');
  assert.equal(detectLocale(['fr-FR', 'zh-TW']), 'zh-TW');
  assert.equal(detectLocale(['en-US', 'zh-TW']), 'en', 'system preference order is respected');
  assert.equal(detectLocale(['zh-HK', 'en-US']), 'zh-TW');
  assert.equal(detectLocale([]), 'en');
  assert.equal(detectLocale(undefined), 'en');
});

test('resolveInitialLocale: saved beats system, blocked storage is safe, auto value is never persisted', () => {
  assert.equal(resolveInitialLocale(memStore({ 'skyline-rush-locale': 'en' }), ['zh-TW']), 'en');
  assert.equal(resolveInitialLocale(memStore({ 'skyline-rush-locale': 'zh-TW' }), ['fr']), 'zh-TW');
  assert.equal(resolveInitialLocale(memStore({ 'skyline-rush-locale': 'bogus' }), ['zh-CN']), 'zh-TW');
  const empty = memStore();
  assert.equal(resolveInitialLocale(empty, ['zh-HK']), 'zh-TW');
  assert.equal(empty.data.size, 0);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(resolveInitialLocale(blocked, ['zh-TW']), 'zh-TW');
  assert.equal(resolveInitialLocale(blocked, []), 'en');
});

test('resolveInitialLocale falls back to navigator.language when navigator.languages is empty or missing', () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const withNavigator = (nav, expected, label) => {
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
    assert.equal(resolveInitialLocale(memStore()), expected, label);
  };
  try {
    withNavigator({ languages: [], language: 'zh-TW' }, 'zh-TW', 'empty languages uses language');
    withNavigator({ language: 'zh-TW' }, 'zh-TW', 'missing languages uses language');
    withNavigator({ languages: ['en-US'], language: 'zh-TW' }, 'en', 'a non-empty list wins over language');
    withNavigator({ languages: [], language: '' }, 'en', 'neither -> en');
    withNavigator({}, 'en', 'bare navigator -> en');
    withNavigator(undefined, 'en', 'no navigator -> en');
  } finally { Object.defineProperty(globalThis, 'navigator', saved); }
});

test('t() interpolates, falls back to English and returns the key when missing', () => {
  assert.equal(interpolate('Hi {name}, {name}! {x}', { name: 'NOVA' }), 'Hi NOVA, NOVA! {x}');
  assert.equal(interpolate('{toString}', {}), '{toString}');
  assert.equal(t('doc.title', undefined, 'ja'), CATALOGS.en['doc.title']); // unsupported locale -> English
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.equal(t('doc.title', undefined, 'zh-TW'), CATALOGS['zh-TW']['doc.title']);
});

test('setLocale validates, notifies on change and unsubscribes', () => {
  const seen = [];
  const off = onLocaleChange(l => seen.push(l));
  try {
    setLocale('zh-TW'); setLocale('zh-TW'); setLocale('bogus');
    assert.equal(getLocale(), 'zh-TW');
    assert.equal(t('doc.title'), CATALOGS['zh-TW']['doc.title']);
    off();
    setLocale('en');
    assert.deepEqual(seen, ['zh-TW']);
  } finally { off(); setLocale('en'); }
});

test('catalogs: en and zh-TW have the same keys and en has no CJK', () => {
  for (const l of SUPPORTED_LOCALES) assert.deepEqual(Object.keys(UI[l]).filter(k => k in GAME[l]), [], 'UI/GAME key overlap');
  assert.deepEqual(Object.keys(CATALOGS['zh-TW']).sort(), Object.keys(CATALOGS.en).sort());
  for (const [k, v] of Object.entries(CATALOGS.en)) assert.doesNotMatch(v, /[　-鿿＀-￯]/, k);
});

test('formatNumber uses the requested locale', () => {
  assert.equal(formatNumber(1234.5, { maximumFractionDigits: 1 }, 'en'), '1,234.5');
});

test('applyI18n and applyDocumentLocale fill attributes, text, lang, title and description', () => {
  const el = (attrs) => ({ attrs: { ...attrs }, textContent: '',
    getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } });
  const text = el({ 'data-i18n': 'doc.title' });
  const titled = el({ 'data-i18n-title': 'doc.title' });
  const labelled = el({ 'data-i18n-aria-label': 'doc.description' });
  const meta = el({});
  const all = [text, titled, labelled];
  const root = { querySelectorAll: sel => all.filter(e => `[${Object.keys(e.attrs).find(a => sel === `[${a}]`)}]` === sel) };
  applyI18n(root, 'zh-TW');
  assert.equal(text.textContent, CATALOGS['zh-TW']['doc.title']);
  assert.equal(titled.attrs.title, CATALOGS['zh-TW']['doc.title']);
  assert.equal(labelled.attrs['aria-label'], CATALOGS['zh-TW']['doc.description']);
  const doc = { documentElement: {}, title: '', querySelector: sel => (sel === 'meta[name="description"]' ? meta : null) };
  applyDocumentLocale(doc, 'zh-TW');
  assert.equal(doc.documentElement.lang, 'zh-TW');
  assert.equal(doc.title, CATALOGS['zh-TW']['doc.title']);
  assert.equal(meta.attrs.content, CATALOGS['zh-TW']['doc.description']);
});

// Regression: Google is a proper noun, but Ghost is gameplay terminology to localize.
test('Cloud save Traditional Chinese copy localizes ghost records', () => {
  assert.match(CATALOGS['zh-TW']['cloud.explain'], /幽靈/);
  assert.doesNotMatch(CATALOGS['zh-TW']['cloud.explain'], /\bGhost\b/);
  assert.match(CATALOGS['zh-TW']['cloud.login'], /Google/);
});

// The browser flow only sees strings it renders; this catches stray English in every zh-TW message.
test('zh-TW catalog keeps English to the allowed brand terms', () => {
  const stray = Object.entries(CATALOGS['zh-TW']).filter(([, text]) => typeof text === 'string')
    .map(([key, text]) => [key, strayEnglish(text.replace(/\{\w+\}/g, ''))]).filter(([, words]) => words.length)
    .map(([key, words]) => `${key}: ${words.join(' ')}`);
  assert.deepEqual(stray, []);
});

// Static template keys must be translated, not silently displayed as their raw identifiers.
test('all static App.vue translation keys and mode History badges exist in both locales', () => {
  const template = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const keys = new Set([...template.matchAll(/data-i18n(?:-aria-label|-title)?="([\w.-]+)"/g)].map(match => match[1]));
  keys.add('mode.historyPersonalBest');
  keys.add('mode.historyGhost');
  for (const locale of SUPPORTED_LOCALES) for (const key of keys)
    assert.ok(typeof CATALOGS[locale][key] === 'string' && CATALOGS[locale][key].length > 0, `${locale}: ${key}`);
});

// Building an Intl formatter costs ~70x formatting with one; history rows and release tabs format many dates per render.
test('dates and numbers reuse one formatter per locale and options', () => {
  const real = { DateTimeFormat: Intl.DateTimeFormat, NumberFormat: Intl.NumberFormat };
  const built = [];
  for (const name of ['DateTimeFormat', 'NumberFormat'])
    Intl[name] = function (...args) { built.push([name, ...args]); return new real[name](...args); };
  try {
    const day = Date.UTC(2026, 0, 2, 12);
    const first = formatDate(day, { month: 'short', day: 'numeric', timeZone: 'UTC' }, 'en');
    assert.equal(formatDate(day, { month: 'short', day: 'numeric', timeZone: 'UTC' }, 'en'), first);
    assert.equal(formatDate(day, { timeZone: 'UTC', day: 'numeric', month: 'short' }, 'en'), first);
    assert.notEqual(formatDate(day, { month: 'short', day: 'numeric', timeZone: 'UTC' }, 'zh-TW'), first, 'the locale is part of the key');
    assert.equal(formatDate(day, { month: 'long', day: 'numeric', timeZone: 'UTC' }, 'en'), 'January 2');
    formatNumber(1234.5, { maximumFractionDigits: 1 }, 'en'); assert.equal(formatNumber(1234.5, { maximumFractionDigits: 1 }, 'en'), '1,234.5');
    assert.equal(built.filter(([name]) => name === 'DateTimeFormat').length, 4, JSON.stringify(built));
    assert.ok(built.filter(([name]) => name === 'NumberFormat').length <= 1, 'an earlier caller may already have built it');
  } finally { Object.assign(Intl, real); }
});
