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
- `checkReleaseNotes` (run by `npm test` and the release gate) rejects developer terms in en and
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
  (`git log -1 --format=%cs v<version>`); `npm test` refuses two UPCOMING entries.
- A highlight players see happen in the game ships with a real-game picture or clip, checked frame by
  frame (`docs/release-announcements.md` §6 step 2); the review's "Show it" verdict and `/release`
  Phase N both stop a release that lacks one. Record it once, right before the release, from the code
  being released; never record or re-shoot for each change that lands on `develop`.
- Clips never autoplay in the notes: a hero or highlight `video` shows its poster with a play button and plays only
  in the enlarged view after a tap. Keep clips under 1 MB (CRF stepping in `scripts/record-whats-new-clip.mjs`);
  never raise the limit to gain quality. `checkReleaseNotes` refuses an unbundled hero or highlight clip.
- Leave out what players never need: fine tuning details, code structure or refactors, tests and
  tooling, back-office, admin or server setup, and anything sensitive (links, accounts, keys,
  unannounced plans).
- The dialog shows only the newest five versions; keep every older release's entry and images in
  the repo, archived.
- Inside a release the dialog lists highlights NEW → improvement → fix (unknown kinds last, written
  order kept within a kind) via `highlightsByKind` in `src/release-notes.ts`; write the data in any
  order and never re-sort it by hand.
- `scripts/release-gate.sh` runs `scripts/check-release-notes.mjs <version>` and refuses a release
  whose entry is incomplete, fails the copy check, was never reviewed or changed after review;
  never bypass it.
