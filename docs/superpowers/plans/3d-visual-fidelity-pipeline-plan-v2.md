# AI-assisted 3D Visual Fidelity Pipeline — Implementation Plan v2

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or
> superpowers:executing-plans to implement this plan task by task. Tick a checkbox only after observed evidence.

Status: active · v2 adopted 2026-11-08 · Supersedes [3d-visual-fidelity-pipeline-plan-v1.md](3d-visual-fidelity-pipeline-plan-v1.md)
**Goal:** a verified Blender-to-GLB pipeline on Three.js r186.1 (done). Then: finish the Roadster (2b–2d), bring Coast
and every map toward its concept-board panel, and add the board's car as a second player car. Each visual step is
accepted by the concept-board parity review.
**Architecture:** Vue + TypeScript + one WebGL renderer, with physics unchanged. A GLB asset layer with LOD, PBR,
lifecycle control and procedural fallback sits on top. All player cars share one simulation and VFX-port contract.
**Tech stack:** Blender + Python + mcp-for-blender + blender-image-to-3d + Three.js 0.186.1 + GLTFLoader + glTF
Transform + Meshopt/KTX2 + Vue 3 + Vite + Node tests + Playwright.
**Spec:** [../specs/3d-visual-fidelity-pipeline-design-v2.md](../specs/3d-visual-fidelity-pipeline-design-v2.md)
**Look target:** [concept board](../../designs/3d-pipeline/concept-art/README.md) · parity review: spec v2 §8.1
**Preflight:** ../../designs/3d-pipeline/toolchain-environment-preflight.md
**Phase 0 acceptance per device:** ../../designs/3d-pipeline/phase0-multi-device-acceptance.md
**Version migration:** ../../designs/3d-pipeline/threejs-r180-r186-migration.md

## Global constraints
- No item is done because the owner says a tool was installed. Tick boxes only with evidence (command + observed
  result).
- Start in `~/Documents/Workspace/skyline-rush`. Three.js skills are global. `blender-image-to-3d` and Blender MCP
  are project-scoped. No secrets in Git or logs.
- Branches: each phase works on its own `feature/**` branch cut from `develop`, or from the branch that owns the
  current phase. Merges into `develop` happen only with the owner's approval. Never write to sibling map branches.
- Uphold `.claude/rules/performance-review.md`, `docs/rendering-performance.md`, shader warm-up, no mid-race NaNs,
  deterministic physics, all tracks, mobile, localization, and real-screenshot and CI acceptance.
- Audit every third-party asset's licence. The concept board's generator and terms must be recorded before Task 7
  ships.
- Device-specific reports stay local in the git-ignored `docs/designs/3d-pipeline/audits/`. That covers machine
  names, paths, per-device numbers and parity composites.

## Review focus: likely overlooked failures
1. **MCP installed but no live connection:** Blender tasks need a live read-only scene query first.
2. **A global skill exists but never loads:** check runtime skill discovery per device.
3. **A new GLB moves physics or VFX:** every car keeps the exact `REAR_PORTS`/`LIFT_PORTS`, collision envelope and
   rig contract. Fit the body around the ports, never the reverse.
4. **Streaming or model-cache leaks and stalls:** ownership and disposal, preload compilation, chunk switches, a
   second car's GLB, and decoder errors.
5. **Look judged on the wrong renderer:** SwiftShader or CI captures are never parity evidence. Use a real GPU and a
   real phone.
6. **Car selection breaks saves:** Cloud Save and local saves without an equipped car must migrate to the Roadster.

---

## Scope convention: by project vs by device

Unchanged from v1. Every item is tagged **By project**, **Shared via `~/.claude` repo** or **By device**. Full
definition: ../../designs/3d-pipeline/phases/README.md

## Tasks (one file each; read only the task you execute)

| Task | Spec phase | Board panels | Scope | File |
|---|---|---|---|---|
| 0 — Mandatory toolchain audit (FIRST) | 0 | — | by device | ../../designs/3d-pipeline/phases/task-0-toolchain-audit.md |
| 1 — Characterize r180 visuals; RED compatibility tests | 1 | — | project + device evidence | ../../designs/3d-pipeline/phases/task-1-r180-baseline.md |
| 2 — Upgrade to Three.js r186.1 | 1 | — | project + `~/.claude` + device | ../../designs/3d-pipeline/phases/task-2-threejs-r186-upgrade.md |
| 3 — GLB pipeline MVP, licensing, loader | 2 | — | project + device | ../../designs/3d-pipeline/phases/task-3-glb-pipeline-mvp.md |
| 4 — Reference-led Roadster in Garage | 2 | — | project + device | ../../designs/3d-pipeline/phases/task-4-roadster-garage.md |
| 4b — Hero Roadster GLB on Home showcase and in races | 2b | — | project + device | ../../designs/3d-pipeline/phases/task-4b-roadster-race.md |
| 4c — Garage equipment and VFX alignment with the GLB car | 2c | studio rear, Coast boost (glow colour) | project + device | ../../designs/3d-pipeline/phases/task-4c-garage-equipment-vfx.md |
| 4d — Roadster close-out: owner gates, real phone, default-on | 2d | — | project + device | the owner gates in task-4b and task-4c, then default-on (spec v2 §7 Phase 2d) |
| 5 — Coast look development: PBR road, lighting, effects | 3 | Coast ×5 | project + device evidence | ../../designs/3d-pipeline/phases/task-5-coast-pbr-road.md |
| 6 — Maps follow their panels + showcase/cover | 4–5 | Dune, Monsoon, Skyfall, Volcanic, Stormline, Frostbite | project + device | ../../designs/3d-pipeline/phases/task-6-new-tracks-showcase.md |
| 7 — Concept hero car + Garage car selection | 6 | studio 2×2 | project + device | ../../designs/3d-pipeline/phases/task-7-concept-hero-car.md |

Order: 4b → 4c → 4d → (5 ∥ 7) → 6. Covers (Task 6, Phase 5) come last.

**Exit (Task 0):** all mandatory items PASS per device, or have a documented owner-approved exclusion. A live Blender
MCP scene query is required before any Blender task.

## Final review and handoff
- [ ] Compare every section of the spec v2, migration doc and toolchain preflight against this plan; verify task
  coverage.
- [ ] For each visual phase, attach the scored parity sheet (spec v2 §8.1) with the owner's sign-off.
- [ ] Provide the branch HEAD SHA, a diff summary, unit/typecheck/build/CI results, screenshots and the remaining
  manual gates.
- [ ] No PR, auto-merge, deployment or release without owner instruction.
