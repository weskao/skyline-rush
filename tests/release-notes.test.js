import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import packageMeta from '../package.json' with { type: 'json' };
import {
  CURRENT_RELEASE, NOTES_SEEN_KEY, RELEASE_NOTES, RECENT_RELEASE_LIMIT, releaseForVersion, recentReleases,
  compareVersions, shouldAnnounce, markAnnouncementSeen, releaseText, releaseImage
} from '../src/release-notes.js';
import { checkReleaseNotes } from '../scripts/check-release-notes.mjs';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('a release newer than the version the player last saw shows once and records it', () => {
  const store = storage();
  const release = { version: '9.9.9', highlights: [{ id: 'new-track' }] };
  assert.equal(shouldAnnounce(release, store), false, 'a first-time player has nothing new to catch up on');
  assert.equal(shouldAnnounce(release, store, true), true, 'a returning player from before the record existed');
  markAnnouncementSeen(release, store);
  assert.equal(store.getItem(NOTES_SEEN_KEY), '9.9.9');
  assert.equal(shouldAnnounce(release, store), false, 'same version');
  assert.equal(shouldAnnounce({ ...release, version: '9.9.10' }, store), true, 'newer version');
  store.setItem(NOTES_SEEN_KEY, '10.0.0');
  assert.equal(shouldAnnounce(release, store), false, 'player already saw a newer version');
  store.setItem(NOTES_SEEN_KEY, 'garbage');
  assert.equal(shouldAnnounce(release, store), true, 'unreadable record counts as older');
});

test('no announcement without notes', () => {
  const store = storage();
  assert.equal(shouldAnnounce(null, store), false);
  assert.equal(shouldAnnounce({ version: '1.0.0', highlights: [] }, store), false);
});

test('blocked localStorage never crashes and never reopens the notes on every load', () => {
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  const release = { version: '3.0.0', highlights: [{}] };
  assert.equal(shouldAnnounce(release, blocked), false);
  assert.equal(shouldAnnounce(release, blocked, true), false);
  assert.doesNotThrow(() => markAnnouncementSeen(release, blocked));
});

test('versions compare numerically, not as text', () => {
  assert.ok(compareVersions('0.10.0', '0.9.9') > 0);
  assert.ok(compareVersions('0.20.2', '0.20.10') < 0);
  assert.equal(compareVersions('1.2.3', 'v1.2.3'), 0);
  assert.ok(compareVersions('1.0.0', 'garbage') > 0);
});

test('the dialog lists at most five released versions, newest first, never a future one', () => {
  const notes = ['0.1.0', '0.3.0', '0.2.0', '0.9.0', '0.4.0', '0.5.0', '0.6.0', '0.10.0']
    .map(version => ({ version, highlights: [{}] }));
  assert.deepEqual(recentReleases('0.3.0', notes).map(r => r.version), ['0.3.0', '0.2.0', '0.1.0']);
  assert.deepEqual(recentReleases('0.9.0', notes).map(r => r.version), ['0.9.0', '0.6.0', '0.5.0', '0.4.0', '0.3.0']);
  assert.equal(RECENT_RELEASE_LIMIT, 5);
  const shipped = recentReleases();
  assert.ok(shipped.length >= 3 && shipped.length <= 5, `shows ${shipped.length} versions`);
  assert.equal(shipped[0], CURRENT_RELEASE);
});

test('every stored release, shown or archived, is complete in both languages with bundled images', () => {
  const versions = RELEASE_NOTES.map(r => r.version);
  assert.equal(new Set(versions).size, versions.length, 'unique versions');
  for (const release of RELEASE_NOTES) {
    assert.match(release.version, /^\d+\.\d+\.\d+$/);
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.highlights.length, `${release.version} has highlights`);
    const images = [release.image, ...release.highlights.map(h => h.image)].filter(Boolean);
    for (const locale of ['en', 'zh-TW']) {
      for (const h of release.highlights) {
        assert.ok(releaseText(h.title, locale), `${release.version} ${h.id} title ${locale}`);
        assert.ok(releaseText(h.description, locale), `${release.version} ${h.id} description ${locale}`);
      }
      for (const image of images) {
        const path = releaseImage(image, locale);
        assert.ok(path && fs.existsSync(new URL(`../public/${path}`, import.meta.url)), `${release.version} image ${locale}`);
      }
    }
  }
});

test('a release cannot be published without player notes for that version', () => {
  assert.deepEqual(checkReleaseNotes(packageMeta.version), []);
  assert.deepEqual(checkReleaseNotes('v' + packageMeta.version), []);
  assert.match(checkReleaseNotes('99.0.0').join('\n'), /no What's New entry for 99\.0\.0/);
  assert.match(checkReleaseNotes('').join('\n'), /version/);
});

test('current entry is curated, in both languages and only contains shipped features', () => {
  assert.ok(CURRENT_RELEASE);
  assert.equal(releaseForVersion(CURRENT_RELEASE.version), CURRENT_RELEASE);
  assert.ok(CURRENT_RELEASE.highlights.length);
  for (const highlight of CURRENT_RELEASE.highlights) {
    for (const locale of ['en', 'zh-TW']) {
      assert.ok(releaseText(highlight.title, locale));
      assert.ok(releaseText(highlight.description, locale));
    }
    assert.equal(releaseImage(highlight.image, 'fr'), releaseImage(highlight.image, 'en'));
  }
});

test('image fields can be missing or localized and cannot contain remote or traversal URLs', () => {
  assert.equal(releaseImage(null, 'en'), null);
  assert.equal(releaseImage({en:'image-en.jpeg','zh-TW':'image-zh.jpeg'}, 'zh-TW'), 'image-zh.jpeg');
  assert.equal(releaseImage('https://example.com/x.png', 'en'), null);
  assert.equal(releaseImage('../secret.png', 'en'), null);
  assert.equal(releaseImage('valid/path.webp', 'en'), 'valid/path.webp');
  assert.equal(releaseImage('og-image.en.jpeg', 'en'), 'og-image.en.jpeg');
  assert.equal(releaseImage('a/../secret.png', 'en'), null);
  assert.equal(releaseImage('..png', 'en'), null);
  // Pinned: CURRENT_RELEASE follows package.json, so the next version bump would change what it holds.
  assert.equal(releaseImage(releaseForVersion('0.21.0').image, 'zh-TW'), 'og-image.zh-TW.jpeg');
  assert.equal(releaseText({en:'New track','zh-TW':'全新賽道'}, 'zh-TW'), '全新賽道');
  assert.equal(releaseText({en:'New track','zh-TW':'全新賽道'}, 'fr'), 'New track');
});
