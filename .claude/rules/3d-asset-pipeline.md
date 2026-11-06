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
1. Read docs/superpowers/specs/2026-11-04-3d-visual-fidelity-pipeline-design.md and the corresponding implementation plan and local toolchain preflight.
2. Execute Phase 0 environment checks on the actual Mac and record PASS/FAIL/NOT VERIFIED. Owner reports tools installed; this does NOT establish live Blender MCP transport or loaded global Skills. If environment is unavailable, give owner commands; do not invent a result.
3. Run all Skills/MCP setup from the project root: Three.js Skills to `~/.claude/skills` (shared `~/.claude` repo), `blender-image-to-3d` and Blender MCP in project scope (`.mcp.json`, `.codex/config.toml`), never user-scope MCP. Per-device state (`~/.claude.json` approvals, Blender, `uv`) is redone on each machine — see docs/designs/3d-pipeline/phases/README.md. Never copy user config or credentials to this repository. Respect Claude/Codex scope differences and source audit.
4. Until Three.js is tested at r186.1, installed r180 APIs take priority over r186-targeted Skill examples. Then follow the r180→r186 migration plan. Do not implicitly replace WebGLRenderer with WebGPURenderer/TSL.
5. Require valid licensed source, editable Blender masters, stable named pivots/anchors, glTF manifest, PBR colorspace checks, texture budgets, LOD, asset lifecycle and fallback. Do not move physics, road frames or VFX ports for artistic reasons.
6. 2D icon 3× transparency/margin rules in .claude/rules/raster-artwork.md are separate from 3D mesh and PBR texture resolutions.
7. Record RED→GREEN regression tests, frame p50/p95, shader compile/NaN checks, real desktop/mobile WebGL captures, exact-HEAD full CI and art sign-off. Never call a concept illustration an actual in-game screenshot.
8. No PR, deploy, branch reset, force push or merge into develop/main without owner approval.
