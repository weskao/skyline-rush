import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import packageMeta from '../package.json' with { type: 'json' };
import {
  CURRENT_RELEASE, NOTES_SEEN_KEY, RELEASE_NOTES, RECENT_RELEASE_LIMIT, releaseForVersion, recentReleases,
  compareVersions, shouldAnnounce, markAnnouncementSeen, releaseText, releaseImage
} from '../src/release-notes.js';
import { checkReleaseNotes, copyProblems, reviewHash } from '../scripts/check-release-notes.mjs';

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
  const reviews = { [packageMeta.version]: reviewHash(releaseForVersion(packageMeta.version)) };
  assert.deepEqual(checkReleaseNotes(packageMeta.version, { reviews }), []);
  assert.deepEqual(checkReleaseNotes('v' + packageMeta.version, { reviews }), []);
  assert.match(checkReleaseNotes('99.0.0').join('\n'), /no What's New entry for 99\.0\.0/);
  assert.match(checkReleaseNotes('').join('\n'), /version/);
});

test('current entry is curated in both languages', () => {
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

const entry = (en, zh, extra = {}) => ({ version: '9.9.9', date: '2099-01-01', image: null, highlights: [{
  id: 'x', kind: 'new', image: null, title: { en: 'A new street race', 'zh-TW': '新的街道賽' }, description: { en, 'zh-TW': zh }, ...extra
}] });

test('player copy passes when it talks about what players get', () => {
  assert.deepEqual(copyProblems(entry('On iPhone, sign in with Google and turn AUTO on from the App.', '在 iPhone 上用 Google 登入，從 App 開啟 AUTO。')), []);
});

test('player copy rejects developer jargon in both languages', () => {
  for (const en of ['Refactored the AI collision code.', 'Fixed a shader bug.', 'Moved saves to Firestore.', 'CI now runs faster.', 'New backend API for scores.', 'Faster database queries.', 'Updated the Vue component.']) {
    assert.match(copyProblems(entry(en, '更順暢的比賽。')).join('\n'), /developer term/, en);
  }
  for (const zh of ['重構碰撞邏輯。', '後端效能提升。', '調整後台設定。', '資料庫查詢更快。', '程式架構更清楚。', '新增單元測試。', '修改設定檔。']) {
    assert.match(copyProblems(entry('Smoother races.', zh)).join('\n'), /developer term/, zh);
  }
});

test('player copy rejects anything that looks like a secret, link, file or code name', () => {
  for (const en of ['See https://example.com for more.', 'Write to user@example.com.', 'Token sk-test1234 is fixed.', 'Edited src/game.js.', 'Tuned knockBack for rivals.', 'The max_speed limit is higher.', 'Call knock() less.', 'Fixed in 9e7eb18.', 'Runs on localhost.']) {
    assert.match(copyProblems(entry(en, '更順暢的比賽。')).join('\n'), /looks like/, en);
  }
});

test('player copy stays short enough to read at a glance', () => {
  assert.match(copyProblems(entry('Faster. '.repeat(30), '更快。')).join('\n'), /too long/);
  assert.match(copyProblems(entry('Faster.', '更快。'.repeat(40))).join('\n'), /too long/);
});

test('every stored release reads as player copy', () => {
  for (const release of RELEASE_NOTES) assert.deepEqual(copyProblems(release), [], release.version);
});

test('a release is refused until its notes are reviewed, and again if they change after review', () => {
  const v = packageMeta.version, release = releaseForVersion(v);
  assert.match(checkReleaseNotes(v, { reviews: {} }).join('\n'), /not reviewed/);
  assert.match(checkReleaseNotes(v, { reviews: { [v]: 'stale' } }).join('\n'), /changed since/);
  const edited = { ...release, highlights: [{ ...release.highlights[0], title: { en: 'Edited', 'zh-TW': '已修改' } }, ...release.highlights.slice(1)] };
  assert.notEqual(reviewHash(edited), reviewHash(release));
  assert.deepEqual(checkReleaseNotes(v, { reviews: { [v]: reviewHash(release) } }), []);
});

test('the gate also refuses notes that fail the player copy check', () => {
  const bad = entry('Refactored the backend.', '重構後端。');
  assert.match(checkReleaseNotes('9.9.9', { notes: [bad], reviews: { '9.9.9': reviewHash(bad) } }).join('\n'), /developer term/);
});

test('the release script checks the notes before it pulls, commits or tags anything', () => {
  const release = fs.readFileSync(new URL('../scripts/release.sh', import.meta.url), 'utf8');
  const gate = fs.readFileSync(new URL('../scripts/release-gate.sh', import.meta.url), 'utf8');
  assert.ok(release.indexOf('release-gate.sh') < release.indexOf('.claude/scripts/release.sh'), 'gate runs before the shared commit/tag script');
  const notes = gate.indexOf('node scripts/check-release-notes.mjs');
  assert.ok(notes > 0);
  for (const step of ['git fetch', 'gh run list', 'npm test']) assert.ok(notes < gate.indexOf(step), `notes are checked before ${step}`);
});
