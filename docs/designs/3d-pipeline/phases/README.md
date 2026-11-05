# 3D pipeline — per-task plan files

Index for [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md). Read only the task you are executing.

| Task | Spec phase | TODO phase | File |
|---|---|---|---|
| 0 | Phase 0 | Phase 0 | [task-0-toolchain-audit.md](task-0-toolchain-audit.md) |
| 1 | Phase 1 (baseline) | — | [task-1-r180-baseline.md](task-1-r180-baseline.md) |
| 2 | Phase 1 (migration) | Phase 1 | [task-2-threejs-r186-upgrade.md](task-2-threejs-r186-upgrade.md) |
| 3 | Phase 2 (pipeline) | Phase 2 | [task-3-glb-pipeline-mvp.md](task-3-glb-pipeline-mvp.md) |
| 4 | Phase 2 (Roadster) | Phase 3 | [task-4-roadster-garage.md](task-4-roadster-garage.md) |
| 5 | Phase 3 | — | [task-5-coast-pbr-road.md](task-5-coast-pbr-road.md) |
| 6 | Phase 4–5 | — | [task-6-new-tracks-showcase.md](task-6-new-tracks-showcase.md) |

## Scope convention: by project vs by device

Two git repos are shared across the owner's machines: this repo and `~/.claude`. Every checklist item from Task 1 on is tagged with where it lives:

- **By project** — committed to this repo: code, tests, docs, exact-pinned `devDependencies`, `.mcp.json`, `.codex/config.toml`, `.claude/skills/blender-image-to-3d`, `scripts/`, `assets-src/`, `public/models/`. Done once; another device gets it with `git pull` + `npm ci`.
- **Shared via `~/.claude` repo** — `~/.claude/skills/threejs-*` (and other user skills). Install once, `git pull ~/.claude` elsewhere; still **verify loaded** on each device (E09).
- **By device** — outside both repos; redo and re-verify on every machine, evidence only in the gitignored `../audits/`:
  - `~/.claude.json`: user-scope MCP servers, project trust / `.mcp.json` server approval (`enabledMcpjsonServers`), OAuth state.
  - `~/.codex/config.toml`: Codex user-level MCP and trusted-project state.
  - Blender.app, its version, the `blender_mcp` addon and Blender user preferences (incl. any generator API keys), the running MCP server (N panel).
  - `uv`/`uvx`, Homebrew, `toktx` (KTX-Software), Node runtime version, free disk space.
  - Real-hardware evidence: WebGL screenshots, draw calls, p50/p95, thermal on that Mac or phone.

Never move a by-device item into the repo to "save a step"; never commit `~/.claude.json`, `~/.codex/config.toml`, Blender prefs or per-device numbers.
