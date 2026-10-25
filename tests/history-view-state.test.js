import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('History panel owns view-model data and renders saved values as text, never interpolated HTML', async () => {
  const file = new URL('../src/history-view-state.ts', import.meta.url);
  assert.ok(existsSync(file), 'history presentation should be typed Vue state');
  const { historyView, updateHistoryView } = await import('../src/history-view-state.ts');
  updateHistoryView({ careerSummary: '<script>untrusted</script>', historyRuns: [{ fields: ['<img onerror=alert(1)>'], best: false, detail: '<b>raw</b>' }] });
  assert.equal(historyView.careerSummary, '<script>untrusted</script>');
  assert.equal(historyView.historyRuns[0].best, false);
  const template = readFileSync(new URL('../src/HistoryPanel.vue', import.meta.url), 'utf8');
  assert.match(template, /\{\{\s*historyView\.careerSummary\s*\}\}/);
  assert.match(template, /v-for=".*historyView\.historyRuns"/);
  assert.match(template, /:points="historyView\.trendPolyPoints"/);
  assert.doesNotMatch(template, /v-html="[^"]*historyView/, 'stored values must stay escaped by Vue interpolation');
});
