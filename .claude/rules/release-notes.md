---
paths:
  - "src/release-notes.ts"
  - "src/release-notes-data.ts"
  - "scripts/check-release-notes.mjs"
  - "scripts/release-notes-reviews.json"
---

# What's New notes are reviewed player copy

- Write each entry for players (`docs/release-process.md` "Player-facing release announcement writing"): what they
  can now do or notice, never how it was built, configured or tested, and nothing sensitive.
- `checkReleaseNotes` (run by `pnpm test` and the release gate) rejects developer terms in en and
  zh-TW, links, emails, secrets, file and code names, commit ids and over-long text. Extend its
  word lists when a new kind of leak slips through (add the line to `DEVELOPER_ONLY` in
  `tests/release-notes.test.js`); never loosen them to pass a note.
- Draft and review only from `node scripts/check-release-notes.mjs --changes`: feat / fix / perf
  commits outside tooling scopes. Docs, test, CI, build, refactor and chore commits never become
  highlights.
- A version ships only after `/review-release-notes <version>`: a fresh-eyes sub-agent review, the
  user's approval, then `--approve` stores the copy's fingerprint. Editing the entry afterwards
  voids the review. Never write `scripts/release-notes-reviews.json` by hand.
- Every `AskUserQuestion` in the review or release flow has a first option ending in
  "(Recommended)", with the reason in its description.
- The coming release's entry is written as `version: UPCOMING`, never a version number, with media
  under `public/whats-new/<theme-slug>/`. It shows first as "Upcoming" until the release commit bumps
  `package.json`, which names it; the review and the gate find it under the version being released.
  Before writing the next notes, stamp the shipped entry with its version and tag date
  (`git log -1 --format=%cs v<version>`); `pnpm test` refuses two UPCOMING entries.
- A highlight players see happen in the game ships with a real-game picture or clip, checked frame by
  frame (`docs/release-announcements.md` §6 step 2); the review's "Show it" verdict and `/release`
  Phase N both stop a release that lacks one. Record it once, right before the release, from the code
  being released; never record or re-shoot for each change that lands on `develop`.
- The hero clip (the entry's `video`) autoplays inline, muted and looping, while the notes are open and its
  version is shown (poster + controls, no autoplay, under reduced motion). iPhone in Low Power Mode refuses even
  muted autoplay until a touch, so a refused hero starts inline on the first tap or key anywhere on the notes
  (`onUserActivation`, shared with the music unlock), never only through a tap on the clip, which enlarges it;
  guard: the "refused autoplay" tests in `tests/release-video-browser.spec.js`. Highlight clips stay a poster with a
  play button and play only in the enlarged view after a tap. In the enlarged view a tap on the clip pauses and
  resumes it, a tap outside it, the × or Esc closes. Encode at balanced quality: fixed CRF 20, capped at
  4 MB (`scripts/record-whats-new-clip.mjs`); never coarsen the CRF to save bytes, shorten the clip instead. `checkReleaseNotes` refuses an unbundled hero or highlight clip.
- Let inline hero playback start before prefetching highlight clips. Six simultaneous highlight downloads competed with the desktop hero on CI run `44224944222`, including when the source was assigned but its first frame had yet to play. The hero zoom browser test checks request order as well as playback.
- Clips come from `scripts/record-whats-new-clip.mjs` as lossless PNG frames at device scale 2 on a paused virtual clock, never
  Playwright `recordVideo` (a low-bitrate VP8 webm at scale 1: blurry on HiDPI screens, and CRF 20 cannot recover the lost
  detail); guard: `tests/record-whats-new-clip.test.js`. `--bot` earns NITRO by driving and `--press` scripts NITRO or drift keys. It serves the shipped `coming-soon` Garage mode, never the dev `trial` mode (wallet chips, trial VFX).
- `--master` archives a with-sound take (ffmpeg real-time capture + BlackHole, `vidpress` compressed) under
  `assets-src/whats-new/<slug>/`; the page plays only the silent `public/` clip. The capture is cropped to the
  page from CDP `Browser.getWindowForTarget`, so check the first frame shows only the game: never commit a take
  that caught another window, notification or private data. A headed Chrome offers Google Translate over zh-TW
  pages; the recorder injects `<meta name="google" content="notranslate">`, since no launch flag stops it. A run that
  throws must not orphan its ffmpeg (one kept recording screen + sound and hung the next take): the capture is killed on
  process exit; before retrying a failed take, check `ps -axo pid,comm | grep ffmpeg` is empty. The macOS screensaver
  once replaced a whole take, so `--master` runs `caffeinate -d -i -w <pid>`, and it refuses a locked screen (the lock-screen
  wallpaper video was recorded instead); still audit every take one frame per 2 s.
- A track is named exactly as Home shows it: `TRACK_NAMES` in `src/i18n.ts` (en + zh-TW) is the only table, and
  a highlight names the same tracks in both languages. A draft once wrote 霓虹市區 / 峽谷天道 / 天空螺旋 beside the
  right English names (game: 霓虹都會 / 峽谷天橋 / 天際螺旋). `copyProblems` enforces it; guard: "track names read
  exactly as Home shows them" in `tests/release-notes.test.js`. `TRACK_NAME_EXEMPT` lists reviewed entries written
  before the check; a line leaves it only through a fresh review of that version, and nothing is ever added.
- Leave out what players never need: fine tuning details, code structure or refactors, tests and
  tooling, back-office, admin or server setup, and anything sensitive (links, accounts, keys,
  unannounced plans).
- The dialog shows only the newest five versions; keep every older release's entry and images in
  the repo, archived.
- Every notes module stays at or below 400 lines (`tests/module-size.test.js`). When writing new notes, move each
  entry past the newest five, unchanged, from `release-notes-data.ts` to the top of
  `release-notes-archive-recent.ts`; when an archive module would pass 400 lines, start a new one and spread it in
  `release-notes-data.ts` in version order. Run `pnpm test` before pushing notes: a docs-only notes commit
  (`caf4a3b3`, 478 lines) turned `develop` red on 2026-11-07.
- Inside a release the dialog lists highlights NEW → improvement → fix (unknown kinds last); within
  a kind, clip + text → picture + text → text only, written order kept among equals, via `highlightsByKind` in `src/release-notes.ts`; write the data in any
  order and never re-sort it by hand.
- `scripts/release-gate.sh` runs `scripts/check-release-notes.mjs <version>` and refuses a release
  whose entry is incomplete, fails the copy check, was never reviewed or changed after review;
  never bypass it.

→ Read `docs/release-process.md` before writing or editing What's New / release notes or running
`/release`.
