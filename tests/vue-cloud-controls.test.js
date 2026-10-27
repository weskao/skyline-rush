import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Vue owns Cloud Save controls, status announcements and last-sync presentation', async () => {
  const { cloudView, updateCloudView } = await import('../src/cloud-view-state.ts');
  updateCloudView({ statusText: 'Saved', statusState: 'synced', statusBusy: false, lastSyncText: 'Just now',
    loginHidden: true, logoutHidden: false, logoutNoteHidden: false,
    deleteHidden: false, switchHidden: true, syncDisabled: false,
    loginDisabled: false, deleteDisabled: false });
  assert.equal(cloudView.statusText, 'Saved');
  assert.equal(cloudView.statusState, 'synced');
  assert.equal(cloudView.logoutHidden, false);
  assert.equal(cloudView.syncDisabled, false);
  const component = readFileSync(new URL('../src/HistoryPanel.vue', import.meta.url), 'utf8');
  for (const binding of [
    ':hidden="cloudView.loginHidden"', ':disabled="cloudView.loginDisabled"',
    ':hidden="cloudView.logoutHidden"', ':hidden="cloudView.logoutNoteHidden"',
    ':hidden="cloudView.deleteHidden"', ':disabled="cloudView.deleteDisabled"',
    ':hidden="cloudView.switchHidden"', ':disabled="cloudView.syncDisabled"',
    ':data-cloud-state="cloudView.statusState"', ':aria-busy="cloudView.statusBusy"',
    '{{ cloudView.statusText }}', '{{ cloudView.lastSyncText }}'
  ]) assert.ok(component.includes(binding), 'missing Vue presentation binding ' + binding);
  const controller = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const id of ['cloud-login', 'cloud-logout', 'cloud-logout-note', 'cloud-delete',
    'cloud-switch', 'cloud-sync-now', 'cloud-status', 'cloud-last-sync'])
    assert.doesNotMatch(controller, new RegExp(`\\$\\('#${id}'\\)\\.(?:disabled|hidden|textContent|setAttribute)\\s*(?:=|\\()`),
      id + ' presentation must have a single Vue owner');
  assert.doesNotMatch(controller, /say\(\$\('#cloud-(?:status|last-sync)'\)/);
});
