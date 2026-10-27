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

test('broken cloud avatar stays in fallback across the same account refresh, but retries a changed URL', async () => {
  const { cloudView, updateCloudView, updateCloudProfile } = await import('../src/cloud-view-state.ts');
  const profile = { name: 'Pilot', identity: 'Signed in', avatarUrl: 'https://example.test/missing.png' };
  updateCloudProfile(profile);
  updateCloudView({ avatarFailed: true });
  updateCloudProfile({ ...profile, name: 'Updated Pilot' });
  assert.equal(cloudView.avatarFailed, true, 'a sync or locale refresh must not flicker a broken avatar back');
  assert.equal(cloudView.name, 'Updated Pilot');
  updateCloudProfile({ ...profile, avatarUrl: 'https://example.test/new.png' });
  assert.equal(cloudView.avatarFailed, false, 'changed photo URLs may be retried');
});
