import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import packageMeta from '../package.json' with { type: 'json' };
import {
  CURRENT_RELEASE, NOTES_SEEN_KEY, RELEASE_NOTES, RECENT_RELEASE_LIMIT, releaseForVersion, recentReleases,
  compareVersions, shouldAnnounce, markAnnouncementSeen, releaseText, releaseImage, releaseHeroVideo, UPCOMING, resolveUpcoming
} from '../src/release-notes.ts';
import { checkReleaseNotes, copyProblems, reviewHash, playerFacingChanges, releaseEntryFor } from '../scripts/check-release-notes.mjs';

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

test('the next release is written without a version: shown first as upcoming, then it takes the released version', () => {
  const notes = [{ version: UPCOMING, highlights: [{}] }, { version: '0.2.0', highlights: [{}] }, { version: '0.1.0', highlights: [{}] }];
  const before = resolveUpcoming(notes, '0.2.0');
  assert.deepEqual(recentReleases('0.2.0', before).map(r => r.version), [UPCOMING, '0.2.0', '0.1.0'], 'visible before the release');
  assert.deepEqual(recentReleases('0.3.0', resolveUpcoming(notes, '0.3.0')).map(r => r.version), ['0.3.0', '0.2.0', '0.1.0'], 'the release commit names it');
  const store = storage();
  store.setItem(NOTES_SEEN_KEY, '0.2.0');
  assert.equal(shouldAnnounce(before[0], store), false, 'unreleased notes never pop up by themselves');
  markAnnouncementSeen(before[0], store);
  assert.equal(store.getItem(NOTES_SEEN_KEY), '0.2.0', 'opening unreleased notes does not overwrite the last seen version');
});

