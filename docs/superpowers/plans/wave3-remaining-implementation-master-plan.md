# Wave 3 Remaining Implementation — Frontend-first Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Checkboxes mean executable evidence, never plans-only.

**Goal:** Deliver a complete, attractive, genuinely playable **backend-free early-access** Mission → Results → Demo Rewards → Demo Store → Demo Collection → Equip loop first, then add a verified Go backend **without rewriting the UI**.
**Date/status:** 2026-11-10 · DOCUMENTATION PLANNED, NOTHING IN THIS PLAN IMPLEMENTED BY THIS COMMIT.
**Architecture:** Keep the existing Vue 3 + strict TypeScript / Vite / Three.js game untouched in its hot path. Add a small local-demo experience port and components first; use the same port for future trusted Go+Firestore authority after frontend acceptance. Keep true Cloud Save/PAINTS and demo state entirely separate.
**Tech stack:** Vue 3, TS, native Node tests, Playwright, GitHub Actions, optional small browser storage, existing Firebase client for current gameplay only. Go + Firebase Auth + Firestore **later**.
**Spec:** `docs/superpowers/specs/2026-11-10-wave3-frontend-first-experience-design.md`
**Artwork:** `docs/designs/wave3-frontend-first-visual-assets.md`
**Base audited:** `develop` `dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc`; re-fetch newest HEAD before each future execution.
**Working branch for this plan only:** `feature/wave3-implementation-plan-audit-20261110`; subsequent code work uses new branches from contemporary `develop`, following `CLAUDE.md`.
**Safety:** This document does not authorize implementation, backend deployment, publishing, feature merges or real payments.

## Source-of-truth precedence and historical reconciliation

1. This master plan + linked 2026-11-10 spec define **frontend-first sequencing** and **disposable local-demo behavior**; older 2026-10-31 plans that say "wait for backend before showing any progress" are historical for this limited, prominently labeled demo. Their **prohibitions on claiming real owned items, paid grants, real currencies or trustworthy client results remain binding**.
2. `docs/superpowers/plans/2026-11-03-wave3-v029-completion-plan.md` already covers settlement/preview contracts; reuse instead of duplicating them.
3. `docs/superpowers/plans/2026-10-31-garage-economy-foundation-plan.md` covers data/trial separation; `2026-10-31-garage-rewards-and-missions-plan.md` covers races/missions; `2026-10-31-garage-store-readiness-plan.md` covers disabled real commerce. The new work adds a **new demo mode** rather than mutating their fail-closed functions.
4. `docs/superpowers/plans/2026-11-06-wave3-go-backend-implementation.md` Phase 0–9 executes **after frontend acceptance**, with separate approval; preserve its anti-cheat and true settlement requirements.
5. `TODO.md` is the high-level tracking index; every box in this plan stays open until its own observed RED → GREEN + applicable CI/manual evidence. Historical [ ] sections in TODO are snapshots, not proof current code lacks an existing preview.

## Audited state / no false "done" claims

| Area | Present in audited develop | Missing for frontend demo | Missing for server-authoritative launch |
| --- | --- | --- | --- |
| Garage Studio and VFX | `GaragePanel.vue`, `GarageSkinCatalog.vue`, ``garage-skin-session.ts``, trial releases and existing PAINTS | End-to-end demo collection/entitlement presentation and account/refresh UX acceptance | Genuine verified permanent inventory |
| Missions | `GarageMissionBoard.vue` + 4 art-based tasks and 4 trophy illustrations, explicitly `unavailable` | Event counters, localized goals, reset, progress bar, claim experience | Trusted server events and durable progress |
| Results/rewards | `settleRace` and `result-screen.ts` handle existing results/stars/medals; `garage-settlement-gate.ts` is fail-closed | Local-only completion ID/event adapter, demo reward and pending/claimed UI | Trusted completion, atomic idempotency, real payout |
| Economy | `garage-economy-state.ts` fixed `balance:null`, ``owned:[]``, `canBuy:false` | Separate disposable demo-points ledger and reset; not a paid wallet | Approved currency, authoritative transactions, anti-fraud |
| Store | `garage-store-readiness.ts` fixed Coming Soon; 6 image-based category concepts | Clearly labeled demo browse, confirm, redeem, insufficient balance and inventory loop | Approved catalog, purchase/refund/receipt fulfillment |
| Persistence | Current local history and Firebase Cloud Save for existing game | Tiny separate demo namespace, reload+account isolation, no migration of demo credits | Go + schema/rules, versioning and server migration |
| Assets | Shared original 3× library and runtime Garage VFX/mission/store art | Audit missing visuals, source-locked generation **only when needed**, visible state art and manual QA | Later paid-store assets only after policy approval |

