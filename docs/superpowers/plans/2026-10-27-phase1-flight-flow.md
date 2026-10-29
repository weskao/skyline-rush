# Phase 1 Flight and Combo Flow — Implementation Plan

**Goal:** Make ground-to-air racing feel more continuous without replacing existing NITRO, FLY, DRIFT, trick, record or mode systems.

**Architecture:** Keep deterministic flight and landing rewards in `src/game.js`; use the existing localized, queued `src/callouts.ts` UI for feedback. No new dependencies, settings screens or unbounded particle systems. Coast is the initial feel benchmark; all modes retain existing restrictions.

**Tech stack:** JavaScript simulation; TypeScript UI/service boundaries; Node test runner, Playwright, GitHub Actions.

## TDD checkpoints

- [ ] RED: Unit tests expect a conservative FLY drain of 15/s and AIR DASH combined drain of 18/s (from 19/s and 22/s), independent of rendering.
- [ ] GREEN: Update shared simulation constants/logic; adjust existing assertions to the approved contract without removing tests.
- [ ] RED: Unit tests require an earned one-time clean-landing speed bridge after a meaningful powered flight with NITRO; reject ordinary flights, bad landings, no-flight and duplicate awards.
- [ ] GREEN: Reuse existing mini-boost, preserving drift/trick awards and result eligibility, without adding persistent player data.
- [ ] RED: UI feedback test checks that a newly earned chain is announced once and translated in en/zh-TW using the existing callout queue.
- [ ] GREEN: Reuse callout UI, add locale keys, avoid a new overlay or new HUD state owner.
- [ ] Verify: `npm test`, `npm run typecheck`, `npm run build`, browser/Cloud Save/World Tour and full exact-HEAD quality gate; do not claim manual phone acceptance without real device evidence.
- [ ] Record any skipped gates; only then update the Phase 1 checkbox on the feature branch and prepare for a *separate* merge decision.

**Balance acceptance:** Comparable, deterministic state at common simulation time steps; no scoring/record regression, unlimited landing bonus farming, or unintended modifier bypass. Keep existing 10 tracks, Ghost and local/cloud results compatible.

**Scope:** Phase 2 Coast art and Phase 3 FPS adaptation stay separate; do not modify them here.
