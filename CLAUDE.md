# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js, Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints and
browser support. Prefer small changes with deterministic unit tests + browser regression.

File-scoped rules live in `.claude/rules/` and load only with the files they cover (UI
architecture, module size, artwork, tracks, touch, Garage, tutorial, release notes, CI,
branches). A rule that only matters for certain files goes there with `paths:`, not here.
A "→ Read `docs/<file>`" line names a situation: open that file only then, follow it exactly.

## Workflow (every feature and bug fix)

Follow `docs/regression-first-workflow.md`: trace the shared root cause; failing test (RED) →
minimal fix (GREEN); regression-check affected tracks, vehicles, locales and inputs;
`make verify`; inspect real WebGL / touch screenshots when behavior or rendering changed; then
check the full GitHub `quality-gate` for the exact HEAD commit. Track evidence in `TODO.md`.
CI, manual visual confirmation and RED evidence are separate gates; one never proves another.

Merge-ready only when the latest `develop` is integrated, required checks are green and the
user-visible symptoms were retested. Never merge into `develop`/`main`, open a PR or deploy
without explicit user approval.

## Verification

- Gameplay / progression / build config → `npm test` + `npm run build`.
- Rendering / navigation / controls / unlock visibility → also `npm run test:browser`, desktop and
  mobile. `npx playwright test <spec>` serves `dist/`: run `npm run build` first or it tests old code.
- Bug seen only on a phone → reproduce on that device class (`make phone-diag`).
- Never delete or weaken tests to pass CI; report any test you could not run.
- Only `main`/`develop` run the full remote CI; a green run on an earlier commit does not
  validate the new HEAD. Pushing, reading CI or merging → Read `.claude/rules/ci-gates.md`
  and `.claude/rules/branch-release.md`.

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

## Branches

Commit and push to the current branch. `feature/**`, `fix/**`, `refactor/**` branch from and
merge back into `develop` (`--no-ff`); only `develop` and `hotfix/*` merge into `main`;
`/release` back-merges `main` into `develop`. Full flow: `.claude/rules/branch-release.md`.