**Repository pointers:** `src/GarageMissionBoard.vue`; `src/garage-wave3-preview-catalog.ts`; `src/GaragePanel.vue`; `src/garage-economy-state.ts`; `src/garage-settlement-gate.ts`; `src/garage-store-readiness.ts`; `src/garage-skin-runtime.ts`; `src/garage-skin-preference.ts`; `src/race-results.ts`; `src/result-screen.ts`; `src/history-achievements.ts`; `src/cloud-progress.ts`; `firestore.rules`; `docs/garage-release-policy.md`.



### A-03 / A-04 implementation file handoff (2026-11-10)

Two standalone new art assets have been produced externally to the app code; the current canonical runtime filename/ownership contract is:

- **A-03 Demo Points:** `public/feature-assets/wave3-demo/raster/demo-points@3x.webp` (transparent `demo-points@3x.png` master counterpart). Consume at **72×72 CSS px** from the 216×216 3× image in the local-only Demo Points balance, Store and Results presentation; never represent as real currency.
- **A-04 Demo Claim:** `public/feature-assets/wave3-demo/raster/demo-claim@3x.webp` (transparent `demo-claim@3x.png` master counterpart). Consume at **72×72 CSS px** when a local-demo mission reward can be claimed or confirmed; state and translation remain authored by Vue, never the image.

Use `import.meta.env.BASE_URL` + `feature-assets/wave3-demo/raster/<filename>`, `object-fit:contain` and ≥8px container padding. Static art needs no GIF/reduced-motion variant. Do not silently substitute existing Store or mission sprites. Before A01/A02 is checked off, verify each binary exists and decodes in the branch, RGBA alpha and ≥20px inset, and capture browser screenshots in portrait/landscape/desktop. Other artwork (A-05/A-06) stays optional. See `docs/designs/wave3-frontend-first-visual-assets.md` §7 for the canonical asset table.

**Status distinction:** file naming/handoff is documented, but this alone is not proof the WebPs are in the repository, wired into UI, or cleared for visual approval. F03–F06 and A01/A02 remain open until their respective evidence is observed.

## Work graph and ownership

`F00 audit → F01 local port → F02 game event capture → F03 local mission engine → F04 local result/demo ledger → F05 demo store+inventory → F06 frontend UX integration → F08 early-access gates → B00 Go backend.`

`A00 asset audit → A01 asset generation when needed → A02 asset browser/visual acceptance` can run alongside F01–F05; A02 must precede F08. No backend requirement blocks F01–F08. Backend B00 never precedes F08. Future engineering may split F02–F05 into isolated branches from then-current develop; integrate incrementally with project gates, no PR unless separately requested.

## Global constraints for every future code task

