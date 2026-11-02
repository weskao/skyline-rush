# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js. Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve: existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints,
browser support. Prefer small changes with deterministic unit tests + browser regression.

Detailed, file-scoped rules live in `.claude/rules/` and load only when their files are touched:
`unlock-separation` · `world-tour` · `performance-review` · `device-quality` · `track-showcase` ·
`touch-input` · `vehicle-road-stability` · `ui-phase-interactions` · `ui-architecture` ·
`release-notes` · `module-size` · `full-screen-dialogs` · `raster-artwork` · `home-layout-gate` ·
`ci-gates` · `branch-release`. A rule that only matters for certain files goes there with `paths:`,
not here.

A "→ Read `docs/<file>`" line below names a situation; open that file only when the situation
occurs, then follow it exactly.

## Always-on defaults (details in the scoped rules)

- **New UI is Vue 3 `<script setup lang="ts">`; new controllers, services, state and business
  rules are typed `.ts`** (interfaces in `src/game-types.ts`). Plain JS stays only for
  performance-sensitive renderer/physics/shader/frame-loop code, which never imports Vue.
  `src/main.js` only shrinks. See `ui-architecture` and `TODO.md`.
- **No source module past 400 lines, functions under ~60 lines**; split by responsibility, one
  `setupXxxUI(deps)` controller per screen area. `tests/module-size.test.js` enforces it (`module-size`).
- **AI-generated images are generated at exactly 3× their display size**, never upscaled; icon art
  passes the completeness / anti-clipping gate in `raster-artwork`.

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
- A bug seen only on a phone / iPhone Home Screen app → reproduce on that device class
  (`make phone-diag`), since desktop Chromium and WebKit can stay clean.
- Writing or editing What's New / release notes, or running `/release`
  → Read `docs/release-process.md`.
- Garage cosmetics, release mode, `GARAGE_VFX_RELEASE_MODE` or the Pages deploy pin
  → Read `docs/garage-release-policy.md`.
- Pushing, reading CI results or merging → Read `.claude/rules/ci-gates.md` and
  `.claude/rules/branch-release.md`.

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
- Home-screen change → `npm run test:layout` before pushing; never bypass the pre-push gate
  (`home-layout-gate`).
- Never delete or weaken tests to pass CI. Report any test you could not run.
- `README.md` changed → sync `README.zh-TW.md` via `scripts/readme-zh.mjs` (hooks enforce it).
- Only `main`/`develop` run the full remote CI; a green run on a previous commit does not validate
  the new HEAD (`ci-gates`).

## Branch workflow

Commit and push to the current development branch. No PR, no merge into `develop` or `main`,
no deploy unless the user explicitly asks. `feature/**`, `fix/**`, `refactor/**` branch from and
merge back into `develop` (`--no-ff`); only `develop` and `hotfix/*` merge into `main`; `/release`
back-merges `main` into `develop`. Full flow: `branch-release`.
