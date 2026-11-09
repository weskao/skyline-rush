# Stage 1 Animated Three.js Homepage — Six-Chat TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the five first-stage Coming Soon maps each selectable and **visibly alive in real 3D on the homepage**, with the same vehicle/camera/weather standard as existing Skyline Rush courses, while starting any of them stays disabled.

**Architecture:** Five independent environment owner branches build one `src/upcoming-scenes/<id>.ts` apiece. A sixth shared-UI owner on `feature/epic-multiroute-longform-tracks` integrates them into the **existing** Three.js renderer, composer, camera, car/jet models and animation tick, and retains race selection as preview-only state; JPEG is card/fallback/reference only, never a full-screen replacement when WebGL runs.

**Tech Stack:** Vue 3, TypeScript strict, Three.js, existing Vite app / `src/world.js`, node:test, Playwright, CI.

**Spec:** `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`.
**Complementary UX spec:** `docs/superpowers/specs/2026-11-03-stage1-coming-soon-home-preview-design.md`.
**Six independent GPT prompts:** `docs/superpowers/prompts/2026-11-03-six-chat-home-preview-implementation.md`.

## Global Constraints

- P0 delivery is the five **animated live 3D homepage scenes**, not the future full-length playable race physics/AI.
- **Only** Stage 1 IDs `dune-tempest`, `monsoon-ruins`, `skyfall-archipelago`, `volcanic-crown`, `stormline-megacity`. Stage 2 five must not appear.
- Five are point-to-point with independent START/FINISH; a partial *home showcase* can be a compact drivable-looking ground/air route slice but must not depict mandatory laps.
- Existing ten sprint racing maps and the garage/circuit retain all current game logic, records, unlocks, input, VFX and view modes.
- Never add upcoming IDs to playable `RACE_TRACKS`, `createRace`, Daily, Cup, Ghost, storage or rewards. These five only change selected **presentation** state.
- Single `#world` renderer, composer and animation loop; no JPEG overlay masking a running existing course, no photograph plane representing environment, no extra WebGL context.
- Reuse actual `makeCar`, `CAR_STYLES`, `createAeroVFX`, `track-preview.ts` camera conventions and the renderer-scene switch pattern in `garage-stage.ts`. No duplicate vehicle model.
- Current locales only en and zh-TW, Coming Soon / 即將推出, Start race / 開始比賽, LOCKED / 未解鎖; fixed `#start-button` width 236 / 210 / 190px across breakpoints.
- No PR, force push, deployment or writes to `main` / `develop`; verify exact HEAD before every non-fast-forward integration and after parallel changes.

## Review Focus (tests must cover each)

1. Returning from selected upcoming map to real playable map and garage must restore the right Three.js scene, vehicle cosmetics and camera with no stale overlay or GPU leak.
2. If unlocked storage is tampered to contain future IDs, neither Start, Enter, gamepad, Daily, Cup, ghost nor persisted recent-track can activate them.
3. Switching locale, quality, Reduced Motion, portrait, landscape or browser resize while viewing a new scene must update UI/presentation without switching gameplay race.
4. Stage 1 scene with heavy dust/rain/ash/bloom must still keep a visible drivable-looking road, foreground player car and target landing area; Low tier must not tank frame time.
5. Scene missing/unavailable or WebGL context lost should show an explicitly labeled graceful fallback, never silently fake live 3D, never corrupt existing races.

---

### Task 1 — Shared renderer integration contract and failing tests (GPT 6)

**Files:**
- Create: `src/upcoming-showcase.ts`, `tests/upcoming-showcase.test.js`.
- Modify: `src/world.js`, `src/main.js`, `src/race-select-ui.ts`, `src/App.vue` if required; focused browser spec `tests/upcoming-home-browser.spec.js`.

**Interfaces:**
- Stage host `createUpcomingShowcase(environmentFactories)` must present `setTrack(id: UpcomingTrackId | null)`, `update(time: number, quality, reducedMotion)`, `render(camera, sharedScene)` or equivalent minimal API, and `dispose()`. Implement with existing renderer / composer rather than a second context.
- Each art module exports `createUpcomingEnvironment(scene: THREE.Scene): {group: THREE.Group;update(timeSeconds:number, quality:'low'|'medium'|'high', reducedMotion:boolean):void;dispose():void}`.
- `race-select-ui.ts` already has a separate `upcomingSelection`; it must notify the world preview host without creating a `Race`.

- [ ] Read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/track-showcase.md`, `src/world.js`, `src/track-preview.ts`, `src/car-model.js`, `src/aero-vfx.js`, `src/garage-stage.ts`.
- [ ] Write a failing Node/contract test asserting that choosing upcoming `id` drives the **live scene host**, not `#upcoming-scene` full-screen JPEG; verify RED in CI/local environment.
- [ ] Write a failing browser test asserting real `#world` WebGL output changes between two *different future track IDs*, whereas the existing playable Race ID stays untouched; verify RED.
- [ ] Add a lifecycle test for preview → real map → preview, quality toggle, Reduced Motion and context loss; verify RED.
- [ ] Implement `src/upcoming-showcase.ts` and minimal `src/world.js` / `src/main.js` hookup using existing shared renderer, camera/composer, shared player/rivals/jet VFX. Remove or hide the interim full-hero JPEG overlay when WebGL is healthy.
- [ ] Verify GREEN on focused tests; refactor repeated scene/camera work into one stage host, not ten track-specific branches in `world.js`.
- [ ] Commit isolated shared-stage changes and observe CI; if the other five art modules are still missing, provide an honest placeholder/fallback and do **not** mark dynamic-five completed.

