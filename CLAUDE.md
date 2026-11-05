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

**No personal paths in files.** This repo is public: never write a user-specific absolute path
(`/Users/<name>/…`, `/home/<name>/…`, `C:\Users\<name>\…`) into any committed file (code, docs,
specs, configs, tests, logs). Use repo-relative paths, `$HOME`/`~`, or a placeholder such as
`<repo>`.

## Workflow (every feature and bug fix)

Follow `docs/regression-first-workflow.md`: trace the shared root cause; failing test (RED) →
minimal fix (GREEN); regression-check affected tracks, vehicles, locales and inputs;
`make verify`; inspect real WebGL / touch screenshots when behavior or rendering changed; then
check the full GitHub `quality-gate` for the exact HEAD commit. Track evidence in `TODO.md`.
CI, manual visual confirmation and RED evidence are separate gates; one never proves another.

Merge-ready only when the latest `develop` is integrated, required checks are green and the
user-visible symptoms were retested. Never merge into `develop`/`main`, open a PR or deploy
without explicit user approval.

## AI-assisted 3D asset / Three.js upgrade (planned; not deployed)

For any Blender, GLB/PBR, 3D asset, rendering-quality or Three.js r180 → r186 work:
first read `docs/superpowers/specs/2026-11-04-3d-visual-fidelity-pipeline-design.md`
and `docs/superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md`.
For repeatable checks across Mac mini, MacBook Pro or other devices, use the self-contained
`docs/designs/3d-pipeline/phase0-multi-device-acceptance.md` (E01–E15, device alias,
actual live MCP evidence and per-device reports). Never reuse another device's PASS.
**Public repo security:** all per-device reports and device names belong ONLY in the
`.gitignore`-excluded `docs/designs/3d-pipeline/audits/` directory; after a device
actually passes, write only its general model (e.g. Mac mini) to the LOCAL report
and ignored `audits/device-status.md`. Do not commit/push machine identifiers,
paths, serials, MCP configs, raw logs or any per-device pass results.
**Mandatory Phase 0 before implementation:** run
`docs/designs/3d-pipeline/toolchain-environment-preflight.md` on the user's Mac;
check actual Blender addon + live MCP transport, user-global Skills, Claude/Codex scopes,
Node and glTF Transform. Report PASS/FAIL/NOT VERIFIED; remote GitHub cannot validate
local installation. Global Skills belong under `~/.claude/skills`, not in this repo.
Three.js r186.1 is the *planned* target; until verified migration, obey currently
installed r180 APIs. Read `docs/designs/3d-pipeline/threejs-r180-r186-migration.md`
and scoped `.claude/rules/3d-asset-pipeline.md` when applicable. Never change
production renderer, physics or sibling branches during a docs-only pass.

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

## Track teaser artwork contract (all maps)

Applies to `public/track-teasers/<track-slug>.jpg` in the home/Coming Soon/track-selection UI.

- Final committed asset **must decode as an actual 568 × 205 pixel JPEG** (not merely display at that CSS size); use a consistent high-quality cinematic futuristic racing illustration style. The 3× rule for transparent UI icons does not replace this exact JPEG contract.
- **Scene only:** never burn in track names, headings, descriptions, buttons, labels, logos, watermarks, captions, or any other text. UI copy belongs in HTML/Vue, not inside the image.
- **Edge-to-edge scene:** no white/blank borders, padding, letterbox bars, empty canvas corners, or fragments of adjacent maps. Inspect the top/bottom rows and all four edges for seams, other map strips and unwanted overlays. Keep the intended vehicle, road and landmark visibly framed; do not crop off significant content to hide a defect.
- For the five-track 2026-11-05 correction, **preserve the original artwork, viewpoint, colors and subject** for Monsoon Ruins, Skyfall Archipelago, Stormline Megacity and Volcanic Crown; repair only text, seams and unwanted lower strips with source-faithful reconstruction. **Only Frostbite Canyon is authorized for a full redraw** to match those maps' original cinematic illustration style.
- Before committing, inspect each decoded JPEG at native 568 × 205 and compare against the source side by side; verify image format and dimensions with an executable check, ensure the image is readable in the real desktop/mobile track-selection UI and check that no unrelated source files changed. CI/test results and manual visual acceptance must be reported separately, never assumed.

