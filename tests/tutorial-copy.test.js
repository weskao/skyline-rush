import test from 'node:test';
import assert from 'node:assert/strict';
import { UI } from '../src/locales/ui.ts';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';
import { DRIFT_MIN_SPEED, DRIFT_BLEED, DRIFT_FIRST_TIER } from '../src/drive-rules.ts';

// The "too slow" coaching names the speed the lesson's own entry check uses (interactive-tutorial.ts DRIFT_ENTRY).
test('drift speed coaching names a km/h just above the real drift entry speed', () => {
  const entryKmh = (DRIFT_MIN_SPEED + DRIFT_BLEED * DRIFT_FIRST_TIER) * 3.6;
  const keys = ['tutorial.driftRetry.slow', 'tutorial.driftRetry.slowSlide', 'tutorial.cue.driftSpeed', 'tutorial.cue.driftSpeedSlide'];
  for (const locale of ['en', 'zh-TW']) for (const key of keys) {
    const kmh = Number(TUTORIAL_COPY[locale][key].match(/(\d+) km\/h/)?.[1]);
    assert.ok(kmh >= entryKmh && kmh < entryKmh + 10, `${locale} ${key}: ${kmh} km/h vs entry ${entryKmh.toFixed(1)}`);
  }
});

// shortcut: CJK = 1 unit, ASCII ≈ 0.55 (12 px coach font), not real layout; the 750x342 browser spec is the real check.
// At 750x342 landscape the paused coach shows two lines of ~32 CJK each beside the pause card.
const coachUnits = text => [...text].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 128 ? 0.55 : 1), 0);
test('the zh-TW drift lesson fits the two-line short-landscape coach card', () => {
  for (const key of ['tutorial.drift', 'tutorial.driftSlide']) {
    const units = coachUnits(TUTORIAL_COPY['zh-TW'][key]);
    assert.ok(units <= 60, `${key}: ${units.toFixed(1)} units`);
  }
});

test('all bilingual interactive tutorial strings are retained in the public UI catalog', () => {
  const english = Object.keys(TUTORIAL_COPY.en).sort();
  const chinese = Object.keys(TUTORIAL_COPY['zh-TW']).sort();
  assert.deepEqual(chinese, english, 'the two tutorial languages must have identical keys');
  assert.equal(english.length, 130, 'all lesson, coaching, live cue and touch/tilt hints remain available');
  for (const key of ['tutorial.cue.chainRelease', 'tutorial.cue.driftRelease', 'tutorial.cue.boostGo', 'tutorial.finishing']) assert.ok(english.includes(key), key);
  assert.ok(english.includes('tutorial.freeDrive'), 'the completion banner must be localized');
  assert.ok(english.includes('tutorial.barrelRollReadyToLand'));
  assert.ok(english.includes('tutorial.drift'));
  assert.match(UI.en['tutorial.drift'], /NITRO arrives as you hold: 0\.6s \+0\.10/);
  assert.match(UI['zh-TW']['tutorial.drift'], /0\.6 秒 \+0\.10.*立即入帳；放開再加速/);
  for (const key of ['tutorial.driftRetry.short', 'tutorial.driftRetry.shortSlide']) {
    assert.match(UI.en[key], /0\.6s/, key);
    assert.match(UI['zh-TW'][key], /0\.6 秒/, key);
  }
  assert.match(UI['zh-TW']['tutorial.drift'], /甩尾/);
  assert.ok(english.includes('tutorial.barrelRollFlicked'), 'new airborne reverse-steer coaching must be localized');
  for (const locale of ['en', 'zh-TW']) {
    for (const key of english) {
      assert.ok(key.startsWith('tutorial.'), key);
      assert.equal(UI[locale][key], TUTORIAL_COPY[locale][key], `${locale} ${key}`);
      assert.ok(UI[locale][key].length > 0, `${locale} ${key}`);
    }
  }
  assert.match(UI.en['tutorial.completedCopy'], /eleven actions/);
  assert.match(UI['zh-TW']['tutorial.completedCopy'], /十一項操作/);
  for (const key of ['tutorial.barrelRoll', 'tutorial.touch.barrelRoll', 'tutorial.slide.barrelRoll', 'tutorial.tilt.barrelRoll']) {
    assert.match(UI.en[key], /release it to glide/, `${key}: English must cue a safe glide`);
    assert.match(UI['zh-TW'][key], /放開/, `${key}: Traditional Chinese must cue releasing FLY`);
  }
});
