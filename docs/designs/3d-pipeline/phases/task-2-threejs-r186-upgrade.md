# Task 2 — Upgrade to Three.js r186.1 with aligned types and stable WebGL

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec Phase 1 · Migration detail: [../threejs-r180-r186-migration.md](../threejs-r180-r186-migration.md) · Scope tags: [README.md](README.md).

**Files:** package.json, package-lock.json, src/world.js (only if required), targeted imports/shader files identified by audit, tests/three-version-contract.test.js, tests/shader-safety.test.js.
**Produces:** r186.1 WebGL app matching baseline and production bundle, no stale r180 types.

## By project (committed once)
- [ ] Review the 180→186 official migration guide and the migration doc with concrete repo import search.
- [ ] RED-first: keep tests that expose r180 vs r186 incompatibility (such as expected version and API use). Observe expected failure, not a test typo.
- [ ] Set three exactly 0.186.1, align @types/three release in devDependencies and remove hardcoded @types/three@0.180.0 dynamic installs from typecheck scripts. Update package-lock and validate clean npm ci.
- [ ] Fix only breaking runtime APIs and image changes; preserve WebGLRenderer, HalfFloat MSAA, bloom finite-pixel guard, shader warmup and one shared Garage context. Do not casually migrate to WebGPU or TSL.
- [ ] Run focused tests, npm run typecheck, npm test, npm run build until green; resolve discovered failures with one shared fix, never a per-device workaround. Run `python3 scripts/three-pipeline/phase1_project_check.py` (P0 rebase pull, P1 `npm ci`, P2 contract test, P3 typecheck, P4 `npm test`, P5 build; `--steps P2,P3` for a subset). AI agents may execute it directly without asking: it never commits or pushes, and stops at the first FAIL.
- [ ] After the bump, re-read `~/.claude/skills/threejs-*` against r186.1 and record which examples now apply.
- [ ] Commit only validated diff, then the full exact-HEAD quality-gate (trigger [full-regression] on feature branch as appropriate); do not declare pass if queued, skipped-required or red.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] `git pull` + `npm ci`; confirm Node satisfies `>=22.12.0` on that machine.
- [ ] Browser shader-warmup/black-frame/road/garage specs and `make verify` green on that machine.
- [ ] Compare true WebGL screenshots, shader-program counts, draw calls, triangle counts and frame p50/p95 with that same device's Task 1 baseline. Record deviations and owner-facing material decisions (public-safe summary in repo, raw per-device numbers in `../audits/`).
