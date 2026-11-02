# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js. Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve: existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints,
browser support. Prefer small changes with deterministic unit tests + browser regression.

Detailed, file-scoped rules live in `.claude/rules/` and load only when their files are touched:
`unlock-separation` · `world-tour` · `performance-review` · `device-quality` · `track-showcase` · `touch-input` · `vehicle-road-stability` · `ui-phase-interactions` · `ui-architecture` · `release-notes` · `module-size`.

A "→ Read `docs/<file>`" line below names a situation; open that file only when the situation
occurs, then follow it exactly.

## Architecture default: Vue 3 + TypeScript (strict); deliberate plain-JS engine exceptions

**Every new UI component must use `<script setup lang="ts">`. New UI controllers, app services,
shared state, and business rules default to typed `.ts` modules.** Existing UI/business `.js`
is migration debt; convert in small TDD-verified slices rather than growing it. TypeScript
interfaces and typed boundaries are defined in `src/game-types.ts`. Do not treat JSDoc
`checkJs` or a narrow `jsconfig.json` as completed TypeScript migration.

The performance-sensitive Three.js renderer, physics, simulation, shader/effect code and
frame-loop HUD may **remain `.js`** when profiling or native-engine APIs justify it.
They must not import Vue or couple the game loop to reactive state. Cross the boundary via
typed adapters and stable snapshots. New exceptions must be justified in code review and
documented in `TODO.md`; they are **exceptions, not the default**. Existing `src/main.js`
must shrink toward bootstrap and the frame loop; event-driven panels move into Vue SFCs.

Use `tsconfig.json` for the TypeScript application, `jsconfig.json` only for explicitly
listed legacy JavaScript islands, and `npm run typecheck` during `make verify`. Migration
must preserve desktop/mobile input, locales, audio, cloud save, accessibility, and
finish/pause clickability. Follow RED → GREEN → browser regressions for each slice.
See `.claude/rules/ui-architecture.md` and `TODO.md`.

## Small modules split by responsibility

No source module grows past **400 lines**; split it by responsibility before adding more
(single responsibility first, dependency inversion for UI controllers). Separate pure decisions
from side effects, data tables from code, business rules from UI, and give each screen area its
own `setupXxxUI(deps)` TypeScript controller instead of adding to `src/main.js`. Functions stay
under ~60 lines. Legacy oversized files have ratcheting ceilings that may only go down.
`tests/module-size.test.js` enforces it; seams and steps are in `.claude/rules/module-size.md`.

## AI-generated images: always 3x

Any image produced by an AI generator must be rendered at **3x the size it is displayed at in
the project**: an asset shown at 10 × 20 px is generated at 30 × 60 px. Work out the display
size first, ask the generator for exactly 3x that size, and keep the 3x original as the
source file. Never upscale a smaller output to reach 3x.

## New long-form tracks: concept art → real WebGL acceptance (Stage 1 and Stage 2)

When implementing any of the ten **proposed** multi-route point-to-point tracks, first
read [`docs/designs/new-tracks/visual-acceptance-gate.md`](docs/designs/new-tracks/visual-acceptance-gate.md), the two
actual JPEG references for that map, its route SVG, and the relevant
`.claude/rules/track-showcase.md` / `.claude/rules/vehicle-road-stability.md` guidance.
Capture repeatable **real WebGL** ground and aerial route frames, compare landmark,
terrain, vehicle scale, weather, branch/landing and visibility, and record deviations.
Concept illustrations and upscaled Stage-2 JPEGs are **not** real 3D renders or true
3× in-game textures. Do not mark visual acceptance complete without screenshot evidence,
functional tests, performance review and explicit PASS/FAIL/APPROVED DEVIATION records.
All ten new maps are point-to-point with distinct START and FINISH; no laps.

## Stage 1 upcoming-map homepage: REAL animated Three.js showcase is mandatory

