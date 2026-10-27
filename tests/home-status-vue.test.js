import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('home daily challenge and medal badge have one Vue-owned reactive state', async () => {
  const state = new URL('../src/home-status-view-state.ts', import.meta.url);
  assert.ok(existsSync(state), 'start-screen status should be a TypeScript Vue state');
  const { homeStatusView, updateHomeStatusView } = await import('../src/home-status-view-state.ts');
  updateHomeStatusView({
    dailyRoute: 'Tokyo · No Flight', dailyBest: '01:24.50',
    dailyStartDisabled: false, medalCount: '2/4',
    medalLabel: '2 medals', hasMedals: true,
  });
  assert.equal(homeStatusView.dailyRoute, 'Tokyo · No Flight');
  assert.equal(homeStatusView.dailyStartDisabled, false);
  assert.equal(homeStatusView.medalLabel, '2 medals');
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  assert.match(app, /\{\{\s*homeStatusView\.dailyRoute\s*\}\}/);
  assert.match(app, /\{\{\s*homeStatusView\.dailyBest\s*\}\}/);
  assert.match(app, /:disabled="homeStatusView\.dailyStartDisabled"/);
  assert.match(app, /:aria-label="homeStatusView\.medalLabel"/);
  assert.match(app, /:class="\{ 'has-medals': homeStatusView\.hasMedals \}"/);
  const controller = readFileSync(new URL('../src/history-ui.ts', import.meta.url), 'utf8');
  assert.match(controller, /updateHomeStatusView\(/);
  assert.doesNotMatch(controller, /\$\('#daily-card-route'\)\.textContent|\$\('#medal-chip'\)\.classList/);
});
