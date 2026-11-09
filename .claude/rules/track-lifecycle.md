---
paths:
  - src/upcoming-tracks.ts
  - src/race-tracks.ts
  - src/access/**
  - src/courses/**
  - src/upcoming-scenes/**
  - public/track-teasers/**
  - docs/track-lifecycle/**
  - scripts/check-track-lifecycle.mjs
---

# Track lifecycle gate

Read `docs/track-lifecycle-sop.md` before adding or promoting a course. A non-released course **must never START outside the development-unlocked access policy**, even with stale saves, URLs or storage edits.

Never add or tick a `RELEASE APPROVED` line; this is exclusively the user's decision. Do not replace evidence with a guessed SHA or claim automated CI is human visual sign-off.

Use `node scripts/check-track-lifecycle.mjs --stage <id>` and preserve the fail-closed production policy.