- Read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `.claude/rules/ci-gates.md`, `.claude/rules/branch-release.md`; add `.claude/rules/raster-artwork.md` and `animated-image-production.md` for visual work.
- TDD RED (observed correct failure) → GREEN → refactor; run `node --test tests/module-size.test.js` before code commits, focused tests, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `npm run test:browser` and `make verify` as applicable. Cloud/rules changes additionally need `npm run test:cloud` with Firebase Emulator/Java 21. Report any unavailable command honestly.
- Feature branch GitHub Actions may skip browser/World Tour for docs/focused commits; `quality-gate` green on a skipped job does not mean E2E verified. Run an explicitly full regression or verify develop's exact merged SHA after separately approved merge.
- Real WebGL/phone/device visual acceptance is distinct from CI. Include iOS Safari/Chrome, Android Chrome, macOS Chrome (including M4 mini), desktop 1440×900, phone 390×844, 844×390; en/zh-TW; Low/Medium/High, VFX off, Reduced Motion, keyboard and touch; no excessive draw calls/memory or overlay blocking.
- Never alter existing racing physics, speed, boosts, AI, score balancing, star unlocks or legacy cloud save as a side effect. Never silently import disposable local items into permanent ownership. No payment SDK, premium price, real reward grant, or unverifiable claim.

## Frontend implementation tasks (execute in order)

### F00 — Audit and behavioral acceptance baseline (P0)

**Read:** files in the audited-state table; current `TODO.md` sections 5.1–5.11 and 2026-11-06 Wave 3 integration; `docs/garage-release-policy.md`.
**Evidence:** exact SHA snapshot, source/test ownership map, working Garage/Results screenshots for 1440×900, 390×844 and 844×390; list which content is already functional, preview-only, missing or CI-unverified.

- [ ] Re-fetch the actual branch HEAD before writing code, reconcile outdated 2026-10-31 "plan only" wording with integrated Wave 3 runtime, and record any missing/changed symbols.
- [ ] Record the complete no-backend guest user journey and baseline screenshots/console output; do not claim unavailable local browser tests were executed.
- [ ] Record explicit acceptance cases for reset, refresh, offline, account A→B and true progress not being modified by the demo.

**Done when:** source map has concrete file names and verified reference SHA; no speculative "completed" labels.

### F01 — Stable local-demo authority boundary (P0)

**Create (proposed):** `src/wave3-experience-contract.ts`, `src/wave3-local-demo.ts`, `tests/wave3-local-demo.test.js`.
**Do not edit:** `src/garage-economy-state.ts` / `src/garage-settlement-gate.ts` to fabricate authoritative balances. Keep the separate port as the single UI seam.
**Interface:** `Wave3ExperiencePort` for `getSnapshot`, `subscribe`, `recordGameEvent`, `settleCompletion`, `claimMission`, `redeemPreview`, `equipPreview`, `resetDemo`; immutable versioned `ExperienceSnapshot` with explicit `mode:'local-demo'`/`authority:'local'`; test fixture catalog version and status enums.

- [ ] **RED:** tests require a guest to initialize with no backend, stable snapshot structure and no `verified` ownership; unknown status/version fails safely.
- [ ] **RED:** account switch and stale asynchronous completion cannot leak state; a browser/storage exception never blocks guest UI.
- [ ] **GREEN:** minimal port and local in-memory adapter; allow current app and Game Loop to function with zero backend calls.
- [ ] **REFACTOR/verify:** pure TypeScript under strict checking; `node --test tests/wave3-local-demo.test.js`, typecheck, build, legacy `tests/garage-economy-state.test.js` and `tests/garage-store-readiness.test.js`.

**Done when:** no server credential/Firestore side effect exists; the local UI can subscribe and reflect state without faking backend claims.

### F02 — Genuine local race events and completion mapping (P0)

**Modify (proposed):** `src/race-results.ts` (after existing settlement, not instead), potentially a small `src/wave3-race-events.ts`; tests `tests/wave3-race-events.test.js` and existing `tests/race-results.test.js`. Inspect `src/game.js` event ownership before changes.
**Consumes:** F01 port; **produces:** versioned local `GameEvent` / `Completion` IDs, mode eligibility, real drift/COMBO/finish/landing counters.

- [ ] **RED:** a genuine finish/drift/combo increments the correct demo objective, while a fabricated static gallery card, aborted race and noneligible mode do not.
- [ ] **RED:** repeated result render, hot reload, Race Again and old events with the same completion ID count once within local-demo retention.
- [ ] **GREEN:** record eligible events at logical transition boundaries; map to demo reducer after existing `settleRace` without mutating racing score/history.
- [ ] **Verify:** native Node results, replay fixtures, existing `tests/race-results.test.js`, game/race Browser specs and World Tour determinism.

