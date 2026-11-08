# Skyline Rush — Claude Code project instructions

Browser 3D arcade racer: Vue 3 + TypeScript (strict) + Vite + Three.js, Node >= 22.12.
Simulation `src/game.js`; rendering `src/world.js`, `src/effects.js`, `src/aero-vfx.js`;
UI `src/App.vue`, `src/main.js`, `src/style.css`.

Preserve existing tracks, touch controls, NITRO/FLY/BOOST, race history, Garage paints and
browser support. Prefer small changes with deterministic unit tests + browser regression.

File-scoped rules live in `.claude/rules/` and load only with the files they cover (UI
architecture, module size, artwork, tracks, touch, Garage, tutorial, release notes, CI,
branches). A rule that only matters for certain files goes there with `paths:`, not here.

**Tutorial lessons** (details: `docs/tutorial-driving.md`): give live, engine-driven cues for
what to press or release now (the bound key on desktop), let every boost/NITRO effect finish
before the next lesson, never move the car between lessons, and chime + toast every pass.


## Shared six-course presentation and controls (mandatory for new courses)

For Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown, Stormline
Megacity, Frostbite Canyon and future courses, **read
`.claude/rules/playable-course-shared-template.md` before editing** map scenes,
home selection, gameplay, `world.js`, AIRFLOW or Garage/Studio controls.

Use the existing horizontal touch/mouse/trackpad carousel, one live `#world`
Three.js preview, common Roadster/rival poses, shared camera dock, paint/VFX,
and the same Garage Home ↔ Preview Studio controls. Do not add per-map swipe,
AIRFLOW, car, Garage, Studio or renderer systems. Home AIRFLOW ON means the
showcase car is grounded; OFF means hovering with jets. This is separate from
the in-race FLY input. Preserve actual 3D road contact, 50° FOV and responsive
camera composition; keep all future cards Coming Soon until physical playable
race acceptance, not just preview or FULL CI success.

Run the cross-course regression matrix in the scoped rule, including all six
maps and existing tracks, real desktop/mobile WebGL screenshots and exact-HEAD
FULL CI. Unverified interactions or race physics remain explicitly pending.
A "→ Read `docs/<file>`" line names a situation: open that file only then, follow it exactly.

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
For CourseGraph geometry tests, compare equivalent **physical arc-length** fractions,
not equal fractions of an authored scalar-distance parameter. Compare float-derived
bank/frame values with tight explicit tolerances, never strict equality of results
from different floating-point expression orders. Do not round/quantize production
metres, coordinates, road contact, signed checkpoints, collisions or flight gaps.

Merge-ready only when the latest `develop` is integrated, required checks are green and the
user-visible symptoms were retested. Never merge into `develop`/`main`, open a PR or deploy
without explicit user approval.

## AI-assisted 3D asset / Three.js upgrade (planned; not deployed)

For any Blender, GLB/PBR, 3D asset, rendering-quality or Three.js r180 → r186 work:
first read `docs/superpowers/specs/3d-visual-fidelity-pipeline-design-v2.md`
and `docs/superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md`.
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
check actual Blender addon + live MCP transport, Skills (project `blender-image-to-3d`,
global `threejs-*`), Claude/Codex scopes, Node and glTF Transform. Report
PASS/FAIL/NOT VERIFIED; remote GitHub cannot validate local installation.
**3D tooling scope (HARD RULE):** Skills may stay global (`~/.claude/skills`, e.g. the
`threejs-*` set); `blender-image-to-3d` stays in `.claude/skills/`. Everything else for 3D
models (Blender, GLB/glTF, textures) — every MCP server, plugin, CLI or npm package —
installs ONLY in this project: MCP in project `.mcp.json` / `.codex/config.toml`, packages
as exact-pinned `devDependencies`. Never use user-scope MCP or a global npm/uv install;
remove any global copy found. Commit no credentials.
Target-look concept board (mood only, not a screenshot or geometry source):
`docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg`.
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
| `make deploy-netlify` | Build this checkout, deploy to Netlify production, live check, Telegram link |

## Branches

Commit and push to the current branch. `feature/**`, `fix/**`, `refactor/**` branch from and
merge back into `develop` (`--no-ff`); only `develop` and `hotfix/*` merge into `main`;
`/release` back-merges `main` into `develop`. Full flow: `.claude/rules/branch-release.md`.

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
