---
paths:
  - "assets-src/**"
  - "public/models/**"
  - "public/materials/**"
  - "scripts/assets/**"
  - "docs/designs/3d-pipeline/**"
  - "src/asset-model-loader.ts"
  - "src/model-manifest.ts"
  - "tests/model-asset-*.js"
  - "tests/model-manifest*.js"
---

# AI and Blender 3D asset pipeline (planning rule)

Before any Blender asset, GLB import, texture, loader, compression or asset pipeline work:
1. Read docs/superpowers/specs/3d-visual-fidelity-pipeline-design-v2.md and the corresponding implementation plan and local toolchain preflight.
2. Execute Phase 0 environment checks on the actual Mac and record PASS/FAIL/NOT VERIFIED. Owner reports tools installed; this does NOT establish live Blender MCP transport or loaded global Skills. If environment is unavailable, give owner commands; do not invent a result.
3. Run all Skills/MCP setup from the project root: Three.js Skills to `~/.claude/skills` (shared `~/.claude` repo), `blender-image-to-3d` and Blender MCP in project scope (`.mcp.json`, `.codex/config.toml`), never user-scope MCP. Per-device state (`~/.claude.json` approvals, Blender, `uv`) is redone on each machine — see docs/designs/3d-pipeline/phases/README.md. Never copy user config or credentials to this repository. Respect Claude/Codex scope differences and source audit.
4. Until Three.js is tested at r186.1, installed r180 APIs take priority over r186-targeted Skill examples. Then follow the r180→r186 migration plan. Do not implicitly replace WebGLRenderer with WebGPURenderer/TSL.
5. Require valid licensed source, editable Blender masters, stable named pivots/anchors, glTF manifest, PBR colorspace checks, texture budgets, LOD, asset lifecycle and fallback. Do not move physics, road frames or VFX ports for artistic reasons.
6. 2D icon 3× transparency/margin rules in .claude/rules/raster-artwork.md are separate from 3D mesh and PBR texture resolutions.
7. Record RED→GREEN regression tests, frame p50/p95, shader compile/NaN checks, real desktop/mobile WebGL captures, exact-HEAD full CI and art sign-off. Never call a concept illustration an actual in-game screenshot. The target-look concept board is docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg (mood reference only; see its README).
8. No PR, deploy, branch reset, force push or merge into develop/main without owner approval.
9. Repeatable checks across devices use docs/designs/3d-pipeline/phase0-multi-device-acceptance.md (E01–E15, device alias, live MCP evidence, per-device report). Never reuse another device's PASS. Phase 0 runs docs/designs/3d-pipeline/toolchain-environment-preflight.md on the actual Mac.
10. Public repo: per-device reports and device names live only in the `.gitignore`-excluded docs/designs/3d-pipeline/audits/; after a pass, write only the general model (e.g. Mac mini) to the local report and audits/device-status.md. Never commit machine identifiers, paths, serials, MCP configs, raw logs or per-device results.
11. Tooling scope (HARD RULE): Skills may stay global (`~/.claude/skills`, the `threejs-*` set); `blender-image-to-3d` stays in `.claude/skills/`. Every other 3D tool — MCP server, plugin, CLI or npm package — installs only in this project (`.mcp.json` / `.codex/config.toml`, exact-pinned `devDependencies`). Never user-scope MCP or a global npm/uv install; remove any global copy found. Commit no credentials.
12. Three.js r186.1 is the planned target (docs/designs/3d-pipeline/threejs-r180-r186-migration.md). A docs-only pass changes no production renderer, physics or sibling branch.