**Read [the binding animated homepage spec](docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) and [six-chat implementation plan](docs/superpowers/plans/2026-11-03-six-chat-home-preview-integration.md) before changing the five Stage 1 Coming Soon cards or art.** The earlier JPEG-only full-hero `#upcoming-scene` overlay is a temporary implementation **not accepted** as final.
- Selecting Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown or Stormline Megacity on the homepage must show that track's **real, animated, world-space Three.js landscape** in the existing `#world` renderer: visible ground road and air branch, signature landmarks, scene-specific motion/weather, actual shared player/rival car models, hover/jets and curated camera. JPEG is art-direction reference/card thumbnail/explicit WebGL failure fallback **only**; do not imitate 3D with a photo plane, CSS animation or static screenshot.
- Reuse `src/world.js` renderer/camera/composer/idle update loop, `src/track-preview.ts` camera/vehicle appearance and `src/car-model.js` / `src/aero-vfx.js` effects; scene switching may mirror `src/garage-stage.ts`. **No second canvas, WebGL context or parallel render loop**. Each map's module must be independent, time-driven, quality/reduced-motion aware and disposable.
- Keep exactly the Stage 1 five **unplayable**: their `#start-button` is disabled with `COMING SOON / 即將推出`, even for keyboard, saved unlocks or mode change. Do not add them to `RACE_TRACKS`. The Stage 2 five stay hidden. Preserve all existing playable tracks.
- **TDD+QA:** prove two time-separated *real WebGL frames* with observed animation per new map and original JPEG visual anchors (ground and air), mobile/desktop and Reduced Motion, and full exact-HEAD CI. A JPEG file, scene module that does not render, or unrun test does not complete the homepage.

## Mandatory regression-first workflow (every feature and bug fix)

**Always follow `docs/regression-first-workflow.md`** before calling work complete:
read the relevant rules and trace the shared root cause; reproduce with a failing
test and observe RED; implement the minimal fix and observe GREEN; regression-check
all affected tracks, vehicles, locales and inputs; run `make verify`; inspect
real-game/WebGL and touch screenshots where behavior or rendering changed; then
inspect the **full GitHub CI `quality-gate` for the exact HEAD commit**.
Use `TODO.md` to track evidence. CI, manual visual confirmation and historical
RED evidence are distinct gates — never claim one proves the others.

Only mark the branch **merge-ready** when the latest `develop` has been integrated,
all required checks are green and the user-visible symptoms have been retested.
Do not merge into `develop` or `main`, create a PR or deploy without explicit user approval.
Direct pushes cannot be prevented by Markdown; branch rulesets are required for
server-enforced status protection.

## Situational guides

- Renderer, scene, effect or shader code; adding a cache, instancing or any per-frame /
  per-row work → Read `docs/rendering-performance.md`.
- Road geometry, car pose, collision, steering, AI/traffic, or a prop drawn on the road
  → Read `.claude/rules/vehicle-road-stability.md` and `.claude/rules/world-tour.md`
  ("Solid props", "Shared collision physics").
- Track centrelines, route previews/markers, Coast scenery, render pacing, or anything that
  changes track length, checkpoints or saved best-time/Ghost data
  → Read `docs/classic-road-minimap.md`.
- Tutorial steps, lesson transitions or tutorial input → Read `docs/tutorial-driving.md`.
- Home 3D preview, showcase camera views or a new track → Read `.claude/rules/track-showcase.md`;
  camera dock / Start button layout → Read `docs/home-showcase.md`.
- Adding, redesigning or modifying any UI element, screen, overlay, interaction or player
  feedback (audio, quality tiers, iPhone touch, post-race clickability)
  → Read `docs/ui-change-checklist.md`.
- Writing or editing What's New / release notes, or running `/release`
  → Read `docs/release-process.md`.
- Garage cosmetics, release mode, `GARAGE_VFX_RELEASE_MODE` or the Pages deploy pin
  → Read `docs/garage-release-policy.md`.

## Commands

| Command | Purpose |
| --- | --- |
| `make` / `make dev` | Vite dev server, saved progression respected |
| `make dev-unlocked` (= `make test-unlocked`) | Local-only all-unlocked server (not a test runner) |
| `make dev-feature <name>` | Worktree of `origin/feature/<name>`, all-unlocked, HTTPS localhost |
| `make phone [name] [y=1]` | Same menu as `/phone-dev`: start/check/stop a phone-reachable locked dev server for this checkout, a worktree or a branch; `y=1` takes every Recommended option, no prompts, prints each choice |
| `make dev-diag` / `make phone-diag [name]` | Same servers with the on-screen diagnostic banner compiled in (`VITE_DIAG=1` → `src/crash-log.ts`); production builds never include it |
| `npm test` | Node unit tests |
| `npm run build` | Production build + release-bundle lock assertion |
| `npm run test:browser` | Playwright suite (pretest builds production assets) |
| `npm run test:layout` | Home-screen layout browser tests (pre-push hook runs it on UI pushes) |
| `make run` | Unit + browser tests |
| `make verify` | Full local regression gate: unit, build, browser, World Tour long-run |
| `make deploy` | Trigger CI GitHub Pages deploy of remote `main` |