**Done when:** progress is sourced from actual local gameplay events, never DOM/image clicks or synthetic finish claims, and existing results remain intact.

### F03 — Local Missions, daily/weekly cadence and trophy display (P0)

**Modify:** `src/GarageMissionBoard.vue` and localized catalog/labels; **create (proposed):** `src/wave3-demo-missions.ts`, `tests/wave3-demo-missions.test.js`, `tests/wave3-missions-browser.spec.js`.
**Consumes:** F01/F02, existing `garage-wave3-preview-catalog.ts` item identities and `GarageArtworkImage.vue`.

- [ ] **RED:** four mission families (race/time/drift/combo) show actual current/max counts, 0→100% semantics and correct status; once claimed, do not show another claim.
- [ ] **RED:** local daily/weekly UTC rollover, stale replay, app reopening, account switch and absent image still display correct progress and bilingual status.
- [ ] **GREEN:** deterministic local-only objectives and optionally a few clean-landing/distance tasks; complete/claim progression, countdown and local trophies clearly marked "試玩成就".
- [ ] **Verify:** Node reducer tests + desktop/phone Playwright; screen-reader labels and ≥44px tap controls; no 60-FPS Vue updates.

**Done when:** guest can complete and claim a mission in the running game with no backend, and local claims cannot masquerade as real achievements.

### F04 — Local-only demo rewards and result summary (P0)

**Create (proposed):** `src/wave3-demo-settlement.ts`, `tests/wave3-demo-settlement.test.js`; **modify:** presentation boundaries `src/result-screen.ts` and relevant result UI mounting code only.
**Consumes:** F02/F03; **returns:** `pending-local`, `completed-local`, `duplicate-local`, `ineligible`, `failed-local` states.

- [ ] **RED:** same `completionId` and same mission claim cannot add demo points twice, including a double-click/refresh and account A→B.
- [ ] **RED:** ineligible/cancelled race produces zero demo award, insufficient storage still permits in-memory UI; result view never says server verified.
- [ ] **GREEN:** visibly separate existing race score/star/medal from demo points and demo mission progress; show a concise local-settlement result summary and an explicit "only this browser" disclaimer.
- [ ] **Verify:** `tests/result-screen.test.js`, `tests/wave3-demo-settlement.test.js`, actual game finish→result→Garage regression, screen width/locale/device tests.

**Done when:** first successful guest race produces an entirely local, repeat-safe result and the user knows it is disposable.

### F05 — Demo Store + Collection + trial/equip loop (P0)

**Modify:** `src/GaragePanel.vue`, `src/GarageSourceArtGallery.vue` or add a focused view component; reuse `src/garage-wave3-preview-catalog.ts` and `src/garage-skin-runtime.ts` without altering true entitlements.
**Create (proposed):** `src/wave3-demo-store.ts`, `tests/wave3-demo-store.test.js`, `tests/wave3-demo-store-browser.spec.js`.

- [ ] **RED:** guest sees preview→demo redeem confirmation→demo balance change→demo collection→equip→race; "Not enough demo points" is actionable and changes nothing.
- [ ] **RED:** duplicate redeem, item version change, deleted/invalid SKU, trial expiry, account change and unsupported storage preserve valid existing PAINTS/skin selection and cannot mint `owned`.
- [ ] **GREEN:** add an isolated "試玩商城 / Demo Store" tab/flag, optional free demo exchange, collection filters `Demo unlocked / Trial / Locked / Preview only` and a visible reset.
- [ ] **GREEN:** keep the production/real `storeReadiness()` fail-closed as Coming Soon with `canBuy:false` and no price/payment, regardless of demo availability.
- [ ] **Verify:** `tests/garage-store-readiness.test.js`, `tests/garage-skin-session.test.js`, release-mode bundle audits and Playwright no-payment/correct labels.

