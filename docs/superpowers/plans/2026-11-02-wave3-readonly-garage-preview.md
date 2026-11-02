# Wave 3 Garage Read-only Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans; write BDD tests first, then implementation, then exact-HEAD verification.

**Goal:** Upgrade existing static source galleries into accessible read-only category browsing and details without activating Missions/Store functionality.

**Architecture:** Reuse existing artwork tiles; a typed catalog provides localized source descriptions and grouping. Shared Vue gallery is compiled on both existing feature branches and is closed by default. Never add new global state or business transactions.

**Tech Stack:** Vue 3 + strict TypeScript, Node test runner, Playwright; existing 3× WebP source only.

**Spec:** docs/superpowers/specs/2026-11-02-wave3-readonly-garage-preview.md

## Tasks

- [ ] **RED:** `tests/garage-wave3-preview-catalog.test.js` asserts all 8+6 source IDs, 3× pixel/display sizing, localized metadata, filters and disjoint groups; `tests/garage-wave3-preview-browser.spec.js` asserts selection, keyboard, responsive layout, dual-language, image fallback and no actionable Buy/Claim.
- [ ] **Verify RED:** run Node test against missing catalog and Playwright against static art gallery. Save observed failures; no claims until actual runner output.
- [ ] **GREEN:** implement `src/garage-wave3-preview-catalog.ts` and upgrade `src/GarageSourceArtGallery.vue`. Preserve original `#garage-art-source-*` and all original image count and native width assertions.
- [ ] **REFACTOR:** use the same exact Git blobs for catalog+Vue component in Rewards and Store branches. Do not duplicate visuals or images. New artwork unnecessary.
- [ ] **Verify:** `npm test`, `npm run typecheck`, `npm run test:browser` and `make verify` if a local clone exists; otherwise leave unverified and use each branch's exact HEAD Actions full quality gate; inspect screenshots in 390×844, 844×390, 1440×900.
- [ ] **Gate:** screenshots/real-device/manual acceptance and dependency integration are separately required before merging either feature into develop.

## Review focus

1. Disabled store must never expose fake checkout or price or an enabled Buy action.
2. Rewards gallery must not show fake settlement/claim/progress.
3. Keyboard selection/locale updates must not break after changing tabs.
4. Missing WebP must fall back to human-readable text at native 1× display.
5. Existing paint controls and Garage dialog remain usable and unchanged.
