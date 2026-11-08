---
paths:
  - ".github/**"
  - "scripts/ci-changes.mjs"
  - "tests/ci-changes.test.js"
  - "scripts/release-gate.sh"
---

# Remote CI gates

- Only `main` and `develop` run the full remote CI: the `quality-gate` job requires unit,
  browser, cloud-save and World Tour checks to succeed. `feature/**`, `fix/**` and `refactor/**`
  pushes run a focused gate (unit + cloud-save; browser and World Tour skipped) unless the commit
  message has `[full-regression]` or a manual run sets `full_regression`. The full suite on
  `develop` after the merge is the acceptance gate. A successful run on a previous commit does
  **not** validate the new HEAD.
- On every branch, a push or PR that only changes Markdown/text/images/video or the `Makefile`
  outside `src/`, `public/`, `tests/`, `scripts/` and `.github/` skips all suites (`quality-gate`
  still reports green), but only when the parent commit's own CI run on that branch passed.
  Rules: `scripts/ci-changes.mjs`; a test that reads a new doc must add it to `NEEDS_CI` there
  (`tests/ci-changes.test.js` enforces it).
- Pushing to a branch whose CI is in progress cancels that run (`cancel-in-progress`); wait for it to
  finish, or accept that the superseded run shows as cancelled, not failed (`quality-gate` uses
  `!cancelled()`, never `always()`; `tests/ci-quality-gate.test.js` pins it).
- A commit on `main` is not a deploy; publication rules are in `.github/workflows/ci.yml`.
- CI runs and optional screenshot artifacts are evidence for review, not substitutes for real
  vehicle/road contact or manual interaction testing on devices.