### Task 2 — Five independent dynamic scene environment implementations (GPT 1–5)

**Files per owner branch:** `src/upcoming-scenes/<id>.ts`, `tests/upcoming-<id>-scene.test.js`, `docs/designs/new-tracks/home-art/<id>.md` and optional one `public/track-teasers/<id>.jpg`.

**Interfaces:** The exact scene export signature above, with local road around `(0,0,0)`, forward `-Z`, `+Y` up; shared renderer supplies player/rivals/car camera/time/quality and reduced-motion. No scene module controls game race state or owns a Renderer.

- [ ] For each Stage 1 ID, inspect BOTH reference JPEGs and route SVG; record 3 unique scenery anchors (foreground road, main landmark, far-field skyline/biome).
- [ ] Write a failing scene-geometry test asserting 3D road, branch and required landmark/motion group shape; ensure no DOM, external RAF or independent Renderer is created. Verify RED.
- [ ] Build scene's three-dimensional terrain and forward-looking *ground* road, visible higher *flight/branch* level and 3 unique local landmarks; use scene/instanced geometry where existing scene design supports.
- [ ] Add weather/prop motion from deterministic time input: dunes = dust; ruins = rain + waterfall + foliage; archipelago = cloud + waterfall; volcanic = lava + embers; megacity = rain + neon + distant traffic.
- [ ] Verify actual object transforms/material animation differ for different timestamps in normal mode, but Low / Reduced Motion suppress or simplify expensive effects; verify GREEN.
- [ ] Add art note with three anchors, palette, camera ground/air, screenshot candidate poses, quality/particle budgets, reference paths and deviations.
- [ ] Commit only your owned files to your existing art branch; provide SHA and actual evidence. No PR and no merge.

### Task 3 — Selectively integrate art branches (GPT 6)

**Files:** `src/upcoming-scenes/*.ts`, matching tests, and `docs/designs/new-tracks/home-art/*.md`, plus `src/upcoming-showcase.ts` imports/registry.

- [ ] Fetch each art branch's latest HEAD and verify actual scene code, scene test, art note and nonconflicting file ownership.
- [ ] Copy only the approved individual scene/test/note blobs into current shared UI HEAD, not full older branch history. Do not overwrite another art owner's files or common UI.
- [ ] Register the five scene factory imports in one typed map. Missing scene should produce documented fallback (not count as completed).
- [ ] Verify real shared car, jets, rivals and camera are in the correct world-space pose for each 3D map, including portrait and aerial view.
- [ ] Add/adjust tests for transition to existing playable race, garage, return to home, no resource buildup, low/reduced motion and old-course behavior.

### Task 4 — Real WebGL visual fidelity and runtime gate (GPT 6)

**Files:** browser tests and evidence reports under `artifacts/new-tracks/visual-evidence/<id>/` or CI artifact; update `TODO.md` and `docs/designs/new-tracks/visual-acceptance-gate.md` with actual evidence.

- [ ] Capture **two time-separated real WebGL frames** per map proving local environmental movement without drifting terrain/landmarks; capture Reduced Motion state.
- [ ] Capture each map on desktop 1440×900 and phone 390×844 at Medium, ground and aerial showcase cameras (40 baseline screenshots across all 10 eventual proposed playable tracks is separate; for the **five home scenes**, 20 baseline camera/device screenshots).
- [ ] Compare actual frames against **both** original JPEG views; record five categories: terrain silhouette/three landmark anchors, car size, foreground road and air branch, weather/lighting/animation, camera framing/occlusion.
- [ ] Check no JPEG backing/flat-plane illusion, no hidden performance runaway, high scene depth, 1–3 true car models if budget supports, same existing camera/hover quality on old courses.
- [ ] Run automated Playwright selector/keyboard/locales and accessibility checks, Low/Medium/High, Reduced Motion and phone landscape/portrait.
- [ ] Mark each map **PASS**, **FAIL** or **APPROVED DEVIATION** with real screenshot links and explanation; **do not** invent numeric similarity score or claim a scene passes with only generated art.

### Task 5 — Exact-HEAD test/CI and signoff (GPT 6)

**Files:** tests, `CLAUDE.md` (if needed), plan/spec and `TODO.md`.

- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, and `make verify` where actual environment allows; record commands and observed PASS/FAIL.
- [ ] Run/check full exact-HEAD GitHub Actions quality-gate and retain run URL, commit, failed jobs and fixes; do not mark pending as green. No proactive CI spam.
- [ ] Confirm five home scenes show real 3D animation, five cards show Coming Soon, `start-button` stays fixed and cannot start, original ten maps still work.
- [ ] Keep Stage 2 five as **planning-only** until authorized and preserve full race graph/AI implementation as **later stage**, not a blocker for the home-only dynamic showroom.
- [ ] No `develop` / `main` merge, deployment, PR or force push.
