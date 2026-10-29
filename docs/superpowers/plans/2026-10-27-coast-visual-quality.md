# Coast Visual Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Coast a visually cohesive, device-scaled benchmark without replacing the renderer or changing gameplay.

**Architecture:** Existing scene materials, shaders and camera contract remain in `src/world.js`. A small typed Three.js scenery kit uses three instanced meshes and tile-stable transforms; the `?perf` QA display exposes render load data without changing regular game UI.

**Tech Stack:** Vue 3 + strict TypeScript, Three.js, native Node test runner, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-27-coast-visual-quality-design.md`

## Global Constraints
- Do not implement Phase 1 gameplay or Phase 3 target FPS.
- No added packages, dynamic shaders/lights or new render passes.
- Preserve all non-Coast tracks, locales, reduced motion, cloud data, audio and controls.
- No `[x]` unless that specific acceptance has an observed verification result.

## Review Focus
- During a tile wrap, scenery already visible near the player must not jump.
- Coast props must stay outside the player, showcase cameras and drivable road.
- Low/Medium/High maintain stable draw submissions and correct mesh counts.
- Other tracks reset all material properties modified for Coast, including after track switches.
- QA-only instrumentation must not add frame-loop allocations or alter normal FPS settings.

---

### Task 1: Coast scene contract (RED → GREEN)
**Files:** `tests/coast-visuals.test.js`, `src/coast-visuals.ts`, `src/world.js`.
- [ ] Write deterministic tests for bounded Three.js instancing, quality tiers, tile stability and road-side clearance; assert a palette and surface contract.
- [ ] Run `npm test` on tests-only revision and observe the intended failure.
- [ ] Implement the minimal typed scenic kit and integrate Coast-only material/lighting/water adjustments.
- [ ] Run `npm test`, `npm run typecheck` and `npm run build`; commit when verified.

### Task 2: Real WebGL and performance evidence
**Files:** `tests/coast-visual-browser.spec.js`, `src/world.js`, `src/main.js`, `.github/workflows/ci.yml`.
- [ ] Add browser capture for 1440×900, 390×844, 320×740, 844×390; screenshot real Coast showcase and active race.
- [ ] Capture and report `?perf` p50/p95/FPS plus render draw calls and triangle count. Save artifacts on CI for exact commit.
- [ ] Verify six showroom camera modes and main chase/cockpit views, quality presets, reduced motion, EN/zh-TW; record gaps.
- [ ] Compare the same measurement protocol before/after; don't invent deltas.

### Task 3: Regressions and merge gate
**Files:** `TODO.md`, evidence notes.
- [ ] Run strict typecheck, unit, build, layout, browser, World Tour and Cloud Save with fresh results.
- [ ] Confirm last feature HEAD `quality-gate` success, fetch latest main and resolve any divergence.
- [ ] Direct-merge only with verified gates; otherwise preserve this branch and list outstanding checks.
