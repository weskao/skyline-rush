# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js, Node >= 22.12.
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
| Dune, Monsoon, Skyfall, Volcanic, Stormline, Frostbite or a new course; the ten proposed long-form tracks | `.claude/rules/playable-course-shared-template.md` |
| Shortcut or hidden-path rewards on a course | `.claude/rules/ring-layout.md` |
| Course music, or music while a map is only selected on the home screen | `.claude/rules/playable-course-shared-template.md` |
| Animated Garage/HUD/Store/VFX art (GIF, sprite sheet) | `.claude/rules/animated-image-production.md`, `.claude/rules/raster-artwork.md` |
| Track teaser JPEGs under `public/track-teasers/` | `.claude/rules/track-teaser-artwork.md` |
| Blender, GLB/PBR, 3D asset, rendering quality, Three.js r180 → r186 | `.claude/rules/3d-asset-pipeline.md` (planned; not deployed) |
| Tutorial lessons, cues or transitions | `docs/tutorial-driving.md` |
| Pushing, reading CI, merging, releasing | `.claude/rules/ci-gates.md`, `.claude/rules/branch-release.md` |

Every course needs its own in-race song, and that song must not match any other course.
It plays after the race starts. Selecting the course on the home screen keeps the shared intro.

## Workflow (every feature and bug fix)

Follow `docs/regression-first-workflow.md`: trace the shared root cause; failing test (RED) →
minimal fix (GREEN); regression-check affected tracks, vehicles, locales, inputs and **both
orientations** on phones; `make verify`; inspect real WebGL / touch screenshots when behavior or
rendering changed; then check the full GitHub `quality-gate` for the exact HEAD commit. Track
evidence in `TODO.md`. CI, manual visual confirmation and RED evidence are separate gates; one
never proves another.

A bug fix ships with its prevention: the scoped rule that names the trap, the mechanism that
removes it, and a guard test that is RED on the old code.

### Mandatory checks before Commit / Push

- Before committing source changes, run `node --test tests/module-size.test.js`; also run the
  focused regression tests, typecheck and build appropriate to the changed behavior.
- Before a local push, the existing `.githooks/pre-push` runs the module-size gate automatically,
  even with `SKIP_LAYOUT_GATE=1`. Configure `git config core.hooksPath .githooks` for new clones.
- When a check fails, identify the exact source file(s), actual/allowed line count when relevant,
  failed test file, applicable rule file and command to reproduce it. Fix and rerun before pushing.
- Do not compress unrelated statements, remove tests or increase legacy ceilings just to silence CI.
  Keep modules readable; extract code only when there is a meaningful responsibility boundary.
- GitHub API/connector commits bypass local Git hooks: explicitly perform available checks and
  inspect the exact-HEAD remote CI. Report commands not executed; never assume a check passed.

Merge-ready only when the latest `develop` is integrated, required checks are green and the
user-visible symptoms were retested. Never merge into `develop`/`main`, open a PR or deploy
without explicit user approval.

## Verification

- Gameplay / progression / build config → `npm test` + `npm run build`.
- Rendering / navigation / controls / unlock visibility → also `npm run test:browser`, desktop and
  mobile, portrait and landscape. `npx playwright test <spec>` serves `dist/`: run `npm run build`
  first or it tests old code.
- Bug seen only on a phone → reproduce on that device class and orientation (`make phone-diag`);
  a desktop viewport of the same size is not a reproduction.
- Never delete or weaken tests to pass CI; report any test you could not run.
- Never commit RED tests (yours or another session's staged files) without the implementation that turns them
  green; `.githooks/pre-push` runs `npm test` on code/test pushes, never bypass it with `--no-verify`.
- Only `main`/`develop` run the full remote CI; a green run on an earlier commit does not
  validate the new HEAD.

## Commands

| Command | Purpose |
| --- | --- |
| `make` / `make dev` | Vite dev server, saved progression respected |
| `make dev-unlocked` | Local-only all-unlocked server (not a test runner) |
| `make dev-feature <name>` | Worktree of `origin/feature/<name>`, all-unlocked, HTTPS |
| `make phone [name] [y=1]` | Phone-reachable locked dev server (`y=1` = no prompts) |
| `make dev-diag` / `make phone-diag [name]` | Same servers with the diagnostic banner (`VITE_DIAG=1`) |
| `npm test` | Node unit tests |
| `npm run build` | Production build + release-bundle lock assertion |
| `npm run test:browser` | Playwright suite (pretest builds production assets) |
| `npm run test:layout` | Home-screen layout browser tests |
| `make verify` | Full local gate: unit, build, browser, World Tour long-run |
| `make deploy` | Trigger CI GitHub Pages deploy of remote `main` |
| `make deploy-netlify` | Build this checkout, deploy to Netlify production, live check, Telegram link |

## Branches

Commit and push to the current branch. `feature/**`, `fix/**`, `refactor/**` branch from and
merge back into `develop` (`--no-ff`); only `develop` and `hotfix/*` merge into `main`;
`/release` back-merges `main` into `develop`. Full flow: `.claude/rules/branch-release.md`.
