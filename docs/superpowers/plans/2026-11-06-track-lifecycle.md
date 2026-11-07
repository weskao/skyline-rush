# Track Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "can this course be entered?" and "do the Coming Soon car views still work?" machine-checked gates: a stage per course, a lifecycle check script run by `npm test`, a release gate tied to the user's `TODO.md` tick, and a Coming Soon view-matrix browser test.

**Architecture:** Pure gate functions in `scripts/track-lifecycle/gates.mjs` take plain data and return results (fixture-testable). `scripts/track-lifecycle/collect.mjs` builds that data from the real modules and files. `scripts/check-track-lifecycle.mjs` is the CLI. `tests/track-lifecycle.test.js` runs the real check so `npm test`, pre-push and CI enforce it.

**Tech Stack:** Node ≥ 22.12 ESM with built-in TypeScript stripping (as `npm test` already uses), `node:test`, Playwright, Vue 3 / Three.js app.

**Spec:** `docs/superpowers/specs/2026-11-06-track-lifecycle-design.md`

## Global Constraints

- Public repo: no personal absolute paths, device names or machine identifiers in any committed file.
- No new npm dependencies; PNG decoding uses `tests/helpers/png-rgba.js` `decodePngRgba`.
- `src/access/production.ts` `isUpcomingEnterable` stays a constant `false`.
- Teaser JPEG must decode at exactly 568 × 205.
- Course ids are derived from `UPCOMING_TRACKS` / `RACE_TRACKS`; the only fixed list is the frozen legacy list of ten released ids: `coast neon canyon aurora spiral taipei tokyo alpine coastal cosmic`.
- Agents never tick or add a ticked `RELEASE APPROVED` line.
- TDD: every new check is observed failing (RED) before it is implemented.
- View-matrix browser test adds at most about 3 minutes to one CI shard.
- Work in `.claude/worktrees/track-lifecycle` on `feature/track-lifecycle-sop`; never merge into `develop` / `main`; merge into epic only after Stormline, Volcanic and Monsoon have merged there.

## Review Focus

1. A ticked R-gate line with a missing or non-hex `sha:` must FAIL, not pass (Task 2).
2. An approval line outside `## Track release approvals`, for another id, or unticked must not count; `[x]` and `[X]` both count (Task 2).
3. A course in `UPCOMING_TRACKS` with no `UPCOMING_READINESS` entry is `preview` and must never be enterable in either access policy (Task 1, Task 3).
4. A stale saved unlock list containing an upcoming id must not make it available in production (Task 3, P5).
5. An id present in both `RACE_TRACKS` and `UPCOMING_TRACKS`, or stamped `released-at` yet still upcoming, must FAIL (Task 4).

---

### Task 1: `ready` stage and development access

**Files:**
- Modify: `src/upcoming-tracks.ts` (type `UpcomingReadiness`, `UPCOMING_READINESS`)
- Modify: `src/access/dev-unlocked.ts` (`isUpcomingEnterable`)
- Test: `tests/track-readiness.test.js` (create)

**Interfaces:**
- Produces: `type UpcomingReadiness = 'preview' | 'development' | 'playable' | 'ready'`; `upcomingReadiness(id: string): UpcomingReadiness` (unchanged signature); development `isUpcomingEnterable(id)` is true iff readiness is `playable` or `ready` and `raceTrack(id)` is defined.

- [ ] **Step 1: Write the failing test** `tests/track-readiness.test.js`:
  - `test('ready is a declared stage')`: import the module source text and assert `/'ready'/` appears in the `UpcomingReadiness` union (type-only, so check `src/upcoming-tracks.ts` text with a regex on the `export type UpcomingReadiness` line).
  - `test('development access accepts playable and ready, rejects preview and development')`: export a test seam `ENTERABLE_STAGES` from `src/access/dev-unlocked.ts` and assert `deepEqual([...ENTERABLE_STAGES].sort(), ['playable', 'ready'])`.
  - `test('an upcoming id without a readiness entry is preview and not enterable anywhere')`: for every id in `UPCOMING_TRACKS` whose `upcomingReadiness(id) === 'preview'`, assert both access modules' `isUpcomingEnterable(id) === false`.
- [ ] **Step 2: Run** `node --test tests/track-readiness.test.js` — expect FAIL (`ready` missing, `ENTERABLE_STAGES` undefined).
- [ ] **Step 3: Implement** add `'ready'` to the union; in `src/access/dev-unlocked.ts` export `ENTERABLE_STAGES: ReadonlySet<UpcomingReadiness> = new Set(['playable', 'ready'])` and make `isUpcomingEnterable` use it.
- [ ] **Step 4: Run** `node --test tests/track-readiness.test.js tests/coming-soon-release.test.js tests/upcoming-unlock-access.test.js tests/access-build.test.js` — expect PASS.
- [ ] **Step 5: Commit** `feat(lifecycle): add ready stage accepted by development access`.

