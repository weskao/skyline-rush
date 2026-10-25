---
paths:
  - "src/release-notes.js"
  - "scripts/check-release-notes.mjs"
  - "scripts/release-notes-reviews.json"
---

# What's New notes are reviewed player copy

- Write each entry for players (CLAUDE.md "Player-facing release announcement writing"): what they
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
