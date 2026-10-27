import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { compareVersions, recentReleases, releaseImage, releaseText } from '../src/release-notes.ts';

test('typed release notes retain semantic ordering and localized fallback', () => {
  const releases = [
    { version: '0.10.0', date: '2026-01-01', image: null, highlights: [{ id: 'a', kind: 'fix', title: { en: 'Fix', 'zh-TW': '修正' }, description: { en: 'Work', 'zh-TW': '運作' } }] },
    { version: '0.9.9', date: '2025-12-31', image: null, highlights: [] },
  ];
  assert.equal(compareVersions('0.10.0', '0.9.9') > 0, true);
  assert.equal(recentReleases('0.10.0', releases).length, 2);
  assert.equal(releaseText(releases[0].highlights[0].title, 'zh-TW'), '修正');
  assert.equal(releaseImage('../secret.jpg', 'en'), null);
  assert.equal(existsSync(new URL('../src/release-notes.js', import.meta.url)), false);
});
