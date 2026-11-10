# Track lifecycle: Coming Soon → playable in development → ready → released

Status: design, awaiting user approval (2026-11-06). Branch: `feature/track-lifecycle-sop`, cut from
`feature/epic-multiroute-longform-tracks` at `9f6ba4be`.

## Intent

Every new course enters the game as a **Coming Soon** card and stays visually identical to that until
the user personally approves its release. Two failures hurt the most and are the reason this exists:

1. **An unfinished course can be entered with START** (or Enter, a gamepad, a stale saved unlock, a
   storage edit) outside the local all-unlocked server.
2. **A Coming Soon card breaks the car views**: with that card selected, AIRFLOW, the camera dock
   (drive / front / rear / left / right / orbit), Garage Home or Preview Studio render a blank,
   misplaced or erroring scene.

The lifecycle turns "is this course allowed in?" and "do the views still work?" into checks a script
and the test suite enforce, so neither depends on someone remembering a rule.

## Goals

- One declared stage per course, in one place, that every gate reads.
- Each stage has a fixed list of entry requirements, checked by
  `scripts/check-track-lifecycle.mjs` in `npm test` and CI.
- Players (production build and `make dev`) see every non-released course the same way: card,
  teaser JPEG, live 3D preview, carousel swipe, START disabled. "Finished but not released" looks
  exactly like "just announced".
- Only `make dev-unlocked` (and `make dev-feature`, which uses the same development access policy)
  can START a course, and only from the `playable` stage on.
- Release to players needs the user's tick in `TODO.md` **and** a passing
  `node scripts/check-track-lifecycle.mjs --release <id>`; without both, CI fails if the course
  appears in the released catalog.
- A browser regression proves the car views work for every Coming Soon card.
- An SOP document a future agent follows to add a course, step by step, plus a scoped rule and a
  one-line pointer in `CLAUDE.md`.

## Non-goals

- Changing how a course is wired into the race engine before release (the Frostbite pattern and the
  Step 2 work in progress stay as they are). Catalog wiring happens only in the release change itself.
- A server-side or remote-config release switch. Release is a code change on `develop` → `main`.
- Automatic promotion between stages. Every promotion is an explicit commit.
- Re-checking art quality by machine beyond format/dimensions; visual approval stays human.

## Anti-goals (failure even if it "works")

- Any path where a stage value, saved progress, URL or storage lets production START a non-released
  course.
- A second list of course ids that can drift from `UPCOMING_TRACKS` (e.g. hard-coded id arrays in
  tests; `tests/coming-soon-release.test.js` currently hard-codes six ids and should derive them).
- A check that only greps for strings and passes while behaviour is broken; checks import the real
  modules and call the real access functions.
- A view-matrix browser test so slow that people skip it (budget below).

## Stages

The stage lives in `UPCOMING_READINESS` in `src/upcoming-tracks.ts` (introduced by the Frostbite
merge). Existing values keep their meaning so the Step 2 session's work does not conflict; one value
is added.

| Stage | Meaning | Player view (`make dev`, production) | `make dev-unlocked` | Required to enter this stage |
|---|---|---|---|---|
| `preview` (default when absent) | Announced; art and 3D preview only | Coming Soon, START disabled | Coming Soon, START disabled | P-gates |
| `development` | Race runtime being built on a branch; not yet enterable | same | same | P-gates + runtime module exists |
| `playable` | Race runtime registered; can be raced locally | same | START enabled | D-gates |
| `ready` (new) | Fully accepted; waiting for release approval | same | START enabled | R-gates (evidence file complete) |
| released | Removed from `UPCOMING_TRACKS`, in the released catalog | normal course | normal course | Release gate |

`isUpcomingEnterable` in `src/access/dev-unlocked.ts` must accept `playable` and `ready`;
`src/access/production.ts` stays a constant `false`.

### P-gates — any id in `UPCOMING_TRACKS`

- P1 `public/track-teasers/<id>.jpg` decodes as a JPEG of exactly 568 × 205 (read the SOF marker;
  no image library needed).
