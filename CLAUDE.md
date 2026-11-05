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
- Keep exactly the Stage 1 five **unplayable**: their `#start-button` is disabled with `COMING SOON / 即將推出`, even for keyboard, saved unlocks or mode change. Do not add them to `RACE_TRACKS`. Frostbite Canyon (Stage 2) is a sixth Coming Soon card with its real scene in every build; the other Stage 2 maps stay hidden. `make dev-unlocked` may START a Coming Soon card only when its explicit `upcomingReadiness` is `playable` AND `raceTrack(id)` resolves. The five Stage 1 maps are still `preview` and never enterable even if a partial runtime is registered. Frostbite has a gated dev-only runtime; normal development and all production builds keep every Coming Soon card disabled. Preserve all existing playable tracks.
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

## Track teaser artwork contract (all maps)

Applies to `public/track-teasers/<track-slug>.jpg` in the home/Coming Soon/track-selection UI.

- Final committed asset **must decode as an actual 568 × 205 pixel JPEG** (not merely display at that CSS size); use a consistent high-quality cinematic futuristic racing illustration style. The 3× rule for transparent UI icons does not replace this exact JPEG contract.
- **Scene only:** never burn in track names, headings, descriptions, buttons, labels, logos, watermarks, captions, or any other text. UI copy belongs in HTML/Vue, not inside the image.
- **Edge-to-edge scene:** no white/blank borders, padding, letterbox bars, empty canvas corners, or fragments of adjacent maps. Inspect the top/bottom rows and all four edges for seams, other map strips and unwanted overlays. Do not include vehicles, cars, wheels, boost flames or nitro trails in these static teaser JPEGs; keep the original road, terrain, structures and landmarks intact and uncropped.
- For the five-track 2026-11-06 update: **Monsoon Ruins** must use the approved no-portrait, tropical rainforest/waterfalls/stone-bridge scene. For **Skyfall Archipelago, Stormline Megacity, Volcanic Crown and Frostbite Canyon**, remove only cars and their exhaust/trails from the existing GitHub teaser originals, using tightly-scoped inpainting; preserve all unmasked original scene pixels, viewpoint, colors, road and landmarks as closely as possible. Do not replace these four images with newly invented full-scene compositions. Fix any incidental black top-right seam on Volcanic Crown only if demonstrably an artifact.
- Before committing, inspect each decoded JPEG at native 568 × 205 and compare against the source side by side; verify image format and dimensions with an executable check, ensure the image is readable in the real desktop/mobile track-selection UI and check that no unrelated source files changed. CI/test results and manual visual acceptance must be reported separately, never assumed.

## Track teaser rollback ledger (2026-11-06)

Authoritative scoped rule: `.claude/rules/track-teaser-artwork.md`. Keep `develop` and each related
`feature/playable-*` / preview / integration branch on the **same**
`public/track-teasers/frostbite-canyon.jpg` blob (568 × 205 JPEG, no car).

- **Original Frostbite artwork (before car removal):** `15db9d8ebdddff67c5409f9e3ba4728a330d7690`
- **Pre-removal baseline for the five image files:** `ca592105631bc2abc6717b1e2c0bf737f91785ce`
- **Four car-removal source commit (including Frostbite):** `a4cb704553b89b20180f79a1fb86d280509ab0af`
- **Approved human-portrait-free Monsoon replacement:** `5182ee2ce48ea14c8281340879d068a258b5ef02`
- **Approved Frostbite vehicle-free Git blob:** `95264f93c0ebe7a08f0b2c73b3742e53dc1e92a0`

For rollback, see the scoped rule's `git restore --source=<commit>` instructions; use a
new normal commit rather than resetting or force-pushing another branch.