### Task 2: Parsers — JPEG size, evidence record, approvals

**Files:**
- Create: `scripts/track-lifecycle/gates.mjs`
- Test: `tests/track-lifecycle-gates.test.js` (create)

**Interfaces:**
- Produces:
  - `jpegSize(bytes: Uint8Array): { width: number, height: number } | null` — reads the first SOF0/SOF1/SOF2 marker; `null` for non-JPEG.
  - `parseEvidence(markdown: string): { gates: Record<'R1'|'R2'|'R3'|'R4'|'R5'|'R6', { ticked: boolean, sha: string | null }>, releasedAt: string | null }` — line format `- [x] R1 <text> — sha: <7–40 hex>`; `released-at: <7–40 hex>`; a missing R line yields `{ ticked: false, sha: null }`.
  - `parseApprovals(todoMarkdown: string): Set<string>` — ids from `- [x] RELEASE APPROVED: <id>` (x or X) lines that sit under the `## Track release approvals` heading, until the next `## ` heading.
  - `R_GATES = ['R1','R2','R3','R4','R5','R6']`.

- [ ] **Step 1: Write failing tests** in `tests/track-lifecycle-gates.test.js`:
  - `jpegSize` on a hand-built minimal byte array (`FF D8`, `FF C0` segment with height 205, width 568) → `{ width: 568, height: 205 }`; on `public/track-teasers/frostbite-canyon.jpg` → 568 × 205; on `Uint8Array.of(0x89, 0x50)` → `null`.
  - `parseEvidence`: ticked R1 with `sha: abc1234` → `{ ticked: true, sha: 'abc1234' }`; ticked R2 with `sha: xyz` → `sha: null`; absent R6 → `{ ticked: false, sha: null }`; `released-at: deadbeef1` → `releasedAt: 'deadbeef1'`.
  - `parseApprovals`: a ticked line under the section → included; `[X]` → included; unticked → excluded; a ticked line under another `##` heading → excluded.
- [ ] **Step 2: Run** `node --test tests/track-lifecycle-gates.test.js` — expect FAIL (module missing).
- [ ] **Step 3: Implement** the three functions and `R_GATES` in `scripts/track-lifecycle/gates.mjs`.
- [ ] **Step 4: Run** the same command — expect PASS.
- [ ] **Step 5: Commit** `feat(lifecycle): parse teaser JPEG size, evidence records and release approvals`.

### Task 3: Course gates (P, D, R) and next-step helper

**Files:**
- Modify: `scripts/track-lifecycle/gates.mjs`
- Test: `tests/track-lifecycle-gates.test.js`

**Interfaces:**
- Consumes: Task 2 parsers.
- Produces:
  - `type CourseInput = { id, stage, names: { en, 'zh-TW' }, teaserJpeg: Uint8Array | null, routeSvgExists: boolean, hasEnvironment: boolean, productionEnterable: boolean, productionAvailableWithStaleUnlock: boolean, homeStatuses: string[], raceTrackDefined: boolean, classicOnly: boolean, unitTestExists: boolean, browserSpecExists: boolean, developmentEnterable: boolean, evidence: ReturnType<parseEvidence> | null }`
  - `type GateResult = { id: string, gate: string, ok: boolean, reason?: string }`
  - `checkCourse(c: CourseInput): GateResult[]` — P1–P6 always; D1–D3 when stage is `playable` or `ready`; R1–R6 when stage is `ready`. Gate ids exactly `P1`…`P6`, `D1`…`D3`, `R1`…`R6` (P7 is enforced by the view-matrix spec deriving ids, Task 6).
  - `nextGates(c: CourseInput): string[]` — failing gate ids of the next stage up (`preview`→`development` requires none beyond P; `development`→`playable` requires D; `playable`→`ready` requires R; `ready` → `['RELEASE']`).