- P2 `public/track-teasers/<id>-route.svg` exists.
- P3 A 3D preview environment for `<id>` is registered in `UPCOMING_ENVIRONMENTS`.
- P4 English and zh-TW names are non-empty.
- P5 Production `isUpcomingEnterable(<id>)` is `false` and production `availableTracks()` never
  contains `<id>`, including with a stale saved unlock list that contains it.
- P6 `homeTrackStatus(<id>, …)` is `coming-soon` for every unlock set.
- P7 The view-matrix browser test (below) covers `<id>` without listing it by hand.

### D-gates — stage `playable`

- D1 `raceTrack(<id>)` returns a track config (today via `COURSE_TRACKS`) and `assertTrackMode`
  accepts all non-Circuit modes in local development; Circuit uses its own Harbor course. The upcoming id remains absent from Daily and the released catalog.
- D2 `tests/<id>-race.test.js` and `tests/<id>-race-browser.spec.js` exist (START → FINISH).
  Frostbite's files are currently `tests/frostbite-race*.js`; the build renames them to the full id
  and updates `tests/ci-durations.json` (builder's proposal, accepted as my call).
- D3 Development `isUpcomingEnterable(<id>)` is `true`; production stays `false` (P5).

### R-gates — stage `ready`

`docs/track-lifecycle/<id>.md` exists and every required line is ticked with evidence. The script
checks the lines are present, ticked and carry a commit SHA (7–40 hex chars); the evidence itself is
human-recorded:

- R1 Full START → FINISH on desktop and phone, real WebGL, ground and every branch / flight edge.
- R2 Collision, AI (eight cars), recovery / respawn, results and save.
- R3 Frame time p50 / p95 on desktop and one phone at Low / Medium / High.
- R4 `make verify` on the recorded SHA.
- R5 Exact-HEAD full `quality-gate` CI run id on the recorded SHA.
- R6 User's manual visual approval of the race and the Coming Soon card.

### Release gate — moving to the released catalog

"Released catalog" means `RACE_TRACKS` (user decision, 2026-11-06): a released course becomes a
normal course with unlock order, Daily, Cup, medals and stars, including CourseGraph courses that
today live in `COURSE_TRACKS`.

1. The user ticks `- [x] RELEASE APPROVED: <id>` under a `## Track release approvals` section of
   `TODO.md`. Who ticked it is enforced by rule, not by the script (user decision): the scoped rule
   and the SOP forbid any agent from ticking or adding a ticked approval line; the script only checks
   that the line exists and is ticked.
2. `node scripts/check-track-lifecycle.mjs --release <id>` passes: stage is `ready`, every R-gate is
   ticked, the approval line is ticked. On success it appends a `released-at: <HEAD SHA>` stamp to
   `docs/track-lifecycle/<id>.md` and prints the remaining manual steps.
3. The same release change moves the course and wires it as a normal course:
   - remove it from `UPCOMING_TRACKS` / `UPCOMING_READINESS` (and `COURSE_TRACKS` for a CourseGraph
     course) and add it to `RACE_TRACKS` with its unlock position;
   - make `isModeTrack` / `assertTrackMode`, Daily, Cup, medals, stars and unlocks accept it, and
     migrate any topology-keyed saved results (e.g. `frostbite-canyon@t1l1`) so players keep them;
   - give it the normal released-track home preview (it leaves `UPCOMING_ENVIRONMENTS` and the
     Coming Soon showroom);
   - add release notes per `.claude/rules/release-notes.md`;
   - pass the full regression (all existing courses, Daily, Cup, Career, saves) on that commit.
4. The default (no-flag) script run fails CI when:
   - a `RACE_TRACKS` id is neither in the frozen legacy list nor has a lifecycle record with a ticked
     approval and a `released-at` stamp;
   - a stamped course is still in `UPCOMING_TRACKS`.
   The legacy list is the ten courses released before this lifecycle existed, frozen in the script;
   a unit test fails if that list ever gains an id (my call: closes the "skipped the lifecycle" gap
   without becoming a second, drifting course list, since it can only shrink).

(My call, check it: `--release` validates and stamps but does not edit TypeScript sources; the move
is a normal reviewed code change that CI then verifies. Editing source by script would be fragile
for a step that happens once per course.)

## The check script

`scripts/check-track-lifecycle.mjs`, plain Node ESM (TypeScript modules are imported with the
project's existing Node type-stripping, as `npm test` already does).

- No flag: check every course in `UPCOMING_TRACKS` against the gates of its stage, and the released
  catalog against the release gate. Print one line per course and gate (`PASS` / `FAIL <reason>`);
  exit 1 on any FAIL.
- `--release <id>`: the release gate above.
- `--stage <id>`: print the course's stage and the gates still missing for the next stage (the
  SOP's "what do I do next" helper).
- Wired in through a unit test (`tests/track-lifecycle.test.js`) that runs the no-flag check, so
  `npm test`, the pre-push hook and CI all enforce it with no new CI step. The test also feeds the
  script fixture states (missing JPEG, wrong size, stage `ready` without evidence, released without
  approval) and expects FAIL — each such case must fail on the current code before its check exists.

## View-matrix browser test

`tests/coming-soon-views-browser.spec.js`, deriving the ids from `UPCOMING_TRACKS`:

- For each Coming Soon card: select it by carousel swipe and by keyboard; START is disabled; Enter,
  Space and a stale saved unlock containing the id do not start a race (production-access build).
  The game has no gamepad input today, so there is no gamepad case (my call); if gamepad support is
  ever added, this test gains that case.
- For each card: AIRFLOW on and off × the six camera dock views on Home; then open Garage Home and
  Preview Studio with that card selected and cycle the same views.
- Pass criteria per combination: no page error or WebGL error in the console, the `#world` canvas is
  not blank (pixel sample), the showcase car is in frame, and returning to Home keeps the card
  selected with START still disabled.
- Viewports: desktop 1440 × 900 and phone 390 × 844 (and 844 × 390 if the budget allows).
- Budget: no more than about 3 extra minutes on one CI browser shard. The builder chooses the
  sampling (e.g. full matrix on desktop, a rotating subset on phone) to stay inside it.

## Documents

- `docs/track-lifecycle-sop.md`: the step-by-step SOP for adding and promoting a course (preview →
  development → playable → ready → released), what each stage needs, which command shows the next
  gate, and the release procedure.
- `.claude/rules/track-lifecycle.md`: a scoped rule (`paths:` `src/upcoming-tracks.ts`,
  `src/race-tracks.ts`, `src/access/**`, `src/courses/**`, `src/upcoming-scenes/**`,
  `public/track-teasers/**`, `docs/track-lifecycle/**`, `scripts/check-track-lifecycle.mjs`) that
  points to the SOP and states the two hard rules: never START a non-released course outside
  development access; never tick a release approval.
- `CLAUDE.md`: one line in the shared six-course section pointing to the SOP and the scoped rule.
- `docs/track-lifecycle/<id>.md` for the six current courses, created at their present stage
  (Frostbite `playable`; the other five `preview` until Step 2 promotes them).

## Constraints

- Public repo: no personal absolute paths, device names or machine identifiers in any committed
  file, including evidence files.
- Branch `feature/track-lifecycle-sop` from epic; merge back into epic only after the Step 2 courses
  (Stormline, Volcanic, Monsoon) have merged, because both touch `src/upcoming-tracks.ts`. It does not
  wait for Dune and Skyfall: they stay at `preview` (awaiting their A/B engine decision) and later
  follow the SOP to promote (my call). Never merge into `develop` / `main` without explicit approval.
- TDD: each gate's failing fixture case is observed RED before the check is implemented.
- Existing gates stay: `scripts/assert-production-locked.mjs`, `tests/coming-soon-release.test.js`,
  `tests/upcoming-unlock-access.test.js`, `tests/access-build.test.js`.

## Left to the builder

- Internal structure of the script (one file vs a small module it imports), output formatting.
- How the pixel-sample and "car in frame" checks are implemented, and the browser sampling inside the
  time budget.
- Whether `coming-soon-release.test.js` is refactored to derive ids or replaced by the new test.
