# AI-assisted 3D Visual Fidelity Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Each task uses checked boxes only after observed evidence.

Date: 2026-11-04 · Status: PLANNED / NOT EXECUTED
**Goal:** Establish a verified Mac AI/Blender-to-GLB pipeline, upgrade to Three.js r186.1 without gameplay regressions, then upgrade the vehicle, Garage and road/world visuals incrementally.
**Architecture:** Keep Vue+TypeScript+WebGL and physics unchanged; independent asset authoring/loader layer with LOD, PBR, lifecycle control and procedural fallback; shared pipeline adopted after source integration.
**Tech Stack:** Blender + Python + mcp-for-blender + blender-image-to-3d + Three.js 0.186.1 + GLTFLoader + glTF Transform + Meshopt/KTX2 + Vue 3 + Vite + Node tests + Playwright.
**Spec:** ../specs/2026-11-04-3d-visual-fidelity-pipeline-design.md
**Preflight:** ../../designs/3d-pipeline/toolchain-environment-preflight.md
**Standalone Phase 0 acceptance, device-specific reporting, and ready-to-copy AI prompt:** ../../designs/3d-pipeline/phase0-multi-device-acceptance.md
**Version migration:** ../../designs/3d-pipeline/threejs-r180-r186-migration.md

## Global constraints
- This document describes future work; no item is done because the owner says a tool was installed.
- Start in ~/Documents/Workspace/skyline-rush. Three.js skills remain global; blender-image-to-3d is project-scoped; Blender MCP belongs only to this project for Claude and Codex. Remove global Blender MCP registrations across AI agents, preserving unrelated servers. No secrets in Git or logs.
- First branch already exists: feature/3d-visual-fidelity-pipeline. Changes may target this existing branch only until owner explicitly directs otherwise. Do not change develop/main/sibling art/map or Roadster branch.
- User requested planning first: write docs and TODO, but **do not upgrade dependencies or remodel game during this docs-only milestone**.
- Keep r180 working until the r186 upgrade phase passes testing; exact target r186.1, matching type definitions and lockfile, keeping WebGLRenderer.
- Uphold .claude/rules/performance-review.md, docs/rendering-performance.md, shader warmup, no mid-race NaNs, deterministic physics, all tracks, mobile, localization, and real screenshot/CI acceptance.
- Never assume all included glTF-Sample-Assets have identical reuse terms; audit each licensed asset.
- For Phase 0, keep **every device-specific audit report LOCAL ONLY** under the gitignored `docs/designs/3d-pipeline/audits/`. Never commit or push reports, actual machine names, paths, versions or live MCP output. Later implementation tasks may commit reviewed code and public-safe documentation only; no PR/merge/deploy without consent.

## Review focus: five likely overlooked failures
1. **MCP installed, but no live connection**: Blender addon enabled yet server missing; Phase 0 explicitly requires live read-only scene query.
2. **Global skill exists but is never loaded**: distinguish ~/.claude/skills, a project copy and runtime skill discovery; Phase 0 checks all.
3. **r186 JS but r180 typechecking**: scripts currently pin old @types in two commands; Task 2 updates scripts/types and validates clean npm ci.
4. **New GLB changes physics/VFX**: keep exact anchors and existing physics hierarchy; Task 4 compares before/after and accepts fallback.
5. **Streaming/model cache leaks or stalls**: ownership/disposal, preload compilation, chunk switches, mobile quality and decoder errors must pass tests in Tasks 3–6.

---

## Scope convention: by project vs by device

This repo and `~/.claude` are both git repos shared across the owner's machines. From Task 1 on, every checklist item is tagged **By project** (committed here, done once, other devices `git pull` + `npm ci`), **Shared via `~/.claude` repo** (user skills, pull elsewhere, verify loaded per device) or **By device** (`~/.claude.json`, `~/.codex/config.toml`, Blender.app/addon/prefs, `uv`, `toktx`, Node runtime, disk space, real-hardware evidence — redo on each machine, evidence only in ignored `audits/`). Full definition: ../../designs/3d-pipeline/phases/README.md

## Tasks (one file each; read only the task you execute)

| Task | Spec phase | Scope | File |
|---|---|---|---|
| 0 — Mandatory user-Mac toolchain audit (FIRST) | 0 | by device | ../../designs/3d-pipeline/phases/task-0-toolchain-audit.md |
| 1 — Characterize r180 visuals; RED compatibility tests | 1 | project + device evidence | ../../designs/3d-pipeline/phases/task-1-r180-baseline.md |
| 2 — Upgrade to Three.js r186.1 | 1 | project + `~/.claude` + device | ../../designs/3d-pipeline/phases/task-2-threejs-r186-upgrade.md |
| 3 — GLB pipeline MVP, licensing, loader | 2 | project + device | ../../designs/3d-pipeline/phases/task-3-glb-pipeline-mvp.md |
| 4 — Reference-led Roadster in Garage | 2 | project + device | ../../designs/3d-pipeline/phases/task-4-roadster-garage.md |
| 4b — One hero Roadster GLB on Home showcase and in races (after Task 4, before Task 6 covers) | 2b | project + device | ../../designs/3d-pipeline/phases/task-4b-roadster-race.md |
| 5 — Coast road UV, PBR, streaming pilot | 3 | project + device evidence | ../../designs/3d-pipeline/phases/task-5-coast-pbr-road.md |
| 6 — Five new tracks + showcase/cover | 4–5 | project + device | ../../designs/3d-pipeline/phases/task-6-new-tracks-showcase.md |

**Exit (Task 0):** All mandatory items PASS per device, or explicit documented owner-approved optional exclusion; actual Blender MCP scene retrieval must succeed for Blender tasks. Until then, all later implementation checkboxes remain unchecked.

## Final review and handoff
- [ ] Compare every section of design spec, migration doc and toolchain preflight against this plan; verify task coverage.
- [ ] Provide branch HEAD SHA, diff summary, installed-global-tools PASS/FAIL evidence from user's Mac, unit/typecheck/build/CI results, screenshots and remaining manual gates.
- [ ] No PR, no auto-merge to develop/main, no deployment or release. Wait for owner instruction after planning and each integration gate.
