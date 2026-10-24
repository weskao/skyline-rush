---
description: Release Skyline Rush — check and review the What's New notes first, then changelog, commit, tag, push and GitHub Release
argument-hint: "[version] [-y|--yes]   e.g. /release 0.22.0"
---

# Release (Skyline Rush)

This project's `/release` wraps the shared release command: nothing is committed, tagged or
pushed for the release until the version's in-game What's New notes pass every check.

## Phase 0 — Survey

Run Phase 0 of `$HOME/.claude/commands/release.md` (`release-prep.sh`, branch gate) with
`$ARGUMENTS` unchanged. Resolve the version now, because the notes check needs it: the version
token in `$ARGUMENTS`, else ask with `AskUserQuestion`, first option `<SUGGESTED> (Recommended)`
from the survey. Later phases reuse this answer and do not ask again.

## Phase N — What's New notes (before tests, intro or any release write)

1. `node scripts/check-release-notes.mjs <version>` — read-only.
   - **Passes** → go to Phase T.
   - **No entry for the version** → stop. The notes are written first (CLAUDE.md "Every release
     ships its What's New notes"); offer to draft them from the commits since the last tag.
   - **Copy problems, not reviewed, or changed since review** → run
     `.claude/commands/review-release-notes.md` with the version: automatic check, fresh-eyes
     sub-agent review, the user's answers (every `AskUserQuestion` carries a "(Recommended)" first
     option), then `--approve`.
2. After an approval, commit `src/release-notes.js` and `scripts/release-notes-reviews.json`
   together on the release branch (`docs(release): review <version> notes`) and push it: the gate
   only tags a commit that is on `origin/main` with a green CI run, and waits for a running one.
3. Re-run step 1; continue only when it passes.

`-y` / `--yes` skips the intro approval only, never a notes question.

## Phases T, A and B

Follow Phases T, A and B and the final report of `$HOME/.claude/commands/release.md` unchanged.
`RELEASE_SCRIPT` resolves to this project's `scripts/release.sh`, whose `scripts/release-gate.sh`
re-runs the notes check first, then requires `main` = `origin/main`, a green CI run and
`npm test` + `npm run build`, before the shared script writes the changelog, commits, tags,
pushes and creates the GitHub Release.