- [ ] **Step 1: Write failing tests** with a `validPreview()` fixture factory, then one test per failure: wrong JPEG size → P1 fail; `routeSvgExists: false` → P2; `hasEnvironment: false` → P3; empty zh-TW name → P4; `productionEnterable: true` → P5; `productionAvailableWithStaleUnlock: true` → P5; a homeStatus `'unlocked'` → P6; stage `playable` with `classicOnly: false` → D1; stage `playable` without `browserSpecExists` → D2; stage `playable` with `developmentEnterable: false` → D3; stage `ready` with evidence null → all R fail; stage `ready` with R4 ticked but `sha: null` → R4 fail. Plus `validPreview()` → every result ok, and `nextGates` on a valid `playable` course without evidence → `R_GATES`.
- [ ] **Step 2: Run** `node --test tests/track-lifecycle-gates.test.js` — expect the new tests FAIL.
- [ ] **Step 3: Implement** `checkCourse` and `nextGates`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(lifecycle): check preview, playable and ready course gates`.

### Task 4: Catalog and release gates

**Files:**
- Modify: `scripts/track-lifecycle/gates.mjs`
- Test: `tests/track-lifecycle-gates.test.js`

**Interfaces:**
- Consumes: Task 2 parsers, Task 3 `checkCourse`.
- Produces:
  - `LEGACY_RELEASED_TRACKS: readonly string[]` = the ten ids in Global Constraints, `Object.freeze`d.
  - `checkCatalog({ raceTrackIds: string[], upcomingIds: string[], evidenceById: Map<string, Evidence>, approvals: Set<string> }): GateResult[]` — gate `CATALOG`: each `RACE_TRACKS` id not in the legacy list needs approval and `releasedAt`; an id in both lists fails; a stamped id still upcoming fails.
  - `checkRelease(id: string, course: CourseInput, approvals: Set<string>): GateResult[]` — gate `RELEASE`: stage `ready`, all R ok, `approvals.has(id)`.

- [ ] **Step 1: Write failing tests**: legacy list length is 10 and equals the exact ids (this is the "cannot grow" guard); new id in RACE_TRACKS without approval → CATALOG fail; with approval and `releasedAt` → ok; id in both lists → fail; stamped but still upcoming → fail; `checkRelease` fails for stage `playable`, for missing approval, for one unticked R gate, and passes for a complete `ready` course.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** `LEGACY_RELEASED_TRACKS`, `checkCatalog`, `checkRelease`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(lifecycle): gate released catalog and release approval`.

### Task 5: Collector, CLI, records and wiring into `npm test`

**Files:**
- Create: `scripts/track-lifecycle/collect.mjs`, `scripts/check-track-lifecycle.mjs`
- Create: `docs/track-lifecycle/<id>.md` for the six upcoming ids (template below)
- Modify: `TODO.md` (add an empty `## Track release approvals` section with a one-line note that only the user ticks it)
- Rename: `tests/frostbite-race.test.js` → `tests/frostbite-canyon-race.test.js`, `tests/frostbite-race-browser.spec.js` → `tests/frostbite-canyon-race-browser.spec.js` (`git mv`; fix any reference in `tests/ci-durations.json` or configs)
- Modify: `tests/coming-soon-release.test.js` (derive ids from `UPCOMING_TRACKS` instead of the hard-coded array)
- Test: `tests/track-lifecycle.test.js` (create)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `collectState(root: string): Promise<{ courses: CourseInput[], raceTrackIds: string[], upcomingIds: string[], evidenceById: Map, approvals: Set<string> }>` — imports `src/upcoming-tracks.ts`, `src/race-tracks.ts`, `src/upcoming-scenes/index.ts`, both access modules; reads teaser/route files, `docs/track-lifecycle/<id>.md`, `TODO.md`; `productionAvailableWithStaleUnlock` is computed by calling production `availableTracks()` with a stubbed saved-unlock list containing the id (stub the storage the way `tests/upcoming-unlock-access.test.js` does).
  - CLI `node scripts/check-track-lifecycle.mjs` → prints `PASS|FAIL <id> <gate> [reason]` per result, exit 1 on any FAIL; `--stage <id>` prints the stage and `nextGates`; `--release <id>` runs `checkRelease`, and on success appends `released-at: <git rev-parse HEAD>` to `docs/track-lifecycle/<id>.md` and prints the manual move steps from the spec's release section 3.
  - Evidence record template (R lines unticked, `sha:` empty):
    `# <English name> lifecycle record` / one `- [ ] R<n> <spec text> — sha:` line per R1–R6 / `released-at:`.

- [ ] **Step 1: Write the failing test** `tests/track-lifecycle.test.js`: `test('the repository passes the lifecycle check')` spawns `node scripts/check-track-lifecycle.mjs` and asserts exit code 0 and no `FAIL` line; `test('--stage reports frostbite-canyon as playable with R gates next')` asserts stdout contains `playable` and `R1`.
- [ ] **Step 2: Run** `node --test tests/track-lifecycle.test.js` — expect FAIL (script missing).
- [ ] **Step 3: Implement** collector and CLI; create the six records and the TODO section; do the two `git mv` renames.
- [ ] **Step 4: Run** `npm test` — expect all PASS, including the renamed Frostbite tests and the refactored `coming-soon-release.test.js`.
- [ ] **Step 5: Run** `node scripts/check-track-lifecycle.mjs --release frostbite-canyon` — expect exit 1 with `RELEASE` FAIL (stage is `playable`), and `git status` shows no change to its record.
- [ ] **Step 6: Commit** `feat(lifecycle): enforce course lifecycle gates in npm test`.