**Done when:** all store demonstration actions are locally interactive and clearly noncommercial, without accidental Cloud Save/entitlement grant.

### F06 — Persistence, accessibility and service-free UX (P0)

**Create (proposed):** `src/wave3-demo-storage.ts` and `tests/wave3-demo-storage.test.js`; **modify:** minimal UI seam only.
**Consumes:** F01–F05. **Key:** `skyline-rush-wave3-demo:v1:<guest-or-uid>`, max 64 KiB, expiry seven days (review before implementation), app continues in memory when unavailable.

- [ ] **RED:** corrupt/oversized/future-version/expired/cross-account records are discarded only within the demo namespace; existing `skyline-rush-*` game keys and Cloud Save never touched.
- [ ] **RED:** refresh/close/reopen, browser no-storage, offline start, network failure, reduced-motion, hidden UI and second-device no-sync assumptions are explicit; account identity changes clear stale demo actions.
- [ ] **GREEN:** optional bounded storage + reset action; labels and empty states in en/zh-TW; no persistence of credentials, payment data, account secrets or real item grants.
- [ ] **Verify:** `tests/wave3-demo-storage.test.js`, `tests/cloud-progress.test.js`, `tests/garage-skin-preference.test.js` and actual browser smoke.

**Done when:** frontend never stalls awaiting Go/Auth and reset touches only local demo data.

## Visual work is a required phase, not an afterthought

### A00 — Audit existing source artwork before generating (P0)

**Specification:** `docs/designs/wave3-frontend-first-visual-assets.md`; **assets:** existing 8 mission/trophy icons, 6 store icons, Garage skin/GIF set and original 59-file 3× archive.

- [ ] Compare existing runtime icons with the original source/reference board; record exact path, blob SHA, CSS size, alpha margins, blur/crop defects, style identity and decision `reuse / surgical repair / new`.
- [ ] Approve a *minimal* new asset list tied to actual frontend screens, not speculative premium commerce; retain existing 3D translucent neon art and original identity.

### A01 — Produce missing art with explicit per-image prompts (P1)

**Candidate new images (not automatically approved or generated by writing this plan):** demo-points token `216×216` source / `72×72` CSS; small demo claim/badge state icon `216×216` / `72×72`; optional empty demo collection `288×288` / `96×96`. Existing mission, trophy and store images **MUST be reused if visually valid**, not redrawn into an unrelated flat style. Only make new item-specific art after A00 confirms the UI needs it.

- [ ] Create a per-image brief: role/screen, source reference/SHA, source 3× dimensions, CSS layout, style/palette, camera, transparent margin, negative prompt, alt/locale and acceptance owner.
- [ ] Generate genuinely native 3× source images with image-generation capability; no screenshot/fake resize or reconstructed crop; preserve true RGBA alpha, original shape/materials, no logos/text/prices.
- [ ] If animation is needed, follow source-locked frame/motion requirements and ≤900 KiB transparent 20–24-frame GIF (50ms/frame) **only where useful**. Preserve existing GIFs otherwise. No generic overlays or whole-image shake.

### A02 — Asset validation and gameplay visual QA (P1)

- [ ] Run dimensions/decoded image/alpha bounds and fallback tests; for 216px store class require ≥20 px transparent per side at alpha >16; 288px animation frames ≥12 px. Evaluate new static 288px art against scoped inset agreed in asset sheet.
- [ ] Side-by-side original vs repaired/generated art at **native 1× CSS**, on dark/light/saturated cards; check uncropped exhaust/glow, no neighboring sprite, no blur/matte halo or style drift.
- [ ] Screenshot actual 390×844 / 844×390 / 1440×900 WebGL/UI at en/zh-TW, Low/Medium/High, VFX off and Reduced Motion; verify ≥8 CSS px image frame padding, caption underneath and ≥44px controls. Record before/after SHA/visual-review approval.
- [ ] No automatic acceptance on alpha/inset tests alone; record real reviewer visual judgment separately.

