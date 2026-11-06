# Skyline Rush — Stage 2 Five Tracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Later implement five additional graph-based 3–5 minute point-to-point worlds with two committed JPEG concept views per track.
**Architecture:** Reuse the Stage 1 opt-in CourseGraph and world sampling frame, layered terrain and checkpoint system; contribute five independent authored map definitions, unique scenery/weather kits and verified 3D previews, without modifying original tracks.
**Tech Stack:** Vue 3, strict TypeScript, Three.js, current Node tests, Playwright, GitHub Actions.
**Spec:** `docs/superpowers/specs/2026-11-02-stage2-five-longform-tracks-design.md`

## Visual signoff dependency

For each of the five Stage 2 course slices, before claiming visual completion follow [the shared ten-map JPEG-to-WebGL acceptance gate](../../designs/new-tracks/visual-acceptance-gate.md). Start from the two actual committed Stage 2 JPEG references, route SVG and deterministic camera/world pose; compare two real WebGL camera views on desktop and mobile against scenery composition, weather, road openness and landing/branch readability. Record PASS / FAIL / APPROVED DEVIATION with screenshots; visually appealing concept art is not proof of runnable quality or true native 3× resolution.

## Global Constraints

- All five maps are **point-to-point**, different START/FINISH, no laps, each has at least 2 hairpins, 3 branching choices, safe ground completion, one optional aerial route and natural broad driving zone.
- Codebase references: `src/race-tracks.ts`, `src/track-paths.ts`, `src/game.js`, `src/world-tour-scene.js`, `src/route-map.ts`, `src/race-visuals.ts`. Reuse Stage 1 graph/terrain rather than duplicating logic.
- All 10 Stage 2 JPEGs are actual committed concept files in `docs/designs/new-tracks/stage-2/source-concept-jpeg/`; art/camera requirements in `docs/designs/new-tracks/stage-2/visual-fidelity.md`. Images are enlarged crops from a composite, *not native true-3× textures*.
- Read `CLAUDE.md` and current `.claude/rules/vehicle-road-stability.md` before geometry/physics edits. No unreviewed dependency changes, no silent schema replacement, no PR or merge until authorized.
- Use RED→GREEN→Refactor per course, real browser WebGL screenshots, Low/Medium/High + Reduced Motion, `make verify`, exact-HEAD CI. Manual physical-device signoff remains human-owned.

## Review Focus

1. At sky/underwater multi-level crossings, a car on one edge cannot receive collisions or checkpoints from another branch.
2. All-weather visual layers leave 3 seconds of visible reaction distance before turns and gates.
3. A player can fail an aerial shortcut and recover to the last safe valid checkpoint without teleporting through scenery.
4. At 30/60/120 Hz, hairpin turns keep finite frames, smooth vehicle rotations and safe landings.
5. New track/ghost keys cannot migrate or overwrite any of the first 10 sprint maps or Harbor Circuit data.

---

### Task 1 — Stage 2 contract and asset validation

**Files:** create `src/courses/stage2-catalog.ts` and `tests/stage2-catalog.test.ts` (or follow project test conventions); reference 10 JPEGs and 5 schematics under `docs/designs/new-tracks/stage-2/`.

**Interface:** `stage2Tracks: readonly Stage2CourseBrief[]` with stable ID, expected length, type=`point-to-point`, distinct start/finish nodes, 2 JPEG references and route graph identity.

- [ ] RED: verify five unique IDs, 10 JPEGs all exist, 5 route diagrams exist, unique finish IDs, no lap-counted mode, correct locale strings and race-target ranges.
- [ ] GREEN: typed catalog, no dynamic assets emitted in runtime bundles from docs; green focused tests and typecheck.
- [ ] Refactor, commit, no production registration until geometry validation.

### Task 2 — Frostbite Canyon / 極地冰原峽谷 (S2-P1)

**Files:** add isolated `src/courses/frostbite-canyon.ts`, `tests/frostbite-canyon.test.ts`, scene module only if shared kit insufficient.

