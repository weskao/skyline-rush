# Skyline Rush v0.29.0 — Wave 3 Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development and superpowers:test-driven-development. Each checkbox requires observed RED and GREEN evidence, not merely authored tests.

**Goal:** Finish the Wave 3 Garage Economy Foundation, Rewards & Missions, and Store Readiness without inventing paid ownership, currencies or incomplete achievements.

**Architecture:** Reuse the v0.29.0 Vue 3, TypeScript and Three.js Garage surface, existing account-scoped Skin Session, race-results, history and Cloud Save contracts. Keep any reward/payout authority on an authenticated backend; a browser-only preview cannot issue grants. A feature-branch merge into develop is a separate explicit gate.

**Tech Stack:** Vue 3, strict TypeScript, native Node test runner, Playwright, Firebase Auth/Firestore rules/transaction or Functions (if approved), Vite, GitHub Actions.

**Specs:**
- `docs/superpowers/specs/2026-10-31-garage-economy-foundation-design.md` on `feature/garage-economy-foundation`
- `docs/superpowers/specs/2026-10-31-garage-rewards-and-missions-design.md` on `feature/garage-rewards-and-missions`
- `docs/superpowers/specs/2026-10-31-garage-store-readiness-design.md`
- `docs/garage-release-policy.md`

## Global constraints