test('every stored release, shown or archived, is complete in both languages with bundled images', () => {
  const versions = RELEASE_NOTES.map(r => r.version);
  assert.equal(new Set(versions).size, versions.length, 'unique versions (one upcoming entry at most: stamp the released one with its version and date first)');
  for (const release of RELEASE_NOTES) {
    assert.match(release.version, new RegExp(`^(\\d+\\.\\d+\\.\\d+|${UPCOMING})$`));
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
  // Pinned: CURRENT_RELEASE follows package.json, so the next version bump would change what it holds.
  assert.equal(releaseImage(releaseForVersion('0.21.0').image, 'zh-TW'), 'og-image.zh-TW.jpeg');
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

test('the review and the gate find the upcoming entry under the version being released', () => {
  const upcoming = { ...entry('Fly longer.', '飛得更久。'), version: UPCOMING };
  const notes = [upcoming, { ...entry('Race at night.', '夜間賽。'), version: '0.2.0' }];
  const reviews = { '0.3.0': reviewHash({ ...upcoming, version: '0.3.0' }) };
  assert.equal(releaseEntryFor('0.3.0', notes), upcoming);
  assert.deepEqual(checkReleaseNotes('0.3.0', { notes, reviews }), [], 'before the release commit');
  assert.deepEqual(checkReleaseNotes('0.3.0', { notes: resolveUpcoming(notes, '0.3.0'), reviews }), [], 'after it, the review still matches');
  assert.match(checkReleaseNotes('0.1.9', { notes, reviews }).join('\n'), /no What's New entry for 0\.1\.9/, 'never under an older version');
  assert.match(checkReleaseNotes('0.3.0', { notes, reviews: {} }).join('\n'), /not reviewed/);
});

test('the gate also refuses notes that fail the player copy check', () => {
  const bad = entry('Refactored the backend.', '重構後端。');
  assert.match(checkReleaseNotes('9.9.9', { notes: [bad], reviews: { '9.9.9': reviewHash(bad) } }).join('\n'), /developer term/);
});

const clipVideo = (desktopSrc = { en: 'whats-new/t/d.en.mp4', 'zh-TW': 'whats-new/t/d.zh-TW.mp4' }, desktopPoster = { en: 'whats-new/t/d.en.jpg', 'zh-TW': 'whats-new/t/d.zh-TW.jpg' }) => ({
  desktop: { src: desktopSrc, poster: desktopPoster },
  mobile: { src: 'whats-new/t/m.mp4', poster: 'whats-new/t/m.jpg' },
});

test('a release video plays the clip for the screen shape and language, with a bundled poster', () => {
  assert.deepEqual(releaseHeroVideo(clipVideo(), 'zh-TW', false), { src: 'whats-new/t/d.zh-TW.mp4', poster: 'whats-new/t/d.zh-TW.jpg', variant: 'desktop' });
  assert.equal(releaseHeroVideo(clipVideo(), 'fr', false)?.src, 'whats-new/t/d.en.mp4', 'other languages fall back to English');
  assert.deepEqual(releaseHeroVideo(clipVideo(), 'en', true), { src: 'whats-new/t/m.mp4', poster: 'whats-new/t/m.jpg', variant: 'mobile' });
  assert.equal(releaseHeroVideo(null, 'en', false), null);
  assert.equal(releaseHeroVideo(undefined, 'en', true), null);
  assert.equal(releaseHeroVideo(clipVideo(undefined, null), 'en', false), null, 'a clip without a poster is not shown');
  for (const src of ['https://example.com/x.mp4', '../x.mp4', 'a/../x.mp4', 'whats-new/t/d.png', '/whats-new/t/d.mp4']) {
    assert.equal(releaseHeroVideo(clipVideo(src), 'en', false), null, src);
  }
  assert.equal(releaseHeroVideo(clipVideo('whats-new/t/d.webm'), 'en', false)?.src, 'whats-new/t/d.webm');
});

test('the gate refuses a release video or poster that is not bundled', () => {
  const release = { ...entry('Fly longer.', '飛得更久。'), video: clipVideo() };
  assert.match(checkReleaseNotes('9.9.9', { notes: [release], reviews: { '9.9.9': reviewHash(release) } }).join('\n'), /desktop video .* is not a file in public\//);
  const shipped = RELEASE_NOTES.find(r => r.video);
  if (shipped) assert.deepEqual(checkReleaseNotes(shipped.version, { reviews: { [shipped.version]: reviewHash(shipped) } }), []);
});

test('changing a release video voids its review, while entries without one keep their fingerprint', () => {
  const release = entry('Fly longer.', '飛得更久。');
  assert.equal(reviewHash({ ...release, video: undefined }), reviewHash(release));
  assert.notEqual(reviewHash({ ...release, video: clipVideo() }), reviewHash(release));
  assert.notEqual(reviewHash({ ...release, video: clipVideo('whats-new/t/other.mp4') }), reviewHash({ ...release, video: clipVideo() }));
  const reviews = JSON.parse(fs.readFileSync(new URL('../scripts/release-notes-reviews.json', import.meta.url), 'utf8'));
  for (const [version, hash] of Object.entries(reviews)) {
    const reviewed = releaseForVersion(version);
    if (reviewed) assert.equal(reviewHash(reviewed), hash, `${version} review still matches`);
  }
});

test('the release script checks the notes before it pulls, commits or tags anything', () => {
  const release = fs.readFileSync(new URL('../scripts/release.sh', import.meta.url), 'utf8');
  const gate = fs.readFileSync(new URL('../scripts/release-gate.sh', import.meta.url), 'utf8');
  assert.ok(release.indexOf('release-gate.sh') < release.indexOf('.claude/scripts/release.sh'), 'gate runs before the shared commit/tag script');
  const notes = gate.indexOf('node scripts/check-release-notes.mjs');
  assert.ok(notes > 0);
  for (const step of ['git fetch', 'gh run list', 'npm test']) assert.ok(notes < gate.indexOf(step), `notes are checked before ${step}`);
});

// Developer-record lines from CHANGELOG.md that must never reach players, and player copy that must pass.
const DEVELOPER_ONLY = {
  en: [
    'Clarify feature branch workflow', 'Isolate preview server ports', 'Seed guide-seen in readme capture',
    'Gate home-screen pushes on layout tests', 'Add explicit immutable per-mode race objectives',
    'Apply objective contract to race completion logic', 'Reject malformed mode requests without changing legacy defaults',
    'Add versioned pure race session identity separate from presentation', 'Name independent deterministic race random streams',
    'Record tested session contracts and outstanding acceptance gates', 'RED contracts for strict validation and seeded replay',
    'Run 8 browser shards and verify tags from main', 'Integrate v0.17.0 before completing interactive tutorial',
    'Add agent guidance for the game', 'Add test-first one-shot event rules for arcade modes',
    'Reconcile upstream browser fixtures and device UX', 'Integrate main race modes into feature/race-modes-p0',
    'Validate raw session settings while preserving normalized callers', 'Track the controls guide v1 checklist',
    'Specify per-mode music loops and checkpoint chimes (RED)', 'Run dev servers on emulators', 'Fixed a P1 crash'
  ],
  'zh-TW': ['新增瀏覽器測試', '合併功能分支', '更新規格文件', '固定隨機種子', '修正舊版相容問題', '整理待辦清單', '補上代理說明', '驗收條件更新', '調整連接埠']
};
const PLAYER_COPY = {
  en: [
    'Push harder through the gates for a perfect line.', 'Test your racing line on the new harbour track.',
    'Add interactive driving tutorial', 'Raise music and effects output gain', 'Steer rivals and traffic around obstacles',
    'Show live Free Drive telemetry', 'Start music on first interaction, no prompt', 'Make every button clickable up to its border',
    'Red and green lights now count you down.', 'Rivals in red cars push back when you bump them.'
  ],
  'zh-TW': ['穿過閃亮的檢查門，挑戰完美路線。', '新的港口賽道開放挑戰。', '紅綠燈倒數更清楚。', '對手被撞時會減速並被推開。']
};

test('developer-only changes never pass as player copy', () => {
  for (const en of DEVELOPER_ONLY.en) assert.notDeepEqual(copyProblems(entry(en, '更順暢的比賽。')), [], en);
  for (const zh of DEVELOPER_ONLY['zh-TW']) assert.notDeepEqual(copyProblems(entry('Smoother races.', zh)), [], zh);
});

test('everyday player copy is not mistaken for developer notes', () => {
  for (const en of PLAYER_COPY.en) assert.deepEqual(copyProblems(entry(en, '更順暢的比賽。')), [], en);
  for (const zh of PLAYER_COPY['zh-TW']) assert.deepEqual(copyProblems(entry('Smoother races.', zh)), [], zh);
});

test('notes are drafted only from changes players can notice', () => {
  assert.deepEqual(playerFacingChanges([
    'feat(game): give ai cars the player\'s collision physics', 'fix(ui): align cloud save buttons', 'perf(world): stream fewer props',
    'feat: add a night track', 'fix(audio)!: keep music on after a call',
    'docs: release 0.21.0', 'docs(readme): link cloud-save operations guide', 'test(browser): isolate preview server ports',
    'ci: run 8 browser shards', 'build(release): refuse a release without its notes', 'refactor(game): split physics',
    'chore: bump deps', 'style: format', 'feat(dev): run dev servers on firebase emulators', 'fix(hooks): run the layout gate on a free port',
    'feat(release): gate notes', 'fix(ci): scale timeout', 'Merge branch main', 'Integrate Firebase cloud save into main'
  ]), [
    'feat(game): give ai cars the player\'s collision physics', 'fix(ui): align cloud save buttons', 'perf(world): stream fewer props',
    'feat: add a night track', 'fix(audio)!: keep music on after a call'
  ]);
});
