import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_RELEASE, NOTES_SEEN_KEY, releaseForVersion, shouldAnnounce,
  markAnnouncementSeen, releaseText, releaseImage
} from '../src/release-notes.js';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('an unread published release shows once and records its version on dismissal', () => {
  const store = storage();
  const release = { version: '9.9.9', autoShow: true, highlights: [{ id: 'new-track' }] };
  assert.equal(shouldAnnounce(release, store), true);
  markAnnouncementSeen(release, store);
  assert.equal(store.getItem(NOTES_SEEN_KEY), '9.9.9');
  assert.equal(shouldAnnounce(release, store), false);
  assert.equal(shouldAnnounce({ ...release, version: '9.9.10' }, store), true);
});

test('no announcement if no notes or the release is only for manual reading', () => {
  const store = storage();
  assert.equal(shouldAnnounce(null, store), false);
  assert.equal(shouldAnnounce({ version: '1', autoShow: true, highlights: [] }, store), false);
  assert.equal(shouldAnnounce({ version: '1', autoShow: false, highlights: [{}] }, store), false);
});

test('localStorage exceptions do not crash the game or disable the current-page fallback', () => {
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  const release = { version: '3', autoShow: true, highlights: [{}] };
  assert.equal(shouldAnnounce(release, blocked), true);
  assert.doesNotThrow(() => markAnnouncementSeen(release, blocked));
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
  assert.equal(releaseImage(CURRENT_RELEASE.image, 'zh-TW'), 'og-image.zh-TW.jpeg');
  assert.equal(releaseText({en:'New track','zh-TW':'全新賽道'}, 'zh-TW'), '全新賽道');
  assert.equal(releaseText({en:'New track','zh-TW':'全新賽道'}, 'fr'), 'New track');
});