## Verification

- Gameplay / progression / build-config change → `npm test` + `npm run build`.
- Rendering / navigation / controls / unlock visibility change → also `npm run test:browser`,
  desktop and mobile. Running a spec directly with `npx playwright test <spec>` serves the built
  `dist/`: run `npm run build` first, or the run checks the old code (a stale build once showed
  last release's notes as "Latest").
- Road, car pose, collision or steering change → follow `vehicle-road-stability.md`: TDD
  RED→GREEN, all-track coverage, frame-rate and road-clearance checks, plus real WebGL
  capture where clipping or jitter was reported. Record unrun checks as pending.
- Home-screen change (`src/App.vue`, `src/main.js`, `src/style.css`, `src/locales/`, `index.html`)
  → `npm run test:layout` before pushing; the `.githooks/pre-push` hook runs it on such pushes and
  blocks a red result (never bypass it with `SKIP_LAYOUT_GATE=1` to get a fix out — CI on `main`
  gates every release). The intro must fit without scrolling at
  ≥ 900 px tall desktops in en and zh-TW, stay below the 112 px top bar and keep 44 px touch
  targets. The height budget is fixed — a new block pays for itself by compacting another,
  never by letting the intro scroll, moving into the top bar or shrinking a button.
- Never delete or weaken tests to pass CI. Report any test you could not run.
- `README.md` changed → sync `README.zh-TW.md` via `scripts/readme-zh.mjs` (hooks enforce it).
- A commit on `main` is not a deploy; publication rules are in `.github/workflows/ci.yml`.

- Only `main` and `develop` run the full remote CI: the `quality-gate` job requires unit,
  browser, cloud-save and World Tour checks to succeed. `feature/**`, `fix/**` and `refactor/**`
  pushes run a focused gate (unit + cloud-save; browser and World Tour skipped) unless the commit
  message has `[full-regression]` or a manual run sets `full_regression`. The full suite on
  `develop` after the merge is the acceptance gate. A successful run on a previous commit does
  **not** validate the new HEAD.
- On every branch, a push or PR that only changes Markdown/text/images/video or the `Makefile` outside `src/`, `public/`,
  `tests/`, `scripts/` and `.github/` skips all suites (`quality-gate` still reports green), but only when the
  parent commit's own CI run on that branch passed. Rules: `scripts/ci-changes.mjs`; a test that reads a new
  doc must add it to `NEEDS_CI` there (`tests/ci-changes.test.js` enforces it).
- CI runs and optional screenshot artifacts are evidence for review, not substitutes
  for real vehicle/road contact or manual interaction testing on devices.

## Branch workflow

Commit and push to the current development branch. No PR, no merge into `develop` or `main`,
no deploy unless the user explicitly asks.

- `feature/**`, `fix/**` and `refactor/**` branch from `develop` and merge back into `develop`
  (local `--no-ff`, `/merge-into-main` targets `develop` when it exists); CI runs the full gate there.
- **Release:** merge `develop` into `main`, push, wait for green CI on that merge commit, then
  `/release` on `main` — the gate and tag flow are in `docs/release-process.md`.
- **After every release, `main` is merged back into `develop`** so the `docs: release …` commit (version
  bump, release-notes stamp) reaches it; skipping it makes the next release merge conflict.
  `/release` does this last (`scripts/release-back-merge.sh`, pushed without touching any checkout); on a
  conflict or rejected push it leaves `develop` untouched and prints the manual merge — do it then.
- **Hotfix:** branch `hotfix/<name>` from `main`, merge into `main`, then `/release` (which back-merges into `develop`).
- **Only `develop` and `hotfix/*` merge into `main`.** `.githooks/main-merge-guard` (run by `pre-merge-commit`
  and `pre-commit`) blocks any other merge on `main`; fast-forwards run no hook, so merge with `--no-ff`. CI's `main-merge-source`
  job (`scripts/check-main-merges.sh`) enforces the same rule on every push to `main`.
