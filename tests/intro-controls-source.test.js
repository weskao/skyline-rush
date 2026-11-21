import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('intro-controls includes the R vehicle reset shortcut with bilingual help', () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const intro = app.split('<div class="intro-controls">')[1]?.split('</div>\n      <p class="flight-tip">')[0];
  assert.ok(intro, 'home intro controls exist');
  assert.match(intro, /<kbd>R<\/kbd><span data-i18n="hint\.reset">Reset vehicle<\/span>/);
  assert.match(intro, /data-i18n-title="hint\.resetTip"/);
  const ui = readFileSync(new URL('../src/locales/ui.ts', import.meta.url), 'utf8');
  assert.match(ui, /'hint\.reset': 'Reset vehicle'/);
  assert.match(ui, /'hint\.reset': '重置車輛'/);
  assert.match(ui, /'hint\.resetTip': 'Return to nearby safe road/);
  assert.match(ui, /'hint\.resetTip': '返回附近安全路段/);
});