## End-to-end early access verification (P0)

### F08 — Complete player-journey acceptance and preview promotion

**Browser test:** add `tests/wave3-early-access-browser.spec.js` exercising real pointer/keyboard actions: fresh guest → Garage Missions → START actual race → earn demo progress → result → claim → Demo Store redeem → Demo Collection → preview/equip → next race → refresh → reset. Include insufficient points, noneligible modes, no server, blocked storage, account switch and missing images.

- [ ] Execute a true backend-free build: no Go endpoint configured, Firebase Auth optional/unavailable, network disabled where feasible; all demo and existing race flows function.
- [ ] Confirm static release build remains safe: real Store "Coming Soon", no Buy/Claim **real** authority, demo labels explicit, no paid SDK or fake official currency. Confirm URL/flag configuration is intentional and documented.
- [ ] Run focused RED→GREEN, `node --test tests/module-size.test.js`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `npm run test:browser`, `npm run test:cloud` (if relevant), `make verify`, exact-HEAD full CI and real-device visual/perf. Do not mark complete for skipped checks.
- [ ] Publish an early-access build **only if explicitly separately authorized**, after privacy/disclaimer, data-loss warning, QA/CI and roll-back plan.

**Definition of frontend-complete:** In a fresh browser with **no backend**, a player can complete the *whole demo* loop without loading blockers or exceptions; no demo action alters permanent progress or true entitlements; all image and device gates pass; source SHA and test receipts are attached.

## Deferred backend tasks (after F08 and explicit go-ahead)

### B00 — Go backend and authority adapter (P0 after frontend)

- [ ] Rebase backend plan Phase 0–9 on the accepted frontend contracts; document concrete TS adapter ↔ Go HTTP request/response and auth/error/UID contracts, not a separate UI flow.
- [ ] **RED:** strict Go auth validation, forged result rejection, durable exactly-once `(uid,completionId)` transaction, daily/weekly missions, legacy migration, Firestore rules and cross-account access using emulators; never trust client demo receipts.
- [ ] **GREEN:** implement `ServerExperienceAdapter` against the same UI port, no critical-path backend requirement for local play, server UTC and verified inventory/mission authority; maintain local-only demo fallback on outage.
- [ ] Keep **demo data non-migratable into real value**: server starts from verified records only. Do not import demo balance, demo unlock or local achieved counters as a valid grant. Test version transitions and rollback.
- [ ] Defer real currency, real checkout, paid items, receipts, refunds, purchase reconciliation and regulatory questions to separate product/policy approval.
- [ ] Run `go test ./...`, `go test -race ./...`, `go vet ./...`, Firebase emulators, frontend unit/Browser/World Tour, full CI and device acceptance; record distinct frontend-only vs server-enabled outcomes.

**Backend plan:** `docs/superpowers/plans/2026-11-06-wave3-go-backend-implementation.md` (still documentation-only).

## Open product decisions (do not invent permanent policies)

- Official currency name and icon, earning and redemption rates, caps, rarity, balance carryover, premium/real-money policy.
- Permanent item acquisition mapping, verified eligibility/race modes, economy anti-cheat assurance, paid checkout provider/compliance.
- Demo retention policy: proposed 7-day/64 KiB, exact local starter points and sample SKU prices are **test fixtures**, not approved payouts.
- Whether early access is on a separate preview URL/build flag vs future product release. Default recommendation: explicitly flagged early-access build, never auto-enable an unfinished real checkout.
- Any proposed persistent claim, automatic progression migration or player compensation after preview ends requires a separate policy decision.

## Commit/CI evidence ledger template

| Task | Branch/commit | Observed RED command/result | Observed GREEN command/result | Browser/real device | Exact-HEAD CI URL | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| F00–B00 / A00–A02 | OPEN | NOT RUN | NOT RUN | NOT RUN | NOT VERIFIED | Pending |

Only mark an item complete with its own proof. The document branch has **no implementation or validation claims**.
