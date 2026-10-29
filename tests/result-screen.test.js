import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resultView, setupResultScreen } from '../src/result-screen.ts';
import { timeString } from '../src/time-format.ts';
import { setLocale, t } from '../src/i18n.ts';

setLocale('en');
const race = (extra = {}) => ({ mode: 'classic', trackId: 'coast', length: 5000, elapsed: 61.5, rivals: [{}, {}, {}], hazards: [],
  result: { position: 1, time: 61.5, score: 480, stars: 2, collisions: 1, nearMisses: 3, success: true }, ...extra });
const finished = (extra = {}) => ({ best: 61.5, record: false, medals: [], series: null, cup: null, stunt: null, next: null, ...extra });

test('result screens and time formatting have their own modules', () => {
  assert.equal(typeof setupResultScreen, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/mode\.eliminationWon/, /mode\.stuntSummary/, /mode\.cupNext/, /result\.styleStars/, /const timeString =/])
    assert.doesNotMatch(main, moved);
});

test('race times read as minutes, seconds and hundredths', () => {
  assert.equal(timeString(61.5), '01:01.50');
  assert.equal(timeString(5.123), '00:05.12');
  assert.equal(timeString(600), '10:00.00');
});

test('a Classic win shows the win title, a counted time/best/style and the NEXT track name', () => {
  const view = resultView(race(), finished({ record: true, next: 'neon' }));
  assert.equal(view.title, t('overlay.winTitle'));
  assert.ok(view.copy.startsWith(t('overlay.recordCopy')));
  assert.equal(view.nextTrack, 'Neon Downtown');
  assert.match(view.stats, /01:01\.50/);
  assert.deepEqual(view.counts.map(count => count.value), [61.5, 61.5, 480]);
  assert.match(view.style.aria, /2/);
});

test('a missed checkpoint run explains the gates instead of a podium', () => {
  const view = resultView(race({ mode: 'checkpoint', checkpoint: { passed: 3, gates: [{}, {}, {}, {}, {}], perfect: 1 },
    result: { success: false, position: 1, time: 40, collisions: 0 } }), finished());
  assert.equal(view.title, t('mode.checkpointFailed'));
  assert.match(view.stats, /3 \/ 5/);
  assert.deepEqual(view.counts, []);
  assert.equal(view.style, undefined);
});

test('a stunt heat with time left offers the next heat; the final heat shows the medal row', () => {
  const stunt = { duration: 60, elapsed: 20, score: 300.4, heats: 1, maxCombo: 4, airTime: 3, trackId: 'coast' };
  const heat = resultView(race({ mode: 'stunt', result: { endReason: 'route', time: 20, success: true } }), finished({ stunt, best: 0 }));
  assert.equal(heat.title, t('mode.stuntHeatEnd'));
  assert.equal(heat.nextStage, t('mode.stuntNext', { sec: 40 }));
  assert.doesNotMatch(heat.stats, new RegExp(t('mode.stuntMedal')));
  const last = resultView(race({ mode: 'stunt', result: { endReason: 'time', time: 40, success: true } }), finished({ stunt: { ...stunt, elapsed: 60 }, best: 300 }));
  assert.equal(last.title, t('mode.stuntComplete'));
  assert.match(last.stats, new RegExp(t('mode.stuntMedal')));
});

test('new personal awards are announced in both languages separately from Career', () => {
  for (const [locale, label] of [['en', 'Clean time trial'], ['zh-TW', '零碰撞計時']]) {
    setLocale(locale);
    const view = resultView(race({ mode: 'time' }), finished({ challengeMedals: ['time-clean'] }));
    assert.ok(view.copy.includes(label), view.copy);
    const repeat = resultView(race({ mode: 'time' }), finished({ challengeMedals: [] }));
    assert.ok(!repeat.copy.includes(label));
  }
  setLocale('en');
});
