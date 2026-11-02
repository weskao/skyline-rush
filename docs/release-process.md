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

Every release ships its What's New notes. The workflow — `version: UPCOMING` entry, media,
`/review-release-notes`, the release gate and highlight ordering — is in
`.claude/rules/release-notes.md`.

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
