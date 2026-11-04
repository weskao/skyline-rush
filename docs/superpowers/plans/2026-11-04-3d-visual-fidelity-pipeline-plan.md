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
- Start in ~/Documents/Workspace/skyline-rush. Global means ~/.claude/skills and user-level MCP, **not** files in the checkout. Do not accidentally run project-scope installs. No secrets in Git or logs.
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

## Task 0 — Mandatory user-Mac toolchain audit (execute FIRST; highest priority)

**Files:** Reference the standalone `docs/designs/3d-pipeline/phase0-multi-device-acceptance.md` plus `docs/designs/3d-pipeline/toolchain-environment-preflight.md`; save E01–E15 audit **only locally** to `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md` (gitignored) and update the ignored `audits/device-status.md` with non-identifying product model **only after PASS**. Public TODO.md can reference the verification procedure but must never contain device-specific outcomes or identifiers.
**Consumes:** Mac workspace ~/Documents/Workspace/skyline-rush, existing Claude/Codex/Blender installations.
**Produces:** toolchain matrix with PASS/FAIL/NOT VERIFIED, version evidence, connection smoke test and explicit blocked steps.

- [ ] Confirm working directory, git branch/HEAD and clean or acknowledged working state; do not clobber concurrent developer work.
- [ ] Run read-only commands for Blender executable/version, node >=22.20, npm, uvx, Claude/Codex CLI (optional Codex), npx skills list -g, ~/.claude/skills/, claude mcp get/list, codex mcp list and npm ls for three/types/glTF Transform.
- [ ] Confirm Blender addon enabled-state in Blender background preferences; then open Blender and execute **read-only live MCP scene query** from Claude Code. Mark addon/server/agent connection separately.
- [ ] If any mandatory dependency is missing, stop the dependent subtask, review source and permissions, run only approved minimal repair commands, **rerun the same check** and record observed result. Global Skills use -g and user MCP scope; do not copy their files into repository. If remote agent cannot reach the Mac, return the exact owner-executable commands and wait for observed output; no fabricated PASS.
- [ ] Review third-party Skill/MCP permissions and trusted model asset licenses. Verify global skill version/API claims vs current r180; after target migration recheck r186.
- [ ] Document per-item evidence in **local ignored** audit files, not in GitHub; check `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` and `git ls-files docs/designs/3d-pipeline/audits/` (must be empty). After successful acceptance, record only generic model such as `Mac mini` in that device's local report and local ignored device-status.md. Never commit/push private paths, hostnames, serials, raw command output or secrets. Do not use Telegram/tgsend without a configured authorized sender.

**Exit:** All mandatory items PASS, or explicit documented owner-approved optional exclusion; actual Blender MCP scene retrieval must succeed for Blender tasks. Until then, all later implementation checkboxes remain unchecked.

## Task 1 — Characterize r180 visuals and performance; add RED compatibility tests

**Files:** tests/three-version-contract.test.js (planned new); tests/shader-warmup-browser.spec.js; tests/black-frame-browser.spec.js; src/world.js read-only baseline; new evidence doc under docs/designs/3d-pipeline/.
**Produces:** reproducible r180 acceptance baseline and real RED evidence tied to a specific compatibility assertion.

- [ ] Read scoped rules and current HEAD; gather exact import API inventory and known material/lighting behavior, Game/Garage/track metrics.
- [ ] Write a targeted failing test for requested r186 compatibility or type/version alignment; record actual observed failure before changing code.
- [ ] Capture true WebGL screenshots and renderer metrics at same settings on Garage, Coast, Sky Spiral and World Tour; include desktop/phone and NITRO/FLY/landing.
- [ ] Confirm existing physics/animation contract assertions and shader warmup/black-frame tests stay meaningful.
- [ ] Commit tests and baseline documentation; no production engine change yet.

## Task 2 — Upgrade to Three.js r186.1 with aligned types and stable WebGL

**Files:** package.json, package-lock.json, src/world.js (only if required), targeted imports/shader files identified by audit, tests/three-version-contract.test.js, tests/shader-safety.test.js.
**Produces:** r186.1 WebGL app matching baseline and production bundle, no stale r180 types.

- [ ] Review the 180→186 official migration guide and docs/designs/3d-pipeline/threejs-r180-r186-migration.md with concrete repo import search.
- [ ] RED-first: keep tests that expose r180 vs r186 incompatibility (such as expected version and API use). Observe expected failure, not a test typo.
- [ ] Set three exactly 0.186.1, align @types/three release in devDependencies and remove hardcoded @types/three@0.180.0 dynamic installs from typecheck scripts. Update package-lock and validate clean npm ci.
- [ ] Fix only breaking runtime APIs and image changes; preserve WebGLRenderer, HalfFloat MSAA, bloom finite-pixel guard, shader warmup and one shared Garage context. Do not casually migrate to WebGPU or TSL.
- [ ] Run focused tests, npm run typecheck, npm test, npm run build, browser shader/black-frame/road/garage tests until green; resolve discovered failures.
- [ ] Compare true WebGL screenshots, shader-program counts, draw calls, triangle counts and frame p50/p95 with r180 baseline. Record deviations and owner-facing material decisions.
- [ ] Run make verify and full exact-HEAD quality-gate (trigger [full-regression] on feature branch as appropriate); do not declare pass if queued, skipped-required or red. Commit only validated diff.

## Task 3 — GLB pipeline MVP, licensing and asset loader

