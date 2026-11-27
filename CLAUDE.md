# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js r186, Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints and
browser support. Prefer small changes with deterministic unit tests + browser regression.

**No personal paths in files.** This repo is public: never write a user-specific absolute path
(`/Users/<name>/…`, `/home/<name>/…`, `C:\Users\<name>\…`) into any committed file (code, docs,
specs, configs, tests, logs). Use repo-relative paths, `$HOME`/`~`, or a placeholder such as
`<repo>`.

## Rules and pointers

File-scoped rules live in `.claude/rules/` and load only with the files they cover. A rule that
only matters for certain files goes there with `paths:`, not here; one home per rule, never a
copy in both. A "→ Read `<file>`" line names a situation: open that file only then, follow it
exactly. Topics whose work often starts before a scoped file is open:

| Starting on… | → Read first |
| --- | --- |
| Home / HUD layout, any `(orientation: landscape)` or `max-height` media query | `.claude/rules/orientation-layout.md` (iOS paints portrait and landscape differently; check both) |
| Creating or modifying any course, including its sky, weather, lighting or graphics-tier fallback | `.claude/rules/playable-course-shared-template.md` |
| Track gaps, minimum jump speed, failed flight, or vehicle resets | `.claude/rules/playable-course-shared-template.md` (gap physics and shared recovery) |
| Shortcut or hidden-path rewards on a course | `.claude/rules/ring-layout.md` |
| A finish area, or any road that does not close into a loop | `.claude/rules/road-runout.md` (the drawn road runs on past the finish; it never ends in the air) |
| Course music, or music while a map is only selected on the home screen | `.claude/rules/playable-course-shared-template.md` |
| Animated Garage/HUD/Store/VFX art (GIF, sprite sheet) | `.claude/rules/animated-image-production.md`, `.claude/rules/raster-artwork.md` |
| Garage/Store access in `make *unlocked` | `.claude/rules/unlock-separation.md` |
| Track teaser JPEGs under `public/track-teasers/` | `.claude/rules/track-teaser-artwork.md` |
| Dressing a map with trees, rocks, lamps or other props; building, changing or moving any procedurally built 3D model, existing or new | `.claude/rules/prop-reuse.md` (one parametric builder per species, vary per instance first, prove defaults with `scripts/assets/glb_ab.py`) |
| Blender, GLB/PBR, 3D asset, new car model, rendering quality, a Three.js upgrade | `docs/designs/3d-pipeline/phases/README.md` (phase index; new car = `task-7-concept-hero-car.md`), then `.claude/rules/3d-asset-pipeline.md` |
| Choosing a camera angle, lens, shot timing or light direction for a car or prop (reveal, showroom, title shot); checking a new GLB's silhouette and scale; a turntable or draft MP4 | `.claude/rules/crucible-mcp.md` (study it in Crucible MCP, ship the numbers as data) |
| Vehicle glare, exterior paint and glass, track lighting or bloom | `.claude/rules/vehicle-lighting.md` |
| A Garage item, paint, cosmetic or vehicle-mounted VFX; adding or switching a selectable car | `.claude/rules/garage-equipment.md` (every item works on every car) |
| Tutorial lessons, cues or transitions | `docs/tutorial-driving.md` |
| Anything the player newly acquires or unlocks (car, track, paint, equipment, clothing, medal, currency, reward, store or mission claim) | `.claude/rules/acquisition-reveal.md` (one shared reveal via `presentAcquisition`) |
| Any confirm, alert, prompt, dropdown, search box or picker; turning an important setting off | `.claude/rules/no-native-ui.md` (in-game `confirmDialog()`, never the browser's native UI) |
| Pushing, reading CI, merging, releasing | `.claude/rules/ci-gates.md`, `.claude/rules/branch-release.md` |

Player copy (What's New, locales, store text, captions) names a track exactly as `TRACK_NAMES` in
`src/i18n.ts` does, in en and zh-TW; never a paraphrase or a second table. Renaming a track changes that table.

## 3D tools

Project-scope MCP servers (`.mcp.json`, `.codex/config.toml`). Pick by the job, and say so when
the one a task needs is not connected instead of working around it:

| Tool | Use it for | Never for |
| --- | --- | --- |
| Blender MCP (`blender`) | Editable masters, GLB/PBR export, bakes | Deciding how the game frames a model |
| Crucible MCP (`crucible`) | Looking before coding: angles, lens, shot timing and light direction for a car or prop, a GLB check, draft stills and MP4 | The game runtime (no `crucible` import under `src/`), asset masters, acceptance evidence |
| The game (Three.js, Playwright) | Every acceptance capture | — |

A Crucible study ends as numbers in the module that owns the shot, with its test, and is then
confirmed on a real WebGL capture. The car premiere's angles in `src/acquisition-car-camera.ts`
came from one.

## Workflow (every feature and bug fix)

Follow `docs/regression-first-workflow.md`: trace the shared root cause; failing test (RED) →
minimal fix (GREEN); regression-check affected tracks, vehicles, locales, inputs and **both
orientations** on phones; `make verify`; inspect real WebGL / touch screenshots when behavior or
rendering changed; then check the full GitHub `quality-gate` for the exact HEAD commit. Track
evidence in `TODO.md`. CI, manual visual confirmation and RED evidence are separate gates; one
never proves another.

A bug fix ships with its prevention: the scoped rule that names the trap, the mechanism that
removes it, and a guard test that is RED on the old code.

### Before Commit / Push

- Before committing source changes, run `node --test tests/module-size.test.js`, plus the focused
  regression tests, typecheck and build for the changed behavior. A failure is fixed at its
  source, never by compressing code, removing tests or raising a ceiling; what to report is in
  `.claude/rules/module-size.md`.
- `.githooks/pre-push` runs the module-size gate (even with `SKIP_LAYOUT_GATE=1`) and `pnpm test`;
  never bypass it with `--no-verify`. A new clone enables the hooks with `make setup`.
- GitHub API/connector commits bypass local Git hooks: run the available checks yourself, inspect
  the exact-HEAD remote CI and report every command not executed.

Merge-ready only when the latest `develop` is integrated, required checks are green and the
user-visible symptoms were retested. Never merge into `develop`/`main`, open a PR or deploy
without explicit user approval.

## Verification

- Gameplay / progression / build config → `pnpm test` + `pnpm run build`.
- Rendering / navigation / controls / unlock visibility → also `pnpm run test:browser`, desktop and
  mobile, portrait and landscape. `pnpm exec playwright test <spec>` serves `dist/`: run `pnpm run build`
  first or it tests old code.
- Bug seen only on a phone → reproduce on that device class and orientation (`make phone-diag`);
  a desktop viewport of the same size is not a reproduction.
- Never delete or weaken tests to pass CI; report any test you could not run.
- Never commit RED tests (yours or another session's staged files) without the implementation
  that turns them green.

## Commands

`make help` lists every target with its options; the `##` annotation on each Makefile target is
the single source, so describe a new target there, not here. Not covered by `make help`:

- `pnpm test`: Node unit tests only.
- `pnpm run build`: production build plus the release-bundle lock assertion.
- `pnpm run test:browser`: Playwright suite alone (does its own trial build first).
- `pnpm run test:layout`: home-screen layout browser tests (no make target).

## Road pickup visibility

All four road energy pickup tiers share `pickup-markers.js`, `pickup-art.js` and
`pickup-visibility.js`. Keep model scale and projection-aware halo independent of Low/Medium/High/Ultra,
DPR and dynamic render scale; use logical CSS viewport height and camera projection. Preserve the
near-collection size, ground clearance, reduced-motion behavior, existing instanced pools and
LOD. Projected size must increase, never shrink, as camera depth decreases at fixed projection;
fit distant geometry bounds to the active close geometry on creation/model swap. Never change
simulation collision, reward, respawn or pickup placement to improve readability.
See `docs/designs/road-pickups/README.md` and the pickup visibility/presentation tests.

## Branches

Commit and push to the current branch. `feature/**`, `fix/**`, `refactor/**` branch from and
merge back into `develop` (`--no-ff`); only `develop` and `hotfix/*` merge into `main`;
`/release` back-merges `main` into `develop`. Full flow: `.claude/rules/branch-release.md`.
