import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitText } from '../src/sign-text.ts';

// A fake 2D context: each character is 0.6 em wide at the current font size.
const context = () => ({ font: '', drawn: null,
  measureText(label) { return { width: label.length * Number(this.font.match(/(\d+)px/)[1]) * .6 }; },
  fillText(label, x, y) { this.drawn = { label, x, y, font: this.font }; } });

test('sign text shrinks the font until the label fits, never below 12 px, and adds CJK families for zh-TW', () => {
  const fits = context();
  fitText(fits, 'NEON', 5, 6, 1000, 40, 'en');
  assert.deepEqual(fits.drawn, { label: 'NEON', x: 5, y: 6, font: 'bold 40px sans-serif' });
  const shrinks = context();
  fitText(shrinks, 'FINISH', 0, 0, 120, 40, 'en'); // 6 chars * px * .6 <= 120 -> 33 px
  assert.equal(shrinks.drawn.font, 'bold 33px sans-serif');
  const floor = context();
  fitText(floor, 'A VERY LONG SIGN LABEL', 0, 0, 10, 40, 'zh-TW');
  assert.match(floor.drawn.font, /^bold 12px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif$/);
});

test('world.js imports sign text instead of defining it', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /function fitText|const signFont/);
  assert.match(world, /import \{ fitText \} from '\.\/sign-text\.ts';/);
});