### Task 6: Coming Soon view-matrix browser test

**Files:**
- Create: `tests/coming-soon-views-browser.spec.js`

**Interfaces:**
- Consumes: `UPCOMING_TRACKS` (ids), `tests/helpers/test.js` `test`/`expect`, `tests/helpers/png-rgba.js` `decodePngRgba`.
- Selectors (existing): card `[data-upcoming-track="<id>"]`, `#start-button`, `#airflow-toggle` (`aria-pressed`), `#showcase-camera-dock`, `#showcase-camera-next` (cycles drive → front → rear → left → right → orbit), `#garage-button`, `#garage-screen`, `#garage-preview #world`, `#garage-studio-open`, `#garage-studio-back`, `#garage-close`, `#world`.

- [ ] **Step 1: Write the spec**, one `test` per upcoming id generated from `Object.keys(UPCOMING_TRACKS)`:
  - select the card by click and by arrow keys; `#start-button` disabled; press Enter and Space; set a stale saved unlock containing the id in `localStorage` and reload; assert no race started (the race HUD never appears) and the card is still selected.
  - Home: for AIRFLOW off and on, cycle the six camera views; after each, assert no `pageerror`, no console message matching `/WebGL|GL_INVALID|THREE\./`, and the `#world` screenshot decoded with `decodePngRgba` has a pixel standard deviation above a non-blank threshold (calibrate once against a known-good frame and pin the number in the test).
  - Garage Home and Preview Studio with the card selected: cycle the same six views in each, same assertions on `#garage-preview #world`; return Home; card still selected and START still disabled.
  - Desktop 1440 × 900 runs the full matrix; phone 390 × 844 runs AIRFLOW on only.
- [ ] **Step 2: Prove it can fail**: temporarily make one upcoming card's environment factory throw (local edit, not committed), run `npm run build && npx playwright test tests/coming-soon-views-browser.spec.js` (with `PLAYWRIGHT_PORT` set to a free port), observe FAIL for that id, revert the edit.
- [ ] **Step 3: Run** the spec on clean code — expect PASS; record its wall time and keep it at about 3 minutes or less on one shard (trim the phone matrix first if over).
- [ ] **Step 4: Commit** `test(lifecycle): Coming Soon cards keep every car view working`.

### Task 7: SOP, scoped rule, CLAUDE.md pointer

**Files:**
- Create: `docs/track-lifecycle-sop.md`, `.claude/rules/track-lifecycle.md`
- Modify: `CLAUDE.md` (one line in "Shared six-course presentation and controls"), `README.md` if it lists scripts or test commands

- [ ] **Step 1: Write `docs/track-lifecycle-sop.md`**: the stage table from the spec; per stage, the files to add and the gates; `node scripts/check-track-lifecycle.mjs --stage <id>` as the "what next" command; the release procedure (user tick → `--release` → the move checklist from spec release section 3); the evidence record template.
- [ ] **Step 2: Write `.claude/rules/track-lifecycle.md`** with `paths:` exactly as the spec lists, stating the two hard rules (never START a non-released course outside development access; never tick a release approval) and pointing to the SOP.
- [ ] **Step 3: Add the CLAUDE.md line**: `New or promoted course → read docs/track-lifecycle-sop.md; gates: node scripts/check-track-lifecycle.mjs.`
- [ ] **Step 4: Run** `npm test` and `npm run build` — expect PASS; `git grep -n "/Users/" -- docs .claude CLAUDE.md` returns nothing new.
- [ ] **Step 5: Commit** `docs(lifecycle): add track lifecycle SOP, scoped rule and CLAUDE.md pointer`.

### Task 8: Branch verification

- [ ] **Step 1: Run** `npm test`, `npm run build`, `npm run test:browser` (desktop and mobile projects), `make verify` — all PASS; record counts in `TODO.md`.
- [ ] **Step 2: Push** `feature/track-lifecycle-sop`; wait for its exact-HEAD CI; report CI, local tests and manual checks separately.
- [ ] **Step 3: Merge readiness**: after Stormline, Volcanic and Monsoon have merged into epic, merge the latest epic into this branch, re-run Step 1, then ask the user before merging into epic.
