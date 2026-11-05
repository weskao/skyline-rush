# Five Playable Courses — Source Import and Runtime Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox `- [ ]` syntax for tracking.

**Goal:** Bring five new authored point-to-point courses into Skyline Rush's existing RaceFactory, physical simulation, eight-car AI, and renderer without corrupting existing tracks.

**Architecture:** Selectively import source-owned course geometry, graph, scenery, and test Git blobs; keep shared runtime owned solely by `feature/epic-multiroute-longform-tracks`. Adapt each source's immutable authored graph to `CourseGraph` and consume the single existing renderer, race state, physics, player, AI, checkpoint, and results pipeline. Preserve Coming Soon until complete manual and CI acceptance.

**Tech Stack:** Vue 3, TypeScript strict, Three.js, node:test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-playable-coursegraph-contract.md`; `.claude/rules/playable-course-shared-template.md`.

## Global Constraints

- Writable branch: `feature/epic-multiroute-longform-tracks` only. Never write to five source branches, `develop`, `main`; no PR, deployment, force push or reset.
- Five source branches: `feature/playable-dune-tempest`, `feature/playable-monsoon-ruins`, `feature/playable-skyfall-archipelago`, `feature/playable-volcanic-crown`, `feature/playable-stormline-megacity`.
- Use source-owned `src/courses/**` and associated tests only. Do not overwrite shared `src/course-*.ts`, `src/world.js`, `src/main.js`, `src/game.js`, common UI, or the original ten tracks.
- Existing `src/upcoming-tracks.ts` `PLAYABLE_PREVIEW_IDS` stays empty and all Coming Soon IDs remain blocked until functional race acceptance.
- Source branch HEADs reviewed at import: Dune `25964bc`, Monsoon `00f6305`, Skyfall `c513700`, Volcanic `d3e356f`, Stormline `7e55474`. Source exact-HEAD workflow success is *focused only*: Browser/World Tour skipped. Not final full CI proof.
- CI must be exact-HEAD, not previous HEAD; never use skipped/pending as pass. Use `[full-regression]` on necessary new target commits.

## Review Focus

1. A flight shortcut cannot skip mandatory checkpoint/finish or teleport between edge layers: signed 3D swept gate tests.
2. A grounded car must stay on actual curved/banked road surface at 30/60/120 fps: contact and interpolation tests.
3. All eight cars must independently select legal forks, avoid physical hazards, recover and rank reliably: graph fleet/AI tests.
4. Existing ten tracks, Garage/Preview Studio and Coming Soon cannot accidentally change: old-route/CTA browser regressions.
5. Desktop/phone geometry, time-separated WebGL frames, reduced-motion/quality and GPU disposal cannot be inferred from concept JPEG: capture actual evidence.

---

### Task 1 — Selective source import (integration owner)
- [x] Review source HEAD, exact-HEAD focused CI, source module dependency lists, 18 map-specific source modules and 28 source test files.
- [x] Preserve import blobs byte-identical; do not merge the older source histories or shared files.
- [ ] Verify the resulting import commit's `npm test`, `npm run typecheck`, `npm run build`, Browser 13/13, World Tour 5/5, cloud and quality-gate using exact-HEAD GitHub Actions.
- [ ] Repair errors on integration branch only; preserve source files' provenance and record any necessary compatibility fixes.

### Task 2 — Five canonical CourseGraph adapters (map-owned interfaces, integration branch)
- [ ] TDD RED for map-specific normalization, checkpoint topology, ordered mandatory nodes, safe all-ground route, safe flight split/merge, exact physical lengths.
- [ ] Implement adapters reusing `validateCourseGraph`, `routeLength`, `sampleRoute`, source data, and existing Skyfall/Stormline graph exports where suitable; no second engine.
- [ ] RED→GREEN in `tests/*course*-graph.test.js` and targeted mapping tests; do not register races.

### Task 3 — Trusted physical simulation integration (shared owner)
- [ ] TDD trusted before/after world-pose stepping from `game.js` to existing `course-measured-motion.ts`, `course-travel.ts`, `course-signed-gates.ts`; reject fake or out-of-order checkpoints, wrong altitude and unsafe landing.
- [ ] Wire the canonical physical route frame into collision/terrain, NITRO, FLY/takeoff/landing, recovery, finish and results; preserve every legacy race's behavior.
- [ ] Verify 30/60/120 Hz equivalence, no per-frame geometry allocation and no race unlock.

### Task 4 — Shared rendering, fleet, AI, HUD, and persistence (shared owner)
- [ ] Use one existing `#world` renderer, shared car and camera, map-owned streaming chunks; update scenery via quality/reduced-motion, dispose on switch.
- [ ] Adapt shared eight-car AI branch navigation, route-layer-aware collision, standings, HUD/minimap and point-to-point progress.
- [ ] Keep daily/cup/ghost/save isolated until testable compatible versions, no silent enabling.

### Task 5 — Manual acceptance and staged unlock (integration owner)
- [ ] Exact-HEAD Full CI unit/typecheck/build, 13 browser shards, 5 World Tour shards, Cloud Save and Quality Gate success; run `make verify` and Playwright where available.
- [ ] Five complete real START→FINISH races, each ground and flight path, checkpoint order, eight-car AI, recovery, result and device controls.
- [ ] Real desktop 1440×900 and phone 390×844 WebGL screenshots at two times for each scene; compare two original JPEGs; measure frame times, draw calls, GPU disposal, Low/Medium/High and Reduced Motion.
- [ ] Only after acceptance, enable approved development-only play through the existing access gate; keep production Coming Soon until separately authorized.

**Current outcome:** Source-owned course files and tests are imported as non-runnable candidates. Shared RaceFactory/physics/AI/world wiring and physical gameplay acceptance remain open. This import alone is NOT completion or human play-test readiness.