- Baseline: `develop` at `474d484b3fdec75a07b3fd968bd0b341b7e6eff5`, package version `0.29.0` at task start. Re-fetch `develop` before any further merging.
- Write only within the owned feature branch. No PR, force push, deployment, change to `main`, or merge into `develop` without a separate explicit authorization.
- Retain all v0.29.0 functionality and existing Garage VFX Phase B trial behavior. No cosmetic effect may alter speed, physics, track unlocks or PAINTS stars.
- No approved pricing, soft-currency earn/spend rates, timeboxed premium offer, wallet or real-money checkout. **Never fake or enable those.** Leave economic release steps blocked until product policy, backend authority and platform compliance are approved.
- Read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/ci-gates.md` and relevant file-scoped rules before edits.
- Source 3× WebPs already exist in the v0.29.0 tree. Preserve source dimensions (Rewards: 288×288 displayed at 96×96 CSS; Store: 216×216 displayed at 72×72 CSS). Use `import.meta.env.BASE_URL`, alt/text fallback, focus and ≥44 CSS-pixel controls.
- RED → GREEN → Refactor per behavior, then `npm test`, `npm run typecheck`, `npm run build`, `make verify`, actual mobile/desktop visual evidence and exact-HEAD full CI. A focused green feature CI where browser/World Tour was skipped is not a full pass.
- Do not modify `TODO.md` checkboxes to complete until required actual test and manual visual proof is attached. Link exact test command, SHA and CI run.

## Review focus and required evidence

1. **Client-forged ownership:** fake localStorage and user-supplied cloud payload must never grant paid cosmetics. Assert denial in Skin Session/Firestore emulator tests.
2. **Double settlement:** two devices/reconnects racing to settle the same completion ID must commit no more than once. Assert this with an atomic server transaction and replay.
3. **Cross-account leaks:** sign-out/sign-in A→B must not expose A's owned skins, payouts, missions or remembered selection. Assert both UI and Firestore rules.
4. **Offline/failed settlement:** no award amount/claim success/available currency while pending, failed or offline; retry can eventually succeed once.
5. **Visual claims:** low quality, reduced motion, missing 3× image, localized strings and phone landscape must retain real functional labels, ≥44px hit areas and no road/vehicle occlusion.

---

### Task 1: Economy Foundation — authoritative state boundary

**Branch:** `feature/garage-economy-foundation`

**Files:** `src/garage-skin-catalog.ts`, `src/garage-skin-session.ts`, `src/cloud-progress.ts`, `tests/garage-skin-session.test.js`, `tests/cloud-progress.test.js`.

**Interfaces:** Continue `normalizeSkinProfile(raw, accountId)`, `createGarageSkinSession(accountId, now, initial)`, `skinCloudPayload(profile)`. New state may be added only if needed by a separately accepted server contract.

- [ ] Write failing tests for legacy PAINTS migration, invalid versions/IDs, expired trial, same-client forged owned item, account switches and browser storage failure; record observed RED.
- [ ] Implement the smallest change without accepting an unverified permanent grant. Reuse existing session/preference helpers and document any remaining *server* ownership gap.
- [ ] Run focused tests → all unit tests → typecheck and build. Record commands/results/commit, only then mark GREEN.
- [ ] Add authoritative backend entitlement validation only after policy review and independent Firebase rules/Functions test. Client profile parsing is not verification.

### Task 2: Rewards — verified completion boundary and deduplication

**Branch:** `feature/garage-rewards-and-missions`

**Files:** `src/garage-settlement-gate.ts`, `tests/garage-settlement-gate.test.js`, eventual server source/rules tests.

**Interfaces:** `createGarageSettlementGate(verify?: CompletionVerifier).settle(accountId, completionId)` returns `{status, award:null}`; `verified` currently means only authoritative proof accepted, **not** credits paid.

- [x] Added fail-closed, concurrent in-memory duplicate / account-isolation / invalid proof tests and settlement verifier adapter (commits `7b04c00f`, `33775a0f`). Standalone Node 22 focused test observed GREEN; main repo CI still pending.
- [ ] Reject tutorial, practice, cancelled results and uncertain race completion at the *real* server-side verification boundary. Assert replay via two clients and reconnect.
- [ ] Persist exactly-once settlement server-side in an authenticated atomic transaction (e.g. `(uid,completionId)` unique key). This is **not complete** with the in-memory Set.
- [ ] Write Firestore emulator tests for forged completions, cross-user reads/writes, two concurrent requests, rejected/offline transaction and account deletion/recovery before adding a UI that says award claimed.
- [ ] Implement nonzero payouts only after explicit earn rates and economy sign-off; prior to this, expose no wallet/credits/claim CTA.

### Task 3: Rewards — podium results and mission progress

**Branch:** `feature/garage-rewards-and-missions`

**Files:** `src/finish-placement-badge.ts`, `src/result-screen.ts`, `tests/finish-placement-badge.test.js`, `tests/result-screen.test.js`, `src/GaragePanel.vue`, `src/GarageSourceArtGallery.vue`.

- [x] Added bilingual Gold/Silver/Bronze **display-only** badge resolver and Classic result-row integration; does not grant a trophy or award (commits `cfe0a1fa`, `83ea7ab3`, `c81a00bc`, `5ad6359f`). Standalone pure helper tests passed; actual browser validation and full suite outstanding.
- [ ] RED tests for verified eligible race events, daily and weekly mission goals, versioned mission IDs, UTC reset boundaries, repeated results and cross-account state; derive progress only from verified results, not preformatted image cards.
- [ ] Implement real mission progression after authority is available, using the smallest typed event adapter; persist server-authoritative counters idempotently, include pending/failed states and no promise of payout.
- [ ] Add real result/mission UI only when those counters exist; keep current eight-card `GarageSourceArtGallery` visually tagged as **concept art** until real progress is wired.
- [ ] Test every English/Traditional Chinese display, desktop 1440×900, phone portrait 390×844 and landscape 844×390, reduced motion and missing assets. Capture genuine screenshots/video.

### Task 4: Store Readiness — safe nontransactional preview

**Branch:** `feature/garage-store-readiness` (created from `develop` because it was absent)

**Files:** `src/garage-store-readiness.ts`, `src/GarageSourceArtGallery.vue`, `tests/garage-store-readiness.test.js`, `tests/garage-wave3-preview-browser.spec.js`.

- [x] Tests and policy helper for frozen Coming Soon state `canBuy:false`, `canClaim:false`, `price:null`, `balance:null`; actual Garage gallery displays clear localized disabled state (commits `8cc6f8c5`, `c3afd99f`, `3d3b9d12`, `ba760bc2`). Isolated pure-helper tests passed; browser and full CI not yet confirmed.
- [ ] RED browser tests for the real Garage→Store preview→Back route with keyboard/touch/history, safe-area, absent/corrupt WebP, account switch, Low/Medium/High and no Buy/claim action.
- [ ] Prefer existing gallery/HTML/CSS state, do not add a new checkout layer or speculative store routing. Only actual user-visible behavior supported by tests is done.
- [ ] Full `make verify`, exact-HEAD quality-gate and true WebGL/mobile visual sign-off.

### Task 5: Garage VFX Phase B regression and integration

**Branch:** `feature/garage-vfx-skins`

- [ ] Validate actual exact HEAD CI including unit, browser, World Tour and cloud-save; distinguish `[full-regression]` from a focused test.
- [ ] Verify trial/equip/preview/expiry/account switching on actual running game, Garage Studio ground/flight, reload, keyboard/touch, VFX Off, Low/Medium/High and shader cleanup/draw calls. Keep remaining hardware checks explicitly open.
- [ ] Fix any root-cause regressions using RED → GREEN → Refactor, never by weakening browser assertions or changing working physics.
- [ ] Request separate approval before integrating fully verified feature branches into `develop`.

### Task 6: Final Wave 3 gate

- [ ] Re-fetch every branch HEAD and `develop`; ensure each target includes current `develop`, no merge conflicts or silently lost work.
- [ ] Check `npm test`, `npm run typecheck`, `npm run build`, `make verify`, cloud emulator tests where applicable; attach successful output and exact SHA/Actions URL per branch.
- [ ] Confirm genuine desktop and phone screenshot/video review, feature release-mode artwork audit, no fake wallet/paid/granted items, no newly exposed browser-only entitlement.
- [ ] Only with independent merge approval, merge each approved branch into `develop` (no PR/force push), then verify full exact-HEAD `develop` CI.
- [ ] Mark Wave 3 complete only if all authorized behaviors and acceptance evidence are present; label withheld economy/purchase functionality as *not approved*, not silently complete.

## Initial evidence and blockers (2026-11-03)

- Source at task start: v0.29.0, `develop` `474d484b`.
- Rewards HEAD after early implementation: `5ad6359f`; workflow `https://github.com/weskao/skyline-rush/actions/runs/41611597607` was pending at latest inspection.
- Store HEAD after early implementation: `ba760bc2`; workflow `https://github.com/weskao/skyline-rush/actions/runs/41611915356` was pending.
- Economy previous merge HEAD: `6af8562d`; workflow `https://github.com/weskao/skyline-rush/actions/runs/41608826441` was queued.
- VFX previous merge HEAD: `0ee10d37`; workflow `https://github.com/weskao/skyline-rush/actions/runs/41609646226` was queued.
- Isolated Node 22 tests for the three pure modules: 10/10 pass; **NOT** `npm test`, `make verify`, WebGL, Cloud emulator or remote CI.
- No authenticated backend settlement/payments policy or approved rates were established. As such the full award/wallet feature is blocked; it is not safe to claim Wave 3 fully complete.
