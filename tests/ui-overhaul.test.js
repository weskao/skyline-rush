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
  assert.match(source('race-select-ui.ts'), /#lobby-track-name/);
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

test('a compact lobby hides full selectors until opened and exposes the race distance', () => {
  assert.match(source("App.vue"), /id="lobby-tracks-toggle"[^>]*aria-haspopup="dialog"/);
  assert.match(source('App.vue'), /id="lobby-race-distance"/);
  assert.match(source('race-select-ui.ts'), /#lobby-race-distance/);
});

test('the same Settings icon is available at home, paused, and finished', () => {
  const css = source('race-lobby.css');
  assert.match(css, /body:is\(\[data-phase="countdown"\], \[data-phase="racing"\]\) #settings-button \{ display: none; \}/);
  assert.doesNotMatch(source('RaceOverlay.vue'), /id="pause-settings"/);
  assert.match(source('SettingsPanel.vue'), /id="settings-button"/);
});

test('foldable viewport segments place HUD and controls over a full-screen world', () => {
  assert.match(source('style.css'), /#world\s*\{[^}]*position:\s*fixed;\s*inset:\s*0/);
  assert.doesNotMatch(source('foldable-viewport.css'), /#world\s*\{/);
});

test('the three lobby destinations pair transparent 3x artwork with their visible labels', () => {
  const app = source('App.vue');
  for (const name of ['garage', 'progress', 'practice']) {
    const file = readFileSync(new URL(`../public/feature-assets/race-lobby/nav-${name}@3x.webp`, import.meta.url));
    assert.equal(file.toString('ascii', 8, 16), 'WEBPVP8X');
    assert.equal(file[20] & 16, 16, 'alpha channel');
    assert.equal(file.readUIntLE(24, 3) + 1, 72);
    assert.equal(file.readUIntLE(27, 3) + 1, 72);
    assert.match(app, new RegExp(`nav-${name}@3x\\.webp[^>]*width="24" height="24" alt=""[^>]*><span data-i18n="nav\\.${name}"`));
  }
});

test('the studio pose switch has two named states', () => {
  assert.match(source('GaragePanel.vue'), /id="garage-pose-action"[^>]*role="switch"[^>]*aria-checked="garageStudioView.mode === 'flight'"/);
});

test('earned points and coins both belong to the collapsed receipt', () => {
  const results = source('wave3-demo-results-ui.ts');
  assert.match(results, /gains\.append\(credit, coinCredit\)/);
  assert.match(results, /details\.append\(status,/);
});

test('selected landmark art is 3x WebP and remains separate from the live race scene', () => {
  const app = source('App.vue');
  for (const track of ['coast', 'neon']) {
    const file = readFileSync(new URL(`../public/feature-assets/race-lobby/${track}-landmark@3x.webp`, import.meta.url));
    assert.equal(file.toString('ascii', 8, 12), 'WEBP');
  }
  assert.match(app, /<canvas id="world"/);
  assert.match(source('wave3-demo-results-integration.ts'), /#result-rewards/);
});

test('home settings use one modal with all four sections and no separate VFX or language toolbar', () => {
  const settings = source('SettingsPanel.vue');
  assert.match(settings, /<dialog[^>]*id="settings-panel"/);
  for (const section of ['audio', 'driving', 'display', 'language'])
    assert.ok(settings.includes(section), section);
  const app = source('App.vue');
  assert.doesNotMatch(app, /class="aero-tools"/);
  assert.match(app, /<template #display>[\s\S]*id="vfx-panel"/);
});

test('classic results reveal driving score and scoring rules without a disclosure', () => {
  const overlay = source('RaceOverlay.vue');
  const renderer = source('result-screen.ts');
  assert.match(overlay, /<div id="result-style" class="result-style" hidden><\/div>/);
  assert.doesNotMatch(overlay, /result-style-details|result\.styleDetails/);
  assert.match(renderer, /style\.hidden = !view\.style/);
  assert.match(renderer, /result\.styleHelp/);
  assert.match(renderer, /result\.styleStars/);
});
