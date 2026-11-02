import test from 'node:test';
import assert from 'node:assert/strict';
import { UI } from '../src/locales/ui.ts';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';

test('all bilingual interactive tutorial strings are retained in the public UI catalog', () => {
  const english = Object.keys(TUTORIAL_COPY.en).sort();
  const chinese = Object.keys(TUTORIAL_COPY['zh-TW']).sort();
  assert.deepEqual(chinese, english, 'the two tutorial languages must have identical keys');
  assert.equal(english.length, 59, 'all lesson, coaching and touch/tilt hints remain available');
  assert.ok(english.includes('tutorial.barrelRollReadyToLand'));
  assert.ok(english.includes('tutorial.drift'));
  assert.match(UI.en['tutorial.drift'], /0.15 NITRO/);
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
