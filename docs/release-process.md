# Release process: What's New notes and the release gate

Read before writing or editing What's New / release notes, and before running `/release`. Scoped rule: `.claude/rules/release-notes.md`; dialog and data design: `docs/release-announcements.md`.

## Player-facing release announcement writing

Every What's New announcement and release note shown **inside the game** must be written
from the player's point of view in **plain, inviting language**. Describe what players
can now do, see, discover or enjoy, and why the change matters to them. Do not expose
implementation details or developer jargon such as CI, TDD, Firestore, shader, refactor,
schema, internal file names or framework names. Replace technical labels with everyday
benefits (e.g. "Other cars react more naturally when bumped", not "Unified AI collision
physics"). Write and review **both English and Traditional Chinese (zh-TW)** copy together,
with native-sounding wording rather than word-for-word translation. Show only features
that genuinely shipped in the announced version; never present a mockup or roadmap item
as released. Images are optional and must match the shipped content; always provide
readable text when an image is missing. Follow `docs/release-announcements.md`.

**Every release ships its What's New notes.** Before publishing, add the coming release's entry at the
top of `RELEASE_NOTES` in `src/release-notes-data.ts` (en + zh-TW, player-first) **with
`version: UPCOMING`, never a version number**: the dialog shows it first, labelled "Upcoming", in dev
and on `main`, and the release commit's `package.json` bump gives it the released version. Starting
the next release's notes, first stamp the shipped one with its version and tag date
(`git log -1 --format=%cs v<version>`); `npm test` refuses two upcoming entries. A highlight players *see happen*
(new effect, move, scene, car or rival behaviour, screen) ships with a real-game image or clip
(`docs/release-announcements.md` §6 step 2, `scripts/record-whats-new-clip.mjs`); fixes, rule changes and
record notes stay text. Record it once, right before the release (`/release` Phase N), never per `develop`
change. Store media under `public/whats-new/<theme-slug>/` (a name for the
release's content, never a version number) and keep every older release's entry and images in the
repo — the dialog shows only the newest five versions, the rest stay archived. Leave out what players never need: fine tuning details, code structure or refactors,
tests and tooling, back-office, admin or server setup, and anything sensitive (links, accounts, keys,
unannounced plans). Then run `/review-release-notes <version>`: an automatic copy check, a fresh-eyes
sub-agent review and your approval record the copy's fingerprint. `scripts/release-gate.sh` runs
`scripts/check-release-notes.mjs <version>` and refuses a release whose entry is incomplete, fails the
copy check, was never reviewed or changed after review; never bypass it.

Inside a release the dialog lists highlights NEW → improvement → fix (unknown kinds last, written
order kept within a kind) via `highlightsByKind` in `src/release-notes.ts`; write the data in any
order and never re-sort it by hand.

## Release

`/release` (project command `.claude/commands/release.md`) first checks the version's What's New notes
and, when they are new or changed, runs `/review-release-notes` and commits the approved review — before
any test run, intro or release write. It then runs `scripts/release.sh`: `scripts/release-gate.sh`
re-checks the notes, then refuses to tag unless `main` equals
`origin/main`, that exact commit has a successful CI run on `main` (a running one is waited for) and
`npm test` + `npm run build` pass; only then does the shared release script commit, tag and publish.
A red or missing run means fix the root cause, commit, push, wait for green and run `/release` again —
never tag around the gate. The tag's CI run re-checks unit tests, confirms through `release-verified`
that the code already passed the full suite on `main`, and deploys, so a release is live within minutes
and a CI timing flake cannot leave a tag unpublished.
