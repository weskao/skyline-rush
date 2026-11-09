# 3D pipeline — per-task plan files

Index for [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md). Read only the task you are executing.

| Task | Spec phase | TODO phase | File |
|---|---|---|---|
| 0 | Phase 0 | Phase 0 | [task-0-toolchain-audit.md](task-0-toolchain-audit.md) |
| 1 | Phase 1 (baseline) | — | [task-1-r180-baseline.md](task-1-r180-baseline.md) |
| 2 | Phase 1 (migration) | Phase 1 | [task-2-threejs-r186-upgrade.md](task-2-threejs-r186-upgrade.md) |
| 3 | Phase 2 (pipeline) | Phase 2 | [task-3-glb-pipeline-mvp.md](task-3-glb-pipeline-mvp.md) |
| 4 | Phase 2 (Roadster) | Phase 3 | [task-4-roadster-garage.md](task-4-roadster-garage.md) |
| 4b | Phase 2b | Phase 3b | [task-4b-roadster-race.md](task-4b-roadster-race.md) |
| 4c | Phase 2c | Phase 3c | [task-4c-garage-equipment-vfx.md](task-4c-garage-equipment-vfx.md) |
| 4d | Phase 2d (Roadster close-out) | Phase 3d | owner gates in task-4b / task-4c, then default-on |
| 5 | Phase 3 | — | [task-5-coast-pbr-road.md](task-5-coast-pbr-road.md) |
| 6 | Phase 4–5 | — | [task-6-new-tracks-showcase.md](task-6-new-tracks-showcase.md) |
| 7 | Phase 6 (concept hero car) | Phase 7 | [task-7-concept-hero-car.md](task-7-concept-hero-car.md) |

Visual tasks (4c–7) are accepted by the concept-board parity review in spec v2 §8.1; see [../concept-art/README.md](../concept-art/README.md) for which panel each task answers to.

## Scope convention: by project vs by device

Every checklist item from Task 0 on is tagged with one of two scopes:

- **By project** — done once; it does not depend on which machine runs it. Committed to this repo (code, tests, docs, exact-pinned `devDependencies`, `.mcp.json`, `.codex/config.toml`, `.claude/skills/blender-image-to-3d`, `scripts/`, `assets-src/`, `public/models/`) or kept under `~/.claude` (`~/.claude/skills/threejs-*`, rules). Another device needs only `git pull` + `npm ci`.
- **By device** — state each machine keeps on its own; redo and re-verify on every machine, evidence only in the gitignored `../audits/`. A step counts as by device as soon as it needs one of these, even if it touches nothing else (e.g. only `~/.claude.json`):
  - `~/.claude.json`: user-scope MCP servers, project trust / `.mcp.json` server approval (`enabledMcpjsonServers`), OAuth state.
  - `~/.codex/config.toml`: Codex user-level MCP and trusted-project state.
  - The checkout itself: workspace path, branch/HEAD, `node_modules` from `npm ci`.
  - Blender.app, its version, the `blender_mcp` addon and Blender user preferences (incl. any generator API keys), the running MCP server (N panel).
  - CLIs and runtimes: Claude/Codex CLI, `uv`/`uvx`, Homebrew, `toktx` (KTX-Software), Node/npm version, free disk space.
  - Real-hardware evidence: WebGL screenshots, renderer stats, draw calls, p50/p95, thermal on that Mac or phone, and every browser run.

Never move a by-device item into the repo to "save a step"; never commit `~/.claude.json`, `~/.codex/config.toml`, Blender prefs or per-device numbers. A device that already passed a phase keeps that status; this split only says which steps the next device repeats.

## Phase 0 (Task 0) split

E-numbers refer to [../phase0-multi-device-acceptance.md](../phase0-multi-device-acceptance.md).

**By project — once:**
- E08 project skill `.claude/skills/blender-image-to-3d` committed (never installed globally); E09 `~/.claude/skills/threejs-*` installed, loadable and reviewed against r180 (recheck r186 after Task 2).
- E06 / E14 project files: Blender MCP registered in `.mcp.json` and `.codex/config.toml`.
- E10 `package.json`, lockfile and typecheck scripts reference the expected three/@types versions.
- E11 `.gitignore` excludes `audits/`; tracked content carries no machine identifiers.
- E12 exact-HEAD CI status read for the branch.
- E13 `@gltf-transform/cli` exact-pinned `4.5.1` in `devDependencies` and the lockfile.
- Third-party Skill/MCP permission and license review.

**By device — every machine:**
- E01 checkout path, remote, branch and HEAD on this machine.
- E02 Node >= 22.20 and npm; E04 `uvx` and Claude CLI.
- E03 Blender binary/version and background `bpy`; E05 `blender_mcp` addon enabled in this Blender's preferences.
- E06 / E14 machine state: the project `.mcp.json` server approved and no user-scope Blender MCP in `~/.claude.json`; Codex project trust and no global Blender MCP in `~/.codex/config.toml`; `codex mcp list` connects.
- E07 live read-only Blender MCP scene query from Claude Code.
- E10 / E13 after `npm ci`: installed three/@types match the lockfile (`npm ls`); `npx --no-install gltf-transform --version` and `inspect` / `optimize --compress meshopt` on a test GLB.
- Local audit report and `audits/device-status.md` (generic model name only).

## Phase 1 (Tasks 1–2) split

**By project — once:**
- Task 1: RED `tests/three-version-contract.test.js`, capture spec `tests/three-baseline-browser.spec.js`, [../r180-baseline.md](../r180-baseline.md) with device-class labels only.
- Task 2: `three` 0.186.1 + `@types/three` 0.186.0 exact-pinned, lockfile, no dynamic types installs; contract test GREEN; `npm run typecheck`, `npm test`, `npm run build`. Run `python3 scripts/three-pipeline/phase1_project_check.py` (P0 rebase pull, P1 `npm ci`, P2 contract test, P3 typecheck, P4 `npm test`, P5 build; `--steps P2,P3` for a subset). AI agents may execute it directly without asking: it never commits or pushes, and stops at the first FAIL.
- One shared fix for any r186 API breakage a device run finds (never a per-device workaround).
- Re-read `~/.claude/skills/threejs-*` against r186.1.
- Commit, then the full exact-HEAD `quality-gate` CI run.

**By device — every machine** (D1–D7 via `scripts/three-pipeline/phase1_device_check.py`; see `TODO.md`):
- D1 `npm ci` and installed versions; D2 Playwright Chrome launch.
- D3 own r180 baseline from the pre-upgrade commit (screenshots, renderer stats, `make perf`).
- D4 shader-warmup and black-frame specs at r186; D5 r186 capture compared with D3; D6 `make perf` no worse than D3; D7 `make verify`.
- D8 screenshots reviewed side by side with D3; D9 `make perf-phone` on each QA phone.
