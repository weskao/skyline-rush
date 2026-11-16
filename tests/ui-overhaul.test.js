import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { icons } from '../src/icons.ts';
import { t } from '../src/i18n.ts';

const source = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');

test('vehicle inspection has shared named camera and pose artwork', () => {
  for (const name of ['settings', 'garage', 'trophy', 'practice', 'cameraOrbit', 'zoomIn', 'zoomOut']) {
    assert.match(icons[name] ?? '', /<(?:path|circle|rect)\b/, name);
  }
});

test('the default lobby presents the selected track as its heading', () => {
  const app = source('App.vue');
  assert.match(app, /<h1 id="intro-title"[^>]*>[^<]*<span id="lobby-hero-track"/);
  assert.match(source('race-select-ui.ts'), /#lobby-hero-track/);
});

test('the quick first-start guide keeps the full manual for later visits', () => {
  assert.match(source('GuidePanel.vue'), /v-show="!guideView.firstStart"[^>]*class="guide-manual"/);
});

test('player navigation and settings destinations are localized', () => {
  assert.deepEqual(['en', 'zh-TW'].map(locale => t('nav.progress', undefined, locale)), ['Progress', '進度']);
  assert.deepEqual(['en', 'zh-TW'].map(locale => t('settings.display', undefined, locale)), ['Display & HUD', '畫面與 HUD']);
});

test('the reward card reserves its last row for the mission progress', () => {
  const results = source('wave3-demo-results-ui.ts');
  const contents = results.slice(results.indexOf('details.append('), results.indexOf('const toggle ='));
  assert.ok(contents.indexOf('disclaimer') < contents.indexOf('__missions'));
  assert.match(source('wave3-demo-results.css'), /\.wave3-demo-results__mission\s*\{[^}]*grid-template-rows:\s*1fr auto/s);
});

test('progress is a modal owned by the existing history flow', () => {
  assert.match(source('HistoryPanel.vue'), /data-i18n="nav.progress"/);
  assert.match(source('RaceOverlay.vue'), /data-open-history[^>]*data-i18n="nav.progress"/);
});

test('reward credits use distinct currency icons and retain their amount text', () => {
  const results = source('wave3-demo-results-ui.ts');
  assert.match(results, /makeCredit\(doc, '[^']*', 'demo-points'\)/);
  assert.match(results, /makeCredit\(doc, '[^']*', 'wallet-coin'\)/);
  assert.match(results, /put\(points, reward \?\? ''\)/);
});