- [ ] RED: 13.8 km target; reachable open canyon + grounded ice course; ≥2 hairpins / ≥3 choices; airborne ice-bridge split lands on valid edge, 8-car AI can follow both.
- [ ] GREEN: snow/ice terrain, distant glacier walls and quality-scaled powder/whiteout; test weather transparency and old-track parity.
- [ ] Capture desktop/phone ground vs air views and compare with corresponding JPEGs; measure 3–5 minute finished-session median (pending until samples).

### Task 3 — Abyssal Ruins / 深海遺跡城 (S2-P1)

**Files:** `src/courses/abyssal-ruins.ts`, `tests/abyssal-ruins.test.ts`, shared undersea scene module only.

- [ ] RED: seal integrity of upper pressure tunnel, legal lower ground road, bifurcation and rejoin, no flight-through-shell or illegal checkpoint crossing.
- [ ] GREEN: transparent undersea tunnel, coral ruin backdrop, bounded fish/bubble instancing and caustics; **no swimming/pressure physics**.
- [ ] Capture genuine ground/air screenshots vs both JPEGs; run Low and Reduced Motion visibility tests.

### Task 4 — Windspire Highlands / 風之高原 (S2-P1)

**Files:** `src/courses/windspire-highlands.ts`, `tests/windspire-highlands.test.ts`.

- [ ] RED: open natural grassy terrain / 2 mountain hairpins / 3 choices, safe no-flight pass, repeatable 30/60/120 FPS wind forces or visual-only wind.
- [ ] GREEN: stone-bridge and turbine landmarks, seeded grass/debris particle pool and visibly marked crosswind; ensure AI safe alternative.
- [ ] Capture actual scene and report ground/air JPEG comparison and measured duration.

### Task 5 — Crystal Stardust Valley / 水晶星塵谷 (S2-P2)

**Files:** `src/courses/crystal-stardust-valley.ts`, `tests/crystal-stardust-valley.test.ts`.

- [ ] RED: separate high crystal span vs ground mineral canyon, branch merge and no hidden clipping at luminous arches, legible hairpin markers.
- [ ] GREEN: instanced iridescent crystal rocks and bounded emissive/bloom, no excessive mobile GPU passes.
- [ ] Compare real WebGL to both JPEGs, examine road and HUD readability across quality settings.

### Task 6 — Chrono Rift / 時空斷層 (S2-P2)

**Files:** `src/courses/chrono-rift.ts`, `tests/chrono-rift.test.ts`.

- [ ] RED: portal visuals cannot teleport/farm reward/finish, legitimate flying branch and ground route with graph continuity, no loop lap.
- [ ] GREEN: original fractured stone architecture, portal particle/event cues, safe sky fall/reset volumes.
- [ ] Capture comparison to 2 committed JPEGs and verify accessibility for flash-sensitive and reduced-motion players.

### Task 7 — Integration, localization and evidence (S2-GATE)

**Files:** track registry/selector and locale modules, `src/route-map.ts`, race-mode/ghost serialization, new browser suites and docs evidence.

- [ ] RED: ten original sprints + Stage 1 proposals unaffected; five new options show `起點 → 終點`, one finish, no lap counter, accurate fork markers and unknown secret-shortcut policy.
- [ ] GREEN: replay/AI/save and new topology version, no layout/asset regressions; only then expose tracks in intended game modes.
- [ ] Real-WebGL captures for 10 Stage 2 camera cases × desktop/mobile, maintain side-by-side JPEG comparison table with APPROVED DEVIATION when appropriate.
- [ ] Measure frame p50/p95, draw calls, GPU resources, 20+ finish times/course; tune gameplay so typical target duration is 3–5 min rather than claiming it solely from length.
- [ ] Run targeted suites, `npm test`, `npm run build`, Playwright, `make verify`, exact-HEAD full CI; request explicit merge authorization into `develop`. Never claim device tests or CI green before real receipts.

