import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { resolveInitialLocale } from '../src/locale-preference.ts';

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

test('the prepaint locale matches the runtime preference order, even when storage fails', () => {
  const script = html.match(/<script id="startup-locale-bootstrap">([\s\S]*?)<\/script>/);
  assert.ok(script && script.index < html.indexOf('<body'));
  for (const [saved, languages, language] of [
    ['zh-TW', ['en-US'], 'en-US'], ['en', ['zh-Hant'], 'zh-Hant'],
    [null, ['ja', 'zh-HK', 'en'], 'en-US'], ['bad', ['en-US', 'zh-TW'], 'zh-TW'],
    [null, [], 'zh-Hant'], [null, ['fr'], 'fr'],
  ]) {
    const document = { documentElement: { lang: 'en' } };
    const storage = { getItem(key) {
      assert.equal(key, 'skyline-rush-locale');
      if (saved === null) throw new Error('storage blocked');
      return saved;
    } };
    runInNewContext(script[1], { document, localStorage: storage, navigator: { languages, language } });
    assert.equal(document.documentElement.lang, resolveInitialLocale(storage, languages.length ? languages : [language]));
  }
});
