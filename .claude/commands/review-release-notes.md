---
description: Review a version's What's New notes from the player's point of view, then record the review
argument-hint: <version>
---

# Review release notes for $ARGUMENTS

The release gate (`scripts/release-gate.sh` → `scripts/check-release-notes.mjs`) refuses a version
whose notes were never reviewed, or were edited after their review. This command is the review.

1. **Automatic check.** Run `node scripts/check-release-notes.mjs $ARGUMENTS`. Fix every problem it
   lists in `src/release-notes-data.ts` (developer terms, links, emails, secrets, file or code names,
   commit ids, over-long text, missing language). Only the "not reviewed" line may remain.
2. **Fresh-eyes review.** Spawn one sub-agent that did not write the notes. Give it only the
   `$ARGUMENTS` entry (en + zh-TW) from `src/release-notes-data.ts`, what shipped in that version and
   this checklist; it reads no code and edits nothing. What shipped is
   `node scripts/check-release-notes.mjs --changes` (the version's feat / fix / perf commits since
   the last tag, tooling scopes removed — docs, tests, CI, build, release, hooks and dev setup
   never reach players), plus the version's `CHANGELOG.md` section once `/release` has written it. For each highlight it answers
   **OK / Rewrite (with en + zh-TW wording) / Remove**, with one reason:
   - **Player value:** says what players can now do, see or feel, and why it matters to them.
   - **Too detailed:** internal numbers, tuning values, edge cases players never notice → cut.
   - **Behind the scenes:** code structure, refactors, tests, tooling, build or CI, back-office,
     admin or server setup, how data is stored → remove unless players notice a result, then
     describe only that result.
   - **Sensitive:** links, accounts, emails, keys, internal addresses, people's names, unannounced
     plans, how a security or cheating problem worked → remove.
   - **Shipped only:** every highlight matches a line of the `--changes` list (quote it); nothing
     from a docs, test, CI, build or tooling commit, a roadmap or a mock-up.
   - **Language:** en and zh-TW say the same thing, each natural (Taiwan wording, not a word-for-word
     translation), plain and inviting.
3. **Ask the user** about every finding that is not OK, with `AskUserQuestion` (one question per
   highlight, up to four per call). **Every question's first option is your recommendation, its
   label ending in "(Recommended)"**, and its description says why. Typical options: apply the
   suggested rewrite (show the en + zh-TW wording in the description) · keep it as written ·
   remove the highlight. Apply the answers, then ask for the final approval the same way:
   `Approve these notes (Recommended)` when the automatic check passes and nothing is open,
   otherwise `Revise first (Recommended)`; the other option is the opposite. `-y` / `--yes`
   never skips these questions, and you never approve on the user's behalf.
4. **Record the review** only after the user approves: `node scripts/check-release-notes.mjs
   --approve $ARGUMENTS`. It re-runs the automatic check and stores the copy's fingerprint in
   `scripts/release-notes-reviews.json`. Commit that file together with `src/release-notes-data.ts`.
   Any later edit to the entry changes the fingerprint, and the gate asks for a new review.