**Files:** scripts/assets/ (planned Blender export / glTF Transform CLI scripts); src/asset-model-loader.ts (planned), src/model-manifest.ts (planned), tests/model-asset-loader.test.js (planned), tests/model-manifest.test.js (planned), public/models/ (validated outputs only), assets-src/ (masters); src/world.js minimally for staged adapter.
**Produces:** manifest-defined, preloaded game model with fallback, predictable decoder/asset lifetime and GitHub Pages subpath support.

- [ ] First write RED tests for missing/slow/invalid GLB, decoder unavailability, exact node names, duplicate request deduplication, cancellation, ownership and disposal.
- [ ] Specify minimal manifest and async loader contracts (avoid speculative factory abstractions). Define: asset ID → URL, source SHA/license, node names, LOD references, fallback type, material set and asset provenance.
- [ ] Implement a single GLTFLoader backend, opt-in KTX2Loader/MeshoptDecoder/DRACOLoader only if encoded assets require them, using import.meta.env.BASE_URL paths.
- [ ] Author reproducible Blender .blend + Python source, glTF Transform inspect/optimize step with triangle, texture and animation/names integrity checks. Keep source material legally auditable.
- [ ] Add camera-switch, quality-change, track-switch and context-loss lifecycle tests; prewarm all material/shader variants before mid-race use.
- [ ] Observe GREEN, test real WebGL Garage load/fallback and browser console, run focused and full checks; report actual packaged asset sizes and metrics.

## Task 4 — Reference-led high-fidelity Roadster in Garage

**Files:** assets-src/roadster2/ (planned), public/models/cars/ (planned), src/car-model.js, src/garage-stage.ts, src/roadster-fidelity.js for procedural fallback only, tests/roadster-fidelity.test.js, tests/garage-*-browser.spec.js.
**Produces:** real GLB-based hero car demonstrably matching approved front/side/rear reference while maintaining game controls and vehicle attachments.

- [ ] Read all docs/designs/roadster2-reference/ photographs, Garage visual contract and active roadster feature branch; reconcile its completed diff before editing any shared car file. Do not overwrite branch work.
- [ ] RED tests for named four independent wheels, active wing, exact original VFX ports/collision frame/paint targets, fallback and camera visibility.
- [ ] Use installed Blender MCP and image-to-3D Skill (proven available in Task 0) to sculpt car in visually gated iterations. Export front, side, rear and rear-quarter same-camera comparisons; inspect body panel smoothness, lamp shapes, five-blade wheels and quad dark recessed thrusters.
- [ ] Rig/animate only visual pivots, use PBR and HDRI with explicit environment license, run GLB validation/LOD optimization. Test paint selection without affecting ownership.
- [ ] Deploy only after all RED→GREEN and Garage/race/flight/BOOST/NITRO screenshots, performance and exact-HEAD CI evidence; obtain owner visual sign-off for fidelity.

## Task 5 — Coast road UV, PBR and streaming pilot

**Files:** src/geometry.ts (roadRibbon UV), src/world-tour-scene.js, src/track-palettes.ts, src/coast-visuals.ts, src/world-tour-scenery.js, tests/phase4-road-materials.test.js and new UV seam test.
**Produces:** PBR asphalt/shoulder/track objects at Coast with unaffected track frame, lanes and collisions.

- [ ] RED tests for UV continuity across moving road ribbon/chunks, correct tangent-space orientation, road widths, world-frame transforms, track switch and collision/vehicle-road clearance parity.
- [ ] Add UV0 and safe road PBR texture assignment with per-quality resources; static terrain props may use an authored GLB with existing deterministic 120 m chunk placement/InstancedMesh.
- [ ] Validate asset stream eviction and no duplicate draw calls; preserve Low visuals and proper renderer ownership.
- [ ] Real WebGL screenshots/draw and p50/p95 tables across Coast rain/day and other ten tracks; verify drift, flight/landing and ramps.
- [ ] Full verification and exact-HEAD CI, no silent map topology changes.

## Task 6 — Five new tracks adopt shared pipeline and optional showcase/cover

**Files:** shared loader/manifests established in Task 3; branch-specific scene modules only with owner approval, per-track visual assets, existing showcase modules and tests.
**Produces:** reusable, measured visual assets for Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown and Stormline Megacity.

- [ ] Wait until shared pipeline is validated and integrated according to repository branch policy. Don't change sibling map branches from this working branch.
- [ ] Define each map's unique foreground landmarks, reference images, licensed texture sets, world-space scale and deterministic chunk/LOD budgets with its owner.
- [ ] Use reference-led Blender models only for major nearby features and hero landmarks; farther scenery retains low-cost procedural geometry and correct occlusion.
- [ ] Add per-map parity tests for course frames, checkpoints, collisions, flying shortcuts and no missing GLB or pipeline stall. Test weather/fog and game speed separately.
- [ ] Build actual running-game captures for launch/cover assets. Generated concept images can remain mood-board only; label separate from WebGL proof.
- [ ] Measure tier-by-tier across Mac/phone and exact-HEAD CI, review source asset licensing and owner art approval.

## Final review and handoff
- [ ] Compare every section of design spec, migration doc and toolchain preflight against this plan; verify task coverage.
- [ ] Provide branch HEAD SHA, diff summary, installed-global-tools PASS/FAIL evidence from user's Mac, unit/typecheck/build/CI results, screenshots and remaining manual gates.
- [ ] No PR, no auto-merge to develop/main, no deployment or release. Wait for owner instruction after planning and each integration gate.
