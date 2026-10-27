import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Vue exclusively owns cloud profile name, identity and avatar fallback', async () => {
  const { cloudView, updateCloudView } = await import('../src/cloud-view-state.ts');
  updateCloudView({ name: 'Driver', identity: 'Signed in as driver@example.com', avatarUrl: 'https://example.com/avatar.png' });
  assert.equal(cloudView.name, 'Driver');
  assert.equal(cloudView.identity, 'Signed in as driver@example.com');
  assert.equal(cloudView.avatarUrl, 'https://example.com/avatar.png');
  updateCloudView({ avatarFailed: true });
  assert.equal(cloudView.avatarFailed, true, 'failed images reveal the fallback');
  updateCloudView({ avatarUrl: '', avatarFailed: false });
  assert.equal(cloudView.avatarUrl, '');

  const template = readFileSync(new URL('../src/HistoryPanel.vue', import.meta.url), 'utf8');
  for (const token of ['{{ cloudView.name }}', '{{ cloudView.identity }}',
    ':src="cloudView.avatarUrl || undefined"', ':hidden="!cloudView.avatarUrl || cloudView.avatarFailed"',
    ':hidden="!!cloudView.avatarUrl && !cloudView.avatarFailed"', '@error="hideBrokenCloudAvatar"'])
    assert.ok(template.includes(token), 'Vue cloud profile binding missing: ' + token);

  const controller = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(controller, /updateCloudView\(/);
  assert.doesNotMatch(controller, /\$\('#cloud-(?:name|identity|avatar|avatar-fallback)'\)\.(?:textContent|hidden|addEventListener)/,
    'main.js must not compete with Vue for cloud profile presentation');
  assert.doesNotMatch(controller, /avatar\.src\s*=|avatar\.hidden\s*=|avatar\.removeAttribute\(['"]src['"]\)/,
    'avatar src and visibility are Vue-owned');
});
