import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_HUD_CLASSES } from './helpers/responsive-hud.js';
import { AIRFLOW_START_CLASSES, START_LAYOUT_SIZES } from './helpers/responsive-start.js';
import { SAFE_AREA_PROFILES } from './helpers/responsive-safe-areas.js';
import { RACE_MAP_SIZES, CONTROL_COMBOS } from './helpers/responsive-map.js';
import { HOME_VERSION_SIZES } from './helpers/responsive-home-version.js';

// tests/responsive-browser.spec.js folds viewport matrices into one booted page per class. These lists are the
// matrices it walks, so a size dropped from a list is a tested layout lost.
const key = ([width, height]) => `${width}x${height}`;

test('the race HUD matrix keeps every size it checked before folding', () => {
  const sizes = (locale) => RACE_HUD_CLASSES.filter(c => c.locale === locale).flatMap(c => c.sizes.map(key));
  assert.deepEqual(sizes('en-US').sort(), ['1024x768', '1440x900', '320x568', '360x780', '375x667', '390x844', '412x892', '480x1040', '640x360',
    '658x320', '740x360', '750x342', '780x360', '814x380', '820x1180', '844x390', '874x339'].sort());
  assert.deepEqual(sizes('zh-TW').sort(), ['1024x768', '320x568', '375x667', '390x844', '750x342', '780x360', '844x390', '874x339'].sort());
  for (const { sizes: list, hasTouch } of RACE_HUD_CLASSES) assert.ok(hasTouch || list.length === 1, 'a desktop class never mixes sizes');
});

test('the airflow showcase matrix covers every start layout size once, with the race-starting size last', () => {
  assert.equal(START_LAYOUT_SIZES.length, 14);
  assert.equal(AIRFLOW_START_CLASSES.flatMap(c => c.sizes).length, START_LAYOUT_SIZES.length);
});

test('the safe-area and home-version matrices keep their profiles', () => {
  assert.deepEqual(SAFE_AREA_PROFILES.map(p => p[0]), ['notch iphone', 'dynamic island', 'android 15 gesture', 'android 15 buttons', 'android 14',
    'notch landscape', 'android 15 landscape buttons', 'ipad portrait', 'ipad landscape']);
  assert.deepEqual(HOME_VERSION_SIZES.map(key), ['320x740', '390x844', '844x390', '1440x900']);
});

test('the race map matrix keeps its seven sizes and twelve touch combos', () => {
  assert.deepEqual(RACE_MAP_SIZES.map(key), ['375x667', '360x640', '320x568', '844x390', '874x339', '812x375', '932x430']);
  assert.equal(CONTROL_COMBOS.length, 12);
  assert.equal(new Set(CONTROL_COMBOS.map(c => `${c.size}${c.mode}${c.hand}`)).size, 12);
});
