# npm → pnpm Migration Implementation Plan

> **For agentic workers:** Execute incrementally with regression-first testing and verification before completion.

**Goal:** Convert Skyline Rush development, CI, tools, and release commands to pnpm without changing game behavior.

**Architecture:** Pin pnpm in package.json, move package-manager policies to pnpm-workspace.yaml, generate a real lockfile with pnpm import, and migrate all executable scripts and GitHub Actions. Keep npm only as an intentional compatibility fallback when benchmarking an older npm-only Git reference.

**Tech Stack:** Node.js 22+, pnpm 11.28.13, Vue, Vite, Playwright, Firebase emulator, GitHub Actions.

**Spec:** User's 2026-11-22 request: migrate npm to pnpm, including Makefile and every CI job, deeply review, repair issues, and work on a dedicated develop-based branch.

## Global Constraints

- Base branch: develop; target: feature/pnpm-migration. Do not merge or open a PR.
- Do not change gameplay, unlock policy, published release logic, or production assets.
- Keep pnpm-lock.yaml authoritative; frozen lockfile installation in CI.
- Preserve package aliases, dependency overrides, approved dependency build scripts, historical performance baselines, and browser prebuild behavior.

## Review Focus

- pnpm 11 does not assume npm's implicit pretest:browser hook; browser build must remain explicit.
- The Crucible npm alias and pinned Three.js must resolve together.
- Native binaries like esbuild must be permitted to run install scripts.
- Preview/browser and cloud-save commands must start the correct server.
- Release gates must recognize pnpm-lock.yaml and not widen allowed release-only file changes.

## Tasks

### Task 1: Package metadata and lockfile
- [x] Add pinned packageManager, translate overrides/build policy, remove npm-only settings.
- [ ] Produce actual pnpm-lock.yaml from existing lock with pnpm import using a connected GitHub runner.
- [ ] Confirm pnpm install --frozen-lockfile on Linux from a clean checkout.
- [ ] Remove obsolete package-lock.json only after the replacement passes.

### Task 2: Toolchain entry points
- [x] Update Makefile and browser-script lifecycle semantics.
- [ ] Replace npm/npx in executable scripts, hooks, browser servers, and release commands.
- [ ] Add executable regression assertions and verify they fail before fixes, then pass.

### Task 3: CI / docs / review
- [x] Switch primary CI install/cache to pnpm; adapt independent artwork CI workflows.
- [ ] Sync README/CLAUDE guidance with commands and install expectations.
- [ ] Run unit, typecheck, build, cloud-save and browser verification where feasible.
- [ ] Review the branch diff for leftovers; fix critical findings.
- [ ] Delete temporary bootstrap workflow; keep target branch separate from develop.